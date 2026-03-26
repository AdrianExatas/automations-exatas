import type { ServiceRequestDefaultContent, ServiceRequestRow } from "../../types";

export function buildLegacyUnecontSubject(row: ServiceRequestRow): string {
  const label = row.nome || row.codigo || row.cnpj;
  return `Relatorio Servicos Tomados - ${label}`;
}

export function buildLegacyUnecontDescription(
  row: ServiceRequestRow,
  attachmentCount: number,
): string {
  const label = row.nome || row.codigo || row.cnpj;
  return `Upload automatico do relatorio Unecont para ${label} com ${attachmentCount} arquivo(s).`;
}

export const legacyUnecontDefaultContent: ServiceRequestDefaultContent = {
  subject: buildLegacyUnecontSubject,
  description: (row, context) => buildLegacyUnecontDescription(row, context.attachmentCount),
};
