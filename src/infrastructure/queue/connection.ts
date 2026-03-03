import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { env } from '../../shared/config/env.js';

const redisUrl = new URL(env.REDIS_URL);

export const redisConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  password: redisUrl.password || undefined,
  db: 0,
};

export const QUEUE_NAMES = {
  INDEXER: 'indexer',
  SNAPSHOT: 'snapshot',
  RECONCILER: 'reconciler',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export function createQueue<TData>(name: string): Queue<TData> {
  return new Queue<TData>(name, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 50,
    },
  });
}

export function createWorker<TData, TResult>(
  name: string,
  processor: (job: { data: TData; id?: string }) => Promise<TResult>,
): Worker<TData, TResult> {
  return new Worker<TData, TResult>(name, processor, {
    connection: redisConnection,
    concurrency: 1,
  });
}
