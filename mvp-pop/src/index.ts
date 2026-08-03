import { mkdirSync } from "node:fs";
import { createApp } from "./server/app";
import { getConfig, getStoragePaths } from "./config";
import { getDb } from "./db/client";
import {
  checkRedisConnection,
  createSubmissionWorker,
} from "./workers/queue";
import { processSubmission } from "./workers/pipeline";
import { updateSubmission } from "./db/repository";
import {
  checkOllamaConnection,
  checkOllamaReachable,
  getLlmProviderName,
} from "./agents/providers";

const { PORT, LLM_PROVIDER, STORAGE_PATH, SKIP_OFFICE } = getConfig();
const paths = getStoragePaths();

for (const p of [
  paths.base,
  paths.uploads,
  paths.outputs,
  paths.work,
  paths.publishRoot,
  paths.entrada,
]) {
  mkdirSync(p, { recursive: true });
}

getDb();

const { INLINE_QUEUE } = getConfig();
if (INLINE_QUEUE) {
  console.log("[mvp-pop] INLINE_QUEUE=1 — processando jobs sem Redis");
} else {
  try {
    await checkRedisConnection();
  } catch (err) {
    console.error("[mvp-pop] Redis indisponível. Rode: docker compose up -d");
    console.error("  Ou defina INLINE_QUEUE=1 no .env para processar em processo.");
    console.error(err);
    process.exit(1);
  }
}

if (LLM_PROVIDER === "ollama") {
  const reachable = await checkOllamaReachable();
  if (!reachable) {
    console.warn("[mvp-pop] Ollama indisponível — jobs de IA falharão até subir.");
  } else {
    const ollama = await checkOllamaConnection();
    if (!ollama.ok) console.warn(`[mvp-pop] ${ollama.error}`);
    else console.log(`[mvp-pop] Ollama OK — ${getConfig().OLLAMA_MODEL}`);
  }
} else if (LLM_PROVIDER === "mock") {
  console.log("[mvp-pop] LLM mock ativo (smoke / piloto sem modelo real)");
}

console.log(`[mvp-pop] LLM: ${getLlmProviderName()}`);
console.log(`[mvp-pop] Storage: ${STORAGE_PATH}`);
console.log(`[mvp-pop] Publish: ${paths.publishRoot}`);
console.log(`[mvp-pop] SKIP_OFFICE: ${SKIP_OFFICE}`);

const worker = createSubmissionWorker(async (submissionId, mode) => {
  try {
    await processSubmission(submissionId, mode);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    updateSubmission(submissionId, { status: "erro", errorMessage: message });
    throw err;
  }
});

if ("on" in worker && typeof worker.on === "function") {
  worker.on("failed", (job: { id?: string } | undefined, err: Error) => {
    console.error(`[worker] Falha ${job?.id}:`, err.message);
  });
}

const app = createApp();
app.listen(PORT, () => {
  console.log(`[mvp-pop] http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
