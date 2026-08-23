import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

export interface CreateCampaignDto {
  name: string;
  pcloudAccountId: string;
  pcloudFileId: string;
  templateId: string;
  emailAccountId?: string;
  contactListId?: string;
  recipientContactIds?: string[];
  recipientOverrides?: Record<string, string>;
  config?: {
    deliveryMode?: 'EMAIL' | 'PCLOUD_NATIVE';
    attachmentMode?: 'ATTACHMENT' | 'DIRECT_LINK' | 'BOTH';
    subject?: string;
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
        emailAccount: { select: { id: true, displayName: true, accountEmail: true, provider: true, status: true } },
        pcloudAccount: { select: { id: true, name: true, accountEmail: true, provider: true, status: true } },
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
        emailAccount: true,
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
    const deliveryMode: 'EMAIL' | 'PCLOUD_NATIVE' = dto.config?.deliveryMode || (dto.emailAccountId ? 'EMAIL' : 'EMAIL');

    const [pcloudAccount, file, template] = await Promise.all([
      this.prisma.pCloudAccount.findFirst({ where: { id: dto.pcloudAccountId, organizationId } }),
      this.prisma.pCloudFile.findFirst({ where: { id: dto.pcloudFileId, organizationId } }),
      this.prisma.template.findFirst({ where: { id: dto.templateId, organizationId } }),
    ]);

    if (!pcloudAccount) throw new BadRequestException(`Invalid pCloud Account ${dto.pcloudAccountId}`);
    if (!file) throw new BadRequestException(`Invalid pCloud File ${dto.pcloudFileId}`);
    if (!template) throw new BadRequestException(`Invalid Template ${dto.templateId}`);

    let emailAccount = null;
    if (deliveryMode === 'EMAIL') {
      if (!dto.emailAccountId) {
        throw new BadRequestException('A verified Email sender account is required for Email delivery mode.');
      }
      emailAccount = await this.prisma.emailAccount.findFirst({
        where: { id: dto.emailAccountId, organizationId, status: 'VERIFIED' },
      });
      if (!emailAccount) {
        throw new BadRequestException(`Invalid or unverified Email sender account ${dto.emailAccountId}`);
      }
    }

    let contactIds: { id: string; email: string }[] = [];
    if (dto.contactListId) {
      const contactList = await this.prisma.contactList.findFirst({
        where: { id: dto.contactListId, organizationId },
      });
      if (!contactList) throw new BadRequestException(`Invalid contact list ${dto.contactListId}`);

      const members = await this.prisma.contactListMember.findMany({
        where: { contactListId: contactList.id, contactList: { organizationId } },
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
      deliveryMode,
      attachmentMode: dto.config?.attachmentMode || 'ATTACHMENT',
      subject: dto.config?.subject || dto.name,
      shareType: dto.config?.shareType || 'uploadtransfer',
      rateLimitPerMinute: dto.config?.rateLimitPerMinute || 60,
      retryCount: dto.config?.retryCount || 3,
    };

    const campaign = await this.prisma.campaign.create({
      data: {
        organizationId,
        name: dto.name,
        emailAccountId: emailAccount ? emailAccount.id : null,
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
        data: contactIds.map((c) => ({
          campaignId: campaign.id,
          contactId: c.id,
          recipientEmail: c.email,
          resolvedDescription: dto.recipientOverrides?.[c.id] || null,
          status: 'PENDING',
        })),
      });
    }

    return this.findOne(campaign.id, organizationId);
  }

  async launch(id: string, organizationId: string) {
    if (!this.jobsService) throw new BadRequestException('Queue service is not available');

    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: { emailAccount: true, pcloudAccount: true, pcloudFile: true, template: true, recipients: true },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    if (!['DRAFT', 'PAUSED'].includes(campaign.status)) {
      throw new BadRequestException(`Campaign cannot be launched from ${campaign.status} state`);
    }
    if (campaign.recipients.length === 0) throw new BadRequestException('Cannot launch campaign with 0 recipients');

    const config = campaign.config ? JSON.parse(campaign.config) : {};
    const deliveryMode = config.deliveryMode || (campaign.emailAccountId ? 'EMAIL' : 'PCLOUD_NATIVE');

    if (deliveryMode === 'EMAIL') {
      if (!campaign.emailAccount || campaign.emailAccount.status !== 'VERIFIED') {
        throw new BadRequestException('Campaign sender email account is not verified or inactive.');
      }
    } else {
      if (campaign.pcloudAccount.status !== 'ACTIVE') {
        throw new BadRequestException('Selected pCloud account is not active.');
      }
      if (config.shareType && config.shareType !== 'uploadtransfer' && config.shareType !== 'sharefolder') {
        throw new BadRequestException(`Unsupported pCloud operation: ${config.shareType}`);
      }
    }

    try {
      await this.jobsService.enqueueCampaignJob({
        campaignId: campaign.id,
        organizationId,
        pcloudAccountId: campaign.pcloudAccountId,
        pcloudFileId: campaign.pcloudFileId,
        templateId: campaign.templateId,
        emailAccountId: campaign.emailAccountId || undefined,
        deliveryMode,
        attachmentMode: config.attachmentMode || 'ATTACHMENT',
        subject: config.subject || campaign.name,
        operationType: config.shareType || 'uploadtransfer',
        retryCount: config.retryCount || 3,
      });

      await this.prisma.campaign.update({ where: { id }, data: { status: 'QUEUED' } });
      await this.prisma.campaignRecipient.updateMany({ where: { campaignId: id, status: 'PENDING' }, data: { status: 'QUEUED' } });
    } catch (error: any) {
      await this.prisma.campaign.update({ where: { id }, data: { status: campaign.status } });
      throw new BadRequestException(error?.message || 'Unable to queue campaign');
    }

    return {
      message: `Campaign queued for ${deliveryMode === 'EMAIL' ? 'Email distribution' : 'pCloud Native'} processing`,
      campaignId: campaign.id,
      deliveryMode,
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
