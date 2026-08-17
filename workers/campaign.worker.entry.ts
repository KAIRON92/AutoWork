import { createCampaignWorker } from './campaign.worker';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

const worker = createCampaignWorker(redisConnection);

const shutdown = async (signal: string) => {
  console.log(`[Campaign Worker] Received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

console.log(`[Campaign Worker] Started on Redis ${redisConnection.host}:${redisConnection.port}`);
