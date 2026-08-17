import { PCloudAccountsService } from '../backend/src/pcloud/accounts/accounts.service';

describe('pCloud production authentication flow', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('uses the official /login endpoint for a password credential', async () => {
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
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.pcloud.com/getapiserver',
      'https://api.pcloud.com/login',
    ]);
    expect(calls[1].body).toContain('username=test%40example.com');
    expect(calls[1].body).toContain('getauth=1');
  });

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
    expect(calls.map((call) => call.url)).toEqual([
      'https://api.pcloud.com/getapiserver',
      'https://api.pcloud.com/login',
      'https://api.pcloud.com/tfa_login',
    ]);
    expect(calls[2].body).toContain('token=tfa-challenge-token');
    expect(calls[2].body).toContain('code=123456');
  });

  it('fails clearly when TFA is required but no code is supplied', async () => {
    global.fetch = jest.fn(async (input: any) => {
      if (String(input).includes('/getapiserver')) {
        return new Response(JSON.stringify({ result: 0, api: ['api.pcloud.com'] }), { status: 200 });
      }
      return new Response(JSON.stringify({ result: 2297, token: 'tfa-challenge-token' }), { status: 200 });
    }) as any;

    const service = new PCloudAccountsService({} as any);

    await expect(
      (service as any).loginWithPassword('test@example.com', 'test-password'),
    ).rejects.toThrow(/two-factor authentication code/i);
  });
});
