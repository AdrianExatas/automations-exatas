/**
 * Converte um relatório JSON já gerado em planilha Excel (.xlsx).
 * Uso: npm run relatorio:xlsx -- relatorios/execucao_2026-03-11_15-57-32.json
 *      ou: node dist/scripts/converter-relatorio-xlsx.js relatorios/execucao_2026-03-11_15-57-32.json
 */

import path from "path";
import fs from "fs";
import { salvarRelatorioXlsx, type RelatorioExecucao } from "../relatorio";

const args = process.argv.slice(2);
const argArquivo = args.find((a) => !a.startsWith("-"));
const caminhoJson = argArquivo
  ? path.resolve(process.cwd(), argArquivo)
  : path.resolve(process.cwd(), "relatorios", "execucao_2026-03-11_15-57-32.json");

if (!fs.existsSync(caminhoJson)) {
  console.error("Arquivo não encontrado:", caminhoJson);
  console.error("Uso: npm run relatorio:xlsx -- <caminho-do-relatorio.json>");
  process.exit(1);
}

let relatorio: RelatorioExecucao;
try {
  const raw = fs.readFileSync(caminhoJson, "utf8");
  relatorio = JSON.parse(raw) as RelatorioExecucao;
} catch (err) {
  console.error("Erro ao ler/parsear JSON:", err instanceof Error ? err.message : err);
  process.exit(1);
}

if (!relatorio.execucao || !Array.isArray(relatorio.resultados)) {
  console.error("Relatório inválido (falta execucao ou resultados).");
  process.exit(1);
}

const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoJson);
if (caminhoXlsx) {
  console.log("Planilha gerada:", caminhoXlsx);
} else {
  console.error("Falha ao gerar a planilha.");
  process.exit(1);
}
