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

  private async loginWithPassword(username: string, password: string, otpCode?: string): Promise<PCloudLoginResult> {
    if (!username || !password) throw new BadRequestException('pCloud email and password are required');
    const hosts = ['https://api.pcloud.com', 'https://eapi.pcloud.com'];
    let lastMessage = 'pCloud authentication failed';
    let lastResult: number | string | undefined;
    let tfaRequired = false;

    for (const apiHost of hosts) {
      const params = new URLSearchParams({
        username,
        password,
        getauth: '1',
        logout: '1',
        authexpire: '31536000',
        authinactiveexpire: '2678400',
        device: 'AutoWork',
      });
      if (otpCode?.trim()) params.set('code', otpCode.trim());

      try {
        const response = await fetch(`${apiHost}/userinfo`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });
        const data = await response.json();
        lastResult = data.result;

        if (data.result === 0 && data.auth) {
          return { token: String(data.auth), userInfo: data, apiHost };
        }

        lastMessage = data.error || `pCloud authentication failed (${data.result})`;
        // pCloud can require a TFA code for password login. Some API surfaces
        // report this as 2297/2012 and affected flows have also returned 1022.
        if ([2297, 2012, 1022].includes(Number(data.result))) tfaRequired = true;
        console.warn(`[pCloud Auth] ${apiHost} rejected request with result=${String(data.result)} message=${String(data.error || 'unknown error')}`);
      } catch (error: any) {
        lastMessage = error?.message || lastMessage;
        console.warn(`[pCloud Auth] ${apiHost} request failed: ${lastMessage}`);
      }
    }

    if (tfaRequired && !otpCode?.trim()) {
      throw new BadRequestException('pCloud requires a two-factor authentication code. Enter the current pCloud verification code and try again.');
    }
    if (tfaRequired && otpCode?.trim()) {
      throw new BadRequestException('The supplied pCloud two-factor authentication code was rejected or expired. Generate a fresh code and try again.');
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
