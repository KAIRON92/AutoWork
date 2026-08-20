import { PCloudAccountsService } from '../backend/src/pcloud/accounts/accounts.service';

describe('pCloud production authentication flow', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.PCLOUD_CREDENTIAL_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  // ── Helper: build a mock fetch that routes by URL pattern ────────────────
  function mockFetch(routes: Record<string, any>) {
    const calls: Array<{ url: string; body: string }> = [];
    const sortedEntries = Object.entries(routes).sort(([a], [b]) => b.length - a.length);
    global.fetch = jest.fn(async (input: any, init: any) => {
      const url = String(input);
      calls.push({ url, body: String(init?.body || '') });
      for (const [pattern, responder] of sortedEntries) {
        if (url.includes(pattern)) {
          const data = typeof responder === 'function' ? responder(url, init) : responder;
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
      return new Response(JSON.stringify({ result: 9999, error: 'unmatched route' }), { status: 200 });
    }) as any;
    return calls;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Password Login & 1022 Handling
  // ══════════════════════════════════════════════════════════════════════════

  it('uses the official /login endpoint for a password credential when supported', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    global.fetch = jest.fn(async (input: any, init: any) => {
      calls.push({ url: String(input), body: String(init?.body || '') });
      if (String(input).includes('/getapiserver')) {
        return new Response(JSON.stringify({ result: 0, api: ['api.pcloud.com'] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        result: 0,
        auth: 'test-auth-token',
        userid: 123,
        email: 'test@example.com',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }) as any;

    const service = new PCloudAccountsService({} as any);
    const result = await (service as any).loginWithPassword('test@example.com', 'test-password');

    expect(result.token).toBe('test-auth-token');
    expect(result.apiHost).toBe('https://api.pcloud.com');
    const loginCall = calls.find(c => c.url.includes('/login'));
    expect(loginCall).toBeDefined();
    expect(loginCall!.body).toContain('username=test%40example.com');
    expect(loginCall!.body).toContain('getauth=1');
  });

  describe('result 1022 — security policy requires access token', () => {
    it('stops host iteration on 1022 and does NOT fall through to EU', async () => {
      const calls = mockFetch({
        'api.pcloud.com/getapiserver': { result: 0, api: ['api.pcloud.com'] },
        'eapi.pcloud.com/getapiserver': { result: 0, api: ['eapi.pcloud.com'] },
        '/login': { result: 1022, error: "Please provide 'code'." },
      });

      const service = new PCloudAccountsService({} as any);

      await expect(
        (service as any).loginWithPassword('user@test.com', 'password123'),
      ).rejects.toThrow();

      // Must NOT have tried eapi.pcloud.com/login
      const loginCalls = calls.filter(c => c.url.includes('/login') && !c.url.includes('getapiserver'));
      const eapiLoginCalls = loginCalls.filter(c => c.url.includes('eapi.pcloud.com'));
      expect(eapiLoginCalls).toHaveLength(0);
    });

    it('throws PCLOUD_ACCESS_TOKEN_REQUIRED with clear message when 1022 occurs', async () => {
      mockFetch({
        'api.pcloud.com/getapiserver': { result: 0, api: ['api.pcloud.com'] },
        'eapi.pcloud.com/getapiserver': { result: 0, api: ['eapi.pcloud.com'] },
        '/login': { result: 1022, error: "Please provide 'code'." },
      });

      const service = new PCloudAccountsService({} as any);

      try {
        await (service as any).loginWithPassword('user@test.com', 'password123');
        expect(true).toBe(false); // Should have thrown
      } catch (err: any) {
        const response = err.getResponse ? err.getResponse() : err.response;
        expect(response).toBeDefined();
        expect(response.accessTokenRequired).toBe(true);
        expect(response.error).toBe('PCLOUD_ACCESS_TOKEN_REQUIRED');
        expect(response.message).toContain('access token');
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TFA & 2297 Handling
  // ══════════════════════════════════════════════════════════════════════════

  it('completes the documented TFA challenge with /tfa_login', async () => {
    const calls: Array<{ url: string; body: string }> = [];
    global.fetch = jest.fn(async (input: any, init: any) => {
      calls.push({ url: String(input), body: String(init?.body || '') });
      if (String(input).includes('/getapiserver')) {
        return new Response(JSON.stringify({ result: 0, api: ['api.pcloud.com'] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
      if (String(input).endsWith('/login')) {
        return new Response(JSON.stringify({ result: 2297, token: 'tfa-challenge-token' }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: 0, auth: 'final-auth-token', userid: 456 }), { status: 200 });
    }) as any;

    const service = new PCloudAccountsService({} as any);
    const result = await (service as any).loginWithPassword('test@example.com', 'test-password', '123456');

    expect(result.token).toBe('final-auth-token');
    expect(result.apiHost).toBe('https://api.pcloud.com');
    const tfaCall = calls.find(c => c.url.includes('/tfa_login'));
    expect(tfaCall).toBeDefined();
    expect(tfaCall!.body).toContain('token=tfa-challenge-token');
    expect(tfaCall!.body).toContain('code=123456');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2321 regional fallback
  // ══════════════════════════════════════════════════════════════════════════

  describe('result 2321 — regional fallback', () => {
    it('retries on the next host when 2321 is returned for genuine location mismatch', async () => {
      const calls = mockFetch({
        'api.pcloud.com/getapiserver': { result: 0, api: ['api.pcloud.com'] },
        'eapi.pcloud.com/getapiserver': { result: 0, api: ['eapi.pcloud.com'] },
        'api.pcloud.com/login': { result: 2321, error: 'This user is on another location.' },
        'eapi.pcloud.com/login': { result: 0, auth: 'eu-auth-token', userid: 999 },
      });

      const service = new PCloudAccountsService({} as any);
      const result = await (service as any).loginWithPassword('eu-user@test.com', 'password123');

      expect(result.token).toBe('eu-auth-token');
      expect(result.apiHost).toBe('https://eapi.pcloud.com');
      const loginCalls = calls.filter(c => c.url.includes('/login') && !c.url.includes('getapiserver'));
      expect(loginCalls.length).toBeGreaterThanOrEqual(2);
    });

    it('fails with last error when all hosts return 2321', async () => {
      mockFetch({
        'api.pcloud.com/getapiserver': { result: 0, api: ['api.pcloud.com'] },
        'eapi.pcloud.com/getapiserver': { result: 0, api: ['eapi.pcloud.com'] },
        '/login': { result: 2321, error: 'This user is on another location.' },
      });

      const service = new PCloudAccountsService({} as any);

      await expect(
        (service as any).loginWithPassword('nowhere@test.com', 'password123'),
      ).rejects.toThrow(/2321/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Discovery: queries both US and EU getapiserver
  // ══════════════════════════════════════════════════════════════════════════

  describe('discoverApiHosts', () => {
    it('queries both api.pcloud.com and eapi.pcloud.com', async () => {
      const calls = mockFetch({
        'api.pcloud.com/getapiserver': { result: 0, api: ['apitok2.pcloud.com'] },
        'eapi.pcloud.com/getapiserver': { result: 0, api: ['eapi.pcloud.com'] },
        '/login': { result: 0, auth: 'token', userid: 1 },
      });

      const service = new PCloudAccountsService({} as any);
      await (service as any).loginWithPassword('test@test.com', 'pass');

      const apiServerCalls = calls.filter(c => c.url.includes('/getapiserver'));
      expect(apiServerCalls.length).toBe(2);
      expect(apiServerCalls[0].url).toContain('api.pcloud.com');
      expect(apiServerCalls[1].url).toContain('eapi.pcloud.com');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Credential safety
  // ══════════════════════════════════════════════════════════════════════════

  describe('credential safety', () => {
    it('does not include passwords or tokens in console.warn messages', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockFetch({
        'api.pcloud.com/getapiserver': { result: 0, api: ['api.pcloud.com'] },
        'eapi.pcloud.com/getapiserver': { result: 0, api: ['eapi.pcloud.com'] },
        '/login': { result: 2000, error: 'Log in failed.' },
      });

      const service = new PCloudAccountsService({} as any);
      try {
        await (service as any).loginWithPassword('test@test.com', 'SuperSecret123!');
      } catch { /* expected */ }

      for (const call of warnSpy.mock.calls) {
        const msg = call.join(' ');
        expect(msg).not.toContain('SuperSecret123!');
      }
      warnSpy.mockRestore();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Direct Access Token Connection Path
  // ══════════════════════════════════════════════════════════════════════════

  describe('direct access token connection', () => {
    it('connects and marks account ACTIVE with valid US access token without calling /login', async () => {
      const calls = mockFetch({
        'api.pcloud.com/userinfo': {
          result: 0,
          userid: 55555,
          email: 'token-user@example.com',
          quota: 10737418240,
          usedquota: 5242880,
          emailverified: true,
          registered: '2026-01-01T00:00:00Z',
        },
      });

      let createdAccountData: any = null;
      const mockPrisma: any = {
        pCloudAccount: {
          create: jest.fn(async ({ data }: any) => {
            createdAccountData = data;
            return {
              id: 'acc-123',
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
        },
      };

      const service = new PCloudAccountsService(mockPrisma);
      const result = await service.create('org-1', {
        name: 'Production US Token Account',
        accountEmail: 'token-user@example.com',
        accessToken: 'valid-us-access-token-xyz',
      });

      // Confirm /userinfo was called with auth token
      const userinfoCall = calls.find(c => c.url.includes('/userinfo'));
      expect(userinfoCall).toBeDefined();
      expect(userinfoCall!.url).toContain('auth=valid-us-access-token-xyz');

      // Confirm /login was NEVER called
      const loginCall = calls.find(c => c.url.includes('/login'));
      expect(loginCall).toBeUndefined();

      // Confirm account state
      expect(createdAccountData.status).toBe('ACTIVE');
      expect(createdAccountData.apiHost).toBe('https://api.pcloud.com');
      expect(createdAccountData.pcloudUserId).toBe('55555');
      expect(createdAccountData.credentials).not.toBe('valid-us-access-token-xyz');
      expect(createdAccountData.credentials).toMatch(/^v1\./); // Encrypted format

      // Confirm returned safe object does not expose credentials
      expect((result as any).credentials).toBeUndefined();
      expect((result as any).hasCredentials).toBe(true);
    });

    it('auto-resolves EU regional host when access token is for EU region', async () => {
      mockFetch({
        'api.pcloud.com/userinfo': { result: 2321, error: 'This user is on another location.' },
        'eapi.pcloud.com/userinfo': {
          result: 0,
          userid: 77777,
          email: 'eu-user@example.com',
          quota: 21474836480,
          usedquota: 1048576,
          emailverified: true,
        },
      });

      let createdAccountData: any = null;
      const mockPrisma: any = {
        pCloudAccount: {
          create: jest.fn(async ({ data }: any) => {
            createdAccountData = data;
            return {
              id: 'acc-eu-456',
              ...data,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }),
        },
      };

      const service = new PCloudAccountsService(mockPrisma);
      await service.create('org-1', {
        name: 'Production EU Token Account',
        accountEmail: 'eu-user@example.com',
        accessToken: 'valid-eu-access-token-abc',
      });

      expect(createdAccountData.status).toBe('ACTIVE');
      expect(createdAccountData.apiHost).toBe('https://eapi.pcloud.com');
      expect(createdAccountData.pcloudUserId).toBe('77777');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // OAuth 2.0 Code Flow
  // ══════════════════════════════════════════════════════════════════════════

  describe('OAuth 2.0 Code Flow', () => {
    beforeEach(() => {
      process.env.PCLOUD_CLIENT_ID = 'test-client-id';
      process.env.PCLOUD_CLIENT_SECRET = 'test-client-secret';
      process.env.PCLOUD_REDIRECT_URI = 'http://localhost:3000/api/auth/pcloud/callback';
      process.env.JWT_SECRET = 'test-jwt-secret-key-12345';
    });

    it('generates a signed authorize URL with CSRF state protection', () => {
      const service = new PCloudAccountsService({} as any);
      const { url } = service.getOAuthAuthorizeUrl('org-test-123', 'user-456');

      expect(url).toContain('https://my.pcloud.com/oauth2/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fpcloud%2Fcallback');
      expect(url).toContain('state=');
    });

    it('rejects tampered OAuth state signatures in callback', async () => {
      const service = new PCloudAccountsService({} as any);
      const { url } = service.getOAuthAuthorizeUrl('org-test-123', 'user-456');
      const stateParam = new URL(url).searchParams.get('state')!;

      // Tamper with state signature
      const tamperedState = stateParam.slice(0, -4) + 'XXXX';

      await expect(
        service.handleOAuthCallback('valid-code', tamperedState),
      ).rejects.toThrow(/invalid pCloud OAuth state/i);
    });

    it('successfully completes code exchange at /oauth2_token and creates ACTIVE account', async () => {
      const calls = mockFetch({
        'api.pcloud.com/oauth2_token': {
          result: 0,
          access_token: 'exchanged-oauth-bearer-token',
          token_type: 'bearer',
          uid: 98765,
        },
        'api.pcloud.com/userinfo': {
          result: 0,
          userid: 98765,
          email: 'oauth-user@example.com',
          quota: 53687091200,
          usedquota: 10485760,
          emailverified: true,
        },
      });

      let savedAccountData: any = null;
      const mockPrisma: any = {
        pCloudAccount: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(async ({ data }: any) => {
            savedAccountData = data;
            return { id: 'acc-oauth-1', ...data, createdAt: new Date(), updatedAt: new Date() };
          }),
        },
      };

      const service = new PCloudAccountsService(mockPrisma);
      const { url } = service.getOAuthAuthorizeUrl('org-test-123', 'user-456');
      const validState = new URL(url).searchParams.get('state')!;

      const result = await service.handleOAuthCallback('test-auth-code-123', validState, '1', 'api.pcloud.com');

      // Check token exchange request
      const tokenCall = calls.find(c => c.url.includes('/oauth2_token'));
      expect(tokenCall).toBeDefined();
      expect(tokenCall!.body).toContain('client_id=test-client-id');
      expect(tokenCall!.body).toContain('client_secret=test-client-secret');
      expect(tokenCall!.body).toContain('code=test-auth-code-123');

      // Check account persistence
      expect(savedAccountData.status).toBe('ACTIVE');
      expect(savedAccountData.apiHost).toBe('https://api.pcloud.com');
      expect(savedAccountData.accountEmail).toBe('oauth-user@example.com');
      expect(savedAccountData.pcloudUserId).toBe('98765');
      expect(savedAccountData.credentials).toMatch(/^v1\./); // AES-256-GCM encrypted

      // Check return does not expose token
      expect((result as any).credentials).toBeUndefined();
      expect((result as any).hasCredentials).toBe(true);
    });

    it('handles locationid=2 by exchanging code on EU endpoint eapi.pcloud.com', async () => {
      const calls = mockFetch({
        'eapi.pcloud.com/oauth2_token': {
          result: 0,
          access_token: 'eu-oauth-bearer-token',
          token_type: 'bearer',
          uid: 11223,
        },
        'eapi.pcloud.com/userinfo': {
          result: 0,
          userid: 11223,
          email: 'eu-oauth-user@example.com',
          quota: 21474836480,
          usedquota: 512,
          emailverified: true,
        },
      });

      let savedAccountData: any = null;
      const mockPrisma: any = {
        pCloudAccount: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(async ({ data }: any) => {
            savedAccountData = data;
            return { id: 'acc-eu-oauth', ...data, createdAt: new Date(), updatedAt: new Date() };
          }),
        },
      };

      const service = new PCloudAccountsService(mockPrisma);
      const { url } = service.getOAuthAuthorizeUrl('org-test-123', 'user-456');
      const validState = new URL(url).searchParams.get('state')!;

      await service.handleOAuthCallback('test-auth-code-eu', validState, '2');

      const tokenCall = calls.find(c => c.url.includes('eapi.pcloud.com/oauth2_token'));
      expect(tokenCall).toBeDefined();
      expect(savedAccountData.apiHost).toBe('https://eapi.pcloud.com');
      expect(savedAccountData.status).toBe('ACTIVE');
    });
  });
});
