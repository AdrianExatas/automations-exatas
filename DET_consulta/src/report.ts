import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";
import type { Worksheet } from "exceljs";

import type {
  ActiveWithoutProcurationRecord,
  AnalyzedDteMessage,
  CompanyResult,
  FailureRecord,
  MessagePriority,
  RunReport,
} from "./types.js";

type Header<T extends object> = [keyof T, string];

const COMPANY_HEADERS: Array<Header<CompanyResult>> = [
  ["dominioCode", "CODIGO_DOMINIO"],
  ["dominioStatus", "STATUS_DOMINIO"],
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["procurationStatus", "SITUACAO_PROCURACAO"],
  ["authorizedDet", "AUTORIZADO_DET"],
  ["totalMessages", "TOTAL_MENSAGENS"],
  ["unreadMessages", "NAO_LIDAS"],
  ["status", "STATUS"],
  ["error", "ERRO"],
];

const ACTIVE_WITHOUT_PROCURATION_HEADERS: Array<Header<ActiveWithoutProcurationRecord>> = [
  ["codiEmp", "CODIGO_DOMINIO"],
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
];

const MESSAGE_HEADERS: Array<Header<AnalyzedDteMessage>> = [
  ["priority", "PRIORIDADE"],
  ["requiresAction", "REQUER_ACAO"],
  ["actionStatus", "STATUS_ACAO"],
  ["category", "CATEGORIA"],
  ["responsibleArea", "RESPONSAVEL_SUGERIDO"],
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["title", "ASSUNTO"],
  ["summary", "RESUMO"],
  ["suggestedAction", "ACAO_SUGERIDA"],
  ["deadlineText", "PRAZO_IDENTIFICADO"],
  ["deadlineDate", "DATA_LIMITE"],
  ["deadlineStatus", "STATUS_PRAZO"],
  ["isUnread", "NAO_LIDA"],
  ["scienceStatus", "TIPO_CIENCIA"],
  ["scienceAt", "DATA_CIENCIA"],
  ["classificationReason", "MOTIVO_CLASSIFICACAO"],
  ["classificationConfidence", "CONFIANCA"],
  ["textPlain", "TEXTO_LIMPO"],
  ["uid", "UID"],
  ["sender", "REMETENTE"],
  ["type", "TIPO_BRUTO"],
  ["situation", "SITUACAO_BRUTA"],
  ["archived", "ARQUIVADA"],
  ["createdAt", "DATA_CRIACAO"],
  ["readAt", "DATA_LEITURA_MANUAL"],
  ["readByDeadlineAt", "DATA_DECURSO_PRAZO"],
  ["sourceSystem", "SISTEMA_ORIGEM"],
  ["text", "HTML_ORIGINAL"],
];

const ACTION_HEADERS: Array<Header<AnalyzedDteMessage>> = [
  ["priority", "PRIORIDADE"],
  ["actionStatus", "STATUS_ACAO"],
  ["responsibleArea", "RESPONSAVEL_SUGERIDO"],
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["title", "ASSUNTO"],
  ["summary", "RESUMO"],
  ["suggestedAction", "ACAO_SUGERIDA"],
  ["deadlineText", "PRAZO_IDENTIFICADO"],
  ["deadlineDate", "DATA_LIMITE"],
  ["deadlineStatus", "STATUS_PRAZO"],
  ["isUnread", "NAO_LIDA"],
  ["scienceStatus", "TIPO_CIENCIA"],
  ["scienceAt", "DATA_CIENCIA"],
  ["createdAt", "DATA_CRIACAO"],
  ["classificationReason", "MOTIVO_CLASSIFICACAO"],
  ["classificationConfidence", "CONFIANCA"],
  ["textPlain", "TEXTO_LIMPO"],
  ["uid", "UID"],
];

const FAILURE_HEADERS: Array<Header<FailureRecord>> = [
  ["cnpj", "CNPJ"],
  ["corporateName", "RAZAO_SOCIAL"],
  ["stage", "ETAPA"],
  ["category", "CATEGORIA"],
  ["httpStatus", "STATUS_HTTP"],
  ["message", "ERRO"],
  ["retryable", "REPETIVEL"],
];

interface CompanyAnalysisRow extends CompanyResult {
  highestPriority: string;
  actionMessages: number;
  criticalMessages: number;
  highPriorityMessages: number;
  operationalMessages: number;
  informationalMessages: number;
  reviewMessages: number;
  tacitScienceMessages: number;
  awaitingScienceMessages: number;
  latestActionMessageAt: string;
}

const COMPANY_ANALYSIS_HEADERS: Array<Header<CompanyAnalysisRow>> = [
  ["highestPriority", "MAIOR_PRIORIDADE"],
  ["actionMessages", "ACOES_A_CONFIRMAR"],
  ["criticalMessages", "CRITICAS"],
  ["highPriorityMessages", "ALTAS"],
  ["operationalMessages", "OPERACIONAIS"],
  ["informationalMessages", "INFORMATIVAS"],
  ["reviewMessages", "REVISAR"],
  ["tacitScienceMessages", "CIENCIA_POR_DECURSO"],
  ["awaitingScienceMessages", "AGUARDANDO_CIENCIA"],
  ["latestActionMessageAt", "ULTIMA_ACAO_SUGERIDA_EM"],
  ...COMPANY_HEADERS,
];

interface RuleRow {
  priority: string;
  criterion: string;
  treatment: string;
}

const RULES: RuleRow[] = [
  { priority: "CRITICA", criterion: "Processo administrativo, auto de infração, documento fiscal, decisão ou recurso.", treatment: "Revisão humana imediata pelo jurídico/fiscal; conferir teor e prazo no sistema oficial." },
  { priority: "ALTA", criterion: "Pendência de FGTS, irregularidade de consignado, notificação, intimação, multa ou prazo.", treatment: "Abrir tarefa, conferir a obrigação no sistema oficial e documentar a providência." },
  { priority: "OPERACIONAL", criterion: "Contratação de consignado ou rotina de igualdade/transparência salarial.", treatment: "Encaminhar ao departamento responsável e validar a competência na rotina operacional." },
  { priority: "INFORMATIVA", criterion: "Contato inicial, orientação geral ou aviso sem comando específico identificado.", treatment: "Registrar para consulta; revisar somente quando aplicável ao estabelecimento." },
  { priority: "REVISAR", criterion: "Mensagem sem correspondência com regra conhecida.", treatment: "Classificação manual obrigatória." },
];

export interface WrittenReports {
  jsonPath: string;
  companiesCsvPath: string;
  messagesCsvPath: string;
  unreadMessagesCsvPath: string;
  actionQueueCsvPath: string;
  failuresCsvPath: string;
  activeWithoutProcurationCsvPath?: string;
  workbookPath: string;
}

export async function writeReports(runDir: string, report: RunReport): Promise<WrittenReports> {
  await mkdir(runDir, { recursive: true });
  const jsonPath = path.join(runDir, "execucao.json");
  const companiesCsvPath = path.join(runDir, "empresas.csv");
  const messagesCsvPath = path.join(runDir, "mensagens.csv");
  const unreadMessagesCsvPath = path.join(runDir, "mensagens_nao_lidas.csv");
  const actionQueueCsvPath = path.join(runDir, "fila_acao.csv");
  const failuresCsvPath = path.join(runDir, "falhas.csv");
  const activeWithoutProcCsvPath = path.join(runDir, "ativas_sem_procuracao.csv");
  const workbookPath = path.join(runDir, "relatorio.xlsx");
  const companyRows = buildCompanyAnalysis(report);
  const actionQueue = sortMessages(report.messages.filter((message) => message.requiresAction));
  const unreadMessages = sortMessages(report.messages.filter((message) => message.isUnread));

  const writes: Promise<unknown>[] = [
    writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(companiesCsvPath, toCsv(companyRows, COMPANY_ANALYSIS_HEADERS), "utf8"),
    writeFile(messagesCsvPath, toCsv(sortMessages(report.messages), MESSAGE_HEADERS), "utf8"),
    writeFile(unreadMessagesCsvPath, toCsv(unreadMessages, ACTION_HEADERS), "utf8"),
    writeFile(actionQueueCsvPath, toCsv(actionQueue, ACTION_HEADERS), "utf8"),
    writeFile(failuresCsvPath, toCsv(report.failures, FAILURE_HEADERS), "utf8"),
  ];

  if (report.activeWithoutProcuration && report.activeWithoutProcuration.length > 0) {
    writes.push(
      writeFile(
        activeWithoutProcCsvPath,
        toCsv(report.activeWithoutProcuration, ACTIVE_WITHOUT_PROCURATION_HEADERS),
        "utf8",
      ),
    );
  }

  await Promise.all(writes);
  await writeWorkbook(workbookPath, report, companyRows, actionQueue, unreadMessages);
  return {
    jsonPath,
    companiesCsvPath,
    messagesCsvPath,
    unreadMessagesCsvPath,
    actionQueueCsvPath,
    failuresCsvPath,
    ...(report.activeWithoutProcuration?.length ? { activeWithoutProcurationCsvPath: activeWithoutProcCsvPath } : {}),
    workbookPath,
  };
}

export function toCsv<T extends object>(rows: T[], headers: Array<Header<T>>): string {
  const lines = [headers.map(([, label]) => csvCell(label)).join(";")];
  for (const row of rows) lines.push(headers.map(([key]) => csvCell(row[key])).join(";"));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function buildCompanyAnalysis(report: RunReport): CompanyAnalysisRow[] {
  const byCompany = new Map<string, AnalyzedDteMessage[]>();
  for (const message of report.messages) {
    const items = byCompany.get(message.cnpj) ?? [];
    items.push(message);
    byCompany.set(message.cnpj, items);
  }
  return report.companies.map((company) => {
    const messages = byCompany.get(company.cnpj) ?? [];
    const actionMessages = messages.filter((message) => message.requiresAction);
    return {
      ...company,
      highestPriority: highestPriority(messages),
      actionMessages: actionMessages.length,
      criticalMessages: messages.filter((message) => message.priority === "critica").length,
      highPriorityMessages: messages.filter((message) => message.priority === "alta").length,
      operationalMessages: messages.filter((message) => message.priority === "operacional").length,
      informationalMessages: messages.filter((message) => message.priority === "informativa").length,
      reviewMessages: messages.filter((message) => message.priority === "revisar").length,
      tacitScienceMessages: messages.filter((message) => message.scienceStatus === "ciencia_por_decurso").length,
      awaitingScienceMessages: messages.filter((message) => message.scienceStatus === "aguardando_ciencia").length,
      latestActionMessageAt: actionMessages.map((message) => message.createdAt).sort().at(-1) ?? "",
    };
  });
}

async function writeWorkbook(filePath: string, report: RunReport, companies: CompanyAnalysisRow[], actionQueue: AnalyzedDteMessage[], unreadMessages: AnalyzedDteMessage[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "DTE Consulta SPE";
  workbook.created = new Date(report.startedAt);
  workbook.modified = new Date(report.finishedAt);
  addDashboard(workbook, report);
  addSheet(workbook, "Fila_de_Acao", actionQueue, ACTION_HEADERS);
  addSheet(workbook, "Nao_Lidas", unreadMessages, ACTION_HEADERS);
  addSheet(workbook, "Empresas", companies, COMPANY_ANALYSIS_HEADERS);
  if (report.activeWithoutProcuration && report.activeWithoutProcuration.length > 0) {
    addSheet(workbook, "Ativas_Sem_Procuracao", report.activeWithoutProcuration, ACTIVE_WITHOUT_PROCURATION_HEADERS);
  }
  const messagesSheet = addSheet(workbook, "Mensagens", sortMessages(report.messages), MESSAGE_HEADERS);
  const htmlColumn = MESSAGE_HEADERS.findIndex(([key]) => key === "text") + 1;
  if (htmlColumn > 0) messagesSheet.getColumn(htmlColumn).hidden = true;
  addSheet(workbook, "Falhas", report.failures, FAILURE_HEADERS);
  addSheet(workbook, "Regras", RULES, [["priority", "PRIORIDADE"], ["criterion", "CRITERIO"], ["treatment", "TRATAMENTO_RECOMENDADO"]]);
  await workbook.xlsx.writeFile(filePath);
}

function addDashboard(workbook: ExcelJS.Workbook, report: RunReport): void {
  const sheet = workbook.addWorksheet("Painel", { views: [{ state: "frozen", ySplit: 3 }] });
  sheet.mergeCells("A1:E1");
  sheet.getCell("A1").value = "Painel de triagem — Domicílio Eletrônico Trabalhista";
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  sheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1351B4" } };
  sheet.getCell("A1").alignment = { vertical: "middle" };
  sheet.getRow(1).height = 28;
  sheet.mergeCells("A2:E2");
  sheet.getCell("A2").value = "Triagem automática: confirme no sistema oficial se a providência já foi cumprida. Não lida não significa ausência de ciência legal.";
  sheet.getCell("A2").alignment = { wrapText: true, vertical: "top" };
  sheet.getCell("A2").font = { italic: true, color: { argb: "FF7A4E00" } };
  sheet.getRow(2).height = 34;
  const priorityCounts = countBy(report.messages, (message) => message.priority);
  const metrics: Array<[string, string | number]> = [
    ["Empresas ativas na Domínio", report.summary.dominioActiveCompanies ?? "-"],
    ["Ativas com procuração no SPE", report.summary.processed],
    ["Ativas SEM procuração no SPE", report.summary.activeWithoutProcuration ?? "-"],
    ["Ignoradas (inativas na Domínio)", report.summary.skippedDominioInactive ?? "-"],
    ["Procurações no SPE", report.summary.procurationsFound],
    ["Mensagens", report.summary.messages],
    ["Não lidas manualmente", report.summary.unreadMessages],
    ["Ações a confirmar", report.summary.actionableMessages],
    ["Empresas com ação a confirmar", report.summary.companiesWithAction],
    ["Ciência por decurso", report.summary.tacitScienceMessages],
    ["Aguardando ciência", report.summary.awaitingScienceMessages],
    ["Falhas", report.summary.failed],
  ];
  sheet.getCell("A4").value = "INDICADOR";
  sheet.getCell("B4").value = "TOTAL";
  metrics.forEach(([label, value], index) => {
    sheet.getCell(index + 5, 1).value = label;
    sheet.getCell(index + 5, 2).value = value;
  });
  sheet.getCell("D4").value = "PRIORIDADE";
  sheet.getCell("E4").value = "MENSAGENS";
  (["critica", "alta", "operacional", "informativa", "revisar"] as MessagePriority[]).forEach((priority, index) => {
    sheet.getCell(index + 5, 4).value = priority.toUpperCase();
    sheet.getCell(index + 5, 5).value = priorityCounts.get(priority) ?? 0;
    applyPriorityFill(sheet.getCell(index + 5, 4), priority);
  });
  ["A4", "B4", "D4", "E4"].forEach((address) => styleHeaderCell(sheet.getCell(address)));
  sheet.columns = [{ width: 34 }, { width: 16 }, { width: 4 }, { width: 24 }, { width: 16 }];
}

function addSheet<T extends object>(workbook: ExcelJS.Workbook, name: string, rows: T[], headers: Array<Header<T>>): Worksheet {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = headers.map(([key, header]) => ({ key: String(key), header, width: columnWidth(header) }));
  rows.forEach((row) => sheet.addRow(Object.fromEntries(Object.entries(row).map(([key, value]) => [key, workbookValue(value)]))));
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `${columnName(headers.length)}1` };
  sheet.getRow(1).height = 25;
  sheet.getRow(1).eachCell(styleHeaderCell);
  const priorityIndex = headers.findIndex(([key]) => key === "priority" || key === "highestPriority");
  const deadlineIndex = headers.findIndex(([key]) => key === "deadlineStatus");
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    if (priorityIndex >= 0) applyPriorityFill(row.getCell(priorityIndex + 1), String(row.getCell(priorityIndex + 1).value ?? ""));
    if (deadlineIndex >= 0 && row.getCell(deadlineIndex + 1).value === "possivelmente_vencido") {
      row.getCell(deadlineIndex + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8D7DA" } };
    }
  });
  return sheet;
}

function sortMessages(messages: AnalyzedDteMessage[]): AnalyzedDteMessage[] {
  const weight: Record<MessagePriority, number> = { critica: 0, alta: 1, operacional: 2, revisar: 3, informativa: 4 };
  return [...messages].sort((a, b) => weight[a.priority] - weight[b.priority] || b.createdAt.localeCompare(a.createdAt) || a.cnpj.localeCompare(b.cnpj));
}

function highestPriority(messages: AnalyzedDteMessage[]): string {
  return sortMessages(messages)[0]?.priority ?? "sem_mensagens";
}

function countBy<T>(items: T[], getKey: (item: T) => string): Map<string, number> {
  const result = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    result.set(key, (result.get(key) ?? 0) + 1);
  }
  return result;
}

function styleHeaderCell(cell: ExcelJS.Cell): void {
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1351B4" } };
}

function applyPriorityFill(cell: ExcelJS.Cell, value: string): void {
  const colors: Record<string, string> = { critica: "FFF4CCCC", alta: "FFFCE5CD", operacional: "FFFFF2CC", informativa: "FFD9EAD3", revisar: "FFD9D2E9" };
  const color = colors[value.toLowerCase()];
  if (color) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function workbookValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const safe = protectFormula(value);
  return safe.length > 32_000 ? `${safe.slice(0, 31_980)}\n[TRUNCADO NO XLSX; ORIGINAL NO JSON/CSV]` : safe;
}

function csvCell(value: unknown): string {
  const text = protectFormula(value === null || value === undefined ? "" : String(value));
  return `"${text.replace(/"/g, '""')}"`;
}

function protectFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function columnWidth(header: string): number {
  if (header.includes("TEXTO") || header.includes("RESUMO") || header.includes("ACAO_") || header.includes("MOTIVO")) return 55;
  if (header.includes("RAZAO") || header.includes("ASSUNTO")) return 38;
  if (header.includes("DATA") || header.includes("PRAZO")) return 24;
  if (header.includes("RESPONSAVEL")) return 25;
  return Math.max(14, Math.min(28, header.length + 3));
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
