import type { ServiceRequestBatchResult, ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";

export const BACKUP_SOLICITACOES_TIPO = "backup-solicitacoes-lote-v1" as const;

export interface BackupSolicitacaoItem {
  ticketId: string;
  cnpj: string;
  codigo: string;
  nome: string;
  solicitante: string;
  departamento: string;
  assunto: string;
  descricao: string;
  attachmentCount: number;
}

export interface BackupSolicitacoesLote {
  tipo: typeof BACKUP_SOLICITACOES_TIPO;
  createdAt: string;
  planilhaPath?: string;
  defaultDepartmentName?: string;
  defaultDepartmentId?: string;
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    reversible: number;
  };
  items: BackupSolicitacaoItem[];
}

export function buildBackupFromBatchResult(
  result: ServiceRequestBatchResult,
  meta: {
    planilhaPath?: string;
    defaultDepartmentName?: string;
    defaultDepartmentId?: string;
  } = {},
): BackupSolicitacoesLote {
  const items: BackupSolicitacaoItem[] = result.items
    .filter((item) => item.status === "success" && item.ticketId?.trim())
    .map((item) => toBackupItem(item.serviceRequest, item.ticketId!, item.attachmentCount ?? 0));

  return {
    tipo: BACKUP_SOLICITACOES_TIPO,
    createdAt: new Date().toISOString(),
    planilhaPath: meta.planilhaPath,
    defaultDepartmentName: meta.defaultDepartmentName,
    defaultDepartmentId: meta.defaultDepartmentId,
    summary: {
      total: result.summary.total,
      success: result.summary.success,
      failed: result.summary.failed,
      skipped: result.summary.skipped,
      reversible: items.length,
    },
    items,
  };
}

function toBackupItem(
  row: ServiceRequestRow,
  ticketId: string,
  attachmentCount: number,
): BackupSolicitacaoItem {
  return {
    ticketId: ticketId.trim(),
    cnpj: row.cnpj,
    codigo: row.codigo,
    nome: row.nome,
    solicitante: row.solicitante,
    departamento: row.departamento,
    assunto: row.assunto,
    descricao: row.descricao,
    attachmentCount,
  };
}

export function parseBackupSolicitacoes(raw: unknown): BackupSolicitacoesLote {
  const data = raw as BackupSolicitacoesLote;
  if (!data || data.tipo !== BACKUP_SOLICITACOES_TIPO) {
    throw new Error('Backup invalido: espere tipo "backup-solicitacoes-lote-v1".');
  }
  if (!Array.isArray(data.items)) {
    throw new Error("Backup invalido: lista de items ausente.");
  }
  const items = data.items
    .map((item) => ({
      ticketId: String(item.ticketId ?? "").trim(),
      cnpj: String(item.cnpj ?? ""),
      codigo: String(item.codigo ?? ""),
      nome: String(item.nome ?? ""),
      solicitante: String(item.solicitante ?? ""),
      departamento: String(item.departamento ?? ""),
      assunto: String(item.assunto ?? ""),
      descricao: String(item.descricao ?? ""),
      attachmentCount: Number(item.attachmentCount ?? 0),
    }))
    .filter((item) => item.ticketId);
  if (items.length === 0) {
    throw new Error("Backup sem tickets reversiveis (nenhum ticketId).");
  }
  return { ...data, items };
}
