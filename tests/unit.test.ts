import { FakeEmailAdapter } from '../automation-modules/email/providers/fake.adapter';
import { PCloudStorageAdapter } from '../backend/src/storage/pcloud.adapter';
import { TemplatesService } from '../backend/src/templates/templates.service';

describe('Autowork.com Unit Tests', () => {
  let templateService: TemplatesService;
  let fakeAdapter: FakeEmailAdapter;
  let pcloudAdapter: PCloudStorageAdapter;

  beforeEach(() => {
    templateService = new TemplatesService();
    fakeAdapter = new FakeEmailAdapter({ simulatedLatencyMs: 10, successRate: 1.0 });
    pcloudAdapter = new PCloudStorageAdapter();
  });

  describe('Server-Side Variable Resolution Engine', () => {
    it('should correctly resolve #NAME#, #COMPANY#, and generate unique #RANDOM# tag', () => {
      const subject = 'Inquiry for #COMPANY# (#RANDOM#)';
      const body = 'Hello #FIRSTNAME#,\n\nWelcome to #COMPANY#. Ref: #RANDOM#';
      const recipient = {
        email: 'sarah.c@cyberdyne.io',
        firstName: 'Sarah',
        lastName: 'Connor',
        company: 'Cyberdyne Systems',
      };

      const result = templateService.resolveTemplate(subject, body, recipient);

      expect(result.subject).toContain('Cyberdyne Systems');
      expect(result.subject).not.toContain('#COMPANY#');
      expect(result.subject).not.toContain('#RANDOM#');
      expect(result.body).toContain('Hello Sarah');
      expect(result.randomVal).toHaveLength(6);
    });
  });

  describe('Fake Email Provider Adapter', () => {
    it('should validate account connection and return valid status', async () => {
      const val = await fakeAdapter.validateAccount({ email: 'test@autowork.com' });
      expect(val.valid).toBe(true);
      expect(val.accountEmail).toBe('test@autowork.com');
    });

    it('should dispatch simulated email and return 200 status code', async () => {
      const res = await fakeAdapter.sendEmail({
        to: { email: 'recipient@test.com', name: 'Test Recipient' },
        subject: 'Test Subject',
        body: 'Test Body',
      });

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.provider).toBe('fake');
      expect(res.messageId).toContain('fake-msg-');
    });
  });

  describe('pCloud Storage Adapter', () => {
    it('should handle placeholder token gracefully and return verified status', async () => {
      const conn = await pcloudAdapter.verifyConnection();
      expect(conn.connected).toBe(true);
      expect(conn.message).toContain('pCloud Adapter running in simulation mode');
    });

    it('should upload file buffer and return file metadata', async () => {
      const result = await pcloudAdapter.uploadFile({
        filename: 'test_brochure.pdf',
        buffer: Buffer.from('PDF test contents'),
        mimeType: 'application/pdf',
      });

      expect(result.fileId).toBeDefined();
      expect(result.filename).toBe('test_brochure.pdf');
      expect(result.fileSize).toBe(17);
    });
  });
});
