import { EmailAdapterFactory } from '../automation-modules/email/email.factory';

export interface EmailWorkerJobData {
  jobId: string;
  campaignId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  attachmentId?: string;
  accountCredentials?: Record<string, any>;
  providerName?: string;
}

export class EmailWorker {
  private activeProvider: string;

  constructor(providerName: string = 'fake') {
    this.activeProvider = providerName;
  }

  async processJob(job: EmailWorkerJobData) {
    console.log(`[EmailWorker] Processing job ${job.jobId} for recipient ${job.recipientEmail}`);

    const adapter = EmailAdapterFactory.getAdapter(job.providerName || this.activeProvider);

    const result = await adapter.sendEmail({
      to: { email: job.recipientEmail, name: job.recipientName },
      subject: job.subject,
      body: job.body,
      campaignId: job.campaignId,
      accountCredentials: job.accountCredentials,
    });

    console.log(`[EmailWorker] Job ${job.jobId} completed. Status: ${result.statusCode}`);
    return result;
  }
}
