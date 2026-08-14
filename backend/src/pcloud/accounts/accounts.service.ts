import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PCloudAdapterFactory } from '../pcloud.factory';
import { encryptPCloudCredential, decryptPCloudCredential } from '../pcloud-credentials';

export interface CreatePCloudAccountDto {
  name: string;
  accountEmail: string;
  provider?: 'pcloud' | 'mock_pcloud';
  accessToken?: string;
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

  private async loginWithPassword(username: string, password: string): Promise<PCloudLoginResult> {
    if (!username || !password) throw new BadRequestException('pCloud email and password are required');
    const hosts = ['https://api.pcloud.com', 'https://eapi.pcloud.com'];
    let lastMessage = 'pCloud authentication failed';

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
      try {
        const response = await fetch(`${apiHost}/userinfo?${params.toString()}`);
        const data = await response.json();
        if (data.result === 0 && data.auth) return { token: String(data.auth), userInfo: data, apiHost };
        lastMessage = data.error || `pCloud authentication failed (${data.result})`;
      } catch (error: any) {
        lastMessage = error?.message || lastMessage;
      }
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
    return account.provider === 'mock_pcloud' ? account.credentials : decryptPCloudCredential(account.credentials);
  }

  async create(organizationId: string, dto: CreatePCloudAccountDto) {
    const provider = dto.provider || 'mock_pcloud';
    const rawCredential = dto.accessToken?.trim();

    if (provider === 'mock_pcloud') {
      const credential = rawCredential || 'mock_access_token';
      const adapter = PCloudAdapterFactory.getAdapter(provider);
      const verifyResult = await adapter.verifyConnection(credential);
      const account = await this.prisma.pCloudAccount.create({
        data: { organizationId, name: dto.name, accountEmail: dto.accountEmail, provider, status: verifyResult.connected ? 'ACTIVE' : 'ERROR', dailyLimit: dto.dailyLimit || 500, sentToday: 0, folderId: dto.folderId || '0', credentials: credential, pcloudUserId: verifyResult.userInfo?.userId || undefined },
      });
      return this.sanitizeAccount(account);
    }

    if (!rawCredential) throw new BadRequestException('Provide a pCloud access token or the pCloud account password');

    const adapter = PCloudAdapterFactory.getAdapter(provider);
    let credentialForStorage = rawCredential;
    let verifyResult = await adapter.verifyConnection(rawCredential);
    let apiHost = 'https://api.pcloud.com';

    if (!verifyResult.connected) {
      const login = await this.loginWithPassword(dto.accountEmail, rawCredential);
      credentialForStorage = login.token;
      apiHost = login.apiHost;
      verifyResult = await adapter.verifyConnection(login.token, apiHost);
    }

    const credentials = encryptPCloudCredential(credentialForStorage);
    const account = await this.prisma.pCloudAccount.create({
      data: { organizationId, name: dto.name, accountEmail: dto.accountEmail, provider, status: verifyResult.connected ? 'ACTIVE' : 'ERROR', dailyLimit: dto.dailyLimit || 500, sentToday: 0, folderId: dto.folderId || '0', credentials, pcloudUserId: verifyResult.userInfo?.userId || undefined, apiHost },
    });
    return this.sanitizeAccount(account);
  }

  async testConnection(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({ where: { id, organizationId } });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    const credential = account.provider === 'mock_pcloud' ? account.credentials : decryptPCloudCredential(account.credentials);
    const adapter = PCloudAdapterFactory.getAdapter(account.provider);
    const result = await adapter.verifyConnection(credential, account.apiHost || undefined);
    await this.prisma.pCloudAccount.update({ where: { id }, data: { status: result.connected ? 'ACTIVE' : 'ERROR', lastUsedAt: new Date() } });
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
