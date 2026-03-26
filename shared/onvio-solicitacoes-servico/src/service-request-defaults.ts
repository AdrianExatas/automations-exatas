import type { ServiceRequestRow } from "./types";

export function buildDefaultServiceRequestSubject(row: ServiceRequestRow): string {
  const label = row.nome || row.codigo || row.cnpj;
  return `Solicitacao de servico - ${label}`;
}

export function buildDefaultServiceRequestDescription(
  row: ServiceRequestRow,
  attachmentCount: number,
): string {
  const label = row.nome || row.codigo || row.cnpj;
  if (attachmentCount > 0) {
    return `Solicitacao automatica para ${label} com ${attachmentCount} arquivo(s) em anexo.`;
  }

  return `Solicitacao automatica para ${label} sem anexos.`;
}
