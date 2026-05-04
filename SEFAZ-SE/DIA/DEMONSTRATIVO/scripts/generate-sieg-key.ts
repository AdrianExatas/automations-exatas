import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

await loadDotEnv();

const generatedDir = path.resolve("src", "generated");
const outputPath = path.join(generatedDir, "sieg-key.ts");
const shouldEmbed = ["1", "true", "yes", "sim"].includes((Bun.env.SIEG_EMBED_API_KEY ?? "").toLowerCase());
const apiKey = shouldEmbed ? Bun.env.SIEG_API_KEY?.trim() ?? "" : "";

if (shouldEmbed && !apiKey) {
  throw new Error("SIEG_EMBED_API_KEY=1 exige SIEG_API_KEY configurada no ambiente ou no .env.");
}

await mkdir(generatedDir, { recursive: true });
await writeFile(
  outputPath,
  [
    "// Arquivo gerado por scripts/generate-sieg-key.ts.",
    "// Nao edite manualmente e nao versionar chave real.",
    `export const EMBEDDED_SIEG_API_KEY = ${JSON.stringify(apiKey)};`,
    "",
  ].join("\n"),
  "utf8",
);

if (!apiKey) {
  console.warn("Executavel gerado sem chave SIEG embutida. Defina SIEG_API_KEY no ambiente de execucao ou use SIEG_EMBED_API_KEY=1 no build.");
}

async function loadDotEnv(): Promise<void> {
  const envPath = path.resolve(".env");
  if (!existsSync(envPath)) {
    return;
  }

  const text = await readFile(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/);
    if (!match) {
      continue;
    }

    const key = match[1]!;
    Bun.env[key] ??= unquote(match[2]!.trim());
  }
}

function unquote(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  return value;
}
