import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PCloudAdapterFactory } from '../pcloud.factory';
import { PCloudErrorCode } from '../pcloud.interface';

export interface CreatePCloudAccountDto {
  name: string;
  accountEmail: string;
  provider?: 'pcloud' | 'mock_pcloud';
  accessToken?: string;
  dailyLimit?: number;
  folderId?: string;
}

@Injectable()
export class PCloudAccountsService {
  constructor(private prisma: PrismaService) {}

  private sanitizeAccount(account: any) {
    if (!account) return null;
    const { credentials, ...safe } = account;
    return {
      ...safe,
      hasCredentials: !!credentials && credentials.length > 0,
    };
  }

  async findAll(organizationId: string) {
    const accounts = await this.prisma.pCloudAccount.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return accounts.map((a) => this.sanitizeAccount(a));
  }

  async findOne(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    return this.sanitizeAccount(account);
  }

  async getAccountCredentials(id: string, organizationId: string): Promise<string> {
    const account = await this.prisma.pCloudAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);
    return account.credentials;
  }

  async create(organizationId: string, dto: CreatePCloudAccountDto) {
    const provider = dto.provider || 'mock_pcloud';
    const token = dto.accessToken || 'mock_access_token';

    // Verify connection before saving
    const adapter = PCloudAdapterFactory.getAdapter(provider);
    const verifyResult = await adapter.verifyConnection(token);

    const account = await this.prisma.pCloudAccount.create({
      data: {
        organizationId,
        name: dto.name,
        accountEmail: dto.accountEmail,
        provider,
        status: verifyResult.connected ? 'ACTIVE' : 'ERROR',
        dailyLimit: dto.dailyLimit || 500,
        sentToday: 0,
        folderId: dto.folderId || '0',
        credentials: token,
        pcloudUserId: verifyResult.userInfo?.userId || undefined,
      },
    });

    return this.sanitizeAccount(account);
  }

  async testConnection(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);

    const adapter = PCloudAdapterFactory.getAdapter(account.provider);
    const result = await adapter.verifyConnection(account.credentials);

    await this.prisma.pCloudAccount.update({
      where: { id },
      data: {
        status: result.connected ? 'ACTIVE' : 'ERROR',
        lastUsedAt: new Date(),
      },
    });

    return result;
  }

  async toggleStatus(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);

    const newStatus = account.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updated = await this.prisma.pCloudAccount.update({
      where: { id },
      data: { status: newStatus },
    });

    return this.sanitizeAccount(updated);
  }

  async remove(id: string, organizationId: string) {
    const account = await this.prisma.pCloudAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException(`pCloud Account ${id} not found`);

    await this.prisma.pCloudAccount.delete({
      where: { id },
    });

    return { success: true, message: `Account ${id} removed successfully` };
  }
}
