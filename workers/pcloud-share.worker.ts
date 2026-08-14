import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { PCloudAdapterFactory } from '../backend/src/pcloud/pcloud.factory';
import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';
import { decryptPCloudCredential } from '../backend/src/pcloud/pcloud-credentials';

const prisma = new PrismaClient();

export interface PCloudShareJobData {
  campaignId: string;
  recipientId: string;
  organizationId: string;
  recipientEmail: string;
  pcloudAccountId: string;
  pcloudProvider: string;
  pcloudFileId: string;
  templateContent: string;
  operationType?: 'sharefolder' | 'uploadtransfer';
}

export function createPCloudShareWorker(redisConnection: { host: string; port: number }) {
  const worker = new Worker(
    'pcloud-share-queue',
    async (job: Job<PCloudShareJobData>) => {
      const data = job.data;
      const recipient = await prisma.campaignRecipient.findFirst({ where: { id: data.recipientId, campaignId: data.campaignId } });
      const campaign = await prisma.campaign.findFirst({ where: { id: data.campaignId, organizationId: data.organizationId }, include: { pcloudAccount: true, pcloudFile: true } });

      if (!recipient || !campaign) throw new Error('Campaign recipient or campaign not found');
      if (campaign.status === 'PAUSED') return { success: false, skipped: true };

      await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'PROCESSING' } });

      const account = campaign.pcloudAccount;
      const credential = account.provider === 'mock_pcloud' ? account.credentials : decryptPCloudCredential(account.credentials);
      const apiHost = account.apiHost || undefined;
      const adapter = PCloudAdapterFactory.getAdapter(account.provider);
      const contact = await prisma.contact.findUnique({ where: { id: recipient.contactId } });
      const { resolvedText, randomCode } = TemplateVariableResolver.resolve(data.templateContent, {
        email: recipient.recipientEmail,
        firstName: contact?.firstName,
        lastName: contact?.lastName,
        fullName: contact?.fullName,
        company: contact?.company,
        phone: contact?.phone,
        target: contact?.target,
      });

      const result = data.operationType === 'sharefolder'
        ? await adapter.shareFolder({ folderId: campaign.pcloudFile.folderId || '0', fileId: campaign.pcloudFile.fileId, recipientEmail: recipient.recipientEmail, message: resolvedText, pcloudAccountId: account.id, organizationId: campaign.organizationId, campaignId: campaign.id, jobId: job.id }, credential, apiHost)
        : await adapter.createTransfer({ fileId: campaign.pcloudFile.fileId, filename: campaign.pcloudFile.name, mimeType: campaign.pcloudFile.mimeType, senderEmail: account.accountEmail, recipientEmails: [recipient.recipientEmail], message: resolvedText, pcloudAccountId: account.id, organizationId: campaign.organizationId, campaignId: campaign.id, jobId: job.id }, credential, apiHost);

      if (!result.success && result.error?.isTransient && job.attemptsMade < (job.opts.attempts || 3)) {
        await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: 'RETRYING', errorCode: result.error.code, errorMessage: result.error.message } });
        throw new Error(result.error.message);
      }

      const execution = await prisma.pCloudShareExecution.create({
        data: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          recipientId: recipient.id,
          pcloudAccountId: account.id,
          pcloudFileId: campaign.pcloudFile.id,
          recipientEmail: recipient.recipientEmail,
          descriptionSnapshot: resolvedText,
          operationType: result.operationType,
          status: result.success ? 'SUCCESS' : 'FAILED',
          pcloudReferenceId: result.pcloudReferenceId || null,
          errorCode: result.error?.code || null,
          errorMessage: result.error?.message || null,
          startedAt: new Date(result.timestamp),
          completedAt: new Date(),
        },
      });

      await prisma.campaignRecipient.update({ where: { id: recipient.id }, data: { status: result.success ? 'SHARED' : 'FAILED', pcloudShareExecutionId: execution.id, resolvedDescription: resolvedText, randomCode, errorCode: result.error?.code || null, errorMessage: result.error?.message || null } });

      if (result.success) {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { sharedCount: { increment: 1 } } });
        await prisma.pCloudAccount.update({ where: { id: account.id }, data: { sentToday: { increment: 1 }, lastUsedAt: new Date() } });
      } else {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { failedCount: { increment: 1 } } });
      }

      const latest = await prisma.campaign.findUnique({ where: { id: campaign.id }, select: { totalCount: true, sharedCount: true, failedCount: true } });
      if (latest && latest.totalCount > 0 && latest.sharedCount + latest.failedCount >= latest.totalCount) {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'COMPLETED' } });
      }

      return { success: result.success, referenceId: result.pcloudReferenceId, recipientEmail: recipient.recipientEmail, randomCode, resolvedDescription: resolvedText, error: result.error };
    },
    { connection: redisConnection, concurrency: 5 }
  );

  worker.on('completed', (job) => console.log(`[pCloud Worker] Job ${job.id} completed for recipient ${job.data.recipientEmail}`));
  worker.on('failed', (job, err) => console.error(`[pCloud Worker] Job ${job?.id} failed: ${err.message}`));
  return worker;
}
