import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { staticPlugin } from "@elysiajs/static";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { submissionsRoutes } from "./routes/submissions";
import { indexMasterRoutes } from "./routes/index-master";
import { panelRoutes } from "./routes/panel";
import { filesRoutes } from "./routes/files";
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
        assets: join(__dirname, "public"),
        prefix: "/static",
      }),
    )
    .use(submissionsRoutes)
    .use(indexMasterRoutes)
    .use(panelRoutes)
    .use(filesRoutes)
    .get("/", () => Bun.file(join(__dirname, "public", "index.html")))
    .get("/validacao", () => Bun.file(join(__dirname, "public", "validacao.html")))
    .get("/painel", () => Bun.file(join(__dirname, "public", "painel.html")))
    .get("/indice", () => Bun.file(join(__dirname, "public", "indice.html")))
    .get("/health", async () => {
      const config = getConfig();
      const storage = getStoragePaths();
      let llm: { provider: string; ok: boolean; error?: string };
      if (config.LLM_PROVIDER === "ollama") {
        const ollama = await checkOllamaConnection();
        llm = { provider: "ollama", ok: ollama.ok, error: ollama.error };
      } else if (config.LLM_PROVIDER === "mock") {
        llm = { provider: "mock", ok: true };
      } else {
        llm = {
          provider: "gemini",
          ok: !!config.GEMINI_API_KEY,
          error: config.GEMINI_API_KEY ? undefined : "GEMINI_API_KEY ausente",
        };
      }
      return {
        status: "ok",
        llm,
        llmProvider: getLlmProviderName(),
        storage: storage.base,
        publishRoot: storage.publishRoot,
        skipOffice: config.SKIP_OFFICE,
      };
    });
}
