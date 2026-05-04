import process from "node:process";
import { loadConfig } from "./config";
import { GerarDaePlaywrightClient } from "./dae-playwright";
import { loadContribuintes } from "./model-loader";
import { competenciaAnterior, formatReferencia } from "./referencia";
import type { Contribuinte, DaeReferencia, GerarDaeConfig } from "./types";

type ResultadoOk = {
  contribuinte: string;
  razaoSocial: string;
  status: "ok";
  arquivo: string;
};

type ResultadoErro = {
  contribuinte: string;
  razaoSocial: string;
  status: "erro";
  erro: string;
};

export type Resultado = ResultadoOk | ResultadoErro;

export async function runGerarDaeBase(config: GerarDaeConfig): Promise<Resultado[]> {
  const contribuintes = loadContribuintes(config.modelDir);
  const ref = config.referencia ?? competenciaAnterior();

  console.log(
    `Processando ${contribuintes.length} contribuinte(s) para competencia ${formatReferencia(ref)}.`,
  );

  const client = new GerarDaePlaywrightClient(config);
  const resultados: Resultado[] = [];

  try {
    await client.start();
    for (const c of contribuintes) {
      resultados.push(await processarContribuinte(client, c, ref));
    }
  } finally {
    await client.close();
  }

  imprimirRelatorio(resultados);
  return resultados;
}

async function processarContribuinte(
  client: GerarDaePlaywrightClient,
  c: Contribuinte,
  ref: DaeReferencia,
): Promise<Resultado> {
  console.log(
    `-> Gerando DAE de ${c.cdPessoaContribuinte} (${c.razaoSocial}) para ${formatReferencia(ref)}...`,
  );
  try {
    const arquivo = await client.gerarDaeParaContribuinte(c, ref);
    console.log(`   OK: ${arquivo}`);
    return {
      contribuinte: c.cdPessoaContribuinte,
      razaoSocial: c.razaoSocial,
      status: "ok",
      arquivo,
    };
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    console.error(`   ERRO: ${mensagem}`);
    return {
      contribuinte: c.cdPessoaContribuinte,
      razaoSocial: c.razaoSocial,
      status: "erro",
      erro: mensagem,
    };
  }
}

function imprimirRelatorio(resultados: Resultado[]): void {
  if (resultados.length === 0) {
    console.log("Nenhum contribuinte processado.");
    return;
  }

  const ok = resultados.filter((r) => r.status === "ok").length;
  const erro = resultados.length - ok;

  console.log("\n=== Relatorio Final ===");
  console.table(
    resultados.map((r) => ({
      contribuinte: r.contribuinte,
      razaoSocial: r.razaoSocial,
      status: r.status,
      detalhe: r.status === "ok" ? r.arquivo : r.erro,
    })),
  );
  console.log(`Total: ${resultados.length} | OK: ${ok} | Erro: ${erro}`);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const headedOnBun =
    typeof process.versions.bun === "string" &&
    (argv.includes("--headed") || process.env.HEADLESS === "false");
  if (headedOnBun) {
    console.error(
      "Playwright em modo headed com o runtime Bun costuma falhar (timeout no CDP/WebSocket). Use: bun run start:headed",
    );
    process.exit(1);
  }
  const config = loadConfig(argv, process.env);
  const resultados = await runGerarDaeBase(config);
  const houveErro = resultados.some((r) => r.status === "erro");
  process.exit(houveErro ? 1 : 0);
}
