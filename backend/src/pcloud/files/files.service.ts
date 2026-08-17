import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PCloudAdapterFactory } from '../pcloud.factory';
import { PCloudAccountsService } from '../accounts/accounts.service';
import { PCloudItemMetadata } from '../pcloud.interface';

@Injectable()
export class PCloudFilesService {
  constructor(
    private prisma: PrismaService,
    private accountsService: PCloudAccountsService,
  ) {}

  private async resolveAccount(organizationId: string, accountId?: string) {
    const account = accountId
      ? await this.prisma.pCloudAccount.findFirst({ where: { id: accountId, organizationId } })
      : await this.prisma.pCloudAccount.findFirst({ where: { organizationId, status: 'ACTIVE' }, orderBy: { createdAt: 'asc' } });

    if (!account) {
      throw new BadRequestException('Connect an active pCloud account before browsing or uploading files.');
    }
    if (account.status !== 'ACTIVE') {
      throw new BadRequestException('The selected pCloud account is not active.');
    }
    return account;
  }

  async listFolder(organizationId: string, accountId?: string, folderId: string = '0') {
    const account = await this.resolveAccount(organizationId, accountId);
    const { credential: token, apiHost } = await this.accountsService.getAccountCredentials(account.id, organizationId);
    const adapter = PCloudAdapterFactory.getAdapter(account.provider);
    return await adapter.listContents(folderId, token, apiHost || undefined);
  }

  async findAllStoredFiles(organizationId: string) {
    return await this.prisma.pCloudFile.findMany({
      where: { organizationId },
      include: { pcloudAccount: { select: { id: true, name: true, accountEmail: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneStoredFile(id: string, organizationId: string) {
    const file = await this.prisma.pCloudFile.findFirst({
      where: { id, organizationId },
      include: { pcloudAccount: true },
    });
    if (!file) throw new NotFoundException(`pCloud file ${id} not found`);
    return file;
  }

  async uploadAndRegister(
    organizationId: string,
    file: { originalname: string; buffer: Buffer; mimetype: string; size: number },
    accountId?: string,
    folderId: string = '0',
  ) {
    const account = await this.resolveAccount(organizationId, accountId);
    const { credential: token, apiHost } = await this.accountsService.getAccountCredentials(account.id, organizationId);
    const adapter = PCloudAdapterFactory.getAdapter(account.provider);

    const uploadedMeta: PCloudItemMetadata = await adapter.uploadFile({
      filename: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      folderId,
      accessToken: token,
      apiHost: apiHost || undefined,
    });

    return this.prisma.pCloudFile.create({
      data: {
        organizationId,
        pcloudAccountId: account.id,
        name: uploadedMeta.name,
        fileId: uploadedMeta.fileId || `pcloud-file-${Date.now()}`,
        folderId: uploadedMeta.folderId || folderId,
        fileSize: uploadedMeta.size || file.size,
        mimeType: uploadedMeta.mimeType || file.mimetype,
        pcloudPath: uploadedMeta.path,
        metadata: JSON.stringify(uploadedMeta.metadata || {}),
      },
    });
  }

  async registerExistingPCloudFile(
    organizationId: string,
    dto: { name: string; fileId: string; folderId?: string; fileSize?: number; mimeType?: string; pcloudAccountId?: string; pcloudPath?: string },
  ) {
    if (!dto.pcloudAccountId) {
      throw new BadRequestException('pcloudAccountId is required when registering an existing pCloud file.');
    }

    const account = await this.prisma.pCloudAccount.findFirst({
      where: { id: dto.pcloudAccountId, organizationId },
    });
    if (!account) throw new BadRequestException('The selected pCloud account does not belong to your organization.');

    return this.prisma.pCloudFile.create({
      data: {
        organizationId,
        pcloudAccountId: account.id,
        name: dto.name,
        fileId: dto.fileId,
        folderId: dto.folderId || '0',
        fileSize: dto.fileSize || 0,
        mimeType: dto.mimeType || 'application/octet-stream',
        pcloudPath: dto.pcloudPath || `/${dto.name}`,
        metadata: JSON.stringify({ registered: true }),
      },
    });
  }

  async removeStoredFile(id: string, organizationId: string) {
    const file = await this.prisma.pCloudFile.findFirst({ where: { id, organizationId } });
    if (!file) throw new NotFoundException(`pCloud file ${id} not found`);

    await this.prisma.pCloudFile.delete({ where: { id } });
    return { success: true, message: `File reference ${id} removed` };
  }
}
