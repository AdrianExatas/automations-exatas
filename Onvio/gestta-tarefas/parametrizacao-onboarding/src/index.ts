import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { executarParametrizacao } from "./execution";
import { validarInput } from "./input";
import { getDefaultMatrixPath } from "./matrix";
import { salvarRelatorios } from "./relatorio";
import { ParametrizacaoInput } from "./types";

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

interface CliArgs {
  inputJson: string | null;
  matrixPath: string;
  dryRun: boolean;
}

function getArgValue(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index < 0) return null;
  return args[index + 1] ?? null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const explicitDryRun = args.includes("--dry-run");
  if (apply && explicitDryRun) {
    throw new Error("Use apenas um modo: --apply ou --dry-run.");
  }

  const inputJson = getArgValue(args, "--input-json");
  const matrixArg = getArgValue(args, "--matrix");

  return {
    inputJson,
    matrixPath: matrixArg
      ? path.resolve(process.cwd(), matrixArg)
      : getDefaultMatrixPath(),
    dryRun: !apply,
  };
}

function lerInput(filePath: string | null): ParametrizacaoInput {
  if (!filePath) {
    throw new Error("Informe --input-json caminho.json.");
  }

  const resolved = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Input JSON nao encontrado: ${resolved}`);
  return validarInput(JSON.parse(fs.readFileSync(resolved, "utf8")));
}

async function main(): Promise<void> {
  console.log("Parametrizacao Onboarding Gestta\n");
  const args = parseArgs();
  const input = lerInput(args.inputJson);

  console.log(`Modo: ${args.dryRun ? "dry-run" : "apply"}`);
  console.log(`Matriz: ${args.matrixPath}`);
  console.log(`CNPJ: ${input.cnpj}\n`);

  const relatorio = await executarParametrizacao({
    matrixPath: args.matrixPath,
    input,
    dryRun: args.dryRun,
    emitLog: (message) => process.stdout.write(message),
  });

  const { jsonPath, xlsxPath } = salvarRelatorios(relatorio);
  console.log(`\nRelatorio JSON: ${jsonPath}`);
  console.log(`Relatorio XLSX: ${xlsxPath}`);

  if (relatorio.execucao.falha > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
