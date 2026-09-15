#!/usr/bin/env bun
import { createWriteStream } from "node:fs";
import { join } from "node:path";
import { Command } from "commander";
import { PATHS } from "../core/config.js";
import { executarCapturaComFallback } from "../consulta/runner.js";
import { limparCheckpoint } from "../download/checkpoint.js";
import { codigoSaidaDownload, executarDownload } from "../download/runner.js";
import { downloadState, resetDownloadState } from "../download/state.js";
import { ensureDir } from "../utils/fs.js";

type TaskName = "consulta" | "download-upload";

function timestampForFile(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "_",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function setupTaskLog(taskName: TaskName): () => Promise<void> {
  const logDir = join(PATHS.logsDir, "tasks");
  ensureDir(logDir);
  const logPath = join(logDir, `${taskName}_${timestampForFile()}.log`);
  const stream = createWriteStream(logPath, { flags: "a" });

  const stdoutWrite = process.stdout.write.bind(process.stdout);
  const stderrWrite = process.stderr.write.bind(process.stderr);

  process.stdout.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: (error?: Error | null) => void) => {
    stream.write(chunk);
    return stdoutWrite(chunk, encoding as BufferEncoding, cb);
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array, encoding?: BufferEncoding | ((error?: Error | null) => void), cb?: (error?: Error | null) => void) => {
    stream.write(chunk);
    return stderrWrite(chunk, encoding as BufferEncoding, cb);
  }) as typeof process.stderr.write;

  console.log(`[TASK] Log: ${logPath}`);

  return async () => {
    process.stdout.write = stdoutWrite;
    process.stderr.write = stderrWrite;
    await new Promise<void>((resolve, reject) => {
      stream.once("finish", resolve);
      stream.once("error", reject);
      stream.end();
    });
  };
}

async function runLoggedTask(taskName: TaskName, task: () => Promise<number>): Promise<void> {
  const teardown = setupTaskLog(taskName);
  const startedAt = Date.now();
  let exitCode = 1;

  try {
    console.log(`[TASK] Iniciando ${taskName} em ${new Date().toLocaleString("pt-BR")}`);
    exitCode = await task();
  } catch (error) {
    console.error(`[ERRO] ${error instanceof Error ? error.message : String(error)}`);
    exitCode = 1;
  } finally {
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[TASK] Finalizado ${taskName} com exit code ${exitCode} em ${seconds}s`);
    await teardown();
  }

  process.exit(exitCode);
}

async function runConsulta(): Promise<number> {
  const sucesso = await executarCapturaComFallback({ headless: true });
  return sucesso ? 0 : 1;
}

async function runDownloadUpload(options: { fromZero: boolean }): Promise<number> {
  if (options.fromZero) {
    console.log("[TASK] Limpando checkpoint de download para execucao do zero");
    limparCheckpoint();
  }

  resetDownloadState();
  downloadState.usarHeadless = true;
  downloadState.extrairZips = true;
  downloadState.uploadAutomatico = true;
  const resultado = await executarDownload();
  return codigoSaidaDownload(resultado);
}

const program = new Command();

program
  .name("task")
  .description("Tarefas automatizadas SEFAZ para uso pelo Agendador do Windows");

program
  .command("consulta")
  .description("Executa a consulta/solicitacao diaria em modo headless")
  .action(async () => {
    await runLoggedTask("consulta", runConsulta);
  });

program
  .command("download-upload")
  .description("Executa download e upload automatico em modo headless")
  .option("--from-zero", "Limpa o checkpoint antes de iniciar")
  .action(async (options: { fromZero?: boolean }) => {
    await runLoggedTask("download-upload", () => runDownloadUpload({ fromZero: Boolean(options.fromZero) }));
  });

program.parse(process.argv);
