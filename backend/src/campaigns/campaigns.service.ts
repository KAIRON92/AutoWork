import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

export interface CreateCampaignDto {
  name: string;
  pcloudAccountId: string;
  pcloudFileId: string;
  templateId: string;
  contactListId?: string;
  recipientContactIds?: string[];
  config?: {
    shareType?: 'sharefolder' | 'uploadtransfer';
    rateLimitPerMinute?: number;
    retryCount?: number;
  };
}

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService, @Optional() private jobsService?: JobsService) {}

  async findAll(organizationId: string) {
    return this.prisma.campaign.findMany({
      where: { organizationId },
      include: {
        pcloudAccount: { select: { id: true, name: true, accountEmail: true, provider: true } },
        pcloudFile: { select: { id: true, name: true, fileId: true, pcloudPath: true } },
        template: { select: { id: true, name: true } },
        contactList: { select: { id: true, name: true } },
        _count: { select: { recipients: true, executions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        pcloudAccount: true,
        pcloudFile: true,
        template: true,
        contactList: true,
        recipients: { take: 100, orderBy: { createdAt: 'asc' } },
        executions: { take: 50, orderBy: { startedAt: 'desc' } },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async create(organizationId: string, dto: CreateCampaignDto) {
    const [account, file, template] = await Promise.all([
      this.prisma.pCloudAccount.findFirst({ where: { id: dto.pcloudAccountId, organizationId } }),
      this.prisma.pCloudFile.findFirst({ where: { id: dto.pcloudFileId, organizationId } }),
      this.prisma.template.findFirst({ where: { id: dto.templateId, organizationId } }),
    ]);

    if (!account) throw new BadRequestException(`Invalid pCloud Account ${dto.pcloudAccountId}`);
    if (!file) throw new BadRequestException(`Invalid pCloud File ${dto.pcloudFileId}`);
    if (!template) throw new BadRequestException(`Invalid Template ${dto.templateId}`);

    let contactIds: { id: string; email: string }[] = [];
    if (dto.contactListId) {
      const members = await this.prisma.contactListMember.findMany({
        where: { contactListId: dto.contactListId },
        include: { contact: { select: { id: true, email: true } } },
      });
      contactIds = members.map((m) => m.contact);
    } else if (dto.recipientContactIds?.length) {
      contactIds = await this.prisma.contact.findMany({
        where: { id: { in: dto.recipientContactIds }, organizationId },
        select: { id: true, email: true },
      });
    }

    const config = {
      shareType: 'uploadtransfer' as const,
      rateLimitPerMinute: 60,
      retryCount: 3,
      ...(dto.config || {}),
    };

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        pcloudAccountId: dto.pcloudAccountId,
        pcloudFileId: dto.pcloudFileId,
        templateId: dto.templateId,
        contactListId: dto.contactListId || null,
        totalCount: contactIds.length,
        sharedCount: 0,
        failedCount: 0,
        retryingCount: 0,
        status: 'DRAFT',
        config: JSON.stringify(config),
      },
    });

    if (contactIds.length > 0) {
      await this.prisma.campaignRecipient.createMany({
        data: contactIds.map((c) => ({ campaignId: campaign.id, contactId: c.id, recipientEmail: c.email, status: 'PENDING' })),
      });
    }

    return this.findOne(campaign.id, organizationId);
  }

  async launch(id: string, organizationId: string) {
    if (!this.jobsService) throw new BadRequestException('Queue service is not available');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { pcloudAccount: true, pcloudFile: true, template: true, recipients: true },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    if (campaign.recipients.length === 0) throw new BadRequestException('Cannot launch campaign with 0 recipients');
    if (campaign.pcloudAccount.status !== 'ACTIVE') throw new BadRequestException('Selected pCloud account is not active');

    const config = campaign.config ? JSON.parse(campaign.config) : { shareType: 'uploadtransfer' };
    if (config.shareType !== 'uploadtransfer' && config.shareType !== 'sharefolder') {
      throw new BadRequestException(`Unsupported pCloud operation: ${config.shareType}`);
    }

    await this.prisma.campaign.update({ where: { id }, data: { status: 'QUEUED' } });
    await this.prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: 'PENDING' }, data: { status: 'QUEUED' } });

    await this.jobsService.enqueueCampaignJob({
      campaignId: campaign.id,
      organizationId,
      pcloudAccountId: campaign.pcloudAccountId,
      pcloudFileId: campaign.pcloudFileId,
      templateId: campaign.templateId,
      operationType: config.shareType,
      retryCount: config.retryCount || 3,
    });

    return {
      message: 'Campaign queued for pCloud processing',
      campaignId: campaign.id,
      status: 'QUEUED',
      totalRecipients: campaign.recipients.length,
    };
  }

  async pause(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return this.prisma.campaign.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async remove(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({ where: { id, organizationId } });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    await this.prisma.campaign.delete({ where: { id } });
    return { success: true, message: `Campaign ${id} removed` };
  }
}
