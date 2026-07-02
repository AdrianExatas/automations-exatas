import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import type { Contribuinte } from "./types";

const PLANILHA_REGEX = /\.(xls|xlsx)$/i;
const CD_PESSOA_MIN_DIGITOS = 6;

export function loadContribuintes(modelDir: string): Contribuinte[] {
  if (!fs.existsSync(modelDir)) {
    throw new Error(`Pasta de modelos nao encontrada: ${modelDir}`);
  }

  const arquivos = fs
    .readdirSync(modelDir)
    .filter((nome) => PLANILHA_REGEX.test(nome))
    .filter((nome) => !nome.startsWith("~$"))
    .sort();

  if (arquivos.length === 0) {
    throw new Error(`Nenhuma planilha (.xls/.xlsx) encontrada em ${modelDir}.`);
  }

  const contribuintes: Contribuinte[] = [];
  const vistos = new Set<string>();

  for (const arquivo of arquivos) {
    const caminho = path.join(modelDir, arquivo);
    const contribuinte = extrairContribuinte(caminho);
    if (!contribuinte) {
      throw new Error(
        `Nao foi possivel extrair cdPessoaContribuinte da planilha ${arquivo}. ` +
          "Esperado nome de aba como '271922052 RAZAO SOCIAL' ou titulo 'Contribuinte: <cd> <nome>'.",
      );
    }
    if (vistos.has(contribuinte.cdPessoaContribuinte)) {
      continue;
    }
    vistos.add(contribuinte.cdPessoaContribuinte);
    contribuintes.push(contribuinte);
  }

  return contribuintes;
}

export function extrairContribuinte(caminho: string): Contribuinte | undefined {
  const wb = XLSX.readFile(caminho, { bookSheets: false });
  const sheetName = wb.SheetNames[0];
  const fonte = path.basename(caminho);

  const fromSheetName = sheetName ? parseSheetName(sheetName) : undefined;
  if (fromSheetName) {
    return { ...fromSheetName, fonte };
  }

  if (!sheetName) {
    return undefined;
  }
  const sheet = wb.Sheets[sheetName];
  if (!sheet) {
    return undefined;
  }
  const titulo = readCell(sheet, "A1");
  const fromTitulo = titulo ? parseTitulo(titulo) : undefined;
  if (fromTitulo) {
    return { ...fromTitulo, fonte };
  }

  return undefined;
}

export function parseSheetName(
  sheetName: string,
): Pick<Contribuinte, "cdPessoaContribuinte" | "razaoSocial"> | undefined {
  const match = sheetName.trim().match(new RegExp(`^(\\d{${CD_PESSOA_MIN_DIGITOS},})\\s+(.+)$`));
  if (!match) {
    return undefined;
  }

  return {
    cdPessoaContribuinte: match[1]!,
    razaoSocial: match[2]!.trim(),
  };
}

export function parseTitulo(
  titulo: string,
): Pick<Contribuinte, "cdPessoaContribuinte" | "razaoSocial"> | undefined {
  const match = titulo.match(
    new RegExp(`Contribuinte:\\s*(\\d{${CD_PESSOA_MIN_DIGITOS},})\\s+([^\\n\\r]+?)(?:\\s+Ref:|\\s*$)`, "i"),
  );
  if (!match) {
    return undefined;
  }

  return {
    cdPessoaContribuinte: match[1]!,
    razaoSocial: match[2]!.trim(),
  };
}

function readCell(sheet: XLSX.WorkSheet, ref: string): string | undefined {
  const cell = sheet[ref];
  if (!cell) {
    return undefined;
  }
  const value = cell.v;
  if (value === undefined || value === null) {
    return undefined;
  }

  return String(value);
}
