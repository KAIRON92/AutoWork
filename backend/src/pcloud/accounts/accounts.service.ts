import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PCloudAdapterFactory } from '../pcloud.factory';
import { encryptPCloudCredential, decryptPCloudCredential } from '../pcloud-credentials';

export interface CreatePCloudAccountDto {
  name: string;
  accountEmail: string;
  provider?: 'pcloud' | 'mock_pcloud';
  accessToken?: string;
  otpCode?: string;
  dailyLimit?: number;
  folderId?: string;
}

interface PCloudLoginResult {
  token: string;
  userInfo: any;
  apiHost: string;
}

interface OAuthState {
  orgId: string;
  userId: string;
  nonce: string;
  exp: number;
}

@Injectable()
export class PCloudAccountsService {
  constructor(private prisma: PrismaService) {}

  private secret(): string {
    const value = process.env.JWT_SECRET || process.env.PCLOUD_CREDENTIAL_ENCRYPTION_KEY;
    if (!value) throw new Error('JWT_SECRET or PCLOUD_CREDENTIAL_ENCRYPTION_KEY is required for OAuth state signing');
    return value;
  }

  private encodeState(state: OAuthState): string {
    const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
    const sig = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    return `${payload}.${sig}`;
  }

  private decodeState(value: string): OAuthState {
    const [payload, sig] = (value || '').split('.');
    if (!payload || !sig) throw new BadRequestException('Invalid pCloud OAuth state');
    const expected = createHmac('sha256', this.secret()).update(payload).digest('base64url');
    if (sig.length !== expected.length || !Buffer.from(sig).equals(Buffer.from(expected))) {
      throw new BadRequestException('Invalid pCloud OAuth state signature');
    }
    const state = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OAuthState;
    if (state.exp < Date.now()) throw new BadRequestException('pCloud OAuth state expired');
    return state;
  }

  pCloudOAuthConfigured(): boolean {
    return Boolean(process.env.PCLOUD_CLIENT_ID && process.env.PCLOUD_CLIENT_SECRET && process.env.PCLOUD_REDIRECT_URI);
  }

  getOAuthAuthorizeUrl(organizationId: string, userId: string): { url: string } {
    if (!this.pCloudOAuthConfigured()) {
      throw new BadRequestException(
        'pCloud OAuth is not configured on the server. Set PCLOUD_CLIENT_ID, PCLOUD_CLIENT_SECRET, and PCLOUD_REDIRECT_URI in backend environment.'
      );
    }
    const state = this.encodeState({
      orgId: organizationId,
      userId,
      nonce: randomBytes(16).toString('hex'),
      exp: Date.now() + 10 * 60 * 1000,
    });
    const params = new URLSearchParams({
      client_id: process.env.PCLOUD_CLIENT_ID!.trim(),
      response_type: 'code',
      redirect_uri: process.env.PCLOUD_REDIRECT_URI!.trim(),
      state,
    });
    return { url: `https://my.pcloud.com/oauth2/authorize?${params.toString()}` };
  }

  async handleOAuthCallback(
    code: string,
    stateValue: string,
    locationid?: string,
    hostname?: string
  ): Promise<any> {
    if (!this.pCloudOAuthConfigured()) {
      throw new BadRequestException('pCloud OAuth is not configured on the server');
    }
    if (!code) throw new BadRequestException('Missing authorization code from pCloud');

    const state = this.decodeState(stateValue);
    const clientId = process.env.PCLOUD_CLIENT_ID!.trim();
    const clientSecret = process.env.PCLOUD_CLIENT_SECRET!.trim();

    // Determine target host for oauth2_token exchange
    let tokenHost = 'https://api.pcloud.com';
    if (hostname?.trim()) {
      const cleanHost = hostname.trim();
      tokenHost = cleanHost.startsWith('http') ? cleanHost : `https://${cleanHost}`;
    } else if (locationid === '2') {
      tokenHost = 'https://eapi.pcloud.com';
    }

    // Exchange authorization code for bearer token at /oauth2_token
    let tokenData: any;
    try {
      const tokenRes = await fetch(`${tokenHost}/oauth2_token`, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code.trim(),
        }).toString(),
      });
      tokenData = await tokenRes.json();
    } catch (err: any) {
      throw new BadRequestException(`Failed to connect to pCloud token server: ${err.message}`);
    }

    // If initial exchange failed with region mismatch (2321), retry on alternate host
    if (Number(tokenData?.result) === 2321) {
      const altHost = tokenHost.includes('eapi.pcloud.com') ? 'https://api.pcloud.com' : 'https://eapi.pcloud.com';
      try {
        const altRes = await fetch(`${altHost}/oauth2_token`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            code: code.trim(),
          }).toString(),
        });
        tokenData = await altRes.json();
        if (Number(tokenData?.result) === 0) {
          tokenHost = altHost;
        }
      } catch { /* proceed with initial tokenData */ }
    }

    if (Number(tokenData?.result) !== 0 || !tokenData?.access_token) {
      throw new BadRequestException(
        `pCloud token exchange failed (result ${String(tokenData?.result)}): ${String(tokenData?.error || 'unknown error')}`
      );
    }

    const accessToken = String(tokenData.access_token);
    const adapter = PCloudAdapterFactory.getAdapter('pcloud');
    const verifyResult = await adapter.verifyConnection(accessToken, tokenHost);

    if (!verifyResult.connected || !verifyResult.userInfo) {
      throw new BadRequestException(verifyResult.message || 'Unable to verify pCloud access token with /userinfo');
    }

    const resolvedApiHost = verifyResult.userInfo.resolvedApiHost || tokenHost;
    const accountEmail = verifyResult.userInfo.email.trim().toLowerCase();
    const credentials = encryptPCloudCredential(accessToken);

    // Look for existing account in this organization
    const existing = await this.prisma.pCloudAccount.findFirst({
      where: { organizationId: state.orgId, accountEmail },
    });

    const accountData = {
      organizationId: state.orgId,
      name: existing?.name || `pCloud (${accountEmail})`,
      accountEmail,
      provider: 'pcloud',
      status: 'ACTIVE' as const,
      dailyLimit: existing?.dailyLimit || 500,
      sentToday: existing?.sentToday || 0,
      folderId: existing?.folderId || '0',
      credentials,
      pcloudUserId: verifyResult.userInfo.userId || String(tokenData.uid || ''),
      apiHost: resolvedApiHost,
      lastUsedAt: new Date(),
    };

    const saved = existing
      ? await this.prisma.pCloudAccount.update({ where: { id: existing.id }, data: accountData })
      : await this.prisma.pCloudAccount.create({ data: accountData });

    return this.sanitizeAccount(saved);
  }

  private sanitizeAccount(account: any) {
    if (!account) return null;
    const { credentials, ...safe } = account;
    return { ...safe, hasCredentials: !!credentials && credentials.length > 0 };
  }

  /**
   * Discover pCloud's closest HTTP API servers. Queries BOTH the US
   * (api.pcloud.com) and EU (eapi.pcloud.com) getapiserver endpoints so that
   * accounts from either region are discovered on the first attempt.
   */
  private async discoverApiHosts(): Promise<string[]> {
    const fallback = ['https://api.pcloud.com', 'https://eapi.pcloud.com'];
    const discovered: string[] = [];

    for (const endpoint of [
      'https://api.pcloud.com/getapiserver',
      'https://eapi.pcloud.com/getapiserver',
    ]) {
      try {
        const response = await fetch(endpoint);
        const data = await response.json();
        if (Number(data.result) === 0 && Array.isArray(data.api)) {
          for (const host of data.api) {
            if (typeof host === 'string' && host.trim()) {
              const normalized = host.startsWith('http') ? host : `https://${host}`;
              if (!discovered.includes(normalized)) discovered.push(normalized);
            }
          }
        }
      } catch {
        /* continue to next endpoint */
      }
    }

    for (const fb of fallback) {
      if (!discovered.includes(fb)) discovered.push(fb);
    }
    return discovered;
  }

  /**
   * Authenticate a real pCloud account using pCloud's documented credential
   * login flow.
   *
   * Result 1022 ("Please provide 'code'") indicates pCloud requires an
   * additional verification code — either emailed to the account owner or
   * from an authenticator app.  When this result is returned by a host that
   * is the CORRECT region for this account, we STOP iterating and either
   * complete the login (if a code was supplied) or surface a verification-
   * required error to the frontend.
   *
   * Result 2297 triggers the older two-step TFA flow: /login returns a
   * challenge token, then /tfa_login exchanges that token + OTP for auth.
   *
   * Result 2321 (wrong region) causes a retry on the next candidate host.
   */
  private async loginWithPassword(username: string, password: string, otpCode?: string): Promise<PCloudLoginResult> {
    if (!username || !password) throw new BadRequestException('pCloud email and password are required');

    const hosts = await this.discoverApiHosts();
    let lastMessage = 'pCloud authentication failed';
    let lastResult: number | string | undefined;

    for (const apiHost of hosts) {
      const baseParams = new URLSearchParams({
        username,
        password,
        getauth: '1',
        logout: '1',
        authexpire: '31536000',
        authinactiveexpire: '2678400',
        device: 'AutoWork',
        deviceid: 'AutoWork',
        os: process.platform === 'win32' ? '5' : process.platform === 'darwin' ? '6' : process.platform === 'linux' ? '7' : '0',
      });

      // Include verification / 2FA code if the user provided one.
      if (otpCode?.trim()) {
        baseParams.set('code', otpCode.trim());
      }

      try {
        const loginResponse = await fetch(`${apiHost}/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: baseParams.toString(),
        });
        const loginData = await loginResponse.json();
        lastResult = loginData.result;

        if (loginData.result === 0 && loginData.auth) {
          return { token: String(loginData.auth), userInfo: loginData, apiHost };
        }

        /* ── Result 1022: pCloud security policy blocks password login ── */
        if (Number(loginData.result) === 1022) {
          // pCloud returns 1022 ("Please provide 'code'") when password-based
          // API authentication is blocked by account security policy for this
          // device/IP. This is NOT an email OTP or 2FA code — it is pCloud's
          // signal that the client must authenticate via access token instead.
          //
          // The correct region HAS been identified (this host accepted the
          // credentials check). Do NOT continue to the next host.
          throw new HttpException(
            {
              statusCode: HttpStatus.BAD_REQUEST,
              message:
                'pCloud has blocked password-based API login for this account. ' +
                'This is a pCloud security policy — not a wrong password. ' +
                'To connect this account, generate a pCloud access token from ' +
                'https://my.pcloud.com/ → Settings → Security → Manage API access tokens, ' +
                'then paste the token in the Access Token field and try again.',
              error: 'PCLOUD_ACCESS_TOKEN_REQUIRED',
              accessTokenRequired: true,
              detectedApiHost: apiHost,
            },
            HttpStatus.BAD_REQUEST,
          );
        }


        /* ── Result 2297: classic two-step TFA challenge ─────────────── */
        if (Number(loginData.result) === 2297) {
          const challengeToken = String(loginData.token || '');
          if (!challengeToken) {
            throw new BadRequestException('pCloud requires two-factor authentication, but no TFA challenge token was returned.');
          }
          if (!otpCode?.trim()) {
            throw new HttpException(
              {
                statusCode: HttpStatus.BAD_REQUEST,
                message:
                  'pCloud requires a two-factor authentication code. ' +
                  'Enter the current code from your authenticator app and try again.',
                error: 'PCLOUD_VERIFICATION_REQUIRED',
                verificationRequired: true,
              },
              HttpStatus.BAD_REQUEST,
            );
          }

          const tfaParams = new URLSearchParams({
            token: challengeToken,
            code: otpCode.trim(),
            getauth: '1',
            logout: '1',
            trustdevice: '1',
            device: 'AutoWork',
            deviceid: 'AutoWork',
            os: process.platform === 'win32' ? '5' : process.platform === 'darwin' ? '6' : process.platform === 'linux' ? '7' : '0',
          });
          const tfaResponse = await fetch(`${apiHost}/tfa_login`, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: tfaParams.toString(),
          });
          const tfaData = await tfaResponse.json();

          if (tfaData.result === 0 && tfaData.auth) {
            return { token: String(tfaData.auth), userInfo: tfaData, apiHost };
          }

          if ([2012, 2064].includes(Number(tfaData.result))) {
            throw new BadRequestException('The supplied pCloud two-factor authentication code was rejected or expired. Generate a fresh code and try again.');
          }

          throw new BadRequestException(`pCloud two-factor authentication failed (result ${String(tfaData.result)}): ${String(tfaData.error || 'unknown error')}`);
        }

        lastMessage = loginData.error || `pCloud authentication failed (${loginData.result})`;
        console.warn(`[pCloud Auth] ${apiHost}/login rejected request with result=${String(loginData.result)} message=${String(loginData.error || 'unknown error')}`);
      } catch (error: any) {
        if (error instanceof HttpException) throw error;
        lastMessage = error?.message || lastMessage;
        console.warn(`[pCloud Auth] ${apiHost}/login request failed: ${lastMessage}`);
      }
    }

    if (lastResult !== undefined) {
      throw new BadRequestException(`pCloud authentication failed (result ${String(lastResult)}): ${lastMessage}`);
    }
    throw new BadRequestException(lastMessage);
  }

  async findAll(organizationId: string) {
    const accounts = await this.prisma.pCloudAccount.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
    return accounts.map((a) => this.sanitizeAccount(a));
  }

  async findOne(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    return this.sanitizeAccount(account);
  }

  async getAccountCredentials(id: string, organizationId: string): Promise<{ credential: string; apiHost: string | null }> {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    if (account.provider === 'mock_pcloud') {
      if (process.env.PCLOUD_ALLOW_MOCK !== 'true') {
        throw new BadRequestException('Mock pCloud accounts are disabled.');
      }
      return { credential: account.credentials, apiHost: account.apiHost };
    }
    return { credential: decryptPCloudCredential(account.credentials), apiHost: account.apiHost };
  }

  async create(organizationId: string, dto: CreatePCloudAccountDto) {
    const provider = dto.provider || process.env.PCLOUD_DEFAULT_PROVIDER || 'pcloud';
    if (provider === 'mock_pcloud' && process.env.PCLOUD_ALLOW_MOCK !== 'true') {
      throw new BadRequestException('Mock pCloud accounts are disabled. Select the Official pCloud REST API (Production) provider.');
    }
    if (provider !== 'pcloud' && provider !== 'mock_pcloud') {
      throw new BadRequestException(`Unsupported pCloud provider: ${provider}`);
    }

    const accountEmail = dto.accountEmail.trim().toLowerCase();
    const rawCredential = dto.accessToken?.trim();

    if (provider === 'mock_pcloud') {
      const credential = rawCredential || 'mock_access_token';
      const adapter = PCloudAdapterFactory.getAdapter(provider);
      const verifyResult = await adapter.verifyConnection(credential);
      const account = await this.prisma.pCloudAccount.create({
        data: {
          organizationId,
          name: dto.name,
          accountEmail,
          provider,
          status: verifyResult.connected ? 'ACTIVE' : 'ERROR',
          dailyLimit: dto.dailyLimit || 500,
          sentToday: 0,
          folderId: dto.folderId || '0',
          credentials: credential,
          pcloudUserId: verifyResult.userInfo?.userId || undefined,
          lastUsedAt: verifyResult.connected ? new Date() : undefined,
        },
      });
      return this.sanitizeAccount(account);
    }

    if (!rawCredential) throw new BadRequestException('Provide a pCloud access token or the pCloud account password');

    const adapter = PCloudAdapterFactory.getAdapter('pcloud');
    let credentialForStorage = rawCredential;
    let verifyResult = await adapter.verifyConnection(rawCredential);
    let apiHost = verifyResult.userInfo?.resolvedApiHost || 'https://api.pcloud.com';

    if (!verifyResult.connected) {
      const login = await this.loginWithPassword(accountEmail, rawCredential, dto.otpCode);
      credentialForStorage = login.token;
      apiHost = login.apiHost;
      verifyResult = await adapter.verifyConnection(login.token, apiHost);
      if (verifyResult.userInfo?.resolvedApiHost) {
        apiHost = verifyResult.userInfo.resolvedApiHost;
      }
    }

    if (!verifyResult.connected) throw new BadRequestException(verifyResult.message || 'Unable to verify pCloud credentials');

    const credentials = encryptPCloudCredential(credentialForStorage);
    const account = await this.prisma.pCloudAccount.create({
      data: {
        organizationId,
        name: dto.name,
        accountEmail,
        provider: 'pcloud',
        status: 'ACTIVE',
        dailyLimit: dto.dailyLimit || 500,
        sentToday: 0,
        folderId: dto.folderId || '0',
        credentials,
        pcloudUserId: verifyResult.userInfo?.userId || undefined,
        apiHost,
        lastUsedAt: new Date(),
      },
    });
    return this.sanitizeAccount(account);
  }

  async testConnection(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    if (account.provider === 'mock_pcloud' && process.env.PCLOUD_ALLOW_MOCK !== 'true') {
      throw new BadRequestException('This account uses the disabled mock provider. Disconnect it and add the account using Official pCloud REST API (Production).');
    }

    const credential = account.provider === 'mock_pcloud' ? account.credentials : decryptPCloudCredential(account.credentials);
    const adapter = PCloudAdapterFactory.getAdapter(account.provider);
    const result = await adapter.verifyConnection(credential, account.apiHost || undefined);
    const updatedApiHost = result.userInfo?.resolvedApiHost || account.apiHost;
    await this.prisma.pCloudAccount.update({
      where: { id },
      data: {
        status: result.connected ? 'ACTIVE' : 'ERROR',
        apiHost: updatedApiHost,
        lastUsedAt: result.connected ? new Date() : account.lastUsedAt,
      },
    });
    return result;
  }

  async toggleStatus(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    const newStatus = account.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await this.prisma.pCloudAccount.update({ where: { id }, data: { status: newStatus } });
    return this.sanitizeAccount(updated);
  }

  async remove(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    await this.prisma.pCloudAccount.delete({ where: { id } });
    return { success: true, message: `Account ${id} removed successfully` };
  }
}
