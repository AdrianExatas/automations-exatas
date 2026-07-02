import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { uploadRoutes } from "./routes/upload";
import { jobsRoutes } from "./routes/jobs";
import { downloadRoutes } from "./routes/download";
import { feedbackRoutes } from "./routes/feedback";
import { getConfig, getStoragePaths } from "../config";
import {
  checkOllamaConnection,
  getLlmProviderName,
} from "../agents/providers";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  return new Elysia()
    .use(cors())
    .use(
      staticPlugin({
        assets: join(__dirname, "static"),
        prefix: "/static",
      }),
    )
    .use(uploadRoutes)
    .use(jobsRoutes)
    .use(downloadRoutes)
    .use(feedbackRoutes)
    .get("/", () => Bun.file(join(__dirname, "static", "index.html")))
    .get("/suggestions", () =>
      Bun.file(join(__dirname, "static", "suggestions.html")),
    )
    .get("/health", async () => {
      const config = getConfig();
      const storage = getStoragePaths();

      let llm: { provider: string; ok: boolean; error?: string; models?: string[] };

      if (config.LLM_PROVIDER === "ollama") {
        const ollama = await checkOllamaConnection();
        llm = {
          provider: "ollama",
          ok: ollama.ok,
          error: ollama.error,
          models: ollama.models,
        };
      } else {
        llm = {
          provider: "gemini",
          ok: !!config.GEMINI_API_KEY,
          error: config.GEMINI_API_KEY ? undefined : "GEMINI_API_KEY não configurada",
        };
      }

      return {
        status: "ok",
        llm,
        storage: storage.base,
        llmProvider: getLlmProviderName(),
      };
    });
}
