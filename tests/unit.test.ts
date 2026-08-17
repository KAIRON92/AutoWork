import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';
import { FileParserUtil } from '../backend/src/imports/file-parser.util';
import { MockPCloudAdapter } from '../backend/src/pcloud/mock-pcloud/mock-pcloud.adapter';
import { PCloudErrorMapper } from '../backend/src/pcloud/pcloud-client/pcloud.errors';
import { PCloudErrorCode } from '../backend/src/pcloud/pcloud.interface';

describe('Autowork.com pCloud Architecture Unit Tests', () => {
  let mockPCloud: MockPCloudAdapter;

  beforeEach(() => {
    mockPCloud = new MockPCloudAdapter();
    mockPCloud.simulatedLatencyMs = 0;
  });

  describe('1. Template Variable Resolver & #RANDOM# Generator', () => {
    it('should generate a 6-character uppercase alphanumeric code', () => {
      const code1 = TemplateVariableResolver.generateRandomCode(6);
      const code2 = TemplateVariableResolver.generateRandomCode(6);

      expect(code1).toHaveLength(6);
      expect(code2).toHaveLength(6);
      expect(code1).toMatch(/^[A-Z0-9]{6}$/);
      expect(code2).toMatch(/^[A-Z0-9]{6}$/);
    });

    it('should resolve #NAME#, #FIRSTNAME#, #COMPANY#, #TARGET#, and #RANDOM# accurately', () => {
      const template = 'Hi #FIRSTNAME# (#NAME#),\nWelcome to #COMPANY# - #TARGET#.\nRef: #RANDOM#';
      const recipient = {
        email: 'alex.morgan@acmegrowth.com',
        firstName: 'Alex',
        lastName: 'Morgan',
        company: 'Acme Growth Labs',
        target: 'Enterprise Cloud Division',
      };

      const result = TemplateVariableResolver.resolve(template, recipient, 'K89XP2');

      expect(result.resolvedText).toContain('Hi Alex (Alex Morgan)');
      expect(result.resolvedText).toContain('Welcome to Acme Growth Labs - Enterprise Cloud Division');
      expect(result.resolvedText).toContain('Ref: K89XP2');
      expect(result.resolvedText).not.toContain('#FIRSTNAME#');
      expect(result.resolvedText).not.toContain('#RANDOM#');
      expect(result.randomCode).toBe('K89XP2');
    });

    it('should detect all placeholder tags in a template', () => {
      const template = 'Hello #NAME#, your ref for #COMPANY# is #RANDOM# (#TARGET#)';
      const detected = TemplateVariableResolver.detectVariables(template);
      expect(detected).toEqual(expect.arrayContaining(['#NAME#', '#COMPANY#', '#RANDOM#', '#TARGET#']));
    });
  });

  describe('2. Import File Parser & Column Auto-Detection', () => {
    it('should parse CSV content and automatically map columns', () => {
      const csv = 'Email Address,First Name,Last Name,Company Name,Phone Number,Target\n' +
        'sarah.c@cyberdyne.io,Sarah,Connor,Cyberdyne Systems,+1 555-0192,Strategic IT\n' +
        'bruce.w@wayne.com,Bruce,Wayne,Wayne Enterprises,+1 555-0144,Defense';

      const parsed = FileParserUtil.parseTextOrCsv(csv);

      expect(parsed.totalRows).toBe(2);
      expect(parsed.headers).toEqual(['Email Address', 'First Name', 'Last Name', 'Company Name', 'Phone Number', 'Target']);
      expect(parsed.detectedMapping.email).toBe('Email Address');
      expect(parsed.detectedMapping.firstName).toBe('First Name');
      expect(parsed.detectedMapping.company).toBe('Company Name');
      expect(parsed.detectedMapping.target).toBe('Target');
    });

    it('should support semicolon and tab delimited formats', () => {
      const tsv = "Email\tFirst\tCompany\nsarah@test.com\tSarah\tAcme\nbruce@test.com\tBruce\tWayne";
      const parsed = FileParserUtil.parseTextOrCsv(tsv);
      expect(parsed.totalRows).toBe(2);
      expect(parsed.detectedMapping.email).toBe('Email');
    });
  });

  describe('3. pCloud Error Mapping & Normalization', () => {
    it('should map authentication failure code 1000 to PCLOUD_AUTH_FAILED', () => {
      const error = PCloudErrorMapper.mapRawError(1000, 'Invalid auth token');
      expect(error.code).toBe(PCloudErrorCode.PCLOUD_AUTH_FAILED);
      expect(error.isTransient).toBe(false);
    });

    it('should map rate limit code 4000 to PCLOUD_RATE_LIMITED as transient/retryable', () => {
      const error = PCloudErrorMapper.mapRawError(4000, 'Too many requests');
      expect(error.code).toBe(PCloudErrorCode.PCLOUD_RATE_LIMITED);
      expect(error.isTransient).toBe(true);
    });

    it('should map file not found code 2005 to PCLOUD_FILE_NOT_FOUND', () => {
      const error = PCloudErrorMapper.mapRawError(2005, 'File does not exist');
      expect(error.code).toBe(PCloudErrorCode.PCLOUD_FILE_NOT_FOUND);
      expect(error.isTransient).toBe(false);
    });

    it('should map wrong region code 2321 to PCLOUD_WRONG_REGION as transient/retryable', () => {
      const error = PCloudErrorMapper.mapRawError(2321, 'Wrong region server');
      expect(error.code).toBe(PCloudErrorCode.PCLOUD_WRONG_REGION);
      expect(error.isTransient).toBe(true);
    });
  });

  describe('4. Mock pCloud Provider Simulation & History Tracking', () => {
    it('should successfully verify connection and return quota metrics', async () => {
      const conn = await mockPCloud.verifyConnection('mock_valid_token');
      expect(conn.connected).toBe(true);
      expect(conn.userInfo).toBeDefined();
      expect(conn.userInfo?.email).toBe('mock-pcloud-user@autowork.com');
      expect(mockPCloud.executionHistory).toHaveLength(1);
    });

    it('should simulate folder share operation and record reference ID', async () => {
      const result = await mockPCloud.shareFolder(
        {
          folderId: '0',
          fileId: 'mock-file-101',
          recipientEmail: 'sarah.connor@cyberdyne.io',
          message: 'Confidential file share. Ref: A92K1L',
          pcloudAccountId: 'acc-1',
          campaignId: 'cmp-101',
        },
        'mock_token'
      );

      expect(result.success).toBe(true);
      expect(result.operationType).toBe('sharefolder');
      expect(result.pcloudReferenceId).toContain('mock-share-');
      expect(result.recipientEmail).toBe('sarah.connor@cyberdyne.io');

      const lastHist = mockPCloud.executionHistory[mockPCloud.executionHistory.length - 1];
      expect(lastHist.operation).toBe('sharefolder');
      expect(lastHist.recipientEmail).toBe('sarah.connor@cyberdyne.io');
    });

    it('should fail gracefully when invalid recipient is supplied', async () => {
      const result = await mockPCloud.shareFolder(
        {
          folderId: '0',
          fileId: 'mock-file-101',
          recipientEmail: 'invalid-email-address',
          message: 'Testing',
          pcloudAccountId: 'acc-1',
        },
        'mock_token'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(PCloudErrorCode.PCLOUD_INVALID_RECIPIENT);
    });
  });
});
