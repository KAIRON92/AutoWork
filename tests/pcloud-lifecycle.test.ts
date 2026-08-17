import { PCloudClient } from '../backend/src/pcloud/pcloud-client/pcloud.client';
import { PCloudAdapterFactory } from '../backend/src/pcloud/pcloud.factory';
import { PCloudErrorMapper } from '../backend/src/pcloud/pcloud-client/pcloud.errors';
import { PCloudErrorCode } from '../backend/src/pcloud/pcloud.interface';
import { PCloudAccountsService } from '../backend/src/pcloud/accounts/accounts.service';
import { PCloudFilesService } from '../backend/src/pcloud/files/files.service';
import { encryptPCloudCredential } from '../backend/src/pcloud/pcloud-credentials';

describe('Phase 2 — pCloud Complete Lifecycle & Regional Recovery Suite', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.PCLOUD_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('1. Regional API Discovery & Auto-Recovery (Result 2321)', () => {
    it('automatically recovers on 2321 for getUserInfo and hits alternate regional host', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/userinfo')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Log in from the correct region server.' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/userinfo')) {
          return new Response(JSON.stringify({
            result: 0,
            userid: 98765,
            email: 'eu-user@example.com',
            quota: 2000000,
            usedquota: 500000,
            emailverified: true,
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const user = await client.getUserInfo('mock-token');

      expect(calls).toEqual([
        'https://api.pcloud.com/userinfo?auth=mock-token',
        'https://eapi.pcloud.com/userinfo?auth=mock-token',
      ]);
      expect(user.userId).toBe('98765');
      expect(user.email).toBe('eu-user@example.com');
    });

    it('automatically recovers on 2321 for listFolder (nested folder traversal)', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/listfolder')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Log in from the correct region server.' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/listfolder')) {
          return new Response(JSON.stringify({
            result: 0,
            metadata: {
              folderid: 4567,
              name: 'SubFolder',
              contents: [
                { fileid: 111, name: 'doc1.pdf', isfolder: false, size: 1024, contenttype: 'application/pdf' },
                { folderid: 222, name: 'child-folder', isfolder: true, size: 0 },
              ],
            },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const items = await client.listFolder('4567', 'mock-token');

      expect(calls).toEqual([
        'https://api.pcloud.com/listfolder?auth=mock-token&folderid=4567',
        'https://eapi.pcloud.com/listfolder?auth=mock-token&folderid=4567',
      ]);
      expect(items).toHaveLength(2);
      expect(items[0].fileId).toBe('111');
      expect(items[0].isFolder).toBe(false);
      expect(items[1].folderId).toBe('222');
      expect(items[1].isFolder).toBe(true);
    });

    it('automatically recovers on 2321 for stat / getFileMetadata', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/stat')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Log in from the correct region server.' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/stat')) {
          return new Response(JSON.stringify({
            result: 0,
            metadata: {
              fileid: 8888,
              name: 'verified.pdf',
              isfolder: false,
              size: 5000,
              contenttype: 'application/pdf',
              path: '/verified.pdf',
            },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const meta = await client.getFileMetadata('8888', 'mock-token');

      expect(calls).toEqual([
        'https://api.pcloud.com/stat?auth=mock-token&fileid=8888',
        'https://eapi.pcloud.com/stat?auth=mock-token&fileid=8888',
      ]);
      expect(meta.fileId).toBe('8888');
      expect(meta.name).toBe('verified.pdf');
    });

    it('automatically recovers on 2321 for uploadFile', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/uploadfile')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Wrong region' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/uploadfile')) {
          return new Response(JSON.stringify({
            result: 0,
            metadata: [{
              fileid: 9999,
              name: 'upload.pdf',
              isfolder: false,
              size: 100,
              path: '/upload.pdf',
            }],
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const uploaded = await client.uploadFile('upload.pdf', Buffer.from('test-content'), 'application/pdf', '0', 'mock-token');

      expect(calls).toHaveLength(2);
      expect(uploaded.fileId).toBe('9999');
      expect(uploaded.name).toBe('upload.pdf');
    });

    it('automatically recovers on 2321 for deleteFile', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/deletefile')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Wrong region' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/deletefile')) {
          return new Response(JSON.stringify({ result: 0, deletedfiles: 1 }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const deleted = await client.deleteFile('1234', 'mock-token');

      expect(calls).toEqual([
        'https://api.pcloud.com/deletefile?auth=mock-token&fileid=1234',
        'https://eapi.pcloud.com/deletefile?auth=mock-token&fileid=1234',
      ]);
      expect(deleted).toBe(true);
    });
    it('automatically recovers on 2321 for shareFolder', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/sharefolder')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Wrong region' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/sharefolder')) {
          return new Response(JSON.stringify({ result: 0, shareid: 77777 }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const result = await client.shareFolder({
        folderId: '4567',
        recipientEmail: 'client@example.com',
        message: 'Folder access',
      }, 'mock-token');

      expect(calls).toEqual([
        'https://api.pcloud.com/sharefolder?auth=mock-token&folderid=4567&mail=client%40example.com&permissions=0&message=Folder%20access',
        'https://eapi.pcloud.com/sharefolder?auth=mock-token&folderid=4567&mail=client%40example.com&permissions=0&message=Folder%20access',
      ]);
      expect(result.success).toBe(true);
      expect(result.pcloudReferenceId).toBe('77777');
    });

    it('automatically recovers on 2321 for uploadTransfer', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        calls.push(url);
        if (url.startsWith('https://api.pcloud.com/stat')) {
          return new Response(JSON.stringify({ result: 0, metadata: { fileid: 333, name: 'doc.pdf', isfolder: false, size: 100, contenttype: 'application/pdf' } }), { status: 200 });
        }
        if (url.startsWith('https://api.pcloud.com/getfilelink')) {
          return new Response(JSON.stringify({ result: 0, hosts: ['cdn.pcloud.com'], path: '/doc.pdf' }), { status: 200 });
        }
        if (url.includes('cdn.pcloud.com/doc.pdf')) {
          return new Response(Buffer.from('dummy-pdf'), { status: 200 });
        }
        if (url.startsWith('https://api.pcloud.com/uploadtransfer')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Wrong region' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/uploadtransfer')) {
          return new Response(JSON.stringify({ result: 0, progresshash: 'progress-hash-123' }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      const result = await client.uploadTransfer({
        fileId: '333',
        senderEmail: 'sender@example.com',
        recipientEmails: ['recipient@example.com'],
        message: 'File Transfer',
      }, 'mock-token');

      expect(result.success).toBe(true);
      expect(result.pcloudReferenceId).toBe('progress-hash-123');
    });
  });

  describe('2. Mutation Safety & Ambiguous Response Protection', () => {
    it('does NOT retry on network failure/timeout to prevent duplicate side effects', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        calls.push(String(input));
        throw new Error('ETIMEDOUT: Connection timed out');
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      await expect(
        client.uploadFile('test.pdf', Buffer.from('data'), 'application/pdf', '0', 'mock-token'),
      ).rejects.toMatchObject({
        code: PCloudErrorCode.PCLOUD_TEMPORARY_ERROR,
        isTransient: true,
      });

      // Exactly 1 call was attempted — no blind retry on network error
      expect(calls).toHaveLength(1);
    });

    it('does NOT retry on non-2321 API error codes (e.g. 4000 rate limit, 2005 not found)', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ result: 4000, error: 'Rate limit exceeded' }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      await expect(
        client.getFileMetadata('999', 'mock-token'),
      ).rejects.toMatchObject({
        code: PCloudErrorCode.PCLOUD_RATE_LIMITED,
        isTransient: true,
      });

      // Exactly 1 call was attempted
      expect(calls).toHaveLength(1);
    });

    it('retries exactly once on 2321 and does not loop indefinitely if both regions reject', async () => {
      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ result: 2321, error: 'Log in from the correct region server.' }), { status: 200 });
      }) as any;

      const client = new PCloudClient('https://api.pcloud.com');
      await expect(
        client.getUserInfo('mock-token'),
      ).rejects.toMatchObject({
        code: PCloudErrorCode.PCLOUD_WRONG_REGION,
        isTransient: true,
      });

      // Exactly 2 calls: primary host then alternate host, then terminates cleanly
      expect(calls).toEqual([
        'https://api.pcloud.com/userinfo?auth=mock-token',
        'https://eapi.pcloud.com/userinfo?auth=mock-token',
      ]);
    });
  });

  describe('3. Real vs Mock Provider Isolation', () => {
    it('strictly forbids mock provider when PCLOUD_ALLOW_MOCK is false', () => {
      process.env.PCLOUD_ALLOW_MOCK = 'false';
      expect(() => PCloudAdapterFactory.getAdapter('mock_pcloud')).toThrow(/Mock pCloud provider is disabled/i);
    });

    it('strictly rejects unknown provider names', () => {
      expect(() => PCloudAdapterFactory.getAdapter('dropbox' as any)).toThrow(/Unsupported pCloud provider/i);
    });

    it('returns real adapter for production pcloud provider', () => {
      const adapter = PCloudAdapterFactory.getAdapter('pcloud');
      expect(adapter.providerName).toBe('pcloud');
    });
  });

  describe('4. apiHost Propagation and Self-Healing Persistence', () => {
    it('returns both credential and persisted apiHost from getAccountCredentials', async () => {
      const encrypted = encryptPCloudCredential('real-secret-token');
      const mockPrisma = {
        pCloudAccount: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'acc-eu-1',
            organizationId: 'org-1',
            provider: 'pcloud',
            credentials: encrypted,
            apiHost: 'https://eapi.pcloud.com',
          }),
        },
      };

      const accountsService = new PCloudAccountsService(mockPrisma as any);
      const result = await accountsService.getAccountCredentials('acc-eu-1', 'org-1');

      expect(result.credential).toBe('real-secret-token');
      expect(result.apiHost).toBe('https://eapi.pcloud.com');
    });

    it('passes persisted apiHost to listFolder in PCloudFilesService', async () => {
      const encrypted = encryptPCloudCredential('real-secret-token');
      const mockPrisma = {
        pCloudAccount: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'acc-eu-1',
            organizationId: 'org-1',
            provider: 'pcloud',
            status: 'ACTIVE',
            credentials: encrypted,
            apiHost: 'https://eapi.pcloud.com',
          }),
        },
      };

      const accountsService = new PCloudAccountsService(mockPrisma as any);
      const filesService = new PCloudFilesService(mockPrisma as any, accountsService);

      const calls: string[] = [];
      global.fetch = jest.fn(async (input: any) => {
        calls.push(String(input));
        return new Response(JSON.stringify({
          result: 0,
          metadata: { folderid: 0, contents: [] },
        }), { status: 200 });
      }) as any;

      await filesService.listFolder('org-1', 'acc-eu-1', '0');

      expect(calls).toHaveLength(1);
      expect(calls[0]).toContain('https://eapi.pcloud.com/listfolder');
    });

    it('persists discovered apiHost back to account record during testConnection', async () => {
      const encrypted = encryptPCloudCredential('real-secret-token');
      const updateMock = jest.fn().mockResolvedValue({ id: 'acc-1' });
      const mockPrisma = {
        pCloudAccount: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'acc-1',
            organizationId: 'org-1',
            provider: 'pcloud',
            credentials: encrypted,
            apiHost: 'https://api.pcloud.com', // Stale US host
          }),
          update: updateMock,
        },
      };

      // Mock pCloud getUserInfo returning 2321 on US then 0 on EU
      global.fetch = jest.fn(async (input: any) => {
        const url = String(input);
        if (url.startsWith('https://api.pcloud.com/userinfo')) {
          return new Response(JSON.stringify({ result: 2321, error: 'Wrong region' }), { status: 200 });
        }
        if (url.startsWith('https://eapi.pcloud.com/userinfo')) {
          return new Response(JSON.stringify({
            result: 0,
            userid: 9999,
            email: 'eu-user@example.com',
            quota: 10000,
            usedquota: 1000,
            emailverified: true,
          }), { status: 200 });
        }
        return new Response(JSON.stringify({ result: 1000 }), { status: 200 });
      }) as any;

      const accountsService = new PCloudAccountsService(mockPrisma as any);
      const testResult = await accountsService.testConnection('acc-1', 'org-1');

      expect(testResult.connected).toBe(true);
      expect(testResult.userInfo?.resolvedApiHost).toBe('https://eapi.pcloud.com');

      // Verify Prisma update persisted the newly discovered EU apiHost
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: expect.objectContaining({
          status: 'ACTIVE',
          apiHost: 'https://eapi.pcloud.com',
        }),
      });
    });
  });
});
