import path from "node:path";
import process from "node:process";
import { generateInputWorkbook } from "./input-generator.js";

async function main(): Promise<void> {
  const cwd = process.cwd();
  const requestsPath = path.resolve(cwd, "requisicoes.txt");
  const templatePath = path.resolve(cwd, "model.xlsx");

  console.log(`Lendo requisicoes de: ${requestsPath}`);
  console.log(`Usando planilha modelo: ${templatePath}`);

  const workbookPath = await generateInputWorkbook({
    requestsPath,
    templatePath,
    cwd,
  });

  console.log(`Nova planilha salva em: ${workbookPath}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
