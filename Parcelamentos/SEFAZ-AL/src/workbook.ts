import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import type { InputRow, RunResult } from "./types.js";
import { isBlank, timestampForFile } from "./utils.js";

const REQUIRED_HEADERS = ["EMPRESA", "USUARIO", "SENHA"] as const;

type RawSheetRow = Record<string, unknown>;

export function readInputWorkbook(filePath: string): InputRow[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error("A planilha de entrada não possui nenhuma aba.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rowsAsMatrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    raw: false,
    blankrows: false,
  });
  const headers = (rowsAsMatrix[0] ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);

  validateHeaders(headers);

  const rows = XLSX.utils.sheet_to_json<RawSheetRow>(worksheet, { defval: "", raw: false });
  const mappedRows = rows
    .map((row, index) => mapRow(row, index + 2))
    .filter((row): row is InputRow => row !== null);

  if (mappedRows.length === 0) {
    throw new Error("A planilha não possui linhas de dados para processar.");
  }

  return mappedRows;
}

function validateHeaders(headerRow: string[]): void {
  const headers = new Set(headerRow);

  for (const header of REQUIRED_HEADERS) {
    if (!headers.has(header)) {
      throw new Error(`A planilha de entrada precisa conter a coluna obrigatória "${header}".`);
    }
  }
}

function mapRow(row: RawSheetRow, rowNumber: number): InputRow | null {
  if (Object.values(row).every((value) => isBlank(value))) {
    return null;
  }

  const empresa = String(row.EMPRESA ?? "").trim();
  const usuario = String(row.USUARIO ?? "").trim();
  const senha = String(row.SENHA ?? "").trim();

  if (!empresa) {
    throw new Error(`Linha ${rowNumber}: a coluna EMPRESA está vazia.`);
  }

  if (!usuario) {
    throw new Error(`Linha ${rowNumber}: a coluna USUARIO está vazia.`);
  }

  if (!senha) {
    throw new Error(`Linha ${rowNumber}: a coluna SENHA está vazia.`);
  }

  return {
    rowNumber,
    empresa,
    usuario,
    senha,
  };
}

export const TEMPLATE_HEADERS = ["CODIGO", "EMPRESA", "CNPJ", "USUARIO", "SENHA", "OBSERVAÇÃO"] as const;

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
    EMPRESA: result.empresa,
    USUARIO: result.usuario,
    CONSOLIDACAO: result.consolidacao ?? "",
    PARCELAMENTO: result.parcelamento ?? "",
    PARCELAS_TOTAIS: result.parcelasTotais ?? "",
    PARCELAS_JA_PAGAS: result.parcelasJaPagas ?? "",
    PARCELA_EMITIDA: result.numeroParcelaEmitida ?? "",
    TOTAL_PARCELAS: result.totalParcelas ?? "",
    VENCIMENTO: result.vencimento ?? "",
    ARQUIVO_SALVO: result.arquivoSalvo ?? "",
    TEMPO_CALCULO_MS: result.tempoCalculoMs ?? "",
    TENTATIVAS_CALCULO: result.tentativasCalculo ?? "",
    RESULTADO_CALCULO: result.resultadoCalculo ?? "",
    TEMPO_TENTATIVA_1_MS: result.tempoTentativa1Ms ?? "",
    TEMPO_TENTATIVA_2_MS: result.tempoTentativa2Ms ?? "",
    CATEGORIA_ERRO: result.categoriaErro ?? "",
    FASE_ERRO: result.faseErro ?? "",
    TENTATIVAS_PROCESSAMENTO: result.tentativasProcessamento ?? "",
    MENSAGEM_DIAGNOSTICO: result.mensagemDiagnostico ?? "",
    STATUS: result.status,
    MENSAGEM: result.mensagem,
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(reportRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados");
  XLSX.writeFile(workbook, reportPath);

  return reportPath;
}
