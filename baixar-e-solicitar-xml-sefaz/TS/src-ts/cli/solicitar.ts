#!/usr/bin/env bun
import { Command } from "commander";
import { SEFAZ_CERT_PFX_PASSWORD, SEFAZ_CERT_PFX_PATH } from "../core/config.js";
import { SefazPortalClient, type SefazTransport } from "../portal/client.js";
import { parseDateInput, formatDateBr } from "../utils/dates.js";

const program = new Command();
program
  .name("solicitar")
  .description("Envia uma unica solicitacao XML controlada para validacao")
  .requiredOption("--inscricao <numero>")
  .requiredOption("--tipo <NFE|NFC|CTE>")
  .requiredOption("--pesquisar-por <criterio>")
  .requiredOption("--data-inicial <data>")
  .requiredOption("--data-final <data>")
  .option("--transport <modo>", "auto, http ou playwright", "auto")
  .option("--visible", "abre o navegador quando o fallback for necessario");
program.parse(process.argv);
const options = program.opts<{ inscricao: string; tipo: string; pesquisarPor: string; dataInicial: string; dataFinal: string; transport: SefazTransport; visible?: boolean }>();
if (!(["auto", "http", "playwright"] as const).includes(options.transport)) throw new Error("--transport deve ser auto, http ou playwright");
const inicio = parseDateInput(options.dataInicial);
const fim = parseDateInput(options.dataFinal);
if (inicio > fim) throw new Error("data inicial maior que a data final");
const client = new SefazPortalClient(options.transport, !options.visible);
try {
  await client.login(SEFAZ_CERT_PFX_PATH, SEFAZ_CERT_PFX_PASSWORD);
  const resultado = await client.solicitarXml({
    inscricao_municipal: options.inscricao,
    tipo_arquivo: options.tipo.toUpperCase(),
    pesquisar_por: options.pesquisarPor,
    data_inicial: formatDateBr(inicio),
    data_final: formatDateBr(fim),
  });
  if (!resultado.sucesso) {
    console.error(`[ERRO] ${resultado.mensagem}${resultado.aviso ? `: ${resultado.aviso}` : ""}`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] ${resultado.mensagem}${resultado.aviso ? `: ${resultado.aviso}` : ""}`);
  }
} finally {
  await client.close();
}
