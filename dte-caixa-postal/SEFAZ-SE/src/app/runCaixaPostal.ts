import { access } from 'node:fs/promises';

import { writeCaixaPostalReport } from './caixaPostalReport';
import type { CollectCaixaPostalDataResult } from './caixaPostalDomain';
import { runCaixaPostalBrowser } from './runCaixaPostalBrowser';
import { runCaixaPostalHttp } from './runCaixaPostalHttp';
import type { RunCallbacks, RunLogEntry, RunOptions, RunResult } from './types';

export async function runCaixaPostal(
  options: RunOptions,
  callbacks: RunCallbacks = {},
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  const referenceDate = new Date();

  await validateRunOptions(options);
  emitLog(
    callbacks,
    'info',
    `Inicializando varredura da Caixa Postal com estrategia ${options.executionStrategy}.`,
  );

  const data = await runByStrategy(options, callbacks, referenceDate);
  const outputPath = await writeCaixaPostalReport({
    outputDir: options.outputDir,
    rows: data.rows,
    failures: data.failures,
    messages: data.messages,
  });

  emitLog(callbacks, 'info', `Relatorio salvo em: ${outputPath}`);

  return {
    outputPath,
    processed: data.processed,
    failures: data.failures,
    startedAt,
    finishedAt: new Date().toISOString(),
  };
}

async function validateRunOptions(options: RunOptions): Promise<void> {
  try {
    await access(options.certificatePath);
  } catch {
    throw new Error(`Certificado .pfx nao encontrado no caminho configurado: ${options.certificatePath}`);
  }

  if (!options.certificatePassword.trim()) {
    throw new Error('A senha do certificado esta vazia no config.json.');
  }

  if (options.chromeChannel !== 'chrome') {
    throw new Error(`Canal de navegador nao suportado: ${options.chromeChannel}.`);
  }
}

async function runByStrategy(
  options: RunOptions,
  callbacks: RunCallbacks,
  referenceDate: Date,
): Promise<CollectCaixaPostalDataResult> {
  try {
    if (options.executionStrategy === 'browser') {
      return await runCaixaPostalBrowser(options, callbacks, referenceDate);
    }

    return await runCaixaPostalHttp(options, callbacks, referenceDate);
  } catch (error) {
    const message = formatError(error);
    emitLog(callbacks, 'error', message);
    throw new Error(message);
  }
}

function emitLog(callbacks: RunCallbacks, level: RunLogEntry['level'], message: string): void {
  callbacks.onLog?.({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
