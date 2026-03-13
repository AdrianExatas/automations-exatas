import { z } from 'zod';

const envSchema = z.object({
  ONVIO_EMAIL: z.string().email('ONVIO_EMAIL must be a valid email'),
  ONVIO_PASSWORD: z.string().min(1, 'ONVIO_PASSWORD is required'),
  ONVIO_PFX_PATH: z.string().min(1, 'ONVIO_PFX_PATH is required'),
  ONVIO_PFX_PASSWORD: z.string().min(1, 'ONVIO_PFX_PASSWORD is required'),
  ONVIO_CNPJ: z
    .string()
    .regex(/^\d{14}$/, 'ONVIO_CNPJ must be 14 digits (CNPJ without punctuation)'),
  ONVIO_BASE_URL: z.string().url().optional().default('https://onvio.com.br'),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: unknown): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors
      .map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`Invalid env: ${msg}`);
  }
  return parsed.data;
}

export function getEnv(): Env {
  return parseEnv(process.env);
}
