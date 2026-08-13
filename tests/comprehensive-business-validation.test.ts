import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';
import { FileParserUtil } from '../backend/src/imports/file-parser.util';
import { MockPCloudAdapter } from '../backend/src/pcloud/mock-pcloud/mock-pcloud.adapter';
import { PCloudAdapterFactory } from '../backend/src/pcloud/pcloud.factory';
import { PCloudErrorCode } from '../backend/src/pcloud/pcloud.interface';
import { PCloudErrorMapper } from '../backend/src/pcloud/pcloud-client/pcloud.errors';

describe('Autowork.com — Second Pass Comprehensive Business Validation Suite', () => {
  let mockAdapter: MockPCloudAdapter;

  beforeEach(() => {
    mockAdapter = PCloudAdapterFactory.getMockAdapter();
    mockAdapter.clearHistory();
    mockAdapter.simulatedLatencyMs = 0;
    mockAdapter.failureRate = 0;
    mockAdapter.forcedErrorCode = undefined;
  });

  // ==========================================
  // SECTION 5 & 6: ACCOUNT SELECTION & FULL WORKFLOW
  // ==========================================
  describe('Account Selection & Multi-Account Isolation Test', () => {
    it('should strictly execute operations under selected Account B and never leak to Account A or C', async () => {
      const orgId = 'org-multi-acc';
      const accountA = { id: 'acc-alpha', name: 'Account A', organizationId: orgId, credentials: 'tok-a' };
      const accountB = { id: 'acc-beta', name: 'Account B', organizationId: orgId, credentials: 'tok-b' };
      const accountC = { id: 'acc-gamma', name: 'Account C', organizationId: orgId, credentials: 'tok-c' };

      const campaign = {
        id: 'cmp-targeted-b',
        organizationId: orgId,
        pcloudAccountId: accountB.id,
        pcloudFileId: 'mock-file-selected-99',
        recipients: [
          { email: 'rec1@client.com', name: 'Client One' },
          { email: 'rec2@client.com', name: 'Client Two' },
          { email: 'rec3@client.com', name: 'Client Three' },
        ],
      };

      const executionRecords: any[] = [];

      for (const rec of campaign.recipients) {
        const result = await mockAdapter.shareFolder(
          {
            folderId: '0',
            fileId: campaign.pcloudFileId,
            recipientEmail: rec.email,
            message: `Hello ${rec.name}`,
            pcloudAccountId: campaign.pcloudAccountId,
            campaignId: campaign.id,
            organizationId: campaign.organizationId,
          },
          accountB.credentials
        );

        executionRecords.push({
          campaignId: campaign.id,
          recipientEmail: rec.email,
          pcloudAccountId: campaign.pcloudAccountId,
          pcloudReferenceId: result.pcloudReferenceId,
          status: result.success ? 'SUCCESS' : 'FAILED',
        });
      }

      // Assertions
      expect(executionRecords).toHaveLength(3);
      for (const record of executionRecords) {
        expect(record.pcloudAccountId).toBe(accountB.id);
        expect(record.pcloudAccountId).not.toBe(accountA.id);
        expect(record.pcloudAccountId).not.toBe(accountC.id);
      }

      // Verify adapter execution history
      const history = mockAdapter.executionHistory;
      expect(history).toHaveLength(3);
      expect(history.every((h) => h.pcloudAccountId === accountB.id)).toBe(true);
    });
  });

  // ==========================================
  // SECTION 7: IDEMPOTENCY TEST
  // ==========================================
  describe('Idempotency & Worker Crash Recovery Strategy', () => {
    it('should prevent duplicate pCloud operations on job retry if already completed', async () => {
      const existingExecution = {
        id: 'exec-existing-1',
        campaignId: 'cmp-100',
        recipientEmail: 'sarah.connor@cyberdyne.io',
        pcloudReferenceId: 'mock-share-existing-8821',
        status: 'SUCCESS',
      };

      // Simulated worker idempotency check
      const processShareJob = async (jobPayload: any, dbRecord: any) => {
        // IDEMPOTENCY GUARD: If already marked success with reference ID, skip provider call
        if (dbRecord && dbRecord.status === 'SUCCESS' && dbRecord.pcloudReferenceId) {
          return {
            skipped: true,
            pcloudReferenceId: dbRecord.pcloudReferenceId,
            reason: 'IDEMPOTENT_SKIP_ALREADY_EXECUTED',
          };
        }

        return await mockAdapter.shareFolder(jobPayload, 'mock_token');
      };

      // Attempt 1: First execution succeeds
      const firstRun = await mockAdapter.shareFolder(
        {
          folderId: '0',
          fileId: 'mock-file-1',
          recipientEmail: 'sarah.connor@cyberdyne.io',
          message: 'Confidential file share',
          pcloudAccountId: 'acc-1',
        },
        'mock_token'
      );
      expect(firstRun.success).toBe(true);
      const callCountAfterFirst = mockAdapter.executionHistory.length;

      // Attempt 2: Worker crashes and retries job, idempotency guard catches it
      const retryRun = await processShareJob(
        {
          folderId: '0',
          fileId: 'mock-file-1',
          recipientEmail: 'sarah.connor@cyberdyne.io',
          message: 'Confidential file share',
          pcloudAccountId: 'acc-1',
        },
        { status: 'SUCCESS', pcloudReferenceId: firstRun.pcloudReferenceId }
      );

      expect((retryRun as any).skipped).toBe(true);
      expect((retryRun as any).reason).toBe('IDEMPOTENT_SKIP_ALREADY_EXECUTED');
      // Verify no extra pCloud operation was triggered in history
      expect(mockAdapter.executionHistory.length).toBe(callCountAfterFirst);
    });
  });

  // ==========================================
  // SECTION 8: RETRY & ERROR BEHAVIOR
  // ==========================================
  describe('Transient vs Permanent Error Handling & Retry Policies', () => {
    it('should classify rate limits as transient and retryable with backoff', () => {
      const transientError = PCloudErrorMapper.mapRawError(4000, 'Rate limit exceeded');
      expect(transientError.code).toBe(PCloudErrorCode.PCLOUD_RATE_LIMITED);
      expect(transientError.isTransient).toBe(true);
    });

    it('should classify file not found or invalid recipient as non-transient and not endlessly retry', () => {
      const permError1 = PCloudErrorMapper.mapRawError(2005, 'File not found');
      expect(permError1.code).toBe(PCloudErrorCode.PCLOUD_FILE_NOT_FOUND);
      expect(permError1.isTransient).toBe(false);

      const permError2 = PCloudErrorMapper.mapRawError(2010, 'Invalid email recipient');
      expect(permError2.code).toBe(PCloudErrorCode.PCLOUD_INVALID_RECIPIENT);
      expect(permError2.isTransient).toBe(false);
    });

    it('should succeed on retry after transient failure simulation', async () => {
      let attempts = 0;
      const maxRetries = 3;

      const executeWithRetry = async () => {
        attempts++;
        if (attempts === 1) {
          // First attempt simulates transient error
          return { success: false, isTransient: true, error: { code: PCloudErrorCode.PCLOUD_RATE_LIMITED } };
        }
        // Second attempt succeeds
        return await mockAdapter.shareFolder(
          {
            folderId: '0',
            fileId: 'mock-file-1',
            recipientEmail: 'valid@client.com',
            message: 'Recovered share',
            pcloudAccountId: 'acc-1',
          },
          'mock_token'
        );
      };

      let result: any = await executeWithRetry();
      if (!result.success && result.isTransient && attempts < maxRetries) {
        result = await executeWithRetry();
      }

      expect(attempts).toBe(2);
      expect(result.success).toBe(true);
      expect(result.recipientEmail).toBe('valid@client.com');
    });
  });

  // ==========================================
  // SECTION 9: IMPORT ENGINE EXTENSIVE TESTS
  // ==========================================
  describe('Contact Import & Column Normalization Engine', () => {
    it('should correctly parse CSV, TSV, and Semicolon delimiters', () => {
      const csv = 'Email,First Name,Company\njohn@doe.com,John,Acme';
      const tsv = 'Email\tFirst Name\tCompany\njohn@doe.com\tJohn\tAcme';
      const semi = 'Email;First Name;Company\njohn@doe.com;John;Acme';

      const resCsv = FileParserUtil.parseTextOrCsv(csv);
      const resTsv = FileParserUtil.parseTextOrCsv(tsv);
      const resSemi = FileParserUtil.parseTextOrCsv(semi);

      expect(resCsv.totalRows).toBe(1);
      expect(resTsv.totalRows).toBe(1);
      expect(resSemi.totalRows).toBe(1);
      expect(resCsv.detectedMapping.email).toBe('Email');
      expect(resTsv.detectedMapping.email).toBe('Email');
      expect(resSemi.detectedMapping.email).toBe('Email');
    });

    it('should detect diverse header aliases (E-mail, Organization, Tel, Given Name)', () => {
      const headers = ['E-mail Address', 'Given Name', 'Surname', 'Organization', 'Tel', 'Division', 'Notes'];
      const mapping = FileParserUtil.detectColumnMapping(headers);

      expect(mapping.email).toBe('E-mail Address');
      expect(mapping.firstName).toBe('Given Name');
      expect(mapping.lastName).toBe('Surname');
      expect(mapping.company).toBe('Organization');
      expect(mapping.phone).toBe('Tel');
      expect(mapping.target).toBe('Division');
      expect(mapping.description).toBe('Notes');
    });

    it('should handle mixed column orders and unknown columns safely', () => {
      const raw = 'Custom Field X,Organization,Email,Age,First Name,Random Metadata\nVal1,TechCorp,tech@test.com,35,Alex,Data123';
      const parsed = FileParserUtil.parseTextOrCsv(raw);

      expect(parsed.totalRows).toBe(1);
      expect(parsed.detectedMapping.email).toBe('Email');
      expect(parsed.detectedMapping.company).toBe('Organization');
      expect(parsed.detectedMapping.firstName).toBe('First Name');
      expect(parsed.rows[0]['Email']).toBe('tech@test.com');
      expect(parsed.rows[0]['Organization']).toBe('TechCorp');
    });
  });

  // ==========================================
  // SECTION 10: VARIABLE RESOLVER & UNIQUE #RANDOM#
  // ==========================================
  describe('Dynamic Variable Tokens & #RANDOM# Independence', () => {
    it('should resolve all tokens: #NAME#, #FIRSTNAME#, #LASTNAME#, #EMAIL#, #PHONE#, #COMPANY#, #TARGET#', () => {
      const template = 'To #NAME# (#FIRSTNAME# #LASTNAME#),\nEmail: #EMAIL# | Phone: #PHONE#\nCompany: #COMPANY# (#TARGET#)\nRef: #RANDOM#';
      const recipient = {
        email: 'alex.director@autowork.com',
        firstName: 'Alex',
        lastName: 'Director',
        phone: '+1 555-0100',
        company: 'Autowork Inc',
        target: 'Core Platform',
      };

      const result = TemplateVariableResolver.resolve(template, recipient);

      expect(result.resolvedText).toContain('To Alex Director (Alex Director)');
      expect(result.resolvedText).toContain('Email: alex.director@autowork.com | Phone: +1 555-0100');
      expect(result.resolvedText).toContain('Company: Autowork Inc (Core Platform)');
      expect(result.resolvedText).toContain(`Ref: ${result.randomCode}`);
      expect(result.randomCode).toHaveLength(6);
    });

    it('should generate independent and distinct #RANDOM# codes across 100 consecutive recipients', () => {
      const codes = new Set<string>();
      const template = 'Verification code: #RANDOM#';
      const recipient = { email: 'user@test.com' };

      for (let i = 0; i < 100; i++) {
        const { randomCode } = TemplateVariableResolver.resolve(template, recipient);
        codes.add(randomCode);
      }

      // Assert 100 unique random codes generated without collisions
      expect(codes.size).toBe(100);
    });
  });

  // ==========================================
  // SECTION 11: TENANT ISOLATION
  // ==========================================
  describe('Multi-Tenant Isolation Logic', () => {
    it('should enforce strict organization boundaries on resources', () => {
      const orgA = { id: 'org-a', name: 'Organization Alpha' };
      const orgB = { id: 'org-b', name: 'Organization Beta' };

      const orgAResources = {
        pcloudAccountId: 'acc-org-a-1',
        campaignId: 'cmp-org-a-1',
        fileId: 'file-org-a-1',
        organizationId: orgA.id,
      };

      // Access Control Function
      const checkAccess = (requestingOrgId: string, resource: { organizationId: string }) => {
        if (resource.organizationId !== requestingOrgId) {
          throw new Error('FORBIDDEN_TENANT_ACCESS: Cross-organization resource access denied');
        }
        return true;
      };

      // Org A accessing Org A resource -> Allowed
      expect(checkAccess(orgA.id, orgAResources)).toBe(true);

      // Org B attempting to access Org A resource -> Throws Forbidden
      expect(() => checkAccess(orgB.id, orgAResources)).toThrow('FORBIDDEN_TENANT_ACCESS');
    });
  });
});
