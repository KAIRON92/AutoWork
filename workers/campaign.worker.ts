import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CampaignJobData {
  campaignId: string;
  organizationId: string;
  pcloudAccountId: string;
  pcloudFileId: string;
  templateId: string;
  emailAccountId?: string;
  deliveryMode?: 'EMAIL' | 'PCLOUD_NATIVE';
  attachmentMode?: 'ATTACHMENT' | 'DIRECT_LINK' | 'BOTH';
  operationType?: 'sharefolder' | 'uploadtransfer';
  subject?: string;
  retryCount?: number;
}

export function createCampaignWorker(redisConnection: { host: string; port: number }) {
  const pcloudQueue = new Queue('pcloud-share-queue', { connection: redisConnection });
  const emailQueue = new Queue('email-dispatch-queue', { connection: redisConnection });

  const worker = new Worker(
    'campaign-queue',
    async (job: Job<CampaignJobData>) => {
      const data = job.data;
      const campaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, organizationId: data.organizationId },
        include: { recipients: true, pcloudAccount: true, template: true, emailAccount: true },
      });

      if (!campaign) throw new Error(`Campaign ${data.campaignId} not found`);
      if (campaign.status === 'PAUSED') return { success: false, skipped: true, reason: 'campaign_paused' };

      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PROCESSING' } });

      const config = campaign.config ? JSON.parse(campaign.config) : {};
      const deliveryMode: 'EMAIL' | 'PCLOUD_NATIVE' = data.deliveryMode || config.deliveryMode || (campaign.emailAccountId ? 'EMAIL' : 'PCLOUD_NATIVE');

      let queued = 0;
      for (const recipient of campaign.recipients) {
        if (!['PENDING', 'QUEUED', 'RETRYING'].includes(recipient.status)) continue;

        await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'QUEUED' } });

        if (deliveryMode === 'EMAIL') {
          await emailQueue.add(
            'email-dispatch',
            {
              campaignId: campaign.id,
              organizationId: campaign.organizationId,
              recipientId: recipient.id,
              recipientEmail: recipient.recipientEmail,
              emailAccountId: campaign.emailAccountId || data.emailAccountId,
              pcloudAccountId: campaign.pcloudAccountId,
              pcloudFileId: campaign.pcloudFileId,
              templateContent: campaign.template.content,
              subject: data.subject || config.subject || campaign.name,
              attachmentMode: data.attachmentMode || config.attachmentMode || 'ATTACHMENT',
            },
            {
              attempts: data.retryCount || config.retryCount || 3,
              backoff: { type: 'exponential', delay: 3000 },
              removeOnComplete: 1000,
              removeOnFail: 1000,
            }
          );
        } else {
          await pcloudQueue.add(
            'pcloud-share',
            {
              campaignId: campaign.id,
              organizationId: campaign.organizationId,
              recipientId: recipient.id,
              recipientEmail: recipient.recipientEmail,
              pcloudAccountId: data.pcloudAccountId,
              pcloudProvider: campaign.pcloudAccount.provider,
              pcloudFileId: data.pcloudFileId,
              templateContent: campaign.template.content,
              operationType: data.operationType || config.shareType || 'uploadtransfer',
            },
            {
              attempts: data.retryCount || config.retryCount || 3,
              backoff: { type: 'exponential', delay: 3000 },
              removeOnComplete: 1000,
              removeOnFail: 1000,
            }
          );
        }
        queued++;
      }

      return { success: true, campaignId: campaign.id, deliveryMode, queuedRecipients: queued };
    },
    { connection: redisConnection, concurrency: 1 }
  );

  worker.on('failed', async (job, err) => {
    if (!job) return;
    await prisma.campaign.update({ where: { id: job.data.campaignId }, data: { status: 'FAILED' } }).catch(() => undefined);
    console.error(`[Campaign Worker] Job ${job.id} failed: ${err.message}`);
  });

  return worker;
}
