import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PCloudAdapterFactory } from '../pcloud.factory';
import { PCloudAccountsService } from '../accounts/accounts.service';
import { PCloudItemMetadata } from '../pcloud.interface';

@Injectable()
export class PCloudFilesService {
  constructor(
    private prisma: PrismaService,
    private accountsService: PCloudAccountsService
  ) {}

  async listFolder(organizationId: string, accountId?: string, folderId: string = '0') {
    // If accountId is provided, fetch via that account's provider; otherwise use first active account or mock
    let provider = 'mock_pcloud';
    let token = 'mock_token';

    if (accountId) {
      const account = await this.prisma.pCloudAccount.findFirst({
        where: { id: accountId, organizationId },
      });
      if (account) {
        provider = account.provider;
        token = account.credentials;
      }
    } else {
      const firstAcc = await this.prisma.pCloudAccount.findFirst({
        where: { organizationId, status: 'ACTIVE' },
      });
      if (firstAcc) {
        provider = firstAcc.provider;
        token = firstAcc.credentials;
      }
    }

    const adapter = PCloudAdapterFactory.getAdapter(provider);
    return await adapter.listContents(folderId, token);
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
    folderId: string = '0'
  ) {
    let provider = 'mock_pcloud';
    let token = 'mock_token';
    let selectedAccountId = accountId;

    if (accountId) {
      const account = await this.prisma.pCloudAccount.findFirst({
        where: { id: accountId, organizationId },
      });
      if (account) {
        provider = account.provider;
        token = account.credentials;
      }
    } else {
      const firstAcc = await this.prisma.pCloudAccount.findFirst({
        where: { organizationId, status: 'ACTIVE' },
      });
      if (firstAcc) {
        provider = firstAcc.provider;
        token = firstAcc.credentials;
        selectedAccountId = firstAcc.id;
      }
    }

    const adapter = PCloudAdapterFactory.getAdapter(provider);
    const uploadedMeta: PCloudItemMetadata = await adapter.uploadFile({
      filename: file.originalname,
      buffer: file.buffer,
      mimeType: file.mimetype,
      folderId,
      accessToken: token,
    });

    const fileRecord = await this.prisma.pCloudFile.create({
      data: {
        organizationId,
        pcloudAccountId: selectedAccountId,
        name: uploadedMeta.name,
        fileId: uploadedMeta.fileId || `pcloud-file-${Date.now()}`,
        folderId: uploadedMeta.folderId || folderId,
        fileSize: uploadedMeta.size || file.size,
        mimeType: uploadedMeta.mimeType || file.mimetype,
        pcloudPath: uploadedMeta.path,
        metadata: JSON.stringify(uploadedMeta.metadata || {}),
      },
    });

    return fileRecord;
  }

  async registerExistingPCloudFile(
    organizationId: string,
    dto: { name: string; fileId: string; folderId?: string; fileSize?: number; mimeType?: string; pcloudAccountId?: string; pcloudPath?: string }
  ) {
    return await this.prisma.pCloudFile.create({
      data: {
        organizationId,
        pcloudAccountId: dto.pcloudAccountId,
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
    const file = await this.prisma.pCloudFile.findFirst({
      where: { id, organizationId },
    });
    if (!file) throw new NotFoundException(`pCloud file ${id} not found`);

    await this.prisma.pCloudFile.delete({
      where: { id },
    });

    return { success: true, message: `File reference ${id} removed` };
  }
}
