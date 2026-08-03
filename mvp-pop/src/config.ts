import { z } from "zod";
import { join, resolve } from "node:path";

const llmProviderSchema = z.enum(["ollama", "gemini", "mock"]);

const envSchema = z
  .object({
    LLM_PROVIDER: llmProviderSchema.default("ollama"),
    OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("llama3.2:3b"),
    OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
    REDIS_URL: z.string().default("redis://localhost:6380"),
    STORAGE_PATH: z.string().default("./storage"),
    DATABASE_PATH: z.string().optional(),
    PUBLISH_ROOT: z.string().optional(),
    GERADOR_ROOT: z.string().default("./vendor/gerador"),
    BASE_URL: z.string().default("http://localhost:3100"),
    MAX_RETRIES: z.coerce.number().int().positive().default(3),
    PORT: z.coerce.number().int().positive().default(3100),
    QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(1),
    BUILD_CONCURRENCY: z.coerce.number().int().positive().default(1),
    SKIP_OFFICE: z
      .string()
      .default("0")
      .transform((v) => v === "1" || v.toLowerCase() === "true"),
    INLINE_QUEUE: z
      .string()
      .default("0")
      .transform((v) => v === "1" || v.toLowerCase() === "true"),
    NOTIFY_WEBHOOK_URL: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.LLM_PROVIDER === "gemini" && !data.GEMINI_API_KEY?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "GEMINI_API_KEY é obrigatória quando LLM_PROVIDER=gemini",
        path: ["GEMINI_API_KEY"],
      });
    }
  })
  .transform((data) => {
    const storage = resolve(data.STORAGE_PATH);
    return {
      ...data,
      STORAGE_PATH: storage,
      DATABASE_PATH: data.DATABASE_PATH
        ? resolve(data.DATABASE_PATH)
        : join(storage, "mvp-pop.db"),
      PUBLISH_ROOT: data.PUBLISH_ROOT
        ? resolve(data.PUBLISH_ROOT)
        : join(storage, "GESTAO DE PROCESSOS"),
      GERADOR_ROOT: resolve(data.GERADOR_ROOT),
      GEMINI_API_KEY: data.GEMINI_API_KEY ?? "",
      NOTIFY_WEBHOOK_URL: data.NOTIFY_WEBHOOK_URL ?? "",
    };
  });

export type Config = z.infer<typeof envSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = envSchema.parse(process.env);
  }
  return cachedConfig;
}

export function resetConfigForTests() {
  cachedConfig = null;
}

export function getStoragePaths() {
  const { STORAGE_PATH, PUBLISH_ROOT, GERADOR_ROOT } = getConfig();
  return {
    base: STORAGE_PATH,
    uploads: join(STORAGE_PATH, "uploads"),
    outputs: join(STORAGE_PATH, "outputs"),
    work: join(STORAGE_PATH, "work"),
    publishRoot: PUBLISH_ROOT,
    entrada: join(PUBLISH_ROOT, "00 - Entrada de Documentacoes"),
    geradorRoot: GERADOR_ROOT,
    geradorScripts: join(GERADOR_ROOT, "scripts"),
  };
}
