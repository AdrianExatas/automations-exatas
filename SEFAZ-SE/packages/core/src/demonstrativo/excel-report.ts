import { mkdir } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { ReportEntry, ReportFormat, RunConfig } from "./types";

type DetailRow = {
  Ordem: number;
  Competencia: string;
  Inscricao: string;
  Empresa: string;
  Formato: string;
  Status: string;
  Via: string;
  Arquivo: string;
  Mensagem: string;
};

type SummaryRow = {
  Competencia: string;
  Formato: string;
  Sucessos: number;
  Erros: number;
  Total: number;
};

export function buildExcelReportPath(config: RunConfig): string {
  return path.resolve(config.outDir, config.competencia.value, "relatorio-execucao.xlsx");
}

export async function saveExcelReport(config: RunConfig, entries: ReportEntry[]): Promise<string> {
  const filePath = buildExcelReportPath(config);
  await mkdir(path.dirname(filePath), { recursive: true });

  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.json_to_sheet(buildSummaryRows(config, entries));
  const details = XLSX.utils.json_to_sheet(buildDetailRows(entries));

  summary["!cols"] = [{ wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];
  details["!cols"] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 48 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 90 },
    { wch: 90 },
  ];

  XLSX.utils.book_append_sheet(workbook, summary, "Resumo");
  XLSX.utils.book_append_sheet(workbook, details, "Execucoes");
  XLSX.writeFile(workbook, filePath, { bookType: "xlsx", compression: true });
  return filePath;
}

export function buildDetailRows(entries: ReportEntry[]): DetailRow[] {
  return entries.map((entry, index) => ({
    Ordem: index + 1,
    Competencia: entry.competencia,
    Inscricao: entry.inscricao,
    Empresa: entry.empresa,
    Formato: entry.formato.toUpperCase(),
    Status: entry.status,
    Via: entry.via,
    Arquivo: entry.path ?? "",
    Mensagem: entry.mensagem ?? "",
  }));
}

export function buildSummaryRows(config: RunConfig, entries: ReportEntry[]): SummaryRow[] {
  return config.formats.map((format) => buildSummaryRow(config.competencia.value, entries, format));
}

function buildSummaryRow(competencia: string, entries: ReportEntry[], format: ReportFormat): SummaryRow {
  const filtered = entries.filter((entry) => entry.formato === format);
  const successes = filtered.filter((entry) => entry.status === "sucesso").length;
  const errors = filtered.filter((entry) => entry.status === "erro").length;
  return {
    Competencia: competencia,
    Formato: format.toUpperCase(),
    Sucessos: successes,
    Erros: errors,
    Total: filtered.length,
  };
}
