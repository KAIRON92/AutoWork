import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '../backend/node_modules/.prisma/client';

const prisma = new PrismaClient();

export interface CampaignJobData {
  campaignId: string;
  organizationId: string;
  pcloudAccountId: string;
  pcloudFileId: string;
  templateId: string;
  operationType?: 'sharefolder' | 'uploadtransfer';
  retryCount?: number;
}

export function createCampaignWorker(redisConnection: { host: string; port: number }) {
  const pcloudQueue = new Queue('pcloud-share-queue', { connection: redisConnection });

  const worker = new Worker(
    'campaign-queue',
    async (job: Job<CampaignJobData>) => {
      const data = job.data;
      const campaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, organizationId: data.organizationId },
        include: { recipients: true },
      });

      if (!campaign) throw new Error(`Campaign ${data.campaignId} not found`);
      if (campaign.status === 'PAUSED') return { success: false, skipped: true, reason: 'campaign_paused' };

      await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'PROCESSING' } });

      let queued = 0;
      for (const recipient of campaign.recipients) {
        if (!['PENDING', 'QUEUED', 'RETRYING'].includes(recipient.status)) continue;

        await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'QUEUED' } });
        await pcloudQueue.add(
          'pcloud-share',
          {
            campaignId: campaign.id,
            organizationId: campaign.organizationId,
            recipientId: recipient.id,
            recipientEmail: recipient.recipientEmail,
            pcloudAccountId: data.pcloudAccountId,
            pcloudProvider: campaign.pcloudAccount?.provider || 'pcloud',
            pcloudFileId: data.pcloudFileId,
            templateContent: (await prisma.template.findUnique({ where: { id: data.templateId } }))?.content || '',
            operationType: data.operationType || 'uploadtransfer',
          },
          {
            attempts: data.retryCount || 3,
            backoff: { type: 'exponential', delay: 3000 },
            removeOnComplete: 1000,
            removeOnFail: 1000,
          }
        );
        queued++;
      }

      return { success: true, campaignId: campaign.id, queuedRecipients: queued };
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
