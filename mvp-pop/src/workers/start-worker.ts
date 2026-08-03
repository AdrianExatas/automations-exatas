import { mkdirSync } from "node:fs";
import { getConfig, getStoragePaths } from "../config";
import { getDb } from "../db/client";
import {
  checkRedisConnection,
  createSubmissionWorker,
} from "./queue";
import { processSubmission } from "./pipeline";
import { updateSubmission } from "../db/repository";

const paths = getStoragePaths();
mkdirSync(paths.base, { recursive: true });
mkdirSync(paths.uploads, { recursive: true });
mkdirSync(paths.outputs, { recursive: true });
mkdirSync(paths.work, { recursive: true });
mkdirSync(paths.publishRoot, { recursive: true });
mkdirSync(paths.entrada, { recursive: true });
getDb();

await checkRedisConnection();
console.log(`[mvp-pop-worker] Redis OK — concurrency ${getConfig().QUEUE_CONCURRENCY}`);

const worker = createSubmissionWorker(async (submissionId, mode) => {
  try {
    await processSubmission(submissionId, mode);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    updateSubmission(submissionId, { status: "erro", errorMessage: message });
    throw err;
  }
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Falha ${job?.id}:`, err.message);
});

console.log("[mvp-pop-worker] Aguardando jobs...");
