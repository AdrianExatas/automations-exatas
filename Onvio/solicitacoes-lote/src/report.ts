import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { ServiceRequestBatchResult } from "@exatas/onvio-solicitacoes-servico";
import { buildBackupFromBatchResult, type BackupSolicitacoesLote } from "./backup";

export function writeExecutionReport(
  reportsDir: string,
  result: ServiceRequestBatchResult,
  meta: {
    planilhaPath?: string;
    defaultDepartmentName?: string;
    defaultDepartmentId?: string;
  } = {},
): { jsonPath: string; xlsxPath: string; backupPath: string } {
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(reportsDir, `execucao_${stamp}.json`);
  const xlsxPath = path.join(reportsDir, `execucao_${stamp}.xlsx`);
  const backupPath = path.join(reportsDir, `backup_solicitacoes_${stamp}.json`);

  const backup = buildBackupFromBatchResult(result, meta);
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2), "utf8");
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");

  const rows = result.items.map((item) => ({
    STATUS: item.status,
    CODIGO: item.serviceRequest.codigo,
    CNPJ: item.serviceRequest.cnpj,
    EMPRESA: item.serviceRequest.nome,
    SOLICITANTE: item.serviceRequest.solicitante,
    DEPARTAMENTO: item.serviceRequest.departamento,
    ASSUNTO: item.serviceRequest.assunto,
    TICKET_ID: item.ticketId ?? "",
    ANEXOS: item.attachmentCount ?? 0,
    MENSAGEM: item.message ?? "",
    AVISOS: (item.warnings ?? []).join(" | "),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Resultado");
  XLSX.writeFile(workbook, xlsxPath);

  return { jsonPath, xlsxPath, backupPath };
}

export function writeRollbackReport(
  reportsDir: string,
  origemBackup: string,
  backup: BackupSolicitacoesLote,
  resultados: Array<{ ticketId: string; sucesso: boolean; mensagem: string; codigo?: string; nome?: string }>,
): { jsonPath: string; xlsxPath: string } {
  fs.mkdirSync(reportsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jsonPath = path.join(reportsDir, `reversao_${stamp}.json`);
  const xlsxPath = path.join(reportsDir, `reversao_${stamp}.xlsx`);

  const payload = {
    tipo: "reversao-solicitacoes-lote-v1",
    createdAt: new Date().toISOString(),
    origemBackup,
    backupCreatedAt: backup.createdAt,
    summary: {
      total: resultados.length,
      sucesso: resultados.filter((item) => item.sucesso).length,
      falha: resultados.filter((item) => !item.sucesso).length,
    },
    resultados,
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      resultados.map((item) => ({
        TICKET_ID: item.ticketId,
        CODIGO: item.codigo ?? "",
        EMPRESA: item.nome ?? "",
        SUCESSO: item.sucesso ? "SIM" : "NAO",
        MENSAGEM: item.mensagem,
      })),
    ),
    "Reversao",
  );
  XLSX.writeFile(workbook, xlsxPath);
  return { jsonPath, xlsxPath };
}
