import { Worker, Job } from 'bullmq';

export function createImportWorker(redisConnection: { host: string; port: number }) {
  const worker = new Worker(
    'import-queue',
    async (job: Job) => {
      console.log(`[Import Worker] Processing import job ${job.data.importJobId}`);
      return { success: true, processedAt: new Date().toISOString() };
    },
    { connection: redisConnection }
  );

  return worker;
}
