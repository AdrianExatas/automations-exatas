import { createApp } from "./server/app";
import { getConfig, getStoragePaths } from "./config";
import { getDb } from "./db/client";
import { mkdirSync } from "node:fs";
import { createPopWorker } from "./workers/queue";
import { processPopJob } from "./workers/pop-processor";
import { checkRedisConnection } from "./workers/queue";
import {
  checkOllamaConnection,
  checkOllamaReachable,
  getLlmProviderName,
} from "./agents/providers";

const { PORT, LLM_PROVIDER, STORAGE_PATH } = getConfig();
const { base, uploads, outputs } = getStoragePaths();

mkdirSync(base, { recursive: true });
mkdirSync(uploads, { recursive: true });
mkdirSync(outputs, { recursive: true });

getDb();

try {
  await checkRedisConnection();
} catch (err) {
  console.error(
    "[auto-pop] Redis indisponível. Inicie com: docker compose up -d",
  );
  console.error(err);
  process.exit(1);
}

if (LLM_PROVIDER === "ollama") {
  const reachable = await checkOllamaReachable();
  if (!reachable) {
    console.error("[auto-pop] Ollama indisponível em http://localhost:11434");
    console.error("  Inicie o Ollama (D:\\Ollama\\ollama.exe) e tente novamente.");
    process.exit(1);
  }

  const ollama = await checkOllamaConnection();
  if (!ollama.ok) {
    console.warn("[auto-pop] Ollama online, mas modelo ainda não instalado.");
    console.warn(`  ${ollama.error}`);
    console.warn("  O servidor vai subir; jobs falham até o modelo estar pronto.");
  } else {
    console.log(`[auto-pop] Ollama OK — modelo ${getConfig().OLLAMA_MODEL}`);
  }
}

console.log(`[auto-pop] LLM: ${getLlmProviderName()}`);
console.log(`[auto-pop] Storage: ${STORAGE_PATH}`);

const worker = createPopWorker(async (jobId) => {
  try {
    await processPopJob(jobId);
  } catch (err) {
    const { updateJobStatus } = await import("./db/repository");
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    updateJobStatus(jobId, "error", { errorMessage: message });
    throw err;
  }
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Falha no job ${job?.id}:`, err.message);
});

const app = createApp();

app.listen(PORT, () => {
  console.log(`[auto-pop] Servidor em http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
