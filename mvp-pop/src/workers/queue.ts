import { Queue, Worker, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";
import { getConfig } from "../config";

export const SUBMISSION_QUEUE_NAME = "mvp-pop-submissions";

let connection: IORedis | null = null;
let queue: Queue | null = null;
let inlineProcessor:
  | ((submissionId: string, mode: "full" | "adjust") => Promise<void>)
  | null = null;

export function setInlineProcessor(
  processor: (submissionId: string, mode: "full" | "adjust") => Promise<void>,
) {
  inlineProcessor = processor;
}

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

export function getSubmissionQueue(): Queue {
  if (!queue) {
    queue = new Queue(SUBMISSION_QUEUE_NAME, {
      connection: getConnectionOptions(),
    });
  }
  return queue;
}

export async function enqueueSubmission(
  submissionId: string,
  mode: "full" | "adjust" = "full",
): Promise<void> {
  if (getConfig().INLINE_QUEUE) {
    if (!inlineProcessor) {
      throw new Error("INLINE_QUEUE ativo, mas processador não registrado");
    }
    setTimeout(() => {
      inlineProcessor?.(submissionId, mode).catch((err) => {
        console.error(`[inline-queue] Falha ${submissionId}:`, err);
      });
    }, 0);
    return;
  }

  const q = getSubmissionQueue();
  await q.add(
    mode === "adjust" ? "adjust-docs" : "process-submission",
    { submissionId, mode },
    {
      jobId: `${mode}-${submissionId}-${Date.now()}`,
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 1,
    },
  );
}

export function createSubmissionWorker(
  processor: (submissionId: string, mode: "full" | "adjust") => Promise<void>,
): Worker | { close: () => Promise<void> } {
  if (getConfig().INLINE_QUEUE) {
    setInlineProcessor(processor);
    return {
      close: async () => {
        inlineProcessor = null;
      },
    };
  }

  const { QUEUE_CONCURRENCY } = getConfig();
  return new Worker(
    SUBMISSION_QUEUE_NAME,
    async (job) => {
      const data = job.data as { submissionId: string; mode?: "full" | "adjust" };
      await processor(data.submissionId, data.mode ?? "full");
    },
    {
      connection: getConnectionOptions(),
      concurrency: QUEUE_CONCURRENCY,
    },
  );
}

export async function checkRedisConnection(): Promise<void> {
  if (getConfig().INLINE_QUEUE) return;
  await getRedisConnection().ping();
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
