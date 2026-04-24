import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const generatedDir = path.resolve("src", "generated");
const outputPath = path.join(generatedDir, "sieg-key.ts");
const shouldEmbed = ["1", "true", "yes", "sim"].includes((Bun.env.SIEG_EMBED_API_KEY ?? "").toLowerCase());
const apiKey = shouldEmbed ? Bun.env.SIEG_API_KEY?.trim() ?? "" : "";

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
