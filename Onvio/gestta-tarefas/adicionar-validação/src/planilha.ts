import path from "path";
import * as XLSX from "xlsx";
import { normalizarCnpjDetalhado } from "./cnpj";
import { LinhaConflitoDuplicidade, LinhaPlanilha } from "./types";

function normalizarTextoComparacao(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function getCell(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }

  for (const rowKey of Object.keys(row)) {
    const trimmed = rowKey.trim();
    if (keys.some((key) => key.trim() === trimmed)) {
      const value = row[rowKey];
      if (value !== undefined && value !== null && value !== "") return value;
    }
  }

  return undefined;
}

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

  for (const row of data) {
    const numero = String(getCell(row, ["NUMERO", "NÚMERO", "Numero", "Número"]) ?? "").trim();
    const empresa = String(
      getCell(row, ["NOME EMPRESA", "Nome Empresa", "EMPRESA", "Empresa"]) ?? "",
    ).trim();
    const cnpjRaw = getCell(row, ["CNPJ", "Cnpj"]);
    const setor = String(getCell(row, ["SETOR", "Setor", "DEPARTAMENTO", "Departamento"]) ?? "").trim();
    const responsavel = String(
      getCell(row, ["RESPONSÁVEL", "RESPONSAVEL", "Responsável", "Responsavel"]) ?? "",
    ).trim();
    const validador = String(
      getCell(row, ["VALIDAÇÃO", "VALIDACAO", "Validação", "Validacao"]) ?? "",
    ).trim();

    const cnpjInfo = normalizarCnpjDetalhado(cnpjRaw);

    if (!validador || !setor) continue;
    if (!cnpjInfo.original && !cnpjInfo.digitos) continue;

    linhas.push({
      numero,
      empresa,
      cnpj: cnpjInfo.valor,
      ...(cnpjInfo.original && cnpjInfo.original !== cnpjInfo.valor
        ? { cnpjOriginal: cnpjInfo.original }
        : {}),
      ...(cnpjInfo.ajustado ? { cnpjFoiAjustado: true } : {}),
      ...(!cnpjInfo.valido ? { cnpjInvalido: true } : {}),
      setor,
      responsavel,
      validador,
    });
  }

  return linhas;
}

export function deduplicarLinhasPorCnpjSetor(linhas: LinhaPlanilha[]): {
  linhas: LinhaPlanilha[];
  conflitos: LinhaConflitoDuplicidade[];
  duplicatasIgnoradas: number;
} {
  const grouped = new Map<string, LinhaPlanilha[]>();

  for (const linha of linhas) {
    const key = `${linha.cnpj || linha.cnpjOriginal || ""}::${normalizarTextoComparacao(linha.setor)}`;
    const current = grouped.get(key) ?? [];
    current.push(linha);
    grouped.set(key, current);
  }

  const unicas: LinhaPlanilha[] = [];
  const conflitos: LinhaConflitoDuplicidade[] = [];
  let duplicatasIgnoradas = 0;

  for (const group of grouped.values()) {
    if (group.length === 1) {
      unicas.push(group[0]);
      continue;
    }

    const validadores = new Map<string, LinhaPlanilha[]>();
    for (const linha of group) {
      const key = normalizarTextoComparacao(linha.validador);
      const current = validadores.get(key) ?? [];
      current.push(linha);
      validadores.set(key, current);
    }

    if (validadores.size === 1) {
      unicas.push(group[0]);
      duplicatasIgnoradas += group.length - 1;
      continue;
    }

    const nomes = [...new Set(group.map((item) => item.validador).filter(Boolean))].sort();
    const mensagem =
      `Conflito de duplicidade para o mesmo CNPJ/setor; validadores encontrados: ${nomes.join(", ")}.`;
    conflitos.push(...group.map((linha) => ({ linha, mensagem })));
  }

  return { linhas: unicas, conflitos, duplicatasIgnoradas };
}
