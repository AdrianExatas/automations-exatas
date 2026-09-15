import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import { statusLabel, toFriendlyMessage } from "./messages.js";
import type { NormalizedResult } from "./types.js";

function timestampForFile(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

export async function writeConsolidatedReport(
  results: NormalizedResult[],
  outputDir: string,
): Promise<string> {
  await fs.mkdir(outputDir, { recursive: true });

  const reportPath = path.join(outputDir, `relatorio-execucao-${timestampForFile()}.xlsx`);
  const rows = results.map((result) => ({
    UF: result.uf,
    LINHA: result.rowNumber,
    IDENTIFICADOR: result.identificador,
    EMPRESA: result.empresa ?? "",
    CNPJ: result.cnpj ?? "",
    DETALHE: result.detalhe ?? "",
    STATUS: statusLabel(result.status),
    MENSAGEM: toFriendlyMessage(result.mensagem),
    ARQUIVO: result.arquivo ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Execucao");
  XLSX.writeFile(workbook, reportPath);

  return reportPath;
}
