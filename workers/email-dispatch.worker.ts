import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EmailAdapterFactory } from '../automation-modules/email/email.factory';
import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';
import { decryptProviderCredentials, encryptProviderCredentials } from '../backend/src/email/email.credentials';
import { decryptPCloudCredential } from '../backend/src/pcloud/pcloud-credentials';
import { PCloudClient } from '../backend/src/pcloud/pcloud-client/pcloud.client';

const prisma = new PrismaClient();

export interface EmailDispatchJobData {
  campaignId: string;
  recipientId: string;
  organizationId: string;
  recipientEmail: string;
  emailAccountId: string;
  pcloudAccountId: string;
  pcloudFileId: string;
  templateContent: string;
  subject?: string;
  attachmentMode?: 'ATTACHMENT' | 'DIRECT_LINK' | 'BOTH';
}

export function createEmailDispatchWorker(redisConnection: { host: string; port: number }) {
  const worker = new Worker(
    'email-dispatch-queue',
    async (job: Job<EmailDispatchJobData>) => {
      const data = job.data;
      const recipient = await prisma.campaignRecipient.findFirst({
        where: { id: data.recipientId, campaignId: data.campaignId },
      });
      const campaign = await prisma.campaign.findFirst({
        where: { id: data.campaignId, organizationId: data.organizationId },
        include: { emailAccount: true, pcloudAccount: true, pcloudFile: true },
      });

      if (!recipient || !campaign) throw new Error('Campaign recipient or campaign not found');
      if (campaign.status === 'PAUSED') return { success: false, skipped: true, reason: 'campaign_paused' };
      if (!campaign.emailAccount) throw new Error('Campaign email account not found');
      if (campaign.emailAccount.status !== 'VERIFIED') throw new Error('Email sender account is not verified');

      // Idempotency & Crash Protection
      if (recipient.status === 'SUCCESS') {
        return { success: true, messageId: recipient.randomCode, alreadyCompleted: true };
      }

      if (recipient.status === 'PROCESSING' && job.attemptsMade > 0) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'MANUAL_REVIEW',
            errorCode: 'EXTERNAL_OPERATION_UNCERTAIN',
            errorMessage: 'Worker restarted after the external email dispatch began. Manual reconciliation is required to prevent duplicate email delivery.',
          },
        });
        return { success: false, requiresReconciliation: true };
      }

      // Contact & Template Resolution
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

      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'PROCESSING',
          resolvedDescription: resolvedText,
          randomCode,
          errorCode: null,
          errorMessage: null,
        },
      });

      // Prepare Email Account & Credentials
      const emailAccount = campaign.emailAccount;
      const credentials = JSON.parse(decryptProviderCredentials(emailAccount.credentials));
      const adapter = EmailAdapterFactory.getAdapter(emailAccount.provider);

      // Handle pCloud Document (Attachment / Direct Link)
      const attachmentMode = data.attachmentMode || 'ATTACHMENT';
      let attachments: Array<{ filename: string; content?: Buffer; mimeType?: string }> | undefined = undefined;
      let emailBody = resolvedText;

      const pcloudAccount = campaign.pcloudAccount;
      const pcloudFile = campaign.pcloudFile;

      if (pcloudAccount && pcloudFile) {
        const pcloudToken = pcloudAccount.provider === 'mock_pcloud'
          ? pcloudAccount.credentials
          : decryptPCloudCredential(pcloudAccount.credentials);
        const pcloudHost = pcloudAccount.apiHost || undefined;
        const pcloudClient = new PCloudClient(pcloudHost);

        if (attachmentMode === 'ATTACHMENT' || attachmentMode === 'BOTH') {
          try {
            const downloaded = await pcloudClient.downloadFileBuffer(pcloudFile.fileId, pcloudToken, pcloudHost);
            attachments = [
              {
                filename: downloaded.name || pcloudFile.name,
                content: downloaded.buffer,
                mimeType: downloaded.mimeType || pcloudFile.mimeType || 'application/octet-stream',
              },
            ];
          } catch (err: any) {
            console.error(`[Email Dispatch Worker] Failed to fetch pCloud file buffer: ${err.message}`);
          }
        }

        if (attachmentMode === 'DIRECT_LINK' || attachmentMode === 'BOTH') {
          try {
            const linkRes = await fetch(`${pcloudHost || 'https://api.pcloud.com'}/getfilelink?auth=${encodeURIComponent(pcloudToken)}&fileid=${encodeURIComponent(pcloudFile.fileId)}`);
            const linkData = await linkRes.json();
            if (linkData.result === 0 && linkData.hosts?.length && linkData.path) {
              const directUrl = `https://${linkData.hosts[0]}${linkData.path}`;
              emailBody += `\n\nDownload Document: ${directUrl}`;
            }
          } catch (err: any) {
            console.error(`[Email Dispatch Worker] Failed to generate direct link: ${err.message}`);
          }
        }
      }

      // Execute Send via Email Adapter
      const subject = data.subject || campaign.name || 'Document Distribution';
      const sendPayload = {
        to: {
          email: recipient.recipientEmail,
          name: contact?.fullName || undefined,
        },
        subject,
        body: emailBody,
        attachments,
        accountCredentials: credentials,
        campaignId: campaign.id,
      };

      const result = await adapter.sendEmail(sendPayload);

      // If token refreshed, update email account credentials
      if (sendPayload.accountCredentials && JSON.stringify(sendPayload.accountCredentials) !== JSON.stringify(credentials)) {
        await prisma.emailAccount.update({
          where: { id: emailAccount.id },
          data: {
            credentials: encryptProviderCredentials(JSON.stringify(sendPayload.accountCredentials)),
            lastVerifiedAt: new Date(),
          },
        }).catch(() => undefined);
      }

      if (result.success) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'SUCCESS',
            randomCode: result.messageId || randomCode,
            errorCode: null,
            errorMessage: null,
          },
        });

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: { sharedCount: { increment: 1 } },
        });

        // Update campaign status if all done
        const pendingCount = await prisma.campaignRecipient.count({
          where: { campaignId: campaign.id, status: { in: ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'] } },
        });
        if (pendingCount === 0) {
          const finalCampaign = await prisma.campaign.findUnique({ where: { id: campaign.id } });
          const finalStatus = (finalCampaign?.failedCount || 0) > 0 && (finalCampaign?.sharedCount || 0) === 0 ? 'FAILED' : 'COMPLETED';
          await prisma.campaign.update({ where: { id: campaign.id }, data: { status: finalStatus } });
        }

        return { success: true, messageId: result.messageId };
      } else {
        const attempts = Number(job.opts.attempts || 1);
        const hasRetryRemaining = job.attemptsMade + 1 < attempts;

        if (hasRetryRemaining) {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'RETRYING',
              errorCode: result.error?.code || 'EMAIL_SEND_FAILED',
              errorMessage: result.responseMessage,
            },
          });
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { retryingCount: { increment: 1 } },
          });
          throw new Error(result.responseMessage || 'Email dispatch failed, retrying');
        } else {
          await prisma.campaignRecipient.update({
            where: { id: recipient.id },
            data: {
              status: 'FAILED',
              errorCode: result.error?.code || 'EMAIL_SEND_FAILED',
              errorMessage: result.responseMessage,
            },
          });
          await prisma.campaign.update({
            where: { id: campaign.id },
            data: { failedCount: { increment: 1 } },
          });

          const pendingCount = await prisma.campaignRecipient.count({
            where: { campaignId: campaign.id, status: { in: ['PENDING', 'QUEUED', 'PROCESSING', 'RETRYING'] } },
          });
          if (pendingCount === 0) {
            const finalCampaign = await prisma.campaign.findUnique({ where: { id: campaign.id } });
            const finalStatus = (finalCampaign?.sharedCount || 0) > 0 ? 'COMPLETED' : 'FAILED';
            await prisma.campaign.update({ where: { id: campaign.id }, data: { status: finalStatus } });
          }

          return { success: false, error: result.responseMessage };
        }
      }
    },
    { connection: redisConnection, concurrency: 5 }
  );

  return worker;
}
