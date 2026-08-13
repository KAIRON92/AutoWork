import { Worker, Job } from 'bullmq';
import { PCloudAdapterFactory } from '../backend/src/pcloud/pcloud.factory';
import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';
import { PCloudErrorCode } from '../backend/src/pcloud/pcloud.interface';

export interface PCloudShareJobData {
  campaignId: string;
  recipientId: string;
  recipientEmail: string;
  contactData?: {
    firstName?: string;
    lastName?: string;
    fullName?: string;
    company?: string;
    phone?: string;
    target?: string;
  };
  pcloudAccountId: string;
  pcloudProvider: string;
  pcloudCredentials: string;
  pcloudFolderId?: string;
  pcloudFileId: string;
  templateContent: string;
  operationType?: 'sharefolder' | 'uploadtransfer';
}

export function createPCloudShareWorker(redisConnection: { host: string; port: number }) {
  const worker = new Worker(
    'pcloud-share-queue',
    async (job: Job<PCloudShareJobData>) => {
      const data = job.data;
      console.log(`[pCloud Worker] Processing share for recipient ${data.recipientEmail} (Campaign: ${data.campaignId})`);

      // Resolve variables with #RANDOM# code
      const { resolvedText, randomCode } = TemplateVariableResolver.resolve(
        data.templateContent,
        {
          email: data.recipientEmail,
          ...data.contactData,
        }
      );

      const adapter = PCloudAdapterFactory.getAdapter(data.pcloudProvider || 'mock_pcloud');

      // Execute share/transfer operation
      const result = await adapter.shareFolder(
        {
          folderId: data.pcloudFolderId || '0',
          fileId: data.pcloudFileId,
          recipientEmail: data.recipientEmail,
          message: resolvedText,
          pcloudAccountId: data.pcloudAccountId,
          campaignId: data.campaignId,
          jobId: job.id,
        },
        data.pcloudCredentials
      );

      if (!result.success && result.error) {
        // If error is transient (e.g. rate limit, network 500), throw to trigger BullMQ bounded retry
        if (result.error.isTransient && job.attemptsMade < (job.opts.attempts || 3)) {
          console.warn(`[pCloud Worker] Transient error for ${data.recipientEmail}: ${result.error.message}. Retrying...`);
          throw new Error(result.error.message);
        }
      }

      return {
        success: result.success,
        referenceId: result.pcloudReferenceId,
        recipientEmail: data.recipientEmail,
        randomCode,
        resolvedDescription: resolvedText,
        error: result.error,
        timestamp: new Date().toISOString(),
      };
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[pCloud Worker] Job ${job.id} completed successfully for recipient ${job.data.recipientEmail}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[pCloud Worker] Job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
