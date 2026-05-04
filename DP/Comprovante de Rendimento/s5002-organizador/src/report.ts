import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import type { DetailEntry, RunResult } from "./types";

export async function saveReports(result: Omit<RunResult, "excelPath" | "jsonPath">): Promise<{ excelPath: string; jsonPath: string }> {
  await mkdir(result.outputDir, { recursive: true });

  const jsonPath = path.join(result.outputDir, "relatorio-s5002.json");
  const excelPath = path.join(result.outputDir, "relatorio-s5002.xlsx");

  await writeFile(jsonPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  writeWorkbook(excelPath, result);

  return { excelPath, jsonPath };
}

function writeWorkbook(excelPath: string, result: Omit<RunResult, "excelPath" | "jsonPath">): void {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([
    { Indicador: "Pasta de entrada", Valor: result.inputDir },
    { Indicador: "Pasta de saida", Valor: result.outputDir },
    { Indicador: "ZIPs encontrados", Valor: result.zipCount },
    { Indicador: "XMLs S-5002 encontrados", Valor: result.s5002Count },
    { Indicador: "Arquivos ignorados", Valor: result.ignoredCount },
    { Indicador: "XMLs organizados", Valor: result.successCount },
    { Indicador: "Erros", Valor: result.errorCount },
  ]), "Resumo");

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(buildDetailRows(result.entries)), "Detalhes");
  XLSX.writeFile(workbook, excelPath);
}

function buildDetailRows(entries: DetailEntry[]): Array<Record<string, string | number>> {
  return entries.map((entry) => ({
    Ordem: entry.ordem,
    Status: entry.status,
    ZIP: entry.sourceZip,
    "Arquivo no ZIP": entry.sourceEntry ?? "",
    CPF: entry.cpf ?? "",
    "Periodo Apuracao": entry.perApur ?? "",
    "Arquivo Gerado": entry.outputPath ?? "",
    Erro: entry.errorCode ?? "",
    Mensagem: entry.message ?? "",
  }));
}
