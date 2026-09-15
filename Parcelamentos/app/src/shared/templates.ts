import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import type { UfCode } from "./types.js";

/** Modelos oficiais alinhados aos arquivos reais de cada SEFAZ. */
export const MINIMAL_HEADERS: Record<UfCode, string[]> = {
  AL: ["CODIGO", "EMPRESA", "CNPJ", "USUARIO", "SENHA", "OBSERVAÇÃO"],
  PI: ["CODIGO", "EMPRESA", "CNPJ", "INSCRICAO ESTADUAL"],
  SE: ["CODIGO", "EMPRESA", "CNPJ", "INSCRICAO ESTADUAL", "CPF", "LOCAL PARA SALVAR ARQUIVO"],
};

const EXAMPLE_ROWS: Record<UfCode, Record<string, string>> = {
  AL: {
    CODIGO: "001",
    EMPRESA: "EMPRESA EXEMPLO LTDA",
    CNPJ: "00000000000000",
    USUARIO: "usuario.exemplo",
    SENHA: "senha-exemplo",
    "OBSERVAÇÃO": "",
  },
  PI: {
    CODIGO: "001",
    EMPRESA: "EMPRESA EXEMPLO LTDA",
    CNPJ: "00000000000000",
    "INSCRICAO ESTADUAL": "123456789",
  },
  SE: {
    CODIGO: "001",
    EMPRESA: "EMPRESA EXEMPLO LTDA",
    CNPJ: "00.000.000/0001-00",
    "INSCRICAO ESTADUAL": "123456789",
    CPF: "00000000000",
    "LOCAL PARA SALVAR ARQUIVO": "",
  },
};

export function modelColumnsHint(uf: UfCode): string {
  return `Preencha na planilha: ${MINIMAL_HEADERS[uf].join(", ")}.`;
}

export async function writeUfTemplate(uf: UfCode, filePath: string): Promise<string> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const headers = MINIMAL_HEADERS[uf];
  const example = EXAMPLE_ROWS[uf];
  const aoa = [headers, headers.map((header) => example[header] ?? "")];

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  XLSX.utils.book_append_sheet(workbook, worksheet, uf);
  XLSX.writeFile(workbook, filePath);
  return filePath;
}
