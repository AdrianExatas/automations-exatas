import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import { digitsOnly } from "./normalize.js";
import { MINIMAL_HEADERS } from "./templates.js";
import type { UfCode } from "./types.js";

export async function materializeInputWorkbook(options: {
  uf: UfCode;
  mode: "sheet" | "paste";
  sheetPath?: string;
  downloadDir: string;
  workDir: string;
}): Promise<string> {
  if (options.mode !== "sheet") {
    throw new Error("Use uma planilha de entrada para este estado.");
  }

  const sheetPath = options.sheetPath?.trim();
  if (!sheetPath) {
    throw new Error("Selecione uma planilha de entrada.");
  }

  validateMinimalHeaders(sheetPath, options.uf);

  if (options.uf === "AL") {
    return await materializeAlSheet(sheetPath, options.workDir);
  }

  if (options.uf === "PI") {
    return await materializePiSheet(sheetPath, options.downloadDir, options.workDir);
  }

  return await materializeSeSheet(sheetPath, options.downloadDir, options.workDir);
}

function readFirstSheetRows(filePath: string): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("A planilha nao possui abas.");
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
    defval: "",
    raw: false,
  });
}

function readHeaders(filePath: string): string[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("A planilha nao possui abas.");
  }

  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(workbook.Sheets[firstSheetName], {
    header: 1,
    raw: false,
    blankrows: false,
  });

  return (matrix[0] ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
}

function headerSet(filePath: string): Set<string> {
  return new Set(readHeaders(filePath).map((header) => header.toUpperCase()));
}

export function validateMinimalHeaders(filePath: string, uf: UfCode): void {
  const headers = headerSet(filePath);
  const required = MINIMAL_HEADERS[uf];

  // OBSERVAÇÃO pode vir sem acento
  const missing = required.filter((header) => {
    const upper = header.toUpperCase();
    if (headers.has(upper)) {
      return false;
    }
    if (upper === "OBSERVAÇÃO" && (headers.has("OBSERVACAO") || headers.has("OBSERVAÇÃO"))) {
      return false;
    }
    return true;
  });

  if (missing.length > 0) {
    throw new Error(
      `A planilha de ${uf} precisa das colunas: ${required.join(", ")}. Faltando: ${missing.join(", ")}.`,
    );
  }

  const rows = readFirstSheetRows(filePath).filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));
  if (rows.length === 0) {
    throw new Error("A planilha nao possui linhas de dados para processar.");
  }
}

async function materializeAlSheet(sheetPath: string, workDir: string): Promise<string> {
  const rows = readFirstSheetRows(sheetPath);
  const expanded = rows
    .map((row, index) => {
      const empresa = String(row.EMPRESA ?? "").trim();
      const usuario = String(row.USUARIO ?? "").trim();
      const senha = String(row.SENHA ?? "").trim();

      if (!empresa && !usuario && !senha) {
        return null;
      }

      if (!empresa || !usuario || !senha) {
        throw new Error(`Linha ${index + 2}: preencha EMPRESA, USUARIO e SENHA.`);
      }

      return {
        CODIGO: String(row.CODIGO ?? "").trim(),
        EMPRESA: empresa,
        CNPJ: String(row.CNPJ ?? "").trim(),
        USUARIO: usuario,
        SENHA: senha,
        "OBSERVAÇÃO": String(row["OBSERVAÇÃO"] ?? row.OBSERVACAO ?? "").trim(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (expanded.length === 0) {
    throw new Error("A planilha nao possui linhas de dados para processar.");
  }

  const outPath = path.join(workDir, `entrada-al-${Date.now()}.xlsx`);
  await writeRows(outPath, expanded);
  return outPath;
}

async function materializePiSheet(sheetPath: string, downloadDir: string, workDir: string): Promise<string> {
  const rows = readFirstSheetRows(sheetPath);
  const expanded = rows
    .map((row, index) => {
      const codigo = String(row.CODIGO ?? "").trim() || String(index + 1).padStart(3, "0");
      const empresa = String(row.EMPRESA ?? "").trim();
      const cnpj = digitsOnly(row.CNPJ);
      const ie = digitsOnly(row["INSCRICAO ESTADUAL"]);

      if (!codigo && !empresa && !ie) {
        return null;
      }

      if (!ie) {
        throw new Error(`Linha ${index + 2}: informe a INSCRICAO ESTADUAL.`);
      }

      return {
        CODIGO: codigo,
        EMPRESA: empresa,
        CNPJ: cnpj,
        "INSCRICAO ESTADUAL": ie,
        "LOCAL PARA SALVAR ARQUIVO": downloadDir,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (expanded.length === 0) {
    throw new Error("A planilha nao possui linhas de dados para processar.");
  }

  const outPath = path.join(workDir, `entrada-pi-${Date.now()}.xlsx`);
  await writeRows(outPath, expanded);
  return outPath;
}

async function materializeSeSheet(sheetPath: string, downloadDir: string, workDir: string): Promise<string> {
  const rows = readFirstSheetRows(sheetPath);
  const expanded = rows
    .map((row, index) => {
      const codigo = String(row.CODIGO ?? "").trim() || String(index + 1).padStart(3, "0");
      const empresa = String(row.EMPRESA ?? "").trim();
      const cnpj = String(row.CNPJ ?? "").trim();
      const ie = digitsOnly(row["INSCRICAO ESTADUAL"]);
      const cpf = digitsOnly(row.CPF);
      const saveDir = String(row["LOCAL PARA SALVAR ARQUIVO"] ?? "").trim() || downloadDir;

      if (!codigo && !empresa && !ie && !cpf) {
        return null;
      }

      if (!ie) {
        throw new Error(`Linha ${index + 2}: informe a INSCRICAO ESTADUAL.`);
      }

      if (!cpf) {
        throw new Error(`Linha ${index + 2}: informe o CPF.`);
      }

      return {
        CODIGO: codigo,
        EMPRESA: empresa,
        CNPJ: cnpj,
        "INSCRICAO ESTADUAL": ie,
        CPF: cpf,
        "LOCAL PARA SALVAR ARQUIVO": downloadDir || saveDir,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (expanded.length === 0) {
    throw new Error("A planilha nao possui linhas de dados para processar.");
  }

  const outPath = path.join(workDir, `entrada-se-${Date.now()}.xlsx`);
  await writeRows(outPath, expanded);
  return outPath;
}

async function writeRows(filePath: string, rows: Record<string, unknown>[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Entrada");
  XLSX.writeFile(workbook, filePath);
}

export function detectUfFromSheet(filePath: string): UfCode | null {
  const headers = headerSet(filePath);

  if (headers.has("SENHA") && headers.has("USUARIO")) {
    return "AL";
  }

  if (headers.has("CPF") && headers.has("INSCRICAO ESTADUAL")) {
    return "SE";
  }

  if (headers.has("INSCRICAO ESTADUAL") && (headers.has("CODIGO") || headers.has("EMPRESA"))) {
    return "PI";
  }

  return null;
}

export function inspectSheetPreview(
  filePath: string,
  uf: UfCode,
): { rowCount: number; preview: { rowNumber: number; summary: string }[] } {
  validateMinimalHeaders(filePath, uf);
  const rows = readFirstSheetRows(filePath).filter((row) => Object.values(row).some((value) => String(value ?? "").trim()));

  const preview = rows.slice(0, 5).map((row, index) => {
    const rowNumber = index + 2;
    if (uf === "AL") {
      return {
        rowNumber,
        summary: `${String(row.CODIGO ?? "").trim()} · ${String(row.EMPRESA ?? "").trim()}`,
      };
    }

    if (uf === "PI") {
      return {
        rowNumber,
        summary: `${String(row.CODIGO ?? "").trim()} · IE ${String(row["INSCRICAO ESTADUAL"] ?? "").trim()}`,
      };
    }

    return {
      rowNumber,
      summary: `${String(row.CODIGO ?? "").trim()} · IE ${String(row["INSCRICAO ESTADUAL"] ?? "").trim()}`,
    };
  });

  return { rowCount: rows.length, preview };
}
