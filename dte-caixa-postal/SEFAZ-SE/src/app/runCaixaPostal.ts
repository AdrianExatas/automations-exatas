import { access } from 'node:fs/promises';

import { writeCaixaPostalReport } from './caixaPostalReport';
import { SefazHttpClient } from './sefazHttpClient';
import {
  pickLatestOccurrence,
  type CompanyLink,
  type Occurrence,
} from './sefazPortalParsers';
import type {
  EmpresaReportRow,
  FailureRow,
  RunCallbacks,
  RunLogEntry,
  RunOptions,
  RunResult,
} from './types';

export async function runCaixaPostal(
  options: RunOptions,
  callbacks: RunCallbacks = {},
): Promise<RunResult> {
  const startedAt = new Date().toISOString();
  let processed = 0;

  await validateRunOptions(options);
  emitLog(callbacks, 'info', 'Inicializando varredura HTTP da Caixa Postal.');

  const client = await SefazHttpClient.create(options);

  try {
    emitLog(callbacks, 'info', 'Autenticando no portal da SEFAZ com certificado digital via HTTP.');
    await client.login();

    emitLog(callbacks, 'info', 'Carregando a lista de empresas da Caixa Postal.');
    const companies = await client.getCompanies();
    if (companies.length === 0) {
      throw new Error('Nenhuma empresa foi encontrada na lista da Caixa Postal.');
    }

    emitLog(callbacks, 'info', `${companies.length} empresa(s) localizada(s) para processamento.`);

    const rows: EmpresaReportRow[] = [];
    const failures: FailureRow[] = [];

    for (const [index, company] of companies.entries()) {
      processed = index + 1;
      emitProgress(callbacks, {
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
        const { unreadOccurrence, readOccurrence } = await client.getCompanyOccurrences(company);
        rows.push(buildCompanyRow(company, unreadOccurrence, readOccurrence));
      } catch (error) {
        const message = formatError(error);
        rows.push(buildErrorRow(company, message));
        failures.push({
          identificacao: company.identificacao,
          razao_social: company.razaoSocial,
          erro: message,
        });
        emitLog(callbacks, 'error', `Falha ao processar ${company.identificacao}: ${message}`);
      }
    }

    const outputPath = await writeCaixaPostalReport({
      outputDir: options.outputDir,
      rows,
      failures,
    });

    emitLog(callbacks, 'info', `Relatorio salvo em: ${outputPath}`);

    return {
      outputPath,
      processed,
      failures,
      startedAt,
      finishedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message = formatError(error);
    emitLog(callbacks, 'error', message);
    throw new Error(message);
  }
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

  if (options.executionStrategy !== 'http') {
    throw new Error(`Estrategia de execucao nao suportada: ${options.executionStrategy}.`);
  }
}

function buildCompanyRow(
  company: CompanyLink,
  unreadOccurrence: Occurrence | null,
  readOccurrence: Occurrence | null,
): EmpresaReportRow {
  const latestOccurrence = pickLatestOccurrence(unreadOccurrence, readOccurrence);
  const status = latestOccurrence || unreadOccurrence || readOccurrence ? 'ok' : 'sem_ocorrencias';

  return {
    identificacao: company.identificacao,
    razao_social: company.razaoSocial,
    msg_nao_lidas_lista: company.msgNaoLidas,
    ultima_geral_origem: latestOccurrence?.source ?? '',
    ultima_geral_numero: latestOccurrence?.numero ?? '',
    ultima_geral_orgao: latestOccurrence?.orgao ?? '',
    ultima_geral_unidade: latestOccurrence?.unidade ?? '',
    ultima_geral_assunto: latestOccurrence?.assunto ?? '',
    ultima_geral_data_publicacao: latestOccurrence?.dataPublicacao ?? '',
    ultima_geral_data_ciencia: latestOccurrence?.dataCiencia ?? '',
    ultima_geral_responsavel_ciencia: latestOccurrence?.responsavelCiencia ?? '',
    ultima_geral_link: latestOccurrence?.link ?? '',
    ultima_nao_lida_numero: unreadOccurrence?.numero ?? '',
    ultima_nao_lida_orgao: unreadOccurrence?.orgao ?? '',
    ultima_nao_lida_unidade: unreadOccurrence?.unidade ?? '',
    ultima_nao_lida_assunto: unreadOccurrence?.assunto ?? '',
    ultima_nao_lida_data_publicacao: unreadOccurrence?.dataPublicacao ?? '',
    ultima_nao_lida_data_ciencia: unreadOccurrence?.dataCiencia ?? '',
    ultima_nao_lida_responsavel_ciencia: unreadOccurrence?.responsavelCiencia ?? '',
    ultima_nao_lida_link: unreadOccurrence?.link ?? '',
    status,
    erro: '',
  };
}

function buildErrorRow(company: CompanyLink, error: string): EmpresaReportRow {
  return {
    identificacao: company.identificacao,
    razao_social: company.razaoSocial,
    msg_nao_lidas_lista: company.msgNaoLidas,
    ultima_geral_origem: '',
    ultima_geral_numero: '',
    ultima_geral_orgao: '',
    ultima_geral_unidade: '',
    ultima_geral_assunto: '',
    ultima_geral_data_publicacao: '',
    ultima_geral_data_ciencia: '',
    ultima_geral_responsavel_ciencia: '',
    ultima_geral_link: '',
    ultima_nao_lida_numero: '',
    ultima_nao_lida_orgao: '',
    ultima_nao_lida_unidade: '',
    ultima_nao_lida_assunto: '',
    ultima_nao_lida_data_publicacao: '',
    ultima_nao_lida_data_ciencia: '',
    ultima_nao_lida_responsavel_ciencia: '',
    ultima_nao_lida_link: '',
    status: 'erro',
    erro: error,
  };
}

function emitProgress(
  callbacks: RunCallbacks,
  progress: { current: number; total: number; companyId: string; companyName: string },
): void {
  callbacks.onProgress?.(progress);
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
