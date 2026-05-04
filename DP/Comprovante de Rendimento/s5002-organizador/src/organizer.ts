import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import { messageOf } from "./errors";
import { findExistingXmlWithSameContent, nextWritablePath, outputXmlName, sanitizePathPart } from "./paths";
import { saveReports } from "./report";
import type { DetailEntry, DetailErrorCode, RunCallbacks, RunConfig, RunProgress, RunResult } from "./types";
import { isS5002XmlEntry, MissingXmlFieldError, parseS5002Metadata } from "./xml";

const decoder = new TextDecoder("utf-8");

export async function runS5002Organizer(config: RunConfig, callbacks: RunCallbacks = {}): Promise<RunResult> {
  const inputDir = path.resolve(config.inputDir.trim());
  const outputDir = path.resolve(config.outputDir.trim());
  await validateDirectory(inputDir, "Pasta de entrada nao encontrada.");
  await mkdir(outputDir, { recursive: true });

  const zipPaths = await findZipFiles(inputDir);
  const details: DetailEntry[] = [];
  const state = {
    successCount: 0,
    errorCount: 0,
    ignoredCount: 0,
    s5002Count: 0,
    processedCount: 0,
  };

  emitProgress(callbacks, {
    phase: "descobrindo",
    message: `${zipPaths.length} ZIP(s) encontrado(s).`,
    current: 0,
    total: zipPaths.length,
    outputDir,
    ...state,
  });

  callbacks.onLog?.(`${zipPaths.length} ZIP(s) encontrado(s) em ${inputDir}.`);

  for (const [zipIndex, zipPath] of zipPaths.entries()) {
    throwIfAborted(callbacks.signal);
    const sourceZip = path.basename(zipPath);
    callbacks.onLog?.(`Processando ${sourceZip}...`);

    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(new Uint8Array(await readFile(zipPath)));
    } catch (error) {
      state.errorCount += 1;
      details.push(createErrorEntry(details, sourceZip, undefined, "zip_invalido", `Nao foi possivel abrir o ZIP: ${messageOf(error)}`));
      emitProgress(callbacks, {
        phase: "processando",
        message: `Falha ao abrir ${sourceZip}.`,
        current: zipIndex + 1,
        total: zipPaths.length,
        outputDir,
        ...state,
      });
      continue;
    }

    const names = Object.keys(entries).sort((a, b) => a.localeCompare(b));
    for (const entryName of names) {
      throwIfAborted(callbacks.signal);
      if (entryName.endsWith("/") || !isS5002XmlEntry(entryName)) {
        state.ignoredCount += 1;
        continue;
      }

      state.s5002Count += 1;
      state.processedCount += 1;
      await processXmlEntry({
        sourceZip,
        entryName,
        bytes: entries[entryName]!,
        outputDir,
        details,
        state,
      });
    }

    emitProgress(callbacks, {
      phase: "processando",
      message: `${sourceZip} processado.`,
      current: zipIndex + 1,
      total: zipPaths.length,
      outputDir,
      ...state,
    });
  }

  emitProgress(callbacks, {
    phase: "relatorio",
    message: "Gerando relatorios...",
    current: zipPaths.length,
    total: zipPaths.length,
    outputDir,
    ...state,
  });

  const reportBase = {
    inputDir,
    outputDir,
    zipCount: zipPaths.length,
    s5002Count: state.s5002Count,
    ignoredCount: state.ignoredCount,
    successCount: state.successCount,
    errorCount: state.errorCount,
    entries: details,
  };
  const reportPaths = await saveReports(reportBase);
  const result: RunResult = { ...reportBase, ...reportPaths };

  emitProgress(callbacks, {
    phase: "concluido",
    message: "Processamento concluido.",
    current: zipPaths.length,
    total: zipPaths.length,
    outputDir,
    excelPath: result.excelPath,
    jsonPath: result.jsonPath,
    ...state,
  });

  callbacks.onLog?.(`Concluido: ${state.successCount} XML(s) organizado(s), ${state.errorCount} erro(s), ${state.ignoredCount} arquivo(s) ignorado(s).`);
  return result;
}

async function processXmlEntry(input: {
  sourceZip: string;
  entryName: string;
  bytes: Uint8Array;
  outputDir: string;
  details: DetailEntry[];
  state: { successCount: number; errorCount: number };
}): Promise<void> {
  let metadata: { cpfBenef: string; perApur: string };
  try {
    metadata = parseS5002Metadata(decoder.decode(input.bytes));
  } catch (error) {
    input.state.errorCount += 1;
    const code = error instanceof MissingXmlFieldError ? error.code : "xml_invalido";
    input.details.push(createErrorEntry(input.details, input.sourceZip, input.entryName, code, messageOf(error)));
    return;
  }

  try {
    const collaboratorDir = path.join(input.outputDir, sanitizePathPart(metadata.cpfBenef));
    await mkdir(collaboratorDir, { recursive: true });
    const targetPath =
      (await findExistingXmlWithSameContent(collaboratorDir, input.bytes)) ??
      (await nextWritablePath(path.join(collaboratorDir, outputXmlName(input.entryName, metadata.perApur)), input.bytes));
    await writeFile(targetPath, input.bytes);
    input.state.successCount += 1;
    input.details.push({
      ordem: input.details.length + 1,
      status: "sucesso",
      sourceZip: input.sourceZip,
      sourceEntry: input.entryName,
      cpf: metadata.cpfBenef,
      perApur: metadata.perApur,
      outputPath: targetPath,
    });
  } catch (error) {
    input.state.errorCount += 1;
    input.details.push(createErrorEntry(input.details, input.sourceZip, input.entryName, "gravacao_falhou", messageOf(error), metadata.cpfBenef, metadata.perApur));
  }
}

async function findZipFiles(inputDir: string): Promise<string[]> {
  const names = await readdir(inputDir, { withFileTypes: true });
  return names
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".zip"))
    .map((entry) => path.join(inputDir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function validateDirectory(directory: string, message: string): Promise<void> {
  try {
    const info = await stat(directory);
    if (!info.isDirectory()) {
      throw new Error(message);
    }
  } catch {
    throw new Error(message);
  }
}

function createErrorEntry(
  details: DetailEntry[],
  sourceZip: string,
  sourceEntry: string | undefined,
  errorCode: DetailErrorCode,
  message: string,
  cpf?: string,
  perApur?: string,
): DetailEntry {
  return {
    ordem: details.length + 1,
    status: "erro",
    sourceZip,
    sourceEntry,
    cpf,
    perApur,
    errorCode,
    message,
  };
}

function emitProgress(callbacks: RunCallbacks, progress: RunProgress): void {
  callbacks.onProgress?.(progress);
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("Execucao cancelada.");
  }
}
