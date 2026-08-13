import { Injectable, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { TemplateVariableResolver } from '../templates/template-variable.resolver';
import { PCloudAdapterFactory } from '../pcloud/pcloud.factory';

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
  constructor(
    private prisma: PrismaService,
    @Optional() private jobsService?: JobsService
  ) {}

  async findAll(organizationId: string) {
    return await this.prisma.campaign.findMany({
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
        recipients: {
          take: 100,
          orderBy: { createdAt: 'asc' },
        },
        executions: {
          take: 50,
          orderBy: { startedAt: 'desc' },
        },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async create(organizationId: string, dto: CreateCampaignDto) {
    // Validate that account, file, and template exist in organization
    const [account, file, template] = await Promise.all([
      this.prisma.pCloudAccount.findFirst({ where: { id: dto.pcloudAccountId, organizationId } }),
      this.prisma.pCloudFile.findFirst({ where: { id: dto.pcloudFileId, organizationId } }),
      this.prisma.template.findFirst({ where: { id: dto.templateId, organizationId } }),
    ]);

    if (!account) throw new BadRequestException(`Invalid pCloud Account ${dto.pcloudAccountId}`);
    if (!file) throw new BadRequestException(`Invalid pCloud File ${dto.pcloudFileId}`);
    if (!template) throw new BadRequestException(`Invalid Template ${dto.templateId}`);

    // Gather recipients
    let contactIds: { id: string; email: string }[] = [];
    if (dto.contactListId) {
      const members = await this.prisma.contactListMember.findMany({
        where: { contactListId: dto.contactListId },
        include: { contact: { select: { id: true, email: true } } },
      });
      contactIds = members.map((m) => m.contact);
    } else if (dto.recipientContactIds && dto.recipientContactIds.length > 0) {
      const contacts = await this.prisma.contact.findMany({
        where: { id: { in: dto.recipientContactIds }, organizationId },
        select: { id: true, email: true },
      });
      contactIds = contacts;
    }

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
        config: JSON.stringify(dto.config || { shareType: 'sharefolder' }),
      },
    });

    // Populate CampaignRecipient rows
    if (contactIds.length > 0) {
      await this.prisma.campaignRecipient.createMany({
        data: contactIds.map((c) => ({
          campaignId: campaign.id,
          contactId: c.id,
          recipientEmail: c.email,
          status: 'PENDING',
        })),
      });
    }

    return await this.findOne(campaign.id, organizationId);
  }

  async launch(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
      include: {
        pcloudAccount: true,
        pcloudFile: true,
        template: true,
        recipients: {
          include: {},
        },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    if (campaign.recipients.length === 0) {
      throw new BadRequestException('Cannot launch campaign with 0 recipients');
    }

    await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    // Mark recipients as QUEUED
    await this.prisma.campaignRecipient.updateMany({
      where: { campaignId: id, status: 'PENDING' },
      data: { status: 'QUEUED' },
    });

    // Enqueue in BullMQ or run background execution
    if (this.jobsService && this.jobsService.campaignQueue) {
      await this.jobsService.enqueueCampaignJob({
        campaignId: campaign.id,
        organizationId,
        pcloudAccountId: campaign.pcloudAccountId,
        pcloudFileId: campaign.pcloudFileId,
      });
    }

    // Execute in background
    this.processCampaignExecution(campaign.id, organizationId).catch((err) => {
      console.error(`Error processing campaign ${campaign.id}:`, err);
    });

    return {
      message: 'Campaign launched and queued for pCloud share execution',
      campaignId: campaign.id,
      status: 'PROCESSING',
      totalRecipients: campaign.recipients.length,
    };
  }

  async pause(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    return await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  private async processCampaignExecution(campaignId: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        pcloudAccount: true,
        pcloudFile: true,
        template: true,
        recipients: true,
      },
    });
    if (!campaign) return;

    const adapter = PCloudAdapterFactory.getAdapter(campaign.pcloudAccount.provider);
    const token = campaign.pcloudAccount.credentials;

    for (const recipient of campaign.recipients) {
      // Re-check campaign status in case paused
      const current = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });
      if (current?.status !== 'PROCESSING') break;

      // Resolve contact data
      const contact = await this.prisma.contact.findUnique({
        where: { id: recipient.contactId },
      });

      const sampleData = {
        email: recipient.recipientEmail,
        firstName: contact?.firstName || undefined,
        lastName: contact?.lastName || undefined,
        fullName: contact?.fullName || undefined,
        company: contact?.company || undefined,
        phone: contact?.phone || undefined,
        target: contact?.target || undefined,
      };

      const { resolvedText, randomCode } = TemplateVariableResolver.resolve(campaign.template.content, sampleData);

      // Perform pCloud share or transfer
      const shareResult = await adapter.shareFolder(
        {
          folderId: campaign.pcloudFile.folderId || '0',
          fileId: campaign.pcloudFile.fileId,
          recipientEmail: recipient.recipientEmail,
          message: resolvedText,
          pcloudAccountId: campaign.pcloudAccountId,
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
        },
        token
      );

      // Record PCloudShareExecution record for auditing
      const execution = await this.prisma.pCloudShareExecution.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          recipientId: recipient.id,
          pcloudAccountId: campaign.pcloudAccountId,
          pcloudFileId: campaign.pcloudFile.id,
          recipientEmail: recipient.recipientEmail,
          descriptionSnapshot: resolvedText,
          operationType: 'sharefolder',
          status: shareResult.success ? 'SUCCESS' : 'FAILED',
          pcloudReferenceId: shareResult.pcloudReferenceId || null,
          errorCode: shareResult.error?.code || null,
          errorMessage: shareResult.error?.message || null,
          startedAt: new Date(shareResult.timestamp),
          completedAt: new Date(),
        },
      });

      // Update CampaignRecipient
      await this.prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: shareResult.success ? 'SHARED' : 'FAILED',
          pcloudShareExecutionId: execution.id,
          resolvedDescription: resolvedText,
          randomCode,
          errorCode: shareResult.error?.code || null,
          errorMessage: shareResult.error?.message || null,
        },
      });

      // Update Campaign counters
      if (shareResult.success) {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { sharedCount: { increment: 1 } },
        });
        await this.prisma.pCloudAccount.update({
          where: { id: campaign.pcloudAccountId },
          data: { sentToday: { increment: 1 }, lastUsedAt: new Date() },
        });
      } else {
        await this.prisma.campaign.update({
          where: { id: campaignId },
          data: { failedCount: { increment: 1 } },
        });
      }
    }

    // Finalize campaign status
    const finalState = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (finalState && (finalState.sharedCount + finalState.failedCount >= finalState.totalCount)) {
      await this.prisma.campaign.update({
        where: { id: campaignId },
        data: { status: 'COMPLETED' },
      });
    }
  }

  async remove(id: string, organizationId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, organizationId },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    await this.prisma.campaign.delete({ where: { id } });
    return { success: true, message: `Campaign ${id} removed` };
  }
}
