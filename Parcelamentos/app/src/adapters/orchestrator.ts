import fs from "node:fs";
import path from "node:path";
import { runAlAdapter } from "./al.js";
import { runPiAdapter } from "./pi.js";
import { runSeAdapter } from "./se.js";
import { materializeInputWorkbook } from "../shared/input.js";
import { writeConsolidatedReport } from "../shared/report.js";
import type {
  AdapterRunResult,
  OrchestratorResult,
  ProgressEvent,
  RunRequest,
  UfCode,
} from "../shared/types.js";

export async function runOrchestrator(options: {
  request: RunRequest;
  workDir: string;
  log: (message: string) => void;
  shouldCancel: () => boolean;
  onProgress: (progress: ProgressEvent) => void;
}): Promise<OrchestratorResult> {
  const { request } = options;
  fs.mkdirSync(request.downloadDir, { recursive: true });
  fs.mkdirSync(options.workDir, { recursive: true });

  const perUf: AdapterRunResult[] = [];
  let cancelled = false;

  for (const uf of request.ufs) {
    if (options.shouldCancel()) {
      cancelled = true;
      options.log("Execucao cancelada antes de iniciar o proximo estado.");
      break;
    }

    options.log(`\n=== Iniciando SEFAZ-${uf} ===`);

    const inputPath = await materializeInputWorkbook({
      uf,
      mode: request.inputMode,
      sheetPath: request.sheetPath,
      downloadDir: request.downloadDir,
      workDir: options.workDir,
    });

    const cwd = path.dirname(inputPath);
    const relativeInput = path.basename(inputPath);

    let adapterResult: AdapterRunResult;

    if (uf === "AL") {
      adapterResult = await runAlAdapter({
        inputPath: relativeInput,
        cwd,
        outputDir: request.downloadDir,
        headed: request.headed,
        log: options.log,
        shouldCancel: options.shouldCancel,
        onProgress: options.onProgress,
      });
    } else if (uf === "PI") {
      adapterResult = await runPiAdapter({
        inputPath: relativeInput,
        cwd,
        headed: request.headed,
        log: options.log,
        shouldCancel: options.shouldCancel,
        onProgress: options.onProgress,
      });
    } else {
      adapterResult = await runSeAdapter({
        inputPath: relativeInput,
        cwd,
        headed: request.headed,
        log: options.log,
        shouldCancel: options.shouldCancel,
        onProgress: options.onProgress,
      });
    }

    perUf.push(adapterResult);
    cancelled = cancelled || adapterResult.cancelled;

    if (adapterResult.cancelled) {
      break;
    }
  }

  const results = perUf.flatMap((item) => item.results);
  const successCount = results.filter((item) => item.status === "sucesso").length;
  const errorCount = results.filter((item) => item.status === "erro").length;
  const ignoredCount = results.filter((item) => item.status === "ignorado").length;
  const reportPath = await writeConsolidatedReport(results, path.join(options.workDir, "output"));

  options.log(`\nResumo final: ${successCount} sucesso(s), ${ignoredCount} ignorado(s), ${errorCount} falha(s).`);
  options.log(`Relatorio consolidado: ${reportPath}`);

  return {
    ok: errorCount === 0 && !cancelled,
    cancelled,
    successCount,
    errorCount,
    ignoredCount,
    reportPath,
    downloadDir: request.downloadDir,
    results,
    perUf,
  };
}

export function resolveUfs(selection: string): UfCode[] {
  if (selection === "ALL") {
    return ["AL", "PI", "SE"];
  }

  if (selection === "AL" || selection === "PI" || selection === "SE") {
    return [selection];
  }

  throw new Error("Selecione um estado valido.");
}
