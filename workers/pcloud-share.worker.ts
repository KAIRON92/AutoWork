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
      const campaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, organizationId: data.organizationId },
        include: { recipients: true, pcloudAccount: true, pcloudFile: true },
      });

      if (!recipient || !campaign) throw new Error('Campaign recipient or campaign not found');
      if (campaign.status === 'PAUSED') return { success: false, skipped: true };

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

      let execution = await prisma.pCloudShareExecution.findFirst({
        where: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          recipientId: recipient.id,
          jobId: String(job.id),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (execution?.status === 'SUCCESS') {
        return { success: true, referenceId: execution.pcloudReferenceId, alreadyCompleted: true };
      }

      if (execution?.status === 'PROCESSING' && job.attemptsMade > 0) {
        await prisma.pCloudShareExecution.update({
          where: { id: execution.id },
          data: {
            status: 'UNKNOWN',
            errorCode: 'EXTERNAL_OPERATION_UNCERTAIN',
            errorMessage: 'Worker restarted after the external pCloud operation began. Manual reconciliation is required before retrying to prevent duplicate delivery.',
            completedAt: new Date(),
          },
        });
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'MANUAL_REVIEW',
            errorCode: 'EXTERNAL_OPERATION_UNCERTAIN',
            errorMessage: 'The pCloud operation outcome is uncertain. Reconcile the pCloud side before retrying this recipient.',
          },
        });
        return { success: false, requiresReconciliation: true };
      }

      if (!execution) {
        execution = await prisma.pCloudShareExecution.create({
          data: {
            organizationId: campaign.organizationId,
            campaignId: campaign.id,
            recipientId: recipient.id,
            pcloudAccountId: account.id,
            pcloudFileId: campaign.pcloudFile.id,
            recipientEmail: recipient.recipientEmail,
            descriptionSnapshot: resolvedText,
            operationType: data.operationType || 'uploadtransfer',
            status: 'PROCESSING',
            jobId: String(job.id),
            startedAt: new Date(),
          },
        });
      } else {
        execution = await prisma.pCloudShareExecution.update({
          where: { id: execution.id },
          data: { status: 'PROCESSING', errorCode: null, errorMessage: null, completedAt: null },
        });
      }

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: { status: 'PROCESSING', errorCode: null, errorMessage: null },
      });

      let result;
      try {
        result = data.operationType === 'sharefolder'
          ? await adapter.shareFolder({
              folderId: campaign.pcloudFile.folderId || '0',
              fileId: campaign.pcloudFile.fileId,
              recipientEmail: recipient.recipientEmail,
              message: resolvedText,
              pcloudAccountId: account.id,
              organizationId: campaign.organizationId,
              campaignId: campaign.id,
              jobId: job.id,
            }, credential, apiHost)
          : await adapter.createTransfer({
              fileId: campaign.pcloudFile.fileId,
              filename: campaign.pcloudFile.name,
              mimeType: campaign.pcloudFile.mimeType,
              senderEmail: account.accountEmail,
              recipientEmails: [recipient.recipientEmail],
              message: resolvedText,
              pcloudAccountId: account.id,
              organizationId: campaign.organizationId,
              campaignId: campaign.id,
              jobId: job.id,
            }, credential, apiHost);
      } catch (error: any) {
        result = {
          success: false,
          operationType: data.operationType || 'uploadtransfer',
          recipientEmail: recipient.recipientEmail,
          pcloudAccountId: account.id,
          pcloudFileId: campaign.pcloudFile.id,
          descriptionSnapshot: resolvedText,
          timestamp: new Date().toISOString(),
          error: {
            code: 'PCLOUD_CLIENT_ERROR',
            message: error?.message || 'pCloud client error',
            isTransient: true,
          },
        };
      }

      const attempts = Number(job.opts.attempts || 1);
      const hasRetryRemaining = Boolean(result.error?.isTransient && job.attemptsMade + 1 < attempts);

      if (!result.success && hasRetryRemaining) {
        await prisma.pCloudShareExecution.update({
          where: { id: execution.id },
          data: {
            status: 'RETRYING',
            errorCode: result.error?.code || null,
            errorMessage: result.error?.message || null,
          },
        });
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: { status: 'RETRYING', errorCode: result.error?.code || null, errorMessage: result.error?.message || null },
        });
        throw new Error(result.error?.message || 'Transient pCloud error');
      }

      const finalStatus = result.success ? 'SUCCESS' : 'FAILED';
      const executionUpdated = await prisma.pCloudShareExecution.update({
        where: { id: execution.id },
        data: {
          status: finalStatus,
          pcloudReferenceId: result.pcloudReferenceId || null,
          errorCode: result.error?.code || null,
          errorMessage: result.error?.message || null,
          startedAt: execution.startedAt,
          completedAt: new Date(),
          descriptionSnapshot: resolvedText,
        },
      });

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: result.success ? 'SHARED' : 'FAILED',
          pcloudShareExecutionId: executionUpdated.id,
          resolvedDescription: resolvedText,
          randomCode,
          errorCode: result.error?.code || null,
          errorMessage: result.error?.message || null,
        },
      });

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
  worker.on('failed', async (job, err) => {
    if (!job) return;
    console.error(`[pCloud Worker] Job ${job.id} failed: ${err.message}`);
    if (job.attemptsMade < Number(job.opts.attempts || 1)) return;

    await prisma.campaignRecipient.updateMany({
      where: { id: job.data.recipientId, campaignId: job.data.campaignId, status: { in: ['PROCESSING', 'RETRYING'] } },
      data: {
        status: 'MANUAL_REVIEW',
        errorCode: 'WORKER_EXHAUSTED',
        errorMessage: 'Worker exhausted its attempts. Review the pCloud execution result before retrying to avoid duplicate delivery.',
      },
    }).catch(() => undefined);

    await prisma.pCloudShareExecution.updateMany({
      where: { jobId: String(job.id), campaignId: job.data.campaignId, status: { in: ['PROCESSING', 'RETRYING'] } },
      data: {
        status: 'UNKNOWN',
        errorCode: 'WORKER_EXHAUSTED',
        errorMessage: err.message,
        completedAt: new Date(),
      },
    }).catch(() => undefined);
  });

  return worker;
}
