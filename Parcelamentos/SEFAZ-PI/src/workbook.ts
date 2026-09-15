import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import type { InputRow, RunResult } from "./types.js";
import { DEFAULT_TIPO_RECEITA, isBlank, normalizeCnpj, normalizeIePi, timestampForFile } from "./utils.js";

const OFFICIAL_HEADERS = ["CODIGO", "INSCRICAO ESTADUAL"] as const;
const LEGACY_HEADERS = ["NUMERO PARCELAMENTO", "PARCELA", "VENCIMENTO", "LOCAL PARA SALVAR ARQUIVO"] as const;

type RawSheetRow = Record<string, unknown>;

export function readInputWorkbook(filePath: string): InputRow[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("A planilha de entrada nao possui nenhuma aba.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rowsAsMatrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    raw: false,
    blankrows: false,
  });
  const headers = (rowsAsMatrix[0] ?? [])
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  validateHeaders(headers);

  const rows = XLSX.utils.sheet_to_json<RawSheetRow>(worksheet, { defval: "", raw: false });
  const mappedRows = rows
    .map((row, index) => mapRow(row, index + 2))
    .filter((row): row is InputRow => row !== null);

  if (mappedRows.length === 0) {
    throw new Error("A planilha nao possui linhas de dados para processar.");
  }

  return mappedRows;
}

function validateHeaders(headerRow: string[]): void {
  const headers = new Set(headerRow);

  for (const header of OFFICIAL_HEADERS) {
    if (!headers.has(header)) {
      throw new Error(`A planilha de entrada precisa conter a coluna obrigatoria "${header}".`);
    }
  }
}

function mapRow(row: RawSheetRow, rowNumber: number): InputRow | null {
  if (Object.values(row).every((value) => isBlank(value))) {
    return null;
  }

  const codigo = String(row.CODIGO ?? "").trim();
  const empresa = String(row.EMPRESA ?? "").trim();
  const cnpj = normalizeCnpj(row.CNPJ);
  const inscricaoEstadual = normalizeIePi(row["INSCRICAO ESTADUAL"]);
  const numeroParcelamento = String(row["NUMERO PARCELAMENTO"] ?? "").trim();
  const parcela = String(row.PARCELA ?? "").trim();
  const vencimento = String(row.VENCIMENTO ?? "").trim();
  const tipoReceitaRaw = String(row["TIPO RECEITA"] ?? "").trim();
  const tipoReceita = tipoReceitaRaw || DEFAULT_TIPO_RECEITA;
  const saveDir = String(row["LOCAL PARA SALVAR ARQUIVO"] ?? "").trim();

  if (!codigo) {
    throw new Error(`Linha ${rowNumber}: a coluna CODIGO esta vazia.`);
  }

  if (!inscricaoEstadual) {
    throw new Error(`Linha ${rowNumber}: a coluna INSCRICAO ESTADUAL esta vazia.`);
  }

  if (!saveDir) {
    throw new Error(`Linha ${rowNumber}: a coluna LOCAL PARA SALVAR ARQUIVO esta vazia.`);
  }

  const hasLegacyParcel = Boolean(numeroParcelamento || parcela || vencimento);
  if (hasLegacyParcel && (!numeroParcelamento || !parcela || !vencimento)) {
    throw new Error(
      `Linha ${rowNumber}: no modo legado preencha NUMERO PARCELAMENTO, PARCELA e VENCIMENTO juntos.`,
    );
  }

  return {
    rowNumber,
    codigo,
    empresa: empresa || undefined,
    cnpj: cnpj || undefined,
    inscricaoEstadual,
    numeroParcelamento: numeroParcelamento || undefined,
    parcela: parcela || undefined,
    vencimento: vencimento || undefined,
    tipoReceita,
    saveDir,
  };
}

export const TEMPLATE_HEADERS = ["CODIGO", "EMPRESA", "CNPJ", "INSCRICAO ESTADUAL"] as const;

export async function writeTemplateWorkbook(filePath: string): Promise<string> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([[...TEMPLATE_HEADERS]]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entrada");
  XLSX.writeFile(workbook, filePath);

  return filePath;
}

export async function writeResultWorkbook(results: RunResult[], cwd: string): Promise<string> {
  const outputDir = path.resolve(cwd, "output");
  await fs.mkdir(outputDir, { recursive: true });

  const reportPath = path.join(outputDir, `resultado-${timestampForFile()}.xlsx`);
  const reportRows = results.map((result) => ({
    LINHA: result.rowNumber,
    CODIGO: result.codigo,
    EMPRESA: result.empresa ?? "",
    CNPJ: result.cnpj ?? "",
    NUMERO_PARCELAMENTO: result.numeroParcelamento ?? "",
    PARCELA: result.parcela ?? "",
    VENCIMENTO: result.vencimento,
    SITUACAO_VENCIMENTO: result.situacaoVencimento ?? "",
    NOME_ORIGINAL_PDF: result.nomeOriginalPdf ?? "",
    CAMINHO_PDF: result.pdfPath ?? "",
    STATUS: result.status,
    MENSAGEM: result.mensagem,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(reportRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
  XLSX.writeFile(workbook, reportPath);

  return reportPath;
}

export { LEGACY_HEADERS };
