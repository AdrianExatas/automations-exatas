#!/usr/bin/env bun
import { Command } from "commander";
import { PATHS } from "../core/config.js";
import { enviarAutomatico, NUM_THREADS_PADRAO } from "../upload/uploader.js";

const program = new Command();

program
  .name("upload")
  .description("Upload automatico de XMLs para o SIEG")
  .requiredOption("--auto, -a", "Modo automatico: valida, envia e exclui sem interacao")
  .option("--pasta, -p <pasta>", `Pasta com XMLs (padrao: ${PATHS.downloadsDir})`)
  .option("--manter, -m", "Manter XMLs apos envio (nao excluir)", false)
  .option("--threads, -t <numero>", `Numero de threads (padrao: ${NUM_THREADS_PADRAO})`, (value) => Number.parseInt(value, 10), NUM_THREADS_PADRAO);

program.parse(process.argv);
const options = program.opts<{
  pasta?: string;
  manter: boolean;
  threads: number;
}>();

const resultado = await enviarAutomatico({
  pasta: options.pasta,
  excluirEnviados: !options.manter,
  numThreads: options.threads,
});

if (resultado.erro) {
  console.error(`\n[ERRO] ${resultado.erro}`);
  process.exit(1);
}

process.exit(resultado.erros > 0 ? 1 : 0);
