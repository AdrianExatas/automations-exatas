import { Queue, Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { getConfig } from "../config";

export const POP_QUEUE_NAME = "pop-processing";

let connection: IORedis | null = null;
let queue: Queue | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    const { REDIS_URL } = getConfig();
    connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  return connection;
}

export function getConnectionOptions(): ConnectionOptions {
  return getRedisConnection() as unknown as ConnectionOptions;
}

export function getPopQueue(): Queue {
  if (!queue) {
    queue = new Queue(POP_QUEUE_NAME, {
      connection: getConnectionOptions(),
    });
  }
  return queue;
}

export async function enqueuePopJob(jobId: string): Promise<void> {
  const popQueue = getPopQueue();
  await popQueue.add(
    "process-pop",
    { jobId },
    {
      jobId: `pop-${jobId}`,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 1,
    },
  );
}

export function createPopWorker(
  processor: (jobId: string) => Promise<void>,
): Worker {
  const { QUEUE_CONCURRENCY } = getConfig();
  return new Worker(
    POP_QUEUE_NAME,
    async (job) => {
      const { jobId } = job.data as { jobId: string };
      await processor(jobId);
    },
    {
      connection: getConnectionOptions(),
      concurrency: QUEUE_CONCURRENCY,
    },
  );
}

export async function checkRedisConnection(): Promise<void> {
  const redis = getRedisConnection();
  await redis.ping();
}

export async function closeQueueConnections(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
  if (connection) {
    await connection.quit();
    connection = null;
  }
}
