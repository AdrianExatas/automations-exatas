import { loadServiceRequestsFromExcel, type ServiceRequestRow } from "@exatas/onvio-solicitacoes-servico";
import type { SheetPreviewRow } from "./types";

export function loadSheetPreview(filePath: string): {
  rows: SheetPreviewRow[];
  totalRows: number;
} {
  const rows = loadServiceRequestsFromExcel(filePath).map((row, rowIndex) => ({
    ...row,
    rowIndex,
  }));
  return { rows, totalRows: rows.length };
}

export function toPreviewPayload(row: ServiceRequestRow & { rowIndex: number }) {
  return {
    rowIndex: row.rowIndex,
    cnpj: row.cnpj,
    codigo: row.codigo,
    nome: row.nome,
    solicitante: row.solicitante,
    departamento: row.departamento,
    assunto: row.assunto,
    descricao: row.descricao,
  };
}
