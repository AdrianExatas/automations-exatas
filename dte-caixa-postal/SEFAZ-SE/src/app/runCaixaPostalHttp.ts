import { buildCompanyArtifacts, buildErrorArtifacts, type CollectCaixaPostalDataResult } from './caixaPostalDomain';
import { SefazHttpClient } from './sefazHttpClient';
import type { RunCallbacks, RunLogEntry, RunOptions } from './types';

export async function runCaixaPostalHttp(
  options: RunOptions,
  callbacks: RunCallbacks,
  referenceDate: Date,
): Promise<CollectCaixaPostalDataResult> {
  const client = await SefazHttpClient.create(options);
  emitLog(callbacks, 'info', 'Autenticando no portal da SEFAZ com certificado digital via HTTP.');
  await client.login();

  emitLog(callbacks, 'info', 'Carregando a lista de empresas da Caixa Postal via HTTP.');
  const companies = await client.getCompanies();
  if (companies.length === 0) {
    throw new Error('Nenhuma empresa foi encontrada na lista da Caixa Postal.');
  }

  emitLog(callbacks, 'info', `${companies.length} empresa(s) localizada(s) para processamento.`);

  const rows = [];
  const failures = [];
  const messages = [];

  for (const [index, company] of companies.entries()) {
    const processed = index + 1;
    callbacks.onProgress?.({
      current: processed,
      total: companies.length,
      companyId: company.identificacao,
      companyName: company.razaoSocial,
    });
    emitLog(
      callbacks,
      'info',
      `[${processed}/${companies.length}] Processando ${company.identificacao} - ${company.razaoSocial}`,
    );

    try {
      const { unreadMessages, readMessages } = await client.getCompanyMessages(company);
      const artifacts = buildCompanyArtifacts(company, unreadMessages, readMessages, referenceDate);
      rows.push(artifacts.row);
      messages.push(...artifacts.messages);
    } catch (error) {
      const artifacts = buildErrorArtifacts(company, formatError(error));
      rows.push(artifacts.row);
      failures.push(artifacts.failure);
      emitLog(
        callbacks,
        'error',
        `Falha ao processar ${company.identificacao} via HTTP: ${artifacts.failure.erro}`,
      );
    }
  }

  return {
    rows,
    failures,
    messages,
    processed: companies.length,
  };
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
