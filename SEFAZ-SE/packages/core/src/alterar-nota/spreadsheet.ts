import XLSX from "xlsx";
import type { NotaFiscalAcao, NotaFiscalAlteracaoInput } from "./nf-types";

const HEADER_ROW_INDEX = 1;
const DATA_START_ROW_INDEX = 2;
const ETIQUETA_COLUMN_INDEX = 1;

export const REQUIRED_COLUMNS = [
  "Etiqueta",
  "Vl. ICMS Calc.",
  "Vl. Recolher",
  "Forma Recolhimento",
  "Observacao",
] as const;

const ROW_COLOR_ACTIONS: Record<string, NotaFiscalAcao> = {
  "99CC00": "ignorar",
  FFFF00: "alterar-imposto",
  "00CCFF": "adiar",
  FF0000: "zerar-cobranca",
};

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];
type HeaderIndex = Record<RequiredColumn, number>;
type StyledCell = XLSX.CellObject & {
  s?: {
    fgColor?: {
      rgb?: string;
    };
  };
};

export function readNotaFiscalSpreadsheet(filePath: string): NotaFiscalAlteracaoInput[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false, cellStyles: true, raw: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("A planilha nao possui abas.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    throw new Error("A primeira aba da planilha nao foi encontrada.");
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  if (rows.length === 0) {
    throw new Error("A planilha esta vazia.");
  }

  const company = parseCompanyInfo(text(rows[0]?.[0]));
  const headers = rows[HEADER_ROW_INDEX] ?? [];
  const headerIndex = validateRequiredColumns(headers);

  const items = rows
    .slice(DATA_START_ROW_INDEX)
    .map((row, index) => ({ row, rowNumber: index + DATA_START_ROW_INDEX + 1 }))
    .filter(({ row }) => text(row[headerIndex.Etiqueta]))
    .map(({ row, rowNumber }) => mapRow(sheet, row, headerIndex, company, rowNumber));

  if (items.length === 0) {
    throw new Error("Nenhuma linha com etiqueta foi encontrada.");
  }

  return items;
}

export function validateRequiredColumns(headers: readonly unknown[]): HeaderIndex {
  if (headers.length === 0) {
    throw new Error("A linha de cabecalho da planilha esta vazia.");
  }

  const byName = new Map(headers.map((header, index) => [text(header), index]));
  const missing = REQUIRED_COLUMNS.filter((column) => !byName.has(column));
  if (missing.length > 0) {
    throw new Error(`Colunas obrigatorias ausentes: ${missing.join(", ")}.`);
  }

  return REQUIRED_COLUMNS.reduce((acc, column) => {
    acc[column] = byName.get(column)!;
    return acc;
  }, {} as HeaderIndex);
}

function mapRow(
  sheet: XLSX.WorkSheet,
  row: unknown[],
  headerIndex: HeaderIndex,
  company: Pick<NotaFiscalAlteracaoInput, "inscricaoMunicipal" | "nomeEmpresa">,
  rowNumber: number,
): NotaFiscalAlteracaoInput {
  const corRgb = rowColor(sheet, rowNumber);
  const acao = actionForColor(corRgb, rowNumber);
  const icmsAtual = text(row[headerIndex["Vl. ICMS Calc."]]);
  const valorRecolher = text(row[headerIndex["Vl. Recolher"]]);
  const recolhimentoAtual = text(row[headerIndex["Forma Recolhimento"]]);

  return {
    ...company,
    etiqueta: text(row[headerIndex.Etiqueta]),
    icmsNovo: newIcmsValue(acao, icmsAtual, valorRecolher),
    icmsAtual,
    recolhimentoNovo: recolhimentoAtual,
    recolhimentoAtual,
    acao,
    corRgb,
    observacao: text(row[headerIndex.Observacao]),
    adiar: acao === "adiar",
    rowNumber,
  };
}

function parseCompanyInfo(value: string): Pick<NotaFiscalAlteracaoInput, "inscricaoMunicipal" | "nomeEmpresa"> {
  const match = value.match(/Contribuinte:\s*(\d+)\s+(.+?)(?:\s+Ref:|$)/i);
  if (!match) {
    throw new Error("Nao foi possivel identificar o contribuinte na primeira linha da planilha.");
  }

  return {
    inscricaoMunicipal: match[1]!,
    nomeEmpresa: match[2]!.trim(),
  };
}

function rowColor(sheet: XLSX.WorkSheet, rowNumber: number): string {
  const address = XLSX.utils.encode_cell({ r: rowNumber - 1, c: ETIQUETA_COLUMN_INDEX });
  const cell = sheet[address] as StyledCell | undefined;
  return cell?.s?.fgColor?.rgb?.toUpperCase() ?? "";
}

export function actionForColor(corRgb: string, rowNumber: number): NotaFiscalAcao {
  const normalizedColor = corRgb.toUpperCase();
  const action = ROW_COLOR_ACTIONS[normalizedColor];
  if (!action) {
    throw new Error(`Cor de linha desconhecida na linha ${rowNumber}: ${normalizedColor || "sem cor"}.`);
  }

  return action;
}

function newIcmsValue(acao: NotaFiscalAcao, icmsAtual: string, valorRecolher: string): string {
  switch (acao) {
    case "ignorar":
      return icmsAtual;
    case "alterar-imposto":
      return valorRecolher;
    case "adiar":
      return icmsAtual;
    case "zerar-cobranca":
      return "0,00";
  }
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}
