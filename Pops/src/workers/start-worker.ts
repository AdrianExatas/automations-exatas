import { createPopWorker } from "./queue";
import { processPopJob } from "./pop-processor";
import { getDb } from "../db/client";
import { checkRedisConnection } from "./queue";
import { getConfig, getStoragePaths } from "../config";
import { mkdirSync } from "node:fs";
import { checkOllamaConnection } from "../agents/providers";

const { LLM_PROVIDER, STORAGE_PATH } = getConfig();
const { base, uploads, outputs } = getStoragePaths();

mkdirSync(base, { recursive: true });
mkdirSync(uploads, { recursive: true });
mkdirSync(outputs, { recursive: true });

getDb();
await checkRedisConnection();

if (LLM_PROVIDER === "ollama") {
  const ollama = await checkOllamaConnection();
  if (!ollama.ok) {
    console.error("[worker] Ollama indisponível:", ollama.error);
    process.exit(1);
  }
}

console.log(`[worker] Storage: ${STORAGE_PATH}`);

const worker = createPopWorker(processPopJob);

worker.on("completed", (job) => {
  console.log(`[worker] Job concluído: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job falhou: ${job?.id}`, err.message);
});

console.log("[worker] Auto-POP worker iniciado");

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
