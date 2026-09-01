import { createEmailDispatchWorker } from './email-dispatch.worker';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
};

const worker = createEmailDispatchWorker(redisConnection);

const shutdown = async (signal: string) => {
  console.log(`[Email Dispatch Worker] Received ${signal}, shutting down...`);
  await worker.close();
  process.exit(0);
};

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

console.log(`[Email Dispatch Worker] Started on Redis ${redisConnection.host}:${redisConnection.port}`);
