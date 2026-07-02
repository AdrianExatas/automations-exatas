import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { UploadBatchItemResult, UploadBatchResult } from "./types";

const REPORT_DIRNAME = "_meta";
const REPORT_FILENAME = "relatorio-upload.xlsx";

type SheetRow = Record<string, string | number>;

export function generateUploadRunId(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toTimeString().slice(0, 8).replace(/:/g, "-");
  return `Unecont_upload_${date}_${time}`;
}

function resolveReportPath(reportBaseDir: string): string {
  return path.join(path.resolve(reportBaseDir), REPORT_DIRNAME, REPORT_FILENAME);
}

function estimateColumnWidths(rows: SheetRow[]): { wch: number }[] {
  const widths = new Map<string, number>();

  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      const candidate = Math.max(String(key).length, String(value ?? "").length);
      widths.set(key, Math.min(Math.max(widths.get(key) ?? 0, candidate + 2), 80));
    }
  }

  return Object.keys(rows[0] ?? {}).map((key) => ({ wch: widths.get(key) ?? key.length + 2 }));
}

function boolLabel(value: boolean): string {
  return value ? "sim" : "nao";
}

export interface WriteUploadExecutionReportParams {
  result: UploadBatchResult;
  runId: string;
  reportBaseDir: string;
  attachmentsDir: string;
  empresasExcelPath: string;
  dryRun: boolean;
  skipAttachments: boolean;
}

function buildSummaryRows(params: WriteUploadExecutionReportParams): SheetRow[] {
  const { result, runId, attachmentsDir, empresasExcelPath, dryRun, skipAttachments } = params;
  const absExcel = path.resolve(empresasExcelPath);
  const globalWarnings =
    result.warnings.length > 0 ? result.warnings.join("; ") : "";

  const rows: SheetRow[] = [
    { CAMPO: "RUN_ID", VALOR: runId },
    { CAMPO: "ANEXOS_DIR", VALOR: attachmentsDir || "" },
    { CAMPO: "PLANILHA", VALOR: absExcel },
    { CAMPO: "DRY_RUN", VALOR: boolLabel(dryRun) },
    { CAMPO: "SEM_ANEXOS", VALOR: boolLabel(skipAttachments) },
    { CAMPO: "TOTAL", VALOR: result.summary.total },
    { CAMPO: "SUCESSO", VALOR: result.summary.success },
    { CAMPO: "FALHAS", VALOR: result.summary.failed },
    { CAMPO: "PULADAS", VALOR: result.summary.skipped },
    { CAMPO: "AVISOS_GLOBAIS", VALOR: globalWarnings },
  ];

  return rows;
}

function buildItemRow(item: UploadBatchItemResult): SheetRow {
  const avisos = item.warnings?.length ? item.warnings.join("; ") : "";
  return {
    CODIGO: item.empresa.codigo,
    EMPRESA: item.empresa.nome,
    CNPJ: item.empresa.cnpj,
    STATUS: item.status,
    MENSAGEM: item.message ?? "",
    TICKET_ID: item.ticketId ?? "",
    QTD_ANEXOS: item.attachmentCount ?? "",
    SOLICITANTE: item.empresa.solicitante,
    ONVIO_REQUESTER_ID_RESOLVIDO: item.resolvedRequesterId ?? "",
    DEPARTAMENTO: item.empresa.departamento,
    ASSUNTO: item.empresa.assunto,
    AVISOS: avisos,
  };
}

export function writeUploadExecutionReport(params: WriteUploadExecutionReportParams): string {
  const reportPath = resolveReportPath(params.reportBaseDir);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const summaryRows = buildSummaryRows(params);
  const itemRows = params.result.items.map(buildItemRow);
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = estimateColumnWidths(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const itemsSheet = XLSX.utils.json_to_sheet(itemRows);
  if (itemRows.length > 0) {
    itemsSheet["!cols"] = estimateColumnWidths(itemRows);
  }
  XLSX.utils.book_append_sheet(workbook, itemsSheet, "Itens");

  XLSX.writeFile(workbook, reportPath);
  return reportPath;
}
