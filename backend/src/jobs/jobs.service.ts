import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '../config/config.service';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  public emailQueue!: Queue;
  public importQueue!: Queue;
  public campaignQueue!: Queue;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const connection = {
      host: this.configService.get('redisHost'),
      port: this.configService.get('redisPort'),
    };

    try {
      this.emailQueue = new Queue('email-queue', { connection });
      this.importQueue = new Queue('import-queue', { connection });
      this.campaignQueue = new Queue('campaign-queue', { connection });
      this.logger.log('🚀 BullMQ Queues initialized successfully (email-queue, import-queue, campaign-queue)');
    } catch (err: any) {
      this.logger.warn(`BullMQ queue initialization deferred: ${err.message}`);
    }
  }

  async enqueueEmailJob(data: any) {
    if (this.emailQueue) {
      return await this.emailQueue.add('send-email', data, { attempts: 3, backoff: 5000 });
    }
    this.logger.log(`[Mock Queue] Enqueued email job for recipient ${data.recipientEmail}`);
    return { id: `mock-job-${Date.now()}` };
  }

  async enqueueCampaignJob(data: any) {
    if (this.campaignQueue) {
      return await this.campaignQueue.add('process-campaign', data);
    }
    this.logger.log(`[Mock Queue] Enqueued campaign job ${data.campaignId}`);
    return { id: `mock-campaign-job-${Date.now()}` };
  }

  async enqueueImportJob(data: any) {
    if (this.importQueue) {
      return await this.importQueue.add('process-import', data);
    }
    this.logger.log(`[Mock Queue] Enqueued import job ${data.importJobId}`);
    return { id: `mock-import-job-${Date.now()}` };
  }
}
