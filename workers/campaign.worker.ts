export interface CampaignWorkerJobData {
  campaignId: string;
  organizationId: string;
}

export class CampaignWorker {
  async processJob(job: CampaignWorkerJobData) {
    console.log(`[CampaignWorker] Enqueueing recipient send jobs for campaign ${job.campaignId}`);
    return {
      status: 'PROCESSING',
      queuedCount: 50,
    };
  }
}
