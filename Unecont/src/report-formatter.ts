import fs from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import type {
  ReportFormattingOptions,
  ReportValidationIssue,
  ReportValidationResult,
} from "./types";

const JSZip = require("jszip");

interface DescriptionLookupEntry {
  description?: string;
  ambiguous: boolean;
}

interface RawCellData {
  rawValue: string | number | boolean | Date | null;
  text: string;
  numFmt?: string;
  hyperlink?: string;
  type: XLSX.ExcelDataType | "z";
}

type CanonicalRow = Map<string, RawCellData>;

interface TemplateColumnLayout {
  headerText: string;
  canonicalHeader: string;
  width?: number;
  hidden: boolean;
  outlineLevel: number;
  style: Partial<ExcelJS.Style>;
  headerStyle: Partial<ExcelJS.Style>;
  dataStyle: Partial<ExcelJS.Style>;
}

interface TemplateWorkbookLayout {
  sheetName: string;
  views: Array<Partial<ExcelJS.WorksheetView>>;
  properties: Partial<ExcelJS.WorksheetProperties>;
  pageSetup: Partial<ExcelJS.PageSetup>;
  headerFooter: Partial<ExcelJS.HeaderFooter>;
  state: ExcelJS.WorksheetState;
  columns: TemplateColumnLayout[];
  headerRowHeight?: number;
  dataRowHeight?: number;
}

interface ResolvedCellValue {
  value: ExcelJS.CellValue | null;
  numFmt?: string;
}

const HEADER_DESCRICAO_DO_SERVICO = "DESCRICAO DO SERVICO";
/** Cabeçalho correto no modelo; planilhas antigas do Unecont podem ainda trazer "CONTRATO". */
const HEADER_QUAL_SERVICO_CONTRATADO = "QUAL SERVICO CONTRATADO";
const HEADER_QUAL_SERVICO_CONTRATO_LEGACY = "QUAL SERVICO CONTRATO";
const HEADER_CNAE_DESCRICAO = "CNAE DESCRICAO";
const HEADER_SERVICO_FEDERAL = "SERVICO FEDERAL";
const HEADER_CANCELAMENTO = "CANCELAMENTO";
const HEADER_LINK_NFSE = "LINK PARA NFSE";
const HEADER_CNAE = "CNAE";

/** Cabeçalhos: demais colunas (laranja #F79646) e CNAE Descrição (vermelho). */
const HEADER_FILL_ORANGE_ARGB = "FFF79646";
const HEADER_FILL_RED_ARGB = "FFFF0000";
const HEADER_FONT_WHITE_ARGB = "FFFFFFFF";
const HEADER_FONT_BLACK_ARGB = "FF000000";
const DATE_OUTPUT_FORMAT = "dd/mm/yyyy";
const CNAE_OUTPUT_FORMAT = "00\\.00-0-00";
/** Largura da coluna DESCRIÇÃO DO SERVIÇO (unidades Excel). */
const DESCRIPTION_COLUMN_WIDTH = 52;
const DESCRIPTION_WRAP_LIMIT = 150;
/** Largura mínima para caber "QUAL SERVIÇO CONTRATADO" em uma linha. */
const QUAL_SERVICO_MIN_COLUMN_WIDTH = 30;
/** Teto para largura mínima derivada do texto do cabeçalho (demais colunas). */
const HEADER_COLUMN_WIDTH_CAP = 55;
const DEFAULT_MIN_COLUMN_WIDTH = 10;
const DEFAULT_LINE_HEIGHT = 12;
const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);

const KNOWN_DATE_HEADERS = new Set([
  "DATA COMPETENCIA",
  "EMISSAO NFE",
  "EMISSAO RPS",
  "CANCELAMENTO",
  "EXCLUSAO",
  "PAGAMENTO",
  "DATA DE CADASTRO",
  "DATA CONFERENCIA PELA EMPRESA",
  "DATA CONFERENCIA PELA CONTABILIDADE",
]);

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

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;");
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&apos;/g, "'");
}

function encodeColumnLetter(columnNumber: number): string {
  let current = columnNumber;
  let result = "";

  while (current > 0) {
    const modulo = (current - 1) % 26;
    result = String.fromCharCode(65 + modulo) + result;
    current = Math.floor((current - modulo) / 26);
  }

  return result;
}

function buildRange(columnCount: number, rowCount: number): string {
  return `A1:${encodeColumnLetter(columnCount)}${rowCount}`;
}

function buildTableXml(columnHeaders: string[], ref: string): string {
  const columnsXml = columnHeaders
    .map(
      (header, index) =>
        `<tableColumn id="${index + 1}" name="${escapeXml(header)}"/>`,
    )
    .join("");

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
    `id="1" name="ServicosTomados" displayName="ServicosTomados" ref="${ref}" totalsRowShown="0">` +
    `<autoFilter ref="${ref}"/>` +
    `<tableColumns count="${columnHeaders.length}">${columnsXml}</tableColumns>` +
    `<tableStyleInfo name="TableStyleMedium21" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>` +
    `</table>`
  );
}

async function patchWorksheetTableXml(
  outputPath: string,
  columnHeaders: string[],
  rowCount: number,
): Promise<void> {
  const zip = await JSZip.loadAsync(fs.readFileSync(outputPath));
  const tableFile = Object.keys(zip.files).find((entry: string) => /^xl\/tables\/table\d+\.xml$/.test(entry));

  if (!tableFile) {
    throw new Error("Tabela Excel nao encontrada no arquivo formatado.");
  }

  zip.file(tableFile, buildTableXml(columnHeaders, buildRange(columnHeaders.length, rowCount)));
  const content = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(outputPath, content);
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

function getCellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if ("richText" in value) {
      return value.richText.map((fragment) => fragment.text).join("");
    }
    if ("text" in value) {
      return value.text;
    }
    if ("result" in value && value.result != null) {
      return String(value.result);
    }
  }

  return String(value);
}

function readHeaderText(cell: XLSX.CellObject | undefined): string {
  if (!cell) return "";
  if (cell.w != null) return String(cell.w);
  if (cell.v != null) return String(cell.v);
  return "";
}

function readCellText(cell: XLSX.CellObject | undefined): string {
  if (!cell || cell.t === "z" || cell.v == null) return "";
  if (cell.w != null) return String(cell.w);
  if (typeof cell.v === "string") return cell.v;
  return String(cell.v);
}

function parseDateTextToExcelSerial(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  let first = Number(match[1]);
  let second = Number(match[2]);
  let year = Number(match[3]);

  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }

  let month = first;
  let day = second;

  if (first > 12 && second <= 12) {
    day = first;
    month = second;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const timestamp = Date.UTC(year, month - 1, day);
  return (timestamp - EXCEL_EPOCH_UTC) / 86_400_000;
}

function isDateHeader(header: string): boolean {
  return KNOWN_DATE_HEADERS.has(header) || header.startsWith("DATA ");
}

function looksLikeDateFormat(numFmt: string | undefined): boolean {
  if (!numFmt) return false;
  const normalized = numFmt.toLowerCase();
  return normalized.includes("yy") && (normalized.includes("m") || normalized.includes("d"));
}

function coerceDateSerial(cell: RawCellData | undefined, header: string): number | null {
  if (!cell) return null;
  if (typeof cell.rawValue === "number" && (looksLikeDateFormat(cell.numFmt) || isDateHeader(header))) {
    return cell.rawValue;
  }
  if (cell.rawValue instanceof Date) {
    return (cell.rawValue.getTime() - EXCEL_EPOCH_UTC) / 86_400_000;
  }
  if (typeof cell.rawValue === "string") {
    return parseDateTextToExcelSerial(cell.rawValue);
  }
  if (cell.text) {
    return parseDateTextToExcelSerial(cell.text);
  }
  return null;
}

function createRawCellData(cell: XLSX.CellObject | undefined): RawCellData {
  return {
    rawValue:
      !cell || cell.t === "z" || cell.v == null
        ? null
        : (cell.v as string | number | boolean | Date),
    text: readCellText(cell),
    numFmt: cell?.z ? String(cell.z) : undefined,
    hyperlink: cell?.l?.Target ? decodeXmlEntities(String(cell.l.Target)) : undefined,
    type: cell?.t ?? "z",
  };
}

function normalizeCnaeNumericValue(cell: RawCellData | undefined): number | null {
  if (!cell) return null;
  if (typeof cell.rawValue === "number" && Number.isFinite(cell.rawValue)) {
    return cell.rawValue;
  }
  if (typeof cell.rawValue === "string" || cell.text) {
    const digits = String(cell.rawValue ?? cell.text).replace(/\D/g, "");
    if (digits.length === 7) {
      return Number(digits);
    }
  }
  return null;
}

function minColumnWidthForHeader(headerText: string): number {
  const trimmed = headerText.trim();
  if (!trimmed) return DEFAULT_MIN_COLUMN_WIDTH;
  return Math.min(HEADER_COLUMN_WIDTH_CAP, Math.ceil(trimmed.length * 1.15) + 2);
}

/** Estima linhas visíveis com quebra automática (wrap) para ajustar altura da linha. */
function estimateDisplayLineCount(text: string, columnWidth: number): number {
  const charsPerLine = Math.max(6, Math.floor(columnWidth * 0.85));
  if (!text) return 1;
  let total = 0;
  for (const segment of text.split("\n")) {
    const len = segment.length;
    total += len === 0 ? 1 : Math.ceil(len / charsPerLine);
  }
  return Math.max(1, total);
}

function wrapTextAtWordBoundary(value: string, maxLength: number): string {
  const normalized = normalizeDescriptionText(value);
  if (!normalized || normalized.length <= maxLength) return normalized;

  const words = normalized.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (!word) continue;
    if (!currentLine) {
      if (word.length <= maxLength) {
        currentLine = word;
        continue;
      }

      for (let index = 0; index < word.length; index += maxLength) {
        lines.push(word.slice(index, index + maxLength));
      }
      currentLine = "";
      continue;
    }

    const nextLine = `${currentLine} ${word}`;
    if (nextLine.length <= maxLength) {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    if (word.length <= maxLength) {
      currentLine = word;
      continue;
    }

    for (let index = 0; index < word.length; index += maxLength) {
      const chunk = word.slice(index, index + maxLength);
      if (chunk.length === maxLength || index + maxLength < word.length) {
        lines.push(chunk);
      } else {
        currentLine = chunk;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.join("\n");
}

function getCanonicalRows(reportPath: string): CanonicalRow[] {
  const workbook = XLSX.readFile(reportPath, {
    cellDates: false,
    cellNF: true,
    cellStyles: true,
  });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const ref = worksheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const headers = new Map<number, string>();

  for (let column = range.s.c; column <= range.e.c; column++) {
    const headerAddress = XLSX.utils.encode_cell({ r: range.s.r, c: column });
    const header = canonicalizeHeader(readHeaderText(worksheet[headerAddress]));
    if (header) {
      headers.set(column, header);
    }
  }

  const rows: CanonicalRow[] = [];
  for (let rowIndex = range.s.r + 1; rowIndex <= range.e.r; rowIndex++) {
    const row = new Map<string, RawCellData>();

    headers.forEach((header, column) => {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: column });
      if (!row.has(header)) {
        row.set(header, createRawCellData(worksheet[address]));
      }
    });

    rows.push(row);
  }

  return rows;
}

async function loadTemplateWorkbook(modelPath: string): Promise<TemplateWorkbookLayout> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(modelPath);

  const worksheet = workbook.worksheets[0];
  const headerRow = worksheet.getRow(1);
  const dataRow = worksheet.getRow(2);
  const columns: TemplateColumnLayout[] = [];

  for (let columnIndex = 1; columnIndex <= worksheet.columnCount; columnIndex++) {
    const headerText = getCellText(headerRow.getCell(columnIndex).value);
    const canonicalHeader = canonicalizeHeader(headerText);
    if (!canonicalHeader) continue;

    const modelWidth = worksheet.getColumn(columnIndex).width;
    let resolvedWidth: number | undefined;
    if (canonicalHeader === HEADER_DESCRICAO_DO_SERVICO) {
      resolvedWidth = DESCRIPTION_COLUMN_WIDTH;
    } else if (
      canonicalHeader === HEADER_QUAL_SERVICO_CONTRATADO ||
      canonicalHeader === HEADER_QUAL_SERVICO_CONTRATO_LEGACY
    ) {
      resolvedWidth = Math.max(modelWidth ?? 0, QUAL_SERVICO_MIN_COLUMN_WIDTH);
    } else {
      const fromHeader = minColumnWidthForHeader(headerText);
      resolvedWidth = Math.max(modelWidth ?? DEFAULT_MIN_COLUMN_WIDTH, fromHeader);
    }

    columns.push({
      headerText,
      canonicalHeader,
      width: resolvedWidth,
      hidden: worksheet.getColumn(columnIndex).hidden ?? false,
      outlineLevel: worksheet.getColumn(columnIndex).outlineLevel ?? 0,
      style: deepClone(worksheet.getColumn(columnIndex).style ?? {}),
      headerStyle: deepClone(headerRow.getCell(columnIndex).style ?? {}),
      dataStyle: deepClone(dataRow.getCell(columnIndex).style ?? {}),
    });
  }

  return {
    sheetName: worksheet.name,
    views: deepClone(worksheet.views ?? []),
    properties: deepClone(worksheet.properties ?? {}),
    pageSetup: deepClone(worksheet.pageSetup ?? {}),
    headerFooter: deepClone(worksheet.headerFooter ?? {}),
    state: worksheet.state,
    columns,
    headerRowHeight: headerRow.height ?? undefined,
    dataRowHeight: dataRow.height ?? undefined,
  };
}

function buildWorkbookFromTemplate(template: TemplateWorkbookLayout): {
  workbook: ExcelJS.Workbook;
  worksheet: ExcelJS.Worksheet;
} {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(template.sheetName);

  worksheet.views = deepClone(template.views) as ExcelJS.WorksheetView[];
  worksheet.properties = deepClone(template.properties) as ExcelJS.WorksheetProperties;
  worksheet.pageSetup = deepClone(template.pageSetup) as ExcelJS.PageSetup;
  worksheet.headerFooter = deepClone(template.headerFooter) as ExcelJS.HeaderFooter;
  worksheet.state = template.state;

  template.columns.forEach((columnLayout, index) => {
    const column = worksheet.getColumn(index + 1);
    column.width = columnLayout.width;
    column.hidden = columnLayout.hidden;
    column.outlineLevel = columnLayout.outlineLevel;
    column.style = deepClone(columnLayout.style);
  });

  const headerRow = worksheet.getRow(1);
  if (template.headerRowHeight != null) {
    headerRow.height = template.headerRowHeight;
  }

  template.columns.forEach((columnLayout, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = columnLayout.headerText;
    cell.style = deepClone(columnLayout.headerStyle);
  });

  return { workbook, worksheet };
}

function resolveCellValue(
  header: string,
  sourceRow: CanonicalRow,
  descriptions: Map<string, DescriptionLookupEntry>,
  warnings: string[],
  rowNumber: number,
): ResolvedCellValue {
  if (header === HEADER_DESCRICAO_DO_SERVICO) {
    const serviceItem = normalizeServiceItem(sourceRow.get(HEADER_SERVICO_FEDERAL)?.text);
    const description = descriptions.get(serviceItem);

    if (!serviceItem) return { value: null };
    if (!description) {
      warnings.push(
        `Linha ${rowNumber}: Servico Federal sem mapeamento para DESCRIÇÃO DO SERVIÇO (${serviceItem}).`,
      );
      return { value: null };
    }
    if (description.ambiguous) {
      warnings.push(`Linha ${rowNumber}: Servico Federal com descricao ambigua (${serviceItem}).`);
      return { value: null };
    }
    return {
      value: description.description
        ? wrapTextAtWordBoundary(description.description, DESCRIPTION_WRAP_LIMIT)
        : null,
    };
  }

  if (header === HEADER_QUAL_SERVICO_CONTRATADO || header === HEADER_QUAL_SERVICO_CONTRATO_LEGACY) {
    return { value: null };
  }

  const sourceCell = sourceRow.get(header);
  if (!sourceCell || sourceCell.rawValue == null || sourceCell.text === "") {
    return { value: null };
  }

  if (header === HEADER_LINK_NFSE && sourceCell.hyperlink) {
    return {
      value: {
        text: sourceCell.text || "Link NFS",
        hyperlink: sourceCell.hyperlink,
      },
    };
  }

  if (header === HEADER_CNAE) {
    const cnaeValue = normalizeCnaeNumericValue(sourceCell);
    if (cnaeValue != null) {
      return {
        value: cnaeValue,
        numFmt: CNAE_OUTPUT_FORMAT,
      };
    }
  }

  const dateSerial = coerceDateSerial(sourceCell, header);
  if (dateSerial != null) {
    return {
      value: dateSerial,
      numFmt: DATE_OUTPUT_FORMAT,
    };
  }

  if (typeof sourceCell.rawValue === "number" || typeof sourceCell.rawValue === "boolean") {
    return { value: sourceCell.rawValue };
  }

  if (typeof sourceCell.rawValue === "string") {
    return { value: sourceCell.rawValue || null };
  }

  return { value: sourceCell.text || null };
}

function applyStrike(font: Partial<ExcelJS.Font> | undefined): Partial<ExcelJS.Font> {
  return {
    ...(font ?? {}),
    strike: true,
  };
}

function buildTableRows(
  template: TemplateWorkbookLayout,
  sourceRows: CanonicalRow[],
  descriptions: Map<string, DescriptionLookupEntry>,
  warnings: string[],
): ResolvedCellValue[][] {
  return sourceRows.map((sourceRow, index) =>
    template.columns.map((column) =>
      resolveCellValue(column.canonicalHeader, sourceRow, descriptions, warnings, index + 2),
    ),
  );
}

function renderWorksheet(
  worksheet: ExcelJS.Worksheet,
  template: TemplateWorkbookLayout,
  rows: ResolvedCellValue[][],
  sourceRows: CanonicalRow[],
): void {
  const { columns, headerRowHeight, dataRowHeight } = template;
  const baseRowHeight = dataRowHeight ?? template.properties.defaultRowHeight ?? DEFAULT_LINE_HEIGHT;

  worksheet.addTable({
    name: "ServicosTomados",
    displayName: "ServicosTomados",
    ref: "A1",
    headerRow: true,
    totalsRow: false,
    style: {
      theme: "TableStyleMedium21",
      showFirstColumn: false,
      showLastColumn: false,
      showRowStripes: true,
      showColumnStripes: false,
    },
    columns: columns.map((column) => ({
      name: column.headerText,
      filterButton: true,
    })),
    rows: rows.map((row) => row.map((cell) => cell.value)),
  });

  const headerRow = worksheet.getRow(1);
  if (headerRowHeight != null) {
    headerRow.height = headerRowHeight;
  }

  for (let columnIndex = 1; columnIndex <= columns.length; columnIndex++) {
    const cell = headerRow.getCell(columnIndex);
    const columnLayout = columns[columnIndex - 1];
    cell.value = columnLayout.headerText;
    cell.style = deepClone(columnLayout.headerStyle);
    const canonical = columnLayout.canonicalHeader;

    if (canonical === HEADER_DESCRICAO_DO_SERVICO) {
      cell.font = {
        ...(cell.font ?? {}),
        color: { argb: HEADER_FONT_BLACK_ARGB },
      };
      continue;
    }

    if (
      canonical === HEADER_QUAL_SERVICO_CONTRATADO ||
      canonical === HEADER_QUAL_SERVICO_CONTRATO_LEGACY
    ) {
      continue;
    }

    if (canonical === HEADER_CNAE_DESCRICAO) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: HEADER_FILL_RED_ARGB },
      };
      cell.font = {
        ...(cell.font ?? {}),
        color: { argb: HEADER_FONT_WHITE_ARGB },
      };
      continue;
    }

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: HEADER_FILL_ORANGE_ARGB },
    };
    cell.font = {
      ...(cell.font ?? {}),
      color: { argb: HEADER_FONT_WHITE_ARGB },
    };
  }

  for (let columnIndex = 1; columnIndex <= columns.length; columnIndex++) {
    const cell = headerRow.getCell(columnIndex);
    cell.alignment = {
      ...(cell.alignment ?? {}),
      wrapText: false,
      vertical: "middle",
    };
  }

  rows.forEach((rowValues, rowOffset) => {
    const excelRow = worksheet.getRow(rowOffset + 2);
    const canceled = Boolean(sourceRows[rowOffset]?.get(HEADER_CANCELAMENTO)?.text.trim());
    let maxLineCount = 1;

    if (dataRowHeight != null) {
      excelRow.height = dataRowHeight;
    }

    rowValues.forEach((resolved, columnOffset) => {
      const cell = excelRow.getCell(columnOffset + 1);
      const baseStyle = deepClone(columns[columnOffset].dataStyle);
      cell.style = baseStyle;
      cell.value = resolved.value;

      if (resolved.numFmt) {
        cell.numFmt = resolved.numFmt;
      }

      if (columns[columnOffset].canonicalHeader === HEADER_DESCRICAO_DO_SERVICO) {
        cell.alignment = {
          ...(cell.alignment ?? {}),
          wrapText: true,
          vertical: "middle",
        };
        const descColWidth =
          columns[columnOffset].width ?? DESCRIPTION_COLUMN_WIDTH;
        const textForLines =
          typeof resolved.value === "string" ? resolved.value : "";
        const explicitLines = textForLines.split("\n").length;
        const estimatedLines = estimateDisplayLineCount(textForLines, descColWidth);
        maxLineCount = Math.max(maxLineCount, explicitLines, estimatedLines);
      } else {
        cell.alignment = {
          ...(cell.alignment ?? {}),
          vertical: "middle",
        };
      }

      if (canceled) {
        cell.font = applyStrike(cell.font);
      }
    });

    excelRow.height = Math.max(baseRowHeight, baseRowHeight * maxLineCount);
  });
}

function validateCanonicalRows(
  rows: Record<string, string>[],
  descriptions: Map<string, DescriptionLookupEntry>,
): ReportValidationResult {
  const result = createValidationResult();

  rows.forEach((rawRow, index) => {
    const sourceRow = new Map<string, RawCellData>();
    Object.entries(rawRow).forEach(([header, value]) => {
      const normalizedHeader = canonicalizeHeader(header);
      if (normalizedHeader && !sourceRow.has(normalizedHeader)) {
        sourceRow.set(normalizedHeader, {
          rawValue: String(value ?? ""),
          text: String(value ?? ""),
          type: "s",
        });
      }
    });

    const rowNumber = index + 2;
    const serviceItem = normalizeServiceItem(sourceRow.get(HEADER_SERVICO_FEDERAL)?.text);
    const description = normalizeDescriptionText(sourceRow.get(HEADER_DESCRICAO_DO_SERVICO)?.text);

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
  const sourceRows = getCanonicalRows(reportPath);
  const serviceDescriptions = buildServiceDescriptionLookup(serviceMapPath);
  const warnings: string[] = [];

  const template = await loadTemplateWorkbook(modelPath);
  const { workbook, worksheet } = buildWorkbookFromTemplate(template);
  const resolvedRows = buildTableRows(template, sourceRows, serviceDescriptions, warnings);
  renderWorksheet(worksheet, template, resolvedRows, sourceRows);

  await workbook.xlsx.writeFile(outputPath);
  await patchWorksheetTableXml(
    outputPath,
    template.columns.map((column) => column.headerText),
    resolvedRows.length + 1,
  );

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
