#!/usr/bin/env bun
import { Command } from "commander";
import { limparCheckpoint, limparCheckpointSeForDeOutroDia, verificarCheckpoint } from "../download/checkpoint.js";
import { executarDownload } from "../download/runner.js";
import { downloadState } from "../download/state.js";

const program = new Command();

program
  .name("download")
  .description("Automacao de download de XMLs da SEFAZ")
  .option("--headless", "Executar navegador invisivel", false)
  .option("--visible", "Executar navegador visivel")
  .option("--status", "Apenas mostrar status do checkpoint", false)
  .option("--limpar", "Limpa checkpoint existente", false)
  .option("--pagina-inicial <numero>", "Pagina inicial para processamento", (value) => Number.parseInt(value, 10))
  .option("--pagina-final <numero>", "Pagina final para processamento", (value) => Number.parseInt(value, 10))
  .option("--data <DDMMYYYY>", "Filtro de data de solicitacao")
  .option("--extrair", "Extrai automaticamente os arquivos .zip baixados")
  .option("--nao-extrair", "Nao extrai os arquivos .zip baixados")
  .option("--upload", "Executa upload automatico para SIEG apos descompactacao", false)
  .option("--selenium", "Forca o fluxo antigo via Selenium", false)
  .option("--http", "Usa o fluxo HTTP autenticado", true);

program.parse(process.argv);
const options = program.opts<{
  headless: boolean;
  visible?: boolean;
  status: boolean;
  limpar: boolean;
  paginaInicial?: number;
  paginaFinal?: number;
  data?: string;
  extrair?: boolean;
  naoExtrair?: boolean;
  upload: boolean;
  selenium: boolean;
}>();

if (options.status) {
  const checkpoint = verificarCheckpoint();
  if (!checkpoint) {
    console.log("\n[INFO] Nenhum checkpoint encontrado.");
  }
  process.exit(0);
}

if (options.limpar) {
  console.log("Limpando checkpoint (modo nao-interativo)...");
  limparCheckpoint();
  process.exit(0);
}

limparCheckpointSeForDeOutroDia();

downloadState.usarHeadless = options.visible ? false : options.headless;
downloadState.paginaInicial = options.paginaInicial;
downloadState.paginaFinal = options.paginaFinal;
downloadState.dataSolicitacao = options.data;
downloadState.uploadAutomatico = options.upload;
if (options.extrair !== undefined) {
  downloadState.extrairZips = true;
}
if (options.naoExtrair !== undefined) {
  downloadState.extrairZips = false;
}

console.log("=".repeat(60));
console.log("AUTOMACAO DE DOWNLOAD DE XMLs SEFAZ (TS/Bun)");
console.log("=".repeat(60));
console.log(`Execucao: ${options.selenium ? "Selenium" : "HTTP"}`);
console.log(`Modo: ${downloadState.usarHeadless ? "Headless" : "Visivel"}`);
console.log(`Extracao automatica: ${downloadState.extrairZips ? "Sim" : "Nao"}`);
console.log(`Upload automatico SIEG: ${downloadState.uploadAutomatico ? "Sim" : "Nao"}`);
if (downloadState.paginaInicial) {
  console.log(`Pagina inicial: ${downloadState.paginaInicial}`);
}
if (downloadState.paginaFinal) {
  console.log(`Pagina final: ${downloadState.paginaFinal}`);
}
if (downloadState.dataSolicitacao) {
  console.log(`Filtro de data: ${downloadState.dataSolicitacao}`);
}
console.log("=".repeat(60));

const checkpoint = verificarCheckpoint();
if (checkpoint) {
  console.log("\nCheckpoint encontrado: retomando automaticamente. Use --limpar para zerar.");
}

try {
  await executarDownload({ selenium: options.selenium });
  process.exit(0);
} catch (error) {
  console.error(`\n[ERRO] Erro critico: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
