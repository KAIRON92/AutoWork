import { Worker, Job } from 'bullmq';

export function createCampaignWorker(redisConnection: { host: string; port: number }) {
  const worker = new Worker(
    'campaign-queue',
    async (job: Job) => {
      console.log(`[Campaign Worker] Orchestrating campaign ${job.data.campaignId}`);
      return { success: true, orchestratedAt: new Date().toISOString() };
    },
    { connection: redisConnection }
  );

  return worker;
}
