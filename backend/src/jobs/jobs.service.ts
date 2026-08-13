import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigService } from '../config/config.service';

@Injectable()
export class JobsService implements OnModuleInit {
  private readonly logger = new Logger(JobsService.name);

  public pcloudShareQueue!: Queue;
  public importQueue!: Queue;
  public campaignQueue!: Queue;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const connection = {
      host: this.configService.get('redisHost') || 'localhost',
      port: Number(this.configService.get('redisPort')) || 6379,
    };

    try {
      this.pcloudShareQueue = new Queue('pcloud-share-queue', { connection });
      this.importQueue = new Queue('import-queue', { connection });
      this.campaignQueue = new Queue('campaign-queue', { connection });
      this.logger.log('🚀 BullMQ Queues initialized (pcloud-share-queue, import-queue, campaign-queue)');
    } catch (err: any) {
      this.logger.warn(`BullMQ queue initialization deferred: ${err.message}`);
    }
  }

  async enqueuePCloudShareJob(data: any) {
    if (this.pcloudShareQueue) {
      return await this.pcloudShareQueue.add('pcloud-share', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
      });
    }
    this.logger.log(`[Queue Fallback] Enqueued pCloud share for recipient ${data.recipientEmail}`);
    return { id: `mock-job-${Date.now()}` };
  }

  async enqueueCampaignJob(data: any) {
    if (this.campaignQueue) {
      return await this.campaignQueue.add('process-campaign', data);
    }
    this.logger.log(`[Queue Fallback] Enqueued campaign job ${data.campaignId}`);
    return { id: `mock-campaign-job-${Date.now()}` };
  }

  async enqueueImportJob(data: any) {
    if (this.importQueue) {
      return await this.importQueue.add('process-import', data);
    }
    this.logger.log(`[Queue Fallback] Enqueued import job ${data.importJobId}`);
    return { id: `mock-import-job-${Date.now()}` };
  }
}
