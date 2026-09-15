import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";

import type { CompanyResult, DteMessage, FailureRecord, RunReport } from "./types.js";

const COMPANY_HEADERS: Array<[keyof CompanyResult, string]> = [
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["procurationStatus", "SITUACAO_PROCURACAO"],
  ["authorizedDet", "AUTORIZADO_DET"],
  ["totalMessages", "TOTAL_MENSAGENS"],
  ["unreadMessages", "NAO_LIDAS"],
  ["status", "STATUS"],
  ["error", "ERRO"],
];

const MESSAGE_HEADERS: Array<[keyof DteMessage, string]> = [
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["uid", "UID"],
  ["title", "TITULO"],
  ["text", "TEXTO"],
  ["sender", "REMETENTE"],
  ["type", "TIPO"],
  ["situation", "SITUACAO"],
  ["archived", "ARQUIVADA"],
  ["createdAt", "DATA_CRIACAO"],
  ["readAt", "DATA_LEITURA"],
  ["readByDeadlineAt", "DATA_LEITURA_DECURSO_PRAZO"],
  ["sourceSystem", "SISTEMA_ORIGEM"],
];

const FAILURE_HEADERS: Array<[keyof FailureRecord, string]> = [
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["stage", "ETAPA"],
  ["category", "CATEGORIA"],
  ["httpStatus", "STATUS_HTTP"],
  ["message", "ERRO"],
  ["retryable", "REPETIVEL"],
];

export interface WrittenReports {
  jsonPath: string;
  companiesCsvPath: string;
  messagesCsvPath: string;
  failuresCsvPath: string;
  workbookPath: string;
}

export async function writeReports(runDir: string, report: RunReport): Promise<WrittenReports> {
  await mkdir(runDir, { recursive: true });
  const jsonPath = path.join(runDir, "execucao.json");
  const companiesCsvPath = path.join(runDir, "empresas.csv");
  const messagesCsvPath = path.join(runDir, "mensagens.csv");
  const failuresCsvPath = path.join(runDir, "falhas.csv");
  const workbookPath = path.join(runDir, "relatorio.xlsx");

  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(companiesCsvPath, toCsv(report.companies, COMPANY_HEADERS), "utf8"),
    writeFile(messagesCsvPath, toCsv(report.messages, MESSAGE_HEADERS), "utf8"),
    writeFile(failuresCsvPath, toCsv(report.failures, FAILURE_HEADERS), "utf8"),
  ]);
  await writeWorkbook(workbookPath, report);

  return { jsonPath, companiesCsvPath, messagesCsvPath, failuresCsvPath, workbookPath };
}

export function toCsv<T extends object>(rows: T[], headers: Array<[keyof T, string]>): string {
  const lines = [headers.map(([, label]) => csvCell(label)).join(";")];
  for (const row of rows) {
    lines.push(headers.map(([key]) => csvCell(row[key])).join(";"));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

async function writeWorkbook(filePath: string, report: RunReport): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DTE Consulta SPE";
  workbook.created = new Date(report.startedAt);
  workbook.modified = new Date(report.finishedAt);

  const executionRows = [
    { campo: "schema_version", valor: report.schemaVersion },
    { campo: "collector_version", valor: report.collectorVersion },
    { campo: "inicio", valor: report.startedAt },
    { campo: "fim", valor: report.finishedAt },
    { campo: "fuso", valor: report.timezone },
    ...Object.entries(report.summary).map(([campo, valor]) => ({ campo, valor })),
  ];
  addSheet(workbook, "Execucao", executionRows, [
    ["campo", "CAMPO"],
    ["valor", "VALOR"],
  ]);
  addSheet(workbook, "Empresas", report.companies, COMPANY_HEADERS);
  addSheet(workbook, "Mensagens", report.messages, MESSAGE_HEADERS);
  addSheet(workbook, "Falhas", report.failures, FAILURE_HEADERS);

  await workbook.xlsx.writeFile(filePath);
}

function addSheet<T extends object>(
  workbook: ExcelJS.Workbook,
  name: string,
  rows: T[],
  headers: Array<[keyof T, string]>,
): void {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = headers.map(([key, header]) => ({ key: String(key), header, width: columnWidth(header) }));
  rows.forEach((row) => sheet.addRow(row));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${columnName(headers.length)}1` };
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1351B4" } };
  });
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function columnWidth(header: string): number {
  if (header.includes("TEXTO") || header.includes("ERRO")) return 70;
  if (header.includes("RAZAO") || header.includes("TITULO")) return 42;
  if (header.includes("DATA")) return 25;
  return Math.max(14, Math.min(30, header.length + 4));
}

function columnName(value: number): string {
  let current = value;
  let result = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    current = Math.floor((current - 1) / 26);
  }
  return result || "A";
}
