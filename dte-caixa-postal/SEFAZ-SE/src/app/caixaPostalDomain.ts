import type {
  DetailedMessageRow,
  EmpresaReportRow,
  FailureRow,
  MessagePeriodBucket,
} from './types';
import type { CompanyLink, Occurrence } from './sefazPortalParsers';

export interface CollectCaixaPostalDataResult {
  rows: EmpresaReportRow[];
  failures: FailureRow[];
  messages: DetailedMessageRow[];
  processed: number;
}

export interface CompanyArtifacts {
  row: EmpresaReportRow;
  messages: DetailedMessageRow[];
}

export function buildCompanyArtifacts(
  company: CompanyLink,
  unreadMessages: Occurrence[],
  readMessages: Occurrence[],
  referenceDate: Date,
): CompanyArtifacts {
  const latestUnread = pickLatestOccurrenceFromList(unreadMessages);
  const deduplicatedMessages = deduplicateMessages([...unreadMessages, ...readMessages]);
  const latestGeneral = pickLatestOccurrenceFromList(deduplicatedMessages);
  const status = deduplicatedMessages.length > 0 ? 'ok' : 'sem_ocorrencias';

  return {
    row: {
      identificacao: company.identificacao,
      razao_social: company.razaoSocial,
      msg_nao_lidas_lista: company.msgNaoLidas,
      ultima_geral_origem: latestGeneral?.source ?? '',
      ultima_geral_numero: latestGeneral?.numero ?? '',
      ultima_geral_orgao: latestGeneral?.orgao ?? '',
      ultima_geral_unidade: latestGeneral?.unidade ?? '',
      ultima_geral_assunto: latestGeneral?.assunto ?? '',
      ultima_geral_data_publicacao: latestGeneral?.dataPublicacao ?? '',
      ultima_geral_data_ciencia: latestGeneral?.dataCiencia ?? '',
      ultima_geral_responsavel_ciencia: latestGeneral?.responsavelCiencia ?? '',
      ultima_geral_link: latestGeneral?.link ?? '',
      ultima_nao_lida_numero: latestUnread?.numero ?? '',
      ultima_nao_lida_orgao: latestUnread?.orgao ?? '',
      ultima_nao_lida_unidade: latestUnread?.unidade ?? '',
      ultima_nao_lida_assunto: latestUnread?.assunto ?? '',
      ultima_nao_lida_data_publicacao: latestUnread?.dataPublicacao ?? '',
      ultima_nao_lida_data_ciencia: latestUnread?.dataCiencia ?? '',
      ultima_nao_lida_responsavel_ciencia: latestUnread?.responsavelCiencia ?? '',
      ultima_nao_lida_link: latestUnread?.link ?? '',
      status,
      erro: '',
    },
    messages: sortDetailedMessages(
      deduplicatedMessages.map((message) => toDetailedMessageRow(company, message, referenceDate)),
    ),
  };
}

export function buildErrorArtifacts(company: CompanyLink, error: string): {
  row: EmpresaReportRow;
  failure: FailureRow;
} {
  return {
    row: {
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
    },
    failure: {
      identificacao: company.identificacao,
      razao_social: company.razaoSocial,
      erro: error,
    },
  };
}

export function classifyMessagePeriod(
  timestamp: number,
  referenceDate: Date,
): MessagePeriodBucket {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return 'demais';
  }

  const messageDate = new Date(timestamp);
  const messageYear = messageDate.getUTCFullYear();
  const messageMonth = messageDate.getUTCMonth();
  const referenceYear = referenceDate.getFullYear();
  const referenceMonth = referenceDate.getMonth();

  if (messageYear === referenceYear && messageMonth === referenceMonth) {
    return 'mes_atual';
  }

  const previousMonthDate = new Date(referenceYear, referenceMonth - 1, 1);
  if (
    messageYear === previousMonthDate.getFullYear() &&
    messageMonth === previousMonthDate.getMonth()
  ) {
    return 'mes_anterior';
  }

  return 'demais';
}

export function sortDetailedMessages(messages: DetailedMessageRow[]): DetailedMessageRow[] {
  return [...messages].sort((left, right) => {
    const companyCompare = left.identificacao.localeCompare(right.identificacao);
    if (companyCompare !== 0) {
      return companyCompare;
    }

    const rightTimestamp = parseReportDateToTimestamp(right.data_publicacao);
    const leftTimestamp = parseReportDateToTimestamp(left.data_publicacao);
    if (leftTimestamp !== rightTimestamp) {
      return rightTimestamp - leftTimestamp;
    }

    const sourceCompare = left.origem.localeCompare(right.origem);
    if (sourceCompare !== 0) {
      return sourceCompare;
    }

    return left.numero.localeCompare(right.numero);
  });
}

export function deduplicateMessages(messages: Occurrence[]): Occurrence[] {
  const deduplicated = new Map<string, Occurrence>();

  for (const message of messages) {
    const key = buildDeduplicationKey(message);
    const current = deduplicated.get(key);
    if (!current) {
      deduplicated.set(key, message);
      continue;
    }

    if (shouldReplaceDeduplicatedMessage(current, message)) {
      deduplicated.set(key, message);
    }
  }

  return [...deduplicated.values()];
}

function buildDeduplicationKey(message: Occurrence): string {
  if (message.link) {
    return message.link;
  }

  return `${message.numero}|${message.dataPublicacao}|${message.assunto}|${message.orgao}`;
}

function pickLatestOccurrenceFromList(messages: Occurrence[]): Occurrence | null {
  if (messages.length === 0) {
    return null;
  }

  return [...messages].sort((left, right) => right.timestamp - left.timestamp)[0] ?? null;
}

function shouldReplaceDeduplicatedMessage(current: Occurrence, candidate: Occurrence): boolean {
  if (current.source !== 'nao_lidos' && candidate.source === 'nao_lidos') {
    return true;
  }

  if (candidate.timestamp > current.timestamp) {
    return true;
  }

  return false;
}

function toDetailedMessageRow(
  company: CompanyLink,
  message: Occurrence,
  referenceDate: Date,
): DetailedMessageRow {
  return {
    identificacao: company.identificacao,
    razao_social: company.razaoSocial,
    origem: message.source,
    periodo: classifyMessagePeriod(message.timestamp, referenceDate),
    chave_deduplicacao: buildDeduplicationKey(message),
    numero: message.numero,
    orgao: message.orgao,
    unidade: message.unidade,
    assunto: message.assunto,
    data_publicacao: message.dataPublicacao,
    data_ciencia: message.dataCiencia,
    responsavel_ciencia: message.responsavelCiencia,
    link: message.link,
  };
}

function parseReportDateToTimestamp(value: string): number {
  const match = value.match(
    /(?<day>\d{2})\/(?<month>\d{2})\/(?<year>\d{4})(?:\s+(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2}))?/,
  );

  if (!match?.groups) {
    return 0;
  }

  return Date.UTC(
    Number.parseInt(match.groups.year, 10),
    Number.parseInt(match.groups.month, 10) - 1,
    Number.parseInt(match.groups.day, 10),
    Number.parseInt(match.groups.hour ?? '0', 10),
    Number.parseInt(match.groups.minute ?? '0', 10),
    Number.parseInt(match.groups.second ?? '0', 10),
  );
}
