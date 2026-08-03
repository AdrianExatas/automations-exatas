import path from "path";
import * as XLSX from "xlsx";
import { normalizarCnpj, normalizarTexto } from "./utils";

export const TAREFAS_FINANCEIRO_TOBIAS = [
  "EMISSÃO NOTA FISCAL - PRODUTO",
  "EMISSÃO NOTA FISCAL - SERVIÇO",
] as const;

export const TOTAL_EMPRESAS_TOBIAS_ESPERADO = 63;

export interface LinhaTobias {
  linha: number;
  cnpj: string;
  cliente: string;
}

function localizarCabecalho(rows: unknown[][]): { linha: number; cnpjIndex: number; clienteIndex: number } {
  for (const [linha, values] of rows.entries()) {
    const headers = values.map((value) => normalizarTexto(String(value ?? "")));
    const cnpjIndex = headers.indexOf("cnpj");
    if (cnpjIndex < 0) continue;

    const clienteIndex = headers.findIndex((header) => header === "cliente" || header === "empresa");
    if (clienteIndex < 0) {
      throw new Error(`Cabecalho da aba Tobias na linha ${linha + 1} nao possui a coluna Cliente.`);
    }

    return { linha, cnpjIndex, clienteIndex };
  }

  throw new Error("Cabecalho CNPJ nao encontrado na aba Tobias.");
}

export function normalizarLinhasTobias(rows: unknown[][]): LinhaTobias[] {
  const header = localizarCabecalho(rows);
  const linhas = new Map<string, LinhaTobias>();

  for (let index = header.linha + 1; index < rows.length; index += 1) {
    const values = rows[index] ?? [];
    const rawCnpj = values[header.cnpjIndex];
    const cnpj = normalizarCnpj(rawCnpj);

    if (!cnpj) continue;
    if (cnpj.length !== 14) {
      throw new Error(`CNPJ invalido na aba Tobias, linha ${index + 1}: "${String(rawCnpj)}".`);
    }
    if (linhas.has(cnpj)) {
      throw new Error(`CNPJ duplicado na aba Tobias, linha ${index + 1}: ${cnpj}.`);
    }

    linhas.set(cnpj, {
      linha: index + 1,
      cnpj,
      cliente: String(values[header.clienteIndex] ?? "").trim(),
    });
  }

  return [...linhas.values()];
}

export function lerPlanilhaTobias(planilhaPath: string): LinhaTobias[] {
  const resolved = path.isAbsolute(planilhaPath)
    ? planilhaPath
    : path.resolve(process.cwd(), planilhaPath);
  const workbook = XLSX.readFile(resolved, { type: "file" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("A planilha nao possui uma primeira aba para importar.");

  const rows = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  return normalizarLinhasTobias(rows);
}
