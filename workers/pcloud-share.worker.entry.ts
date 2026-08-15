import { createPCloudShareWorker } from './pcloud-share.worker';

const redisConnection = {
  host: process.env.REDIS_HOST || 'redis',
  port: Number(process.env.REDIS_PORT || 6379),
};

const worker = createPCloudShareWorker(redisConnection);

const shutdown = async (signal: string) => {
  console.log(`[pCloud Worker] Received ${signal}, shutting down...`);
  await worker.close();
  await Promise.resolve();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

console.log(`[pCloud Worker] Started on Redis ${redisConnection.host}:${redisConnection.port}`);
