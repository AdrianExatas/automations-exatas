import { z } from "zod";
import { join } from "node:path";

const llmProviderSchema = z.enum(["ollama", "gemini"]);

const envSchema = z
  .object({
    LLM_PROVIDER: llmProviderSchema.default("ollama"),
    OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
    OLLAMA_MODEL: z.string().default("qwen2.5:7b"),
    OLLAMA_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default("gemini-2.0-flash"),
    REDIS_URL: z.string().default("redis://localhost:6379"),
    STORAGE_PATH: z.string().default("./storage"),
    DATABASE_PATH: z.string().optional(),
    BASE_URL: z.string().default("http://localhost:3000"),
    MAX_RETRIES: z.coerce.number().int().positive().default(3),
    PORT: z.coerce.number().int().positive().default(3000),
    QUEUE_CONCURRENCY: z.coerce.number().int().positive().default(2),
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
  .transform((data) => ({
    ...data,
    DATABASE_PATH: data.DATABASE_PATH ?? join(data.STORAGE_PATH, "auto-pop.db"),
    GEMINI_API_KEY: data.GEMINI_API_KEY ?? "",
  }));

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
  const { STORAGE_PATH } = getConfig();
  return {
    base: STORAGE_PATH,
    uploads: join(STORAGE_PATH, "uploads"),
    outputs: join(STORAGE_PATH, "outputs"),
  };
}
