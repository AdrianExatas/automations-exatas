/**
 * Leitura da planilha DP RESPONSÁVEL.xlsx.
 * Colunas: CÓD., CNPJ, RESPONSÁVEL, MES GERACAO (opcional: EMPRESA, DEPARTAMENTO, SETOR).
 */

import * as XLSX from "xlsx";
import path from "path";
import { LinhaPlanilha } from "./types";
import { normalizarCnpjDetalhado } from "./cnpj";

export const CAMPOS_OBRIGATORIOS_PLANILHA = "CNPJ + RESPONSAVEL + SETOR";

export class PlanilhaObrigatoriaError extends Error {
  constructor(public readonly erros: string[]) {
    super(
      [
        `Campos obrigatorios ausentes na planilha (${CAMPOS_OBRIGATORIOS_PLANILHA} obrigatorios).`,
        ...erros.map((erro) => `- ${erro}`),
      ].join("\n")
    );
    this.name = "PlanilhaObrigatoriaError";
  }
}

const MES_ABREV: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

/**
 * Converte serial de data do Excel (número de dias desde 30/12/1899) para month/year.
 */
function excelSerialToMonthYear(serial: number): { month: number; year: number } | null {
  if (!Number.isFinite(serial) || serial < 1) return null;
  const date = new Date((serial - 25569) * 86400 * 1000); // 25569 = 1 Jan 1970 em Excel
  const month = date.getUTCMonth() + 1;
  const year = date.getUTCFullYear();
  if (month < 1 || month > 12 || year < 2000) return null;
  return { month, year };
}

/**
 * Parseia MES GERACAO: "mar/26" -> { month: 3, year: 2026 }; "03/2026" -> idem.
 * Aceita também número serial do Excel (ex.: 46082).
 */
export function parseMesGeracao(val: unknown): { month: number; year: number } | null {
  if (val == null || val === "") return null;

  if (typeof val === "number") return excelSerialToMonthYear(val);

  const s = String(val).trim().toLowerCase();

  // Formato 03/2026 ou 3/2026
  const numMatch = s.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (numMatch) {
    const month = Math.max(1, Math.min(12, parseInt(numMatch[1], 10)));
    let year = parseInt(numMatch[2], 10);
    if (year < 100) year += 2000;
    return { month, year };
  }

  // Formato mar/26 ou mar/2026
  const abrevMatch = s.match(/^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\/(\d{2,4})$/);
  if (abrevMatch) {
    const month = MES_ABREV[abrevMatch[1]];
    if (!month) return null;
    let year = parseInt(abrevMatch[2], 10);
    if (year < 100) year += 2000;
    return { month, year };
  }

  return null;
}

function getCell(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== "") return row[k];
  }
  // Cabeçalhos podem ter espaço no final (ex.: "RESPONSÁVEL ")
  for (const key of Object.keys(row)) {
    const trimmed = key.trim();
    if (keys.some((k) => k.trim() === trimmed)) {
      const val = row[key];
      if (val !== undefined && val !== null && val !== "") return val;
    }
  }
  return undefined;
}

function hasAnyData(row: Record<string, unknown>): boolean {
  return Object.values(row).some((value) => String(value ?? "").trim() !== "");
}

function getRowNumber(row: Record<string, unknown>, fallback: number): number {
  const rowNum = (row as Record<string, unknown>).__rowNum__;
  return typeof rowNum === "number" ? rowNum + 1 : fallback;
}

function validarCamposObrigatoriosPlanilha(
  row: Record<string, unknown>,
  rowNumber: number,
  cnpjRaw: unknown,
  responsavel: string,
  setorOuDepartamento: string | undefined
): string | null {
  const faltantes: string[] = [];
  const cnpjInfo = normalizarCnpjDetalhado(cnpjRaw);

  if (!cnpjInfo.original && !cnpjInfo.digitos) faltantes.push("CNPJ");
  if (!responsavel) faltantes.push("RESPONSAVEL");
  if (!setorOuDepartamento) faltantes.push("SETOR");

  if (faltantes.length === 0) return null;
  const cod = String(getCell(row, ["CÓD.", "COD", "Cód.", "Cod"]) ?? "").trim();
  const identificador = cod ? ` (COD. ${cod})` : "";
  return `Linha ${rowNumber}${identificador}: informe ${faltantes.join(", ")}.`;
}

/**
 * Lê a planilha e retorna array de linhas normalizadas.
 * @param planilhaPath Caminho para o arquivo .xlsx (absoluto ou relativo ao CWD).
 */
export function lerPlanilha(planilhaPath: string): LinhaPlanilha[] {
  const resolved = path.isAbsolute(planilhaPath)
    ? planilhaPath
    : path.resolve(process.cwd(), planilhaPath);

  const workbook = XLSX.readFile(resolved, { type: "file" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    defval: "",
    raw: false,
  });

  const linhas: LinhaPlanilha[] = [];
  const errosObrigatorios: string[] = [];

  for (let index = 0; index < data.length; index++) {
    const row = data[index];
    if (!hasAnyData(row)) continue;

    const cod = String(getCell(row, ["CÓD.", "COD", "Cód.", "Cod"]) ?? "").trim();
    const cnpjRaw = getCell(row, ["CNPJ", "Cnpj"]);
    const empresa = String(getCell(row, ["EMPRESA", "Empresa", "RAZAO SOCIAL", "Razao Social", "RAZÃO SOCIAL", "Razão Social"]) ?? "").trim() || undefined;
    const responsavel = String(getCell(row, ["RESPONSÁVEL", "RESPONSÁVEL ", "Responsável", "RESPONSAVEL"]) ?? "").trim();
    const mesGeracaoRaw = getCell(row, ["MES GERACAO", "MES GERAÇÃO", "Mes Geracao", "Mês Geração"]);
    const departamento = String(getCell(row, ["DEPARTAMENTO", "Departamento", "DEPARTAMENTO "]) ?? "").trim() || undefined;
    const setor = String(getCell(row, ["SETOR", "Setor"]) ?? "").trim() || undefined;
    const setorOuDepartamento = setor || departamento;
    const erroObrigatorio = validarCamposObrigatoriosPlanilha(
      row,
      getRowNumber(row, index + 2),
      cnpjRaw,
      responsavel,
      setorOuDepartamento
    );
    if (erroObrigatorio) {
      errosObrigatorios.push(erroObrigatorio);
      continue;
    }

    const cnpjInfo = normalizarCnpjDetalhado(cnpjRaw);
    const mesGeracao = parseMesGeracao(mesGeracaoRaw);

    if (!mesGeracao) {
      linhas.push({
        cod,
        cnpj: cnpjInfo.valor,
        ...(cnpjInfo.original && cnpjInfo.original !== cnpjInfo.valor ? { cnpjOriginal: cnpjInfo.original } : {}),
        ...(cnpjInfo.ajustado ? { cnpjFoiAjustado: true } : {}),
        ...(!cnpjInfo.valido ? { cnpjInvalido: true } : {}),
        empresa,
        responsavel,
        mesGeracao: { month: new Date().getMonth() + 1, year: new Date().getFullYear() },
        departamento,
        setor: setorOuDepartamento,
      });
      continue;
    }

    linhas.push({
      cod,
      cnpj: cnpjInfo.valor,
      ...(cnpjInfo.original && cnpjInfo.original !== cnpjInfo.valor ? { cnpjOriginal: cnpjInfo.original } : {}),
      ...(cnpjInfo.ajustado ? { cnpjFoiAjustado: true } : {}),
      ...(!cnpjInfo.valido ? { cnpjInvalido: true } : {}),
      empresa,
      responsavel,
      mesGeracao,
      departamento,
      setor: setorOuDepartamento,
    });
  }

  if (errosObrigatorios.length > 0) {
    throw new PlanilhaObrigatoriaError(errosObrigatorios);
  }

  return linhas;
}
