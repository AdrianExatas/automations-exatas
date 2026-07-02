#!/usr/bin/env bun
import { Command } from "commander";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { executarCapturaComFallback } from "../consulta/runner.js";
import { exibirStatusHistorico, limparTodoHistorico } from "../consulta/historico.js";
import { parseDateInput } from "../utils/dates.js";

const program = new Command();

program
  .name("consulta")
  .description("Captura continua de XMLs com recuperacao automatica de periodos perdidos")
  .option("--headless", "Executar navegador invisivel", false)
  .option("--visible", "Executar navegador visivel")
  .option("--status", "Apenas mostrar status do historico de execucoes", false)
  .option("--limpar-historico", "Limpa todo o historico de execucoes", false)
  .option("--data-inicial <data>", "Data inicial do intervalo (DD/MM/YYYY ou DDMMYYYY)")
  .option("--data-final <data>", "Data final do intervalo (DD/MM/YYYY ou DDMMYYYY)")
  .option("--http", "Usa fluxo HTTP autenticado", true)
  .option("--selenium", "Forca o fluxo legado via Selenium", false);

program.parse(process.argv);
const options = program.opts<{
  headless: boolean;
  visible?: boolean;
  status: boolean;
  limparHistorico: boolean;
  dataInicial?: string;
  dataFinal?: string;
  selenium: boolean;
}>();

if (options.status) {
  exibirStatusHistorico();
  process.exit(0);
}

if (options.limparHistorico) {
  const rl = createInterface({ input, output });
  const resposta = await rl.question("Tem certeza que deseja limpar todo o historico? (s/N): ");
  rl.close();
  if (resposta.toLowerCase() === "s") {
    limparTodoHistorico();
    console.log("Historico limpo!");
  } else {
    console.log("Operacao cancelada.");
  }
  process.exit(0);
}

try {
  if (Boolean(options.dataInicial) !== Boolean(options.dataFinal)) {
    console.error("[ERRO] --data-inicial e --data-final devem ser especificados juntos");
    process.exit(1);
  }

  const dataInicial = options.dataInicial ? parseDateInput(options.dataInicial) : undefined;
  const dataFinal = options.dataFinal ? parseDateInput(options.dataFinal) : undefined;
  const sucesso = await executarCapturaComFallback({
    headless: options.visible ? false : options.headless,
    dataInicial,
    dataFinal,
    selenium: options.selenium,
  });
  process.exit(sucesso ? 0 : 1);
} catch (error) {
  console.error(`\n[ERRO] Erro critico: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
