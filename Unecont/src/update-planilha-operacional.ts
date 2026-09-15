import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import {
  downloadBitrixAccountingCompanies,
  downloadBitrixCompetencias,
  readBitrixCompetenciaCodes,
  resolveCurrentMonthReference,
} from "./bitrix-competencias";
import { compareEmpresasPlanilhas } from "./compare-empresas";
import { downloadEmpresasUnecont } from "./download-empresas-unecont";
import { enrichPlanilhaWithOnvioCompanies } from "./onvio-company-enrichment";
import { rebuildResponsavelUserOptions } from "./rebuild-responsavel-user-options";
import {
  findColumn,
  normalizeCnpj,
  normalizeCodigo,
  normalizeHeader,
} from "./domain/empresa-normalization";
import { resolveAssetPath, resolveFromProject, resolveRuntimePath } from "./project-paths";
import type { UpdatePlanilhaOperacionalOptions, UpdatePlanilhaOperacionalResult } from "./types";

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const ACCOUNTING_DEPARTMENT = "setorcontabil";
const ACCOUNTING_DEPARTMENT_LABEL = "SETOR CONT\u00c1BIL";
const FISCAL_DEPARTMENT_LABEL = "SETOR FISCAL";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseReferenceMonth(value: string): { month: number; year: number } {
  const match = value.match(/^(\d{2})\/(\d{4})$/);
  if (!match) {
    throw new Error(`Referencia invalida: ${value}. Use MM/YYYY.`);
  }

  const month = Number(match[1]);
  const year = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Mes invalido na referencia: ${value}. Use MM/YYYY.`);
  }

  return { month, year };
}

function formatReferenceMonth(month: number, year: number): string {
  return `${pad2(month)}/${year}`;
}

function resolveReferenceMonth(value: string | undefined, now = new Date()): string {
  if (value?.trim()) {
    const parsed = parseReferenceMonth(value.trim());
    return formatReferenceMonth(parsed.month, parsed.year);
  }

  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return formatReferenceMonth(previousMonthDate.getMonth() + 1, previousMonthDate.getFullYear());
}

function referenceMonthKey(referenceMonth: string): string {
  const { month, year } = parseReferenceMonth(referenceMonth);
  return `${year}-${pad2(month)}`;
}

function referenceMonthName(referenceMonth: string): string {
  const { month } = parseReferenceMonth(referenceMonth);
  return MONTH_NAMES[month - 1];
}

export function findLatestOperationalPlanilha(baseDir = resolveAssetPath("planilha")): string {
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Diretorio de planilhas nao encontrado: ${baseDir}`);
  }

  const candidates = fs
    .readdirSync(baseDir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        /^planilha-operacional-.+-atualizada\.xlsx$/i.test(entry.name) &&
        !entry.name.startsWith("~$"),
    )
    .map((entry) => {
      const fullPath = path.join(baseDir, entry.name);
      return {
        fullPath,
        mtimeMs: fs.statSync(fullPath).mtimeMs,
      };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.fullPath.localeCompare(a.fullPath));

  const latest = candidates[0]?.fullPath;
  if (!latest) {
    throw new Error(`Nenhuma planilha operacional atualizada encontrada em ${baseDir}.`);
  }

  return latest;
}

function resolveOperationalPath(operacionalPath?: string): string {
  if (!operacionalPath?.trim()) return findLatestOperationalPlanilha();

  const resolved = resolveFromProject([operacionalPath.trim()]);
  if (!resolved) {
    throw new Error(`Planilha operacional nao encontrada: ${operacionalPath}`);
  }
  return resolved;
}

function resolveOutputDir(outputDir: string | undefined, referenceMonth: string): string {
  if (outputDir?.trim()) return path.resolve(outputDir);
  return resolveRuntimePath("planilhas-operacionais", referenceMonthKey(referenceMonth));
}

function resolvePublishDir(publishDir?: string): string {
  return publishDir?.trim() ? path.resolve(publishDir) : resolveAssetPath("planilha");
}

function resolvePublishedPath(referenceMonth: string, publishDir?: string): string {
  return path.join(
    resolvePublishDir(publishDir),
    `planilha-operacional-${referenceMonthName(referenceMonth)}-atualizada.xlsx`,
  );
}

function resolveAccountingCompaniesPath(accountingCompaniesPath?: string): string {
  if (accountingCompaniesPath?.trim()) {
    const resolved = resolveFromProject([accountingCompaniesPath.trim()]);
    if (!resolved) {
      throw new Error(`Planilha de empresas contabeis nao encontrada: ${accountingCompaniesPath}`);
    }
    return resolved;
  }

  return resolveAssetPath("planilha", "Empresas contabil.xlsx");
}

function getColumnByNormalizedHeader(worksheet: ExcelJS.Worksheet, header: string): number {
  let column = 0;
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const text = String(cell.value ?? "");
    if (normalizeHeader(text) === header) {
      column = columnNumber;
    }
  });
  return column;
}

export function buildAccountingDescription(referenceMonth: string): string {
  return [
    "Prezados,",
    "",
    `Segue, em Excel, o relat\u00f3rio de notas de servi\u00e7os tomados referente \u00e0 compet\u00eancia ${referenceMonth}.`,
    "",
    "Solicito, por gentileza, que sejam conferidas as notas geradas pelo nosso sistema. Caso identifiquem alguma nota faltante no referido relat\u00f3rio, pe\u00e7o que nos encaminhem a nota fiscal e o respectivo arquivo XML.",
    "",
    `Solicito tamb\u00e9m o envio dos valores referentes \u00e0s retiradas de cada s\u00f3cio do m\u00eas ${referenceMonth}, a t\u00edtulo de distribui\u00e7\u00e3o de lucros.`,
    "",
    "Agrade\u00e7o pela aten\u00e7\u00e3o e fico \u00e0 disposi\u00e7\u00e3o para eventuais d\u00favidas.",
    "",
    "Atenciosamente,",
    "Exatas Contabilidade.",
  ].join("\n");
}

function getCellText(value: ExcelJS.CellValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) return String(value.text ?? "").trim();
  return String(value).trim();
}

function readAccountingCompanyKeys(accountingCompaniesPath: string): Set<string> {
  if (!fs.existsSync(accountingCompaniesPath)) {
    throw new Error(`Planilha de empresas contabeis nao encontrada: ${accountingCompaniesPath}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require("xlsx");
  const accountingWorkbook = XLSX.readFile(accountingCompaniesPath);
  const accountingSheet = accountingWorkbook.Sheets.Empresas;
  if (!accountingSheet) {
    throw new Error(
      `Aba "Empresas" nao encontrada na planilha de empresas contabeis: ${accountingCompaniesPath}`,
    );
  }

  const rows = XLSX.utils.sheet_to_json(accountingSheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  const headers = (rows[0] ?? []).map((value) => String(value ?? ""));
  const codigoHeader = findColumn(headers, ["codigo", "cod"], "exact");
  const cnpjHeader = findColumn(headers, ["cnpj"], "exact");
  const codigoColumn = codigoHeader ? headers.indexOf(codigoHeader) : -1;
  const cnpjColumn = cnpjHeader ? headers.indexOf(cnpjHeader) : -1;
  if (codigoColumn < 0 || cnpjColumn < 0) {
    throw new Error(
      'Aba "Empresas" da planilha de empresas contabeis precisa conter as colunas CÓD. e CNPJ.',
    );
  }

  const keys = new Set<string>();
  for (const row of rows.slice(1)) {
    const codigo = normalizeCodigo(row[codigoColumn]);
    const cnpj = normalizeCnpj(row[cnpjColumn]);
    if (codigo && cnpj) keys.add(`${codigo}|${cnpj}`);
  }
  return keys;
}

export interface DepartmentSyncResult {
  accountingCompaniesPath: string;
  accountingKeys: number;
  rows: number;
  accountingRows: number;
  fiscalRows: number;
  updated: number;
}

export async function updateDepartamentosFromAccountingCompanies(
  workbookPath: string,
  accountingCompaniesPath?: string,
): Promise<DepartmentSyncResult> {
  const resolvedAccountingPath = resolveAccountingCompaniesPath(accountingCompaniesPath);
  const accountingKeys = readAccountingCompanyKeys(resolvedAccountingPath);
  if (accountingKeys.size === 0) {
    return {
      accountingCompaniesPath: resolvedAccountingPath,
      accountingKeys: 0,
      rows: 0,
      accountingRows: 0,
      fiscalRows: 0,
      updated: 0,
    };
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet("Planilha1") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error(`Planilha vazia: ${workbookPath}`);

  const codigoColumn = getColumnByNormalizedHeader(worksheet, "codigo");
  const cnpjColumn =
    getColumnByNormalizedHeader(worksheet, "cnpjempresa") ||
    getColumnByNormalizedHeader(worksheet, "cnpj");
  const departamentoColumn = getColumnByNormalizedHeader(worksheet, "departamento");
  if (!codigoColumn || !cnpjColumn || !departamentoColumn) {
    throw new Error("Planilha operacional precisa conter CODIGO, CNPJ EMPRESA e Departamento.");
  }

  let rows = 0;
  let accountingRows = 0;
  let fiscalRows = 0;
  let updated = 0;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const codigo = normalizeCodigo(getCellText(row.getCell(codigoColumn).value));
    const cnpj = normalizeCnpj(getCellText(row.getCell(cnpjColumn).value));
    if (!codigo && !cnpj) continue;

    rows++;
    const expectedDepartment = accountingKeys.has(`${codigo}|${cnpj}`)
      ? ACCOUNTING_DEPARTMENT_LABEL
      : FISCAL_DEPARTMENT_LABEL;
    if (expectedDepartment === ACCOUNTING_DEPARTMENT_LABEL) accountingRows++;
    else fiscalRows++;

    const cell = row.getCell(departamentoColumn);
    if (getCellText(cell.value) !== expectedDepartment) {
      cell.value = expectedDepartment;
      updated++;
    }
  }

  if (updated > 0) {
    await workbook.xlsx.writeFile(workbookPath);
  }

  return {
    accountingCompaniesPath: resolvedAccountingPath,
    accountingKeys: accountingKeys.size,
    rows,
    accountingRows,
    fiscalRows,
    updated,
  };
}

function isAccountingDescription(value: string): boolean {
  const normalized = normalizeHeader(value);
  return normalized.includes("distribuicaodelucros") || normalized.includes("competencia");
}

function findFiscalDescriptionTemplate(
  worksheet: ExcelJS.Worksheet,
  descricaoColumn: number,
  departamentoColumn: number,
): string {
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const departamento = getCellText(row.getCell(departamentoColumn).value);
    const descricao = getCellText(row.getCell(descricaoColumn).value);
    if (
      descricao &&
      normalizeHeader(departamento) !== ACCOUNTING_DEPARTMENT &&
      !isAccountingDescription(descricao)
    ) {
      return descricao;
    }
  }
  return "";
}

export async function restoreResponsavelDropdowns(workbookPath: string): Promise<number> {
  const result = await rebuildResponsavelUserOptions(workbookPath);
  return result.dropdownsApplied + result.dropdownsCleared;
}

async function updateDescricaoReferenceMonthByDepartment(
  workbookPath: string,
  referenceMonth: string,
): Promise<number> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet("Planilha1") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error(`Planilha vazia: ${workbookPath}`);

  const descricaoColumn = getColumnByNormalizedHeader(worksheet, "descricao");
  if (!descricaoColumn) return 0;
  const departamentoColumn = getColumnByNormalizedHeader(worksheet, "departamento");
  const accountingDescription = buildAccountingDescription(referenceMonth);
  const fiscalDescription =
    departamentoColumn > 0
      ? findFiscalDescriptionTemplate(worksheet, descricaoColumn, departamentoColumn)
      : "";

  let updated = 0;
  const pattern = /(\b(?:m[eÃª]s|m[e\u00ea]s|compet[e\u00ea]ncia)\s+)\d{2}\/\d{4}/gi;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const cell = row.getCell(descricaoColumn);
    const currentValue = getCellText(cell.value);
    const departamento = departamentoColumn ? String(row.getCell(departamentoColumn).value ?? "") : "";
    const isAccounting = normalizeHeader(departamento) === ACCOUNTING_DEPARTMENT;
    const nextValue = isAccounting
      ? accountingDescription
      : isAccountingDescription(currentValue) && fiscalDescription
        ? fiscalDescription.replace(pattern, `$1${referenceMonth}`)
        : currentValue.replace(pattern, `$1${referenceMonth}`);

    if (nextValue !== currentValue) {
      cell.value = nextValue;
      updated++;
    }
  }

  if (updated > 0) {
    await workbook.xlsx.writeFile(workbookPath);
  }

  return updated;
}

export async function updateDescricaoReferenceMonth(
  workbookPath: string,
  referenceMonth: string,
): Promise<number> {
  return updateDescricaoReferenceMonthByDepartment(workbookPath, referenceMonth);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const worksheet = workbook.getWorksheet("Planilha1") ?? workbook.worksheets[0];
  if (!worksheet) throw new Error(`Planilha vazia: ${workbookPath}`);

  const descricaoColumn = getColumnByNormalizedHeader(worksheet, "descricao");
  if (!descricaoColumn) return 0;
  const departamentoColumn = getColumnByNormalizedHeader(worksheet, "departamento");
  const accountingDescription = buildAccountingDescription(referenceMonth);

  let updated = 0;
  const pattern = /(\bm[eê]s\s+)\d{2}\/\d{4}/gi;
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const cell = row.getCell(descricaoColumn);
    const currentValue = getCellText(cell.value);
    const departamento = departamentoColumn ? String(row.getCell(departamentoColumn).value ?? "") : "";
    const nextValue =
      normalizeHeader(departamento) === ACCOUNTING_DEPARTMENT
        ? accountingDescription
        : currentValue.replace(pattern, `$1${referenceMonth}`);

    if (nextValue !== currentValue) {
      cell.value = nextValue;
      updated++;
    }
  }

  if (updated > 0) {
    await workbook.xlsx.writeFile(workbookPath);
  }

  return updated;
}

function copyFinalPlanilha(options: {
  sourcePath: string;
  targetPath: string;
  force?: boolean;
}): void {
  fs.mkdirSync(path.dirname(options.targetPath), { recursive: true });
  if (fs.existsSync(options.targetPath) && !options.force) {
    throw new Error(
      `Planilha publicada ja existe: ${options.targetPath}. Use --force para sobrescrever.`,
    );
  }
  fs.copyFileSync(options.sourcePath, options.targetPath);
}

export async function updatePlanilhaOperacional(
  options: UpdatePlanilhaOperacionalOptions,
): Promise<UpdatePlanilhaOperacionalResult> {
  const referenceMonth = resolveReferenceMonth(options.referenceMonth, options.now);
  const outputDir = resolveOutputDir(options.outputDir, referenceMonth);
  const operacionalPath = resolveOperationalPath(options.operacionalPath);

  fs.mkdirSync(outputDir, { recursive: true });

  options.logger?.info?.(`Referencia da planilha operacional: ${referenceMonth}`);
  options.logger?.info?.(`Planilha operacional base: ${operacionalPath}`);

  let bitrixCompetenciasPath: string | undefined;
  let excludedCodes: string[] | undefined;
  if (options.bitrixCompetenciasUrl?.trim()) {
    const bitrixDownload = await downloadBitrixCompetencias({
      url: options.bitrixCompetenciasUrl,
      outputDir,
      browser: options.browser,
      logger: options.logger,
    });
    bitrixCompetenciasPath = bitrixDownload.filePath;
    const currentMonth = resolveCurrentMonthReference(options.now);
    excludedCodes = readBitrixCompetenciaCodes(bitrixCompetenciasPath, currentMonth);
    options.logger?.info?.(
      `Onboarding do mes vigente ${currentMonth} excluido da planilha: ${excludedCodes.length} codigo(s).`,
    );
  }

  let bitrixAccountingPath: string | undefined;
  let accountingCompaniesPath = options.accountingCompaniesPath;
  if (options.bitrixAccountingUrl?.trim()) {
    const bitrixDownload = await downloadBitrixAccountingCompanies({
      url: options.bitrixAccountingUrl,
      outputDir,
      browser: options.browser,
      logger: options.logger,
    });
    bitrixAccountingPath = bitrixDownload.filePath;
    accountingCompaniesPath = bitrixAccountingPath;
  }

  const baseDownload = await downloadEmpresasUnecont({
    credentials: options.credentials,
    browser: options.browser,
    outputDir,
    empresasUrl: options.empresasUrl,
    reportName: options.empresasReportName,
    logger: options.logger,
    timeouts: options.timeouts,
    loginUrl: options.loginUrl,
  });

  const comparison = await compareEmpresasPlanilhas({
    atualizadaPath: baseDownload.filePath,
    operacionalPath,
    outputDir,
    excludedCodes,
    clientUsersProvider: options.clientUsersProvider,
    logger: options.logger,
  });

  let onvioCompaniesReportPath: string | undefined;
  if (options.onvioCompaniesProvider) {
    const onvioCompanies = await enrichPlanilhaWithOnvioCompanies({
      planilhaPath: comparison.finalPlanilhaPath,
      outputDir,
      provider: options.onvioCompaniesProvider,
      logger: options.logger,
    });
    onvioCompaniesReportPath = onvioCompanies.reportPath;
    options.logger?.info?.(
      `Empresas Onvio: ${onvioCompanies.kept}/${onvioCompanies.total} mantidas na planilha, ${onvioCompanies.removed} removidas (inativas/nao localizadas).`,
    );
  } else {
    options.logger?.warn?.(
      "Consulta direta de empresas Onvio nao configurada; ONVIO_CLIENT_ID nao sera atualizado.",
    );
  }

  const departmentSync = await updateDepartamentosFromAccountingCompanies(
    comparison.finalPlanilhaPath,
    accountingCompaniesPath,
  );
  options.logger?.info?.(
    `Departamentos sincronizados: ${departmentSync.updated} alterados (${departmentSync.accountingRows} contabeis, ${departmentSync.fiscalRows} fiscais).`,
  );

  const updatedDescriptions = await updateDescricaoReferenceMonth(
    comparison.finalPlanilhaPath,
    referenceMonth,
  );
  options.logger?.info?.(`Descricoes atualizadas: ${updatedDescriptions}`);
  const restoredDropdowns = await restoreResponsavelDropdowns(comparison.finalPlanilhaPath);
  options.logger?.info?.(`Dropdowns de responsavel restaurados: ${restoredDropdowns}`);

  const publishedPlanilhaPath = resolvePublishedPath(referenceMonth, options.publishDir);
  copyFinalPlanilha({
    sourcePath: comparison.finalPlanilhaPath,
    targetPath: publishedPlanilhaPath,
    force: options.force,
  });

  return {
    outputDir,
    baseUnecontPath: baseDownload.filePath,
    bitrixCompetenciasPath,
    bitrixAccountingPath,
    onvioCompaniesReportPath,
    operacionalPath,
    reportPath: comparison.reportPath,
    runtimePlanilhaPath: comparison.finalPlanilhaPath,
    publishedPlanilhaPath,
    referenceMonth,
    summary: comparison.summary,
  };
}
