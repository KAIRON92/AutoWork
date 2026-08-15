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

  async onModuleInit() {
    const connection = {
      host: this.configService.get('redisHost') || 'localhost',
      port: Number(this.configService.get('redisPort')) || 6379,
    };

    this.pcloudShareQueue = new Queue('pcloud-share-queue', { connection });
    this.importQueue = new Queue('import-queue', { connection });
    this.campaignQueue = new Queue('campaign-queue', { connection });

    await Promise.all([
      this.pcloudShareQueue.waitUntilReady(),
      this.importQueue.waitUntilReady(),
      this.campaignQueue.waitUntilReady(),
    ]);

    this.logger.log('🚀 BullMQ queues connected to Redis (pcloud-share-queue, import-queue, campaign-queue)');
  }

  async enqueuePCloudShareJob(data: any) {
    if (!this.pcloudShareQueue) throw new Error('pCloud share queue is not initialized');
    return this.pcloudShareQueue.add('pcloud-share', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 3000 },
    });
  }

  async enqueueCampaignJob(data: any) {
    if (!this.campaignQueue) throw new Error('Campaign queue is not initialized');
    return this.campaignQueue.add('process-campaign', data, { attempts: 1 });
  }

  async enqueueImportJob(data: any) {
    if (!this.importQueue) throw new Error('Import queue is not initialized');
    return this.importQueue.add('process-import', data, { attempts: 1 });
  }
}
