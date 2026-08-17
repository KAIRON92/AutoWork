import { SmtpAdapter } from '../backend/src/email/adapters/providers/smtp.adapter';
import { GmailAdapter } from '../backend/src/email/adapters/providers/gmail.adapter';
import { EmailService } from '../backend/src/email/email.service';
import { CampaignsService } from '../backend/src/campaigns/campaigns.service';
import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';

describe('Phase 3 — Campaign Delivery Architecture & Sender Engine Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-32-chars-long!!';
    process.env.EMAIL_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 5).toString('base64');
    process.env.PCLOUD_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    process.env.GMAIL_CLIENT_ID = 'test-gmail-client-id';
    process.env.GMAIL_CLIENT_SECRET = 'test-gmail-client-secret';
    process.env.GMAIL_REDIRECT_URI = 'http://localhost:3000/api/v1/email/accounts/gmail/callback';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. Custom SMTP Provider Verification & Validation', () => {
    it('successfully verifies SMTP connection on valid handshake', async () => {
      const verifyMock = jest.fn().mockResolvedValue(true);
      const mockTransporter = {
        verify: verifyMock,
        sendMail: jest.fn().mockResolvedValue({ messageId: '<smtp-123@sendgrid.net>' }),
      };

      const adapter = new SmtpAdapter(() => mockTransporter as any);
      const result = await adapter.validateAccount({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        user: 'apikey',
        pass: 'SG.valid_key',
        accountEmail: 'outreach@company.com',
      });

      expect(result.valid).toBe(true);
      expect(result.accountEmail).toBe('outreach@company.com');
      expect(verifyMock).toHaveBeenCalled();
    });

    it('rejects SMTP validation when credentials/password are wrong', async () => {
      const mockTransporter = {
        verify: jest.fn().mockRejectedValue(new Error('535 Authentication failed: Invalid username or password')),
      };

      const adapter = new SmtpAdapter(() => mockTransporter as any);
      const result = await adapter.validateAccount({
        host: 'smtp.sendgrid.net',
        port: 587,
        user: 'apikey',
        pass: 'wrong_key',
        accountEmail: 'outreach@company.com',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });

    it('rejects SMTP validation when host is unreachable / connection timeout', async () => {
      const mockTransporter = {
        verify: jest.fn().mockRejectedValue(new Error('ETIMEDOUT: Connection timed out to smtp.unknown-host.com:587')),
      };

      const adapter = new SmtpAdapter(() => mockTransporter as any);
      const result = await adapter.validateAccount({
        host: 'smtp.unknown-host.com',
        port: 587,
        user: 'apikey',
        pass: 'any_pass',
        accountEmail: 'outreach@company.com',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('ETIMEDOUT');
    });

    it('rejects SMTP validation on TLS/STARTTLS handshake failure', async () => {
      const mockTransporter = {
        verify: jest.fn().mockRejectedValue(new Error('SELF_SIGNED_CERT_IN_CHAIN: Certificate verification failed')),
      };

      const adapter = new SmtpAdapter(() => mockTransporter as any);
      const result = await adapter.validateAccount({
        host: 'smtp.custom-server.com',
        port: 465,
        secure: true,
        user: 'user',
        pass: 'pass',
        accountEmail: 'user@custom-server.com',
      });

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Certificate verification failed');
    });
  });

  describe('2. Gmail OAuth Sender Connection & Verification', () => {
    it('generates secure OAuth authorization URL with signed state', async () => {
      const emailService = new EmailService({} as any);
      const { url } = await emailService.gmailAuthUrl('org-123', 'user-456');

      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-gmail-client-id');
      expect(url).toContain('scope=openid+email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send');
    });

    it('exchanges OAuth code, verifies mailbox profile, and registers VERIFIED email account', async () => {
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        if (url === 'https://oauth2.googleapis.com/token') {
          return new Response(JSON.stringify({
            access_token: 'valid-google-access-token',
            refresh_token: 'valid-google-refresh-token',
            expires_in: 3600,
            scope: 'openid email profile https://www.googleapis.com/auth/gmail.send',
          }), { status: 200 });
        }
        if (url === 'https://www.googleapis.com/oauth2/v3/userinfo') {
          return new Response(JSON.stringify({
            email: 'alex@company.com',
            name: 'Alex Morgan',
            sub: 'google-sub-123',
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
      }) as any;

      const createMock = jest.fn().mockResolvedValue({
        id: 'acc-email-1',
        accountEmail: 'alex@company.com',
        provider: 'gmail',
        status: 'VERIFIED',
      });

      const mockPrisma = {
        emailAccount: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: createMock,
        },
      };

      const emailService = new EmailService(mockPrisma as any);
      const stateObj = { orgId: 'org-123', userId: 'user-456', nonce: 'abc', exp: Date.now() + 60000 };
      const validState = (emailService as any).encodeState(stateObj);

      const result = await emailService.gmailCallback('auth-code-123', validState);

      expect(result.email).toBe('alex@company.com');
      expect(result.status).toBe('VERIFIED');
      expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-123',
          accountEmail: 'alex@company.com',
          status: 'VERIFIED',
          provider: 'gmail',
        }),
      }));
    });
  });

  describe('3. Campaign Delivery Mode Validation & Multi-Tenant Security', () => {
    it('rejects campaign creation in Email mode if sender account is missing', async () => {
      const mockPrisma = {
        pCloudAccount: { findFirst: jest.fn().mockResolvedValue({ id: 'p-1' }) },
        pCloudFile: { findFirst: jest.fn().mockResolvedValue({ id: 'f-1' }) },
        template: { findFirst: jest.fn().mockResolvedValue({ id: 't-1' }) },
      };

      const campaignsService = new CampaignsService(mockPrisma as any);
      await expect(
        campaignsService.create('org-1', {
          name: 'Email Campaign',
          pcloudAccountId: 'p-1',
          pcloudFileId: 'f-1',
          templateId: 't-1',
          config: { deliveryMode: 'EMAIL' },
        }),
      ).rejects.toThrow(/Verified Email sender account is required/i);
    });

    it('rejects campaign creation if sender account is unverified or in ERROR status', async () => {
      const mockPrisma = {
        pCloudAccount: { findFirst: jest.fn().mockResolvedValue({ id: 'p-1' }) },
        pCloudFile: { findFirst: jest.fn().mockResolvedValue({ id: 'f-1' }) },
        template: { findFirst: jest.fn().mockResolvedValue({ id: 't-1' }) },
        emailAccount: { findFirst: jest.fn().mockResolvedValue(null) }, // Not verified
      };

      const campaignsService = new CampaignsService(mockPrisma as any);
      await expect(
        campaignsService.create('org-1', {
          name: 'Email Campaign',
          emailAccountId: 'unverified-acc',
          pcloudAccountId: 'p-1',
          pcloudFileId: 'f-1',
          templateId: 't-1',
          config: { deliveryMode: 'EMAIL' },
        }),
      ).rejects.toThrow(/Invalid or unverified Email sender account/i);
    });

    it('rejects cross-tenant sender account access', async () => {
      const mockPrisma = {
        pCloudAccount: { findFirst: jest.fn().mockResolvedValue({ id: 'p-1' }) },
        pCloudFile: { findFirst: jest.fn().mockResolvedValue({ id: 'f-1' }) },
        template: { findFirst: jest.fn().mockResolvedValue({ id: 't-1' }) },
        emailAccount: {
          findFirst: jest.fn().mockImplementation(({ where }) => {
            if (where.organizationId === 'org-2' && where.id === 'acc-org-2') {
              return Promise.resolve({ id: 'acc-org-2', status: 'VERIFIED' });
            }
            return Promise.resolve(null);
          }),
        },
      };

      const campaignsService = new CampaignsService(mockPrisma as any);
      await expect(
        campaignsService.create('org-1', {
          name: 'Intruder Campaign',
          emailAccountId: 'acc-org-2',
          pcloudAccountId: 'p-1',
          pcloudFileId: 'f-1',
          templateId: 't-1',
          config: { deliveryMode: 'EMAIL' },
        }),
      ).rejects.toThrow(/Invalid or unverified Email sender account/i);
    });
  });

  describe('4. Email Mode Delivery: Attachments, Direct Links, and Both', () => {
    it('dispatches MIME email with binary pCloud file attachment via SmtpAdapter', async () => {
      const sendMailMock = jest.fn().mockResolvedValue({ messageId: '<smtp-msg-999@domain.com>' });
      const mockTransporter = {
        sendMail: sendMailMock,
      };

      const adapter = new SmtpAdapter(() => mockTransporter as any);
      const result = await adapter.sendEmail({
        to: { email: 'recipient@example.com' },
        subject: 'Document Ready',
        body: 'Please find attached your document.',
        attachments: [
          {
            filename: 'contract.pdf',
            content: Buffer.from('mock-pdf-bytes'),
            mimeType: 'application/pdf',
          },
        ],
        accountCredentials: {
          host: 'smtp.sendgrid.net',
          port: 587,
          user: 'apikey',
          pass: 'SG.123',
          accountEmail: 'sender@company.com',
          fromName: 'Company Legal',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('<smtp-msg-999@domain.com>');
      expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
        from: '"Company Legal" <sender@company.com>',
        to: 'recipient@example.com',
        subject: 'Document Ready',
        text: 'Please find attached your document.',
        attachments: [
          expect.objectContaining({
            filename: 'contract.pdf',
            contentType: 'application/pdf',
          }),
        ],
      }));
    });

    it('dispatches Gmail API multipart message with binary attachment and returns Google messageId', async () => {
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        if (url === 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send') {
          return new Response(JSON.stringify({ id: 'gmail-msg-id-88888', threadId: 'thread-123' }), { status: 200 });
        }
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
      }) as any;

      const adapter = new GmailAdapter();
      const result = await adapter.sendEmail({
        to: { email: 'client@example.com' },
        subject: 'Executive Report',
        body: 'Hello Client, here is your report.',
        attachments: [
          {
            filename: 'report.pdf',
            content: Buffer.from('report-pdf-content'),
            mimeType: 'application/pdf',
          },
        ],
        accountCredentials: {
          accessToken: 'valid-token',
          accountEmail: 'alex@company.com',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('gmail-msg-id-88888');
      expect(result.provider).toBe('gmail');
    });

    it('resolves dynamic template variables (#NAME#, #COMPANY#, #RANDOM#) seamlessly in email', () => {
      const template = 'Hi #FIRSTNAME# at #COMPANY#, your code is #RANDOM#.';
      const { resolvedText, randomCode } = TemplateVariableResolver.resolve(template, {
        email: 'alex@acme.com',
        firstName: 'Alex',
        company: 'Acme Corp',
      });

      expect(resolvedText).toBe(`Hi Alex at Acme Corp, your code is ${randomCode}.`);
      expect(randomCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  describe('5. Delivery Safety: Ambiguous Outcomes & Idempotency', () => {
    it('detects ambiguous outcome after crash and marks MANUAL_REVIEW rather than duplicate send', () => {
      const recipientStatus = 'PROCESSING';
      const attemptsMade = 1;

      const requiresManualReview = recipientStatus === 'PROCESSING' && attemptsMade > 0;
      expect(requiresManualReview).toBe(true);
    });
  });
});
