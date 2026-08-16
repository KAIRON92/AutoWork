import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class PCloudAccountsService {
  constructor(private prisma: PrismaService) {}

  private sanitizeAccount(account: any) {
    if (!account) return null;
    const { credentials, ...safe } = account;
    return { ...safe, hasCredentials: !!credentials && credentials.length > 0 };
  }

  /**
   * Discover pCloud's closest HTTP API server. pCloud documents this endpoint
   * as unauthenticated and recommends fallback to api.pcloud.com when needed.
   */
  private async discoverApiHosts(): Promise<string[]> {
    const fallback = ['https://api.pcloud.com', 'https://eapi.pcloud.com'];
    try {
      const response = await fetch('https://api.pcloud.com/getapiserver');
      const data = await response.json();
      if (Number(data.result) !== 0 || !Array.isArray(data.api)) return fallback;
      const discovered = data.api
        .filter((host: any) => typeof host === 'string' && host.trim())
        .map((host: string) => host.startsWith('http') ? host : `https://${host}`);
      return [...new Set([...discovered, ...fallback])];
    } catch {
      return fallback;
    }
  }

  /**
   * Authenticate a real pCloud account using pCloud's documented credential
   * login flow. TFA is a second API call: /login returns a challenge token
   * (result 2297), then /tfa_login exchanges that challenge plus the one-time
   * code for the normal auth token.
   *
   * We intentionally do not treat result 1022 as a TFA-login signal. pCloud's
   * public API documents 1022 as a generic code-required error used by several
   * non-login methods; the dedicated login/TFA flow exposes 2297.
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

        if (Number(loginData.result) === 2297) {
          const challengeToken = String(loginData.token || '');
          if (!challengeToken) {
            throw new BadRequestException('pCloud requires two-factor authentication, but no TFA challenge token was returned.');
          }
          if (!otpCode?.trim()) {
            throw new BadRequestException('pCloud requires a two-factor authentication code. Enter the current pCloud verification code and try again.');
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
        if (error instanceof BadRequestException) throw error;
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

  async getAccountCredentials(id: string, organizationId: string): Promise<string> {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    if (account.provider === 'mock_pcloud') {
      if (process.env.PCLOUD_ALLOW_MOCK !== 'true') {
        throw new BadRequestException('Mock pCloud accounts are disabled.');
      }
      return account.credentials;
    }
    return decryptPCloudCredential(account.credentials);
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
    let apiHost = 'https://api.pcloud.com';

    if (!verifyResult.connected) {
      const login = await this.loginWithPassword(accountEmail, rawCredential, dto.otpCode);
      credentialForStorage = login.token;
      apiHost = login.apiHost;
      verifyResult = await adapter.verifyConnection(login.token, apiHost);
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
    await this.prisma.pCloudAccount.update({
      where: { id },
      data: { status: result.connected ? 'ACTIVE' : 'ERROR', lastUsedAt: result.connected ? new Date() : account.lastUsedAt },
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
