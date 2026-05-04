import fs from "node:fs/promises";
import path from "node:path";
import XLSX from "xlsx";
import type { NotaFiscalAlteracaoEntry, RunAlterarNotaFiscalConfig } from "./nf-types";

export function buildReportPaths(config: Pick<RunAlterarNotaFiscalConfig, "outDir">): { jsonPath: string; excelPath: string } {
  const runDir = buildRunDir(config.outDir);
  return {
    jsonPath: path.join(runDir, "relatorio-alteracao-notas.json"),
    excelPath: path.join(runDir, "relatorio-alteracao-notas.xlsx"),
  };
}

export function buildRunDir(outDir: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return path.resolve(outDir, stamp);
}

export async function saveExecutionReports(
  config: Pick<RunAlterarNotaFiscalConfig, "outDir">,
  entries: NotaFiscalAlteracaoEntry[],
): Promise<{ jsonPath: string; excelPath: string }> {
  const paths = buildReportPaths(config);
  await fs.mkdir(path.dirname(paths.jsonPath), { recursive: true });
  await fs.writeFile(paths.jsonPath, JSON.stringify(entries, null, 2), "utf8");
  await saveExcelReport(paths.excelPath, entries);
  return paths;
}

async function saveExcelReport(filePath: string, entries: NotaFiscalAlteracaoEntry[]): Promise<void> {
  const workbook = XLSX.utils.book_new();
  const resumo = [
    {
      Sucessos: entries.filter((entry) => entry.status === "sucesso").length,
      Erros: entries.filter((entry) => entry.status === "erro").length,
      Ignoradas: entries.filter((entry) => entry.status === "ignorado").length,
      Total: entries.length,
      GeradoEm: new Date().toLocaleString("pt-BR"),
    },
  ];
  const detalhes = entries.map((entry) => ({
    Linha: entry.rowNumber,
    "Inscricao Municipal": entry.inscricaoMunicipal,
    Empresa: entry.nomeEmpresa,
    Etiqueta: entry.etiqueta,
    Acao: entry.acao,
    Cor: entry.corRgb,
    "ICMS Atual": entry.icmsAtual,
    "ICMS Novo": entry.icmsNovo,
    "Recolhimento Atual": entry.recolhimentoAtual,
    "Recolhimento Novo": entry.recolhimentoNovo,
    Observacao: entry.observacao,
    Adiar: entry.adiar ? "SIM" : "NAO",
    Status: entry.status,
    Mensagem: entry.mensagem ?? "",
    "Data/Hora": entry.timestamp,
  }));

  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resumo), "Resumo");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detalhes), "Notas");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  XLSX.writeFile(workbook, filePath);
}
