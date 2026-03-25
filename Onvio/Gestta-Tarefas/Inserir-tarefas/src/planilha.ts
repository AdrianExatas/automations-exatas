import path from "path";
import * as XLSX from "xlsx";
import { LinhaPlanilha } from "./types";
import { normalizarCnpj, normalizarNome, normalizarNomeTarefa } from "./utils";

type RawRow = Record<string, unknown>;

function getCell(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }

  for (const rowKey of Object.keys(row)) {
    const trimmed = rowKey.trim();
    if (!keys.some((key) => key.trim() === trimmed)) continue;
    const value = row[rowKey];
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

export function normalizarLinhasPlanilha(rows: RawRow[]): LinhaPlanilha[] {
  const linhas = new Map<string, LinhaPlanilha>();

  for (const row of rows) {
    const cod = String(
      getCell(row, [
        "CÓD",
        "CÓD.",
        "CÓDIGO",
        "CÃ“D",
        "CÃ“D.",
        "CÃ“DIGO",
        "COD",
        "COD.",
        "Codigo",
      ]) ?? "",
    ).trim();
    const empresa = String(getCell(row, ["EMPRESA", "Empresa"]) ?? "").trim();
    const cnpj = normalizarCnpj(getCell(row, ["CNPJ", "Cnpj"]));
    const tarefa = String(getCell(row, ["TAREFA", "Tarefa"]) ?? "").trim();
    const responsavel = String(
      getCell(row, [
        "RESPONSÁVEL",
        "RESPONSÁVEL ",
        "RESPONSÃVEL",
        "RESPONSÃVEL ",
        "RESPONSAVEL",
        "Responsável",
        "ResponsÃ¡vel",
        "Responsavel",
      ]) ?? "",
    ).trim();

    if (!cnpj || !tarefa || !responsavel) continue;

    const linha: LinhaPlanilha = { cod, empresa, cnpj, tarefa, responsavel };
    const chave = `${normalizarNomeTarefa(tarefa)}::${cnpj}`;
    const existente = linhas.get(chave);

    if (existente && normalizarNome(existente.responsavel) !== normalizarNome(responsavel)) {
      throw new Error(
        `Conflito na planilha para tarefa "${tarefa}" e CNPJ ${cnpj}: ` +
          `"${existente.responsavel}" x "${responsavel}".`,
      );
    }

    if (!existente) {
      linhas.set(chave, linha);
    }
  }

  return [...linhas.values()];
}

export function lerPlanilha(planilhaPath: string): LinhaPlanilha[] {
  const resolved = path.isAbsolute(planilhaPath)
    ? planilhaPath
    : path.resolve(process.cwd(), planilhaPath);

  const workbook = XLSX.readFile(resolved, { type: "file" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];

  const rows = XLSX.utils.sheet_to_json<RawRow>(firstSheet, {
    defval: "",
    raw: false,
  });

  return normalizarLinhasPlanilha(rows);
}
