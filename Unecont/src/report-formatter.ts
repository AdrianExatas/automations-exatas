import path from "node:path";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import type {
  ReportFormattingOptions,
  ReportValidationIssue,
  ReportValidationResult,
} from "./types";

interface DescriptionLookupEntry {
  description?: string;
  ambiguous: boolean;
}

type CanonicalRow = Map<string, string>;

const HEADER_DESCRICAO_DO_SERVICO = "DESCRICAO DO SERVICO";
const HEADER_QUAL_SERVICO_CONTRATO = "QUAL SERVICO CONTRATO";
const HEADER_SERVICO_FEDERAL = "SERVICO FEDERAL";

export interface FormatDownloadedReportResult {
  outputPath: string;
  warnings: string[];
  filledCount: number;
  missingMappedCount: number;
  missingUnmappedCount: number;
  issues: ReportValidationIssue[];
}

function deepClone<T>(value: T): T {
  return structuredClone(value);
}

export function canonicalizeHeader(value: string | undefined | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function normalizeServiceItem(value: string | undefined | null): string {
  const input = String(value ?? "").trim();
  const match = input.match(/(\d{1,2})\D+(\d{2})/);
  if (!match) return input;
  return `${match[1].padStart(2, "0")}.${match[2]}`;
}

export function normalizeDescriptionText(value: string | undefined | null): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildServiceDescriptionLookup(
  serviceMapPath: string,
): Map<string, DescriptionLookupEntry> {
  const workbook = XLSX.readFile(serviceMapPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  }) as string[][];

  const rawMap = new Map<string, Set<string>>();

  for (const row of rows.slice(1)) {
    const item = normalizeServiceItem(row[2]);
    const description = normalizeDescriptionText(row[3]);
    if (!item || !description) continue;
    const descriptions = rawMap.get(item) ?? new Set<string>();
    descriptions.add(description);
    rawMap.set(item, descriptions);
  }

  const result = new Map<string, DescriptionLookupEntry>();
  for (const [item, descriptions] of rawMap.entries()) {
    const values = [...descriptions];
    result.set(item, {
      description: values.length === 1 ? values[0] : undefined,
      ambiguous: values.length > 1,
    });
  }

  return result;
}

function resolveOutputPath(reportPath: string, overwrite: boolean): string {
  if (overwrite) return reportPath;
  const extension = path.extname(reportPath);
  const baseName = path.basename(reportPath, extension);
  return path.join(path.dirname(reportPath), `${baseName}.formatado${extension}`);
}

function cloneRowStyle(worksheet: ExcelJS.Worksheet, rowNumber: number): {
  height?: number;
  cellStyles: Partial<ExcelJS.Style>[];
} {
  const row = worksheet.getRow(rowNumber);
  const cellStyles: Partial<ExcelJS.Style>[] = [];

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex++) {
    cellStyles.push(deepClone(row.getCell(columnIndex).style ?? {}));
  }

  return {
    height: row.height ?? undefined,
    cellStyles,
  };
}

function clearWorksheetData(worksheet: ExcelJS.Worksheet): void {
  if (worksheet.rowCount > 1) {
    worksheet.spliceRows(2, worksheet.rowCount - 1);
  }
}

function getRawRows(reportPath: string): Record<string, string>[] {
  const workbook = XLSX.readFile(reportPath);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" }) as Record<string, string>[];
}

function createValidationResult(): ReportValidationResult {
  return {
    filledCount: 0,
    missingMappedCount: 0,
    missingUnmappedCount: 0,
    issues: [],
  };
}

function getCanonicalHeaderMap(worksheet: ExcelJS.Worksheet): Map<number, string> {
  const row = worksheet.getRow(1);
  const headers = new Map<number, string>();

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex++) {
    const value = row.getCell(columnIndex).value;
    const header = canonicalizeHeader(
      typeof value === "string" ? value : String(value ?? ""),
    );
    if (header) headers.set(columnIndex, header);
  }

  return headers;
}

function canonicalizeSourceRow(sourceRow: Record<string, string>): CanonicalRow {
  const canonicalRow = new Map<string, string>();

  for (const [header, value] of Object.entries(sourceRow)) {
    const normalizedHeader = canonicalizeHeader(header);
    if (normalizedHeader && !canonicalRow.has(normalizedHeader)) {
      canonicalRow.set(normalizedHeader, String(value ?? ""));
    }
  }

  return canonicalRow;
}

function resolveCellValue(
  header: string,
  sourceRow: CanonicalRow,
  descriptions: Map<string, DescriptionLookupEntry>,
  warnings: string[],
  rowNumber: number,
): string | null {
  if (header === HEADER_DESCRICAO_DO_SERVICO) {
    const serviceItem = normalizeServiceItem(sourceRow.get(HEADER_SERVICO_FEDERAL));
    const description = descriptions.get(serviceItem);

    if (!serviceItem) return null;
    if (!description) {
      warnings.push(
        `Linha ${rowNumber}: Servico Federal sem mapeamento para DESCRIÇÃO DO SERVIÇO (${serviceItem}).`,
      );
      return null;
    }
    if (description.ambiguous) {
      warnings.push(`Linha ${rowNumber}: Servico Federal com descricao ambigua (${serviceItem}).`);
      return null;
    }
    return description.description ?? null;
  }

  if (header === HEADER_QUAL_SERVICO_CONTRATO) {
    return null;
  }

  const value = String(sourceRow.get(header) ?? "");
  return value ? value : null;
}

function validateCanonicalRows(
  rows: Record<string, string>[],
  descriptions: Map<string, DescriptionLookupEntry>,
): ReportValidationResult {
  const result = createValidationResult();

  rows.forEach((rawRow, index) => {
    const sourceRow = canonicalizeSourceRow(rawRow);
    const rowNumber = index + 2;
    const serviceItem = normalizeServiceItem(sourceRow.get(HEADER_SERVICO_FEDERAL));
    const description = normalizeDescriptionText(sourceRow.get(HEADER_DESCRICAO_DO_SERVICO));

    if (!serviceItem) return;

    const lookupEntry = descriptions.get(serviceItem);
    if (lookupEntry?.description) {
      if (description) {
        result.filledCount++;
        return;
      }

      result.missingMappedCount++;
      result.issues.push({
        rowNumber,
        serviceItem,
        reason: "missing_mapped",
      });
      return;
    }

    if (!description) {
      result.missingUnmappedCount++;
      result.issues.push({
        rowNumber,
        serviceItem,
        reason: lookupEntry?.ambiguous ? "ambiguous" : "missing_unmapped",
      });
    }
  });

  return result;
}

export function validateFormattedReport(
  reportPath: string,
  serviceMapPath: string,
): ReportValidationResult {
  const resolvedServiceMapPath = path.resolve(serviceMapPath);
  const rows = getRawRows(path.resolve(reportPath));
  const serviceDescriptions = buildServiceDescriptionLookup(resolvedServiceMapPath);
  return validateCanonicalRows(rows, serviceDescriptions);
}

export async function formatDownloadedReport(
  reportPath: string,
  options: ReportFormattingOptions,
): Promise<FormatDownloadedReportResult> {
  const modelPath = options.modelPath ? path.resolve(options.modelPath) : "";
  const serviceMapPath = options.serviceMapPath ? path.resolve(options.serviceMapPath) : "";
  if (!modelPath) {
    throw new Error("reportFormatting.modelPath e obrigatorio quando a formatacao estiver habilitada");
  }
  if (!serviceMapPath) {
    throw new Error(
      "reportFormatting.serviceMapPath e obrigatorio quando a formatacao estiver habilitada",
    );
  }

  const outputPath = resolveOutputPath(path.resolve(reportPath), options.overwrite ?? true);
  const rawRows = getRawRows(reportPath);
  const serviceDescriptions = buildServiceDescriptionLookup(serviceMapPath);
  const warnings: string[] = [];

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(modelPath);
  const worksheet = workbook.worksheets[0];
  const headers = getCanonicalHeaderMap(worksheet);
  const templateStyle = cloneRowStyle(worksheet, 2);

  clearWorksheetData(worksheet);

  rawRows.forEach((rawRow, index) => {
    const sourceRow = canonicalizeSourceRow(rawRow);
    const targetRowNumber = index + 2;
    const row = worksheet.getRow(targetRowNumber);
    if (templateStyle.height != null) {
      row.height = templateStyle.height;
    }

    for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex++) {
      const cell = row.getCell(columnIndex);
      cell.style = deepClone(templateStyle.cellStyles[columnIndex - 1] ?? {});
      const header = headers.get(columnIndex);
      if (!header) {
        cell.value = null;
        continue;
      }
      cell.value = resolveCellValue(header, sourceRow, serviceDescriptions, warnings, targetRowNumber);
    }

    row.commit();
  });

  await workbook.xlsx.writeFile(outputPath);
  const validation = validateCanonicalRows(getRawRows(outputPath), serviceDescriptions);

  return {
    outputPath,
    warnings,
    filledCount: validation.filledCount,
    missingMappedCount: validation.missingMappedCount,
    missingUnmappedCount: validation.missingUnmappedCount,
    issues: validation.issues,
  };
}
