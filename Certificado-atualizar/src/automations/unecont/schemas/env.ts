import { z } from 'zod';

const envSchema = z.object({
  UNECONT_EMAIL: z.string().min(1, 'UNECONT_EMAIL is required').email('UNECONT_EMAIL must be a valid email'),
  UNECONT_PASSWORD: z.string().min(1, 'UNECONT_PASSWORD is required'),
  UNECONT_CNPJ: z.string().trim().optional().default(''),
  UNECONT_PFX_PASSWORD: z.string().trim().optional().default(''),
  UNECONT_SELECAO_MANUAL: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

export type UnecontEnv = z.infer<typeof envSchema>;

export function getEnv(raw: NodeJS.ProcessEnv = process.env): UnecontEnv {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.errors
      .map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    throw new Error(`Invalid UNECONT env: ${msg}`);
  }
  return parsed.data;
}
