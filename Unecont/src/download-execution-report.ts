import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { DownloadBatchResult, DownloadBatchItemResult } from "./types";

const REPORT_DIRNAME = "_meta";
const REPORT_FILENAME = "relatorio-execucao.xlsx";

type SheetRow = Record<string, string | number>;

function resolveReportPath(downloadsDir: string): string {
  return path.join(path.resolve(downloadsDir), REPORT_DIRNAME, REPORT_FILENAME);
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

function buildSummaryRows(result: DownloadBatchResult): SheetRow[] {
  return [
    { CAMPO: "RUN_ID", VALOR: result.runId },
    { CAMPO: "DOWNLOADS_DIR", VALOR: result.downloadsDir },
    { CAMPO: "TOTAL", VALOR: result.summary.total },
    { CAMPO: "SUCESSO", VALOR: result.summary.success },
    { CAMPO: "SEM_NOTAS", VALOR: result.summary.noNotas },
    { CAMPO: "NAO_ENCONTRADAS", VALOR: result.summary.notFound },
    { CAMPO: "FALHAS", VALOR: result.summary.failed },
    { CAMPO: "PULADAS", VALOR: result.summary.skipped },
  ];
}

function buildItemRow(item: DownloadBatchItemResult): SheetRow {
  return {
    CODIGO: item.empresa.codigo,
    EMPRESA: item.empresa.nome,
    CNPJ: item.empresa.cnpj,
    STATUS: item.status,
    MENSAGEM: item.message ?? "",
    ARQUIVO: item.filePath ? path.basename(item.filePath) : "",
    ARQUIVO_PATH: item.filePath ?? "",
    SOLICITANTE: item.empresa.solicitante,
    DEPARTAMENTO: item.empresa.departamento,
    ASSUNTO: item.empresa.assunto,
  };
}

export function writeDownloadExecutionReport(result: DownloadBatchResult): string {
  const reportPath = resolveReportPath(result.downloadsDir);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const summaryRows = buildSummaryRows(result);
  const itemRows = result.items.map(buildItemRow);
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet["!cols"] = estimateColumnWidths(summaryRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo");

  const itemsSheet = XLSX.utils.json_to_sheet(itemRows);
  itemsSheet["!cols"] = estimateColumnWidths(itemRows);
  XLSX.utils.book_append_sheet(workbook, itemsSheet, "Itens");

  XLSX.writeFile(workbook, reportPath);
  return reportPath;
}
