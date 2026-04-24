/**
 * Automação: alterar responsável de tarefas no Gestta a partir da planilha DP RESPONSÁVEL.xlsx.
 *
 * Fluxo por linha: buscar cliente (CNPJ) → usuário (nome) → ids group_customer →
 * PATCH responsável.
 *
 * Suporta: --continuar / -c (retomar checkpoint), --reprocessar-falhas / -r (retry falhas),
 * --reprocessar <arquivo> (reprocessar falhas a partir de um relatório JSON).
 */

import dotenv from "dotenv";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";
import fs from "fs";

const LEGACY_LOCAL_ENV_PATH = path.resolve(process.cwd(), "..", "_local", ".env");
const LEGACY_AUTH_ENV_KEYS = new Set(["JWT_GESTTA", "GESTTA_JWT_TOKEN"]);

function loadLegacyLocalEnvFallback(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const parsed = dotenv.parse(fs.readFileSync(filePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (LEGACY_AUTH_ENV_KEYS.has(key)) continue;
    if (process.env[key] == null || process.env[key]?.trim() === "") {
      process.env[key] = value;
    }
  }
}

dotenv.config();
loadLegacyLocalEnvFallback(LEGACY_LOCAL_ENV_PATH);

import { resolveGesttaRuntimeAuth } from "./auth/runtime-auth";
import { createGesttaClient } from "./api/client";
import {
  patchResponsavel,
} from "./api/endpoints";
import { buscarClientePorCnpj, buscarUsuarioPorNome, obterGroupCustomerIds, getNomesSetorCanonicos } from "./mapeamentos";
import { lerPlanilha } from "./planilha";
import { LinhaPlanilha, ResultadoLinha } from "./types";
import {
  gerarRelatorioExecucao,
  salvarRelatorio,
  salvarRelatorioXlsx,
  reconstruirLinhaDoRelatorio,
  atualizarIndice,
  type RelatorioExecucao,
} from "./relatorio";
import {
  carregarCheckpoint,
  salvarCheckpoint,
  limparCheckpoint,
} from "./checkpoint";

const DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function logAuthSource(auth: Awaited<ReturnType<typeof resolveGesttaRuntimeAuth>>): void {
  if (auth.source === "artifact") {
    console.log(
      `[auth] Usando JWT do artefato${auth.artifactPath ? `: ${auth.artifactPath}` : "."}`
    );
    return;
  }
  if (auth.source === "legacy-local-env") {
    console.log("[auth] Usando JWT legado de ../_local/.env.");
    return;
  }
  console.log("[auth] Usando JWT do ambiente local (.env/processo).");
}

/** Pergunta no console e retorna a resposta (trim, lower case). */
function perguntar(pergunta: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pergunta, (answer) => {
      rl.close();
      resolve((answer || "").trim().toLowerCase());
    });
  });
}

/** Extrai flags e argumentos da linha de comando. */
function parseArgs(): {
  continuar: boolean;
  reprocessarFalhas: boolean;
  reprocessarArquivo: string | null;
  planilhaArg: string | null;
} {
  const args = process.argv.slice(2);
  const continuar = args.some((a) => a === "--continuar" || a === "-c");
  const reprocessarFalhas = args.some((a) => a === "--reprocessar-falhas" || a === "-r");
  let reprocessarArquivo: string | null = null;
  const idx = args.findIndex((a) => a === "--reprocessar");
  if (idx >= 0 && args[idx + 1]) {
    reprocessarArquivo = path.resolve(process.cwd(), args[idx + 1].trim());
  }
  const planilhaArg = args.find(
    (a) =>
      a !== "--selecionar" &&
      a !== "-s" &&
      a !== "--continuar" &&
      a !== "-c" &&
      a !== "--reprocessar-falhas" &&
      a !== "-r" &&
      a !== "--reprocessar" &&
      !a.startsWith("-")
  ) as string | undefined;
  return {
    continuar,
    reprocessarFalhas,
    reprocessarArquivo: reprocessarArquivo && fs.existsSync(reprocessarArquivo) ? reprocessarArquivo : null,
    planilhaArg: planilhaArg?.trim() || null,
  };
}

function logResumoNormalizacaoCnpj(linhas: LinhaPlanilha[]): void {
  const ajustados = linhas.filter((linha) => linha.cnpjFoiAjustado).length;
  const invalidos = linhas.filter((linha) => linha.cnpjInvalido).length;

  if (ajustados > 0) {
    console.log(`CNPJs ajustados com zero à esquerda: ${ajustados}`);
  }
  if (invalidos > 0) {
    console.log(`Linhas com CNPJ inválido após normalização: ${invalidos}`);
  }
  if (ajustados > 0 || invalidos > 0) {
    console.log("");
  }
}

/**
 * Abre o diálogo do Explorer (Windows) para selecionar a planilha.
 * Retorna o caminho escolhido ou null se o usuário cancelar.
 */
function selecionarPlanilhaNoExplorer(): string | null {
  if (process.platform !== "win32") {
    console.error("A opção --selecionar está disponível apenas no Windows.");
    return null;
  }
  const scriptPath = path.join(__dirname, "..", "scripts", "abrir-planilha.ps1");
  if (!fs.existsSync(scriptPath)) {
    console.error("Script do diálogo não encontrado:", scriptPath);
    return null;
  }
  try {
    const out = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: "utf8", timeout: 120000 }
    );
    const tempPath = (out || "").replace(/^\uFEFF/, "").trim();
    if (!tempPath || !fs.existsSync(tempPath)) return null;
    const filePath = fs.readFileSync(tempPath, "utf8").trim();
    fs.unlinkSync(tempPath);
    return filePath || null;
  } catch (err) {
    return null;
  }
}

/**
 * Caminho da planilha, em ordem de prioridade:
 * 1) Flag --selecionar / -s: abre o Explorer para escolher o arquivo
 * 2) Primeiro argumento da linha de comando que não seja flag nem arquivo de --reprocessar
 * 3) Variável de ambiente PLANILHA_PATH
 * 4) Padrao: ../_local/data/DP RESPONSAVEL.xlsx
 */
function getPlanilhaPath(reprocessarArquivo: string | null): string {
  const args = process.argv.slice(2);
  const usarSeletor = args.some((a) => a === "--selecionar" || a === "-s");
  if (usarSeletor) {
    const selecionado = selecionarPlanilhaNoExplorer();
    if (selecionado) return selecionado;
    console.log("Seleção cancelada.");
    process.exit(0);
  }

  const skip = new Set<string>();
  if (reprocessarArquivo) {
    const idx = args.findIndex((a) => a === "--reprocessar");
    if (idx >= 0 && args[idx + 1]) skip.add(args[idx + 1]);
  }
  const arg = args.find(
    (a) =>
      a !== "--selecionar" &&
      a !== "-s" &&
      a !== "--continuar" &&
      a !== "-c" &&
      a !== "--reprocessar-falhas" &&
      a !== "-r" &&
      a !== "--reprocessar" &&
      !a.startsWith("-") &&
      !skip.has(a)
  );
  if (arg && typeof arg === "string" && arg.trim()) {
    return arg.trim();
  }
  return (
    process.env.PLANILHA_PATH ||
    path.join(process.cwd(), "..", "_local", "data", "DP RESPONSÁVEL.xlsx")
  );
}

async function processarLinha(
  client: ReturnType<typeof createGesttaClient>,
  linha: LinhaPlanilha
): Promise<ResultadoLinha> {
  const resultado: ResultadoLinha = {
    linha,
    sucesso: false,
    mensagem: "",
  };

  if (linha.cnpjInvalido || !linha.cnpj) {
    resultado.mensagem = "CNPJ inválido após normalização";
    resultado.etapaFalha = "validarCnpj";
    return resultado;
  }

  let customer: Awaited<ReturnType<typeof buscarClientePorCnpj>>;
  try {
    customer = await buscarClientePorCnpj(client, linha.cnpj);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar cliente: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarCliente";
    return resultado;
  }
  if (!customer) {
    resultado.mensagem = `Cliente não encontrado para CNPJ ${linha.cnpj}`;
    return resultado;
  }
  resultado.customerId = customer._id;

  let user: Awaited<ReturnType<typeof buscarUsuarioPorNome>>;
  try {
    user = await buscarUsuarioPorNome(client, linha.responsavel);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar funcionário: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarUsuario";
    return resultado;
  }
  if (!user) {
    resultado.mensagem = `Funcionário não encontrado: "${linha.responsavel}"`;
    return resultado;
  }
  resultado.userId = user._id;

  let ids: string[];
  try {
    const departamentoOuSetor = linha.departamento || linha.setor;
    ids = await obterGroupCustomerIds(client, customer._id, departamentoOuSetor);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao obter IDs group_customer: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "groupCustomerIds";
    return resultado;
  }
  resultado.groupIds = ids;

  if (ids.length > 0) {
    try {
      await patchResponsavel(client, { ids, company_user: user._id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      resultado.mensagem = `Erro ao alterar responsável (PATCH): ${msg}`;
      resultado.erro = msg;
      resultado.etapaFalha = "patchResponsavel";
      return resultado;
    }
  } else {
    const filtro = linha.departamento || linha.setor ? ` (departamento/setor: ${linha.departamento || linha.setor})` : "";
    resultado.mensagem = `Nenhum vínculo group_customer encontrado${filtro}; responsável não alterado.`;
    resultado.etapaFalha = "semGroupCustomer";
    return resultado;
  }

  resultado.sucesso = true;
  resultado.mensagem = "Responsável alterado com sucesso.";
  return resultado;
}

/** Reprocessa apenas as linhas com falha a partir de um relatório JSON salvo. */
async function mainReprocessar(caminhoRelatorio: string): Promise<void> {
  console.log("Automação Alterar Responsável (Gestta) — Reprocessar falhas\n");

  let relatorio: RelatorioExecucao;
  try {
    const raw = fs.readFileSync(caminhoRelatorio, "utf8");
    relatorio = JSON.parse(raw) as RelatorioExecucao;
  } catch (err) {
    console.error("Erro ao ler relatório:", err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const planilhaPath = relatorio.execucao?.planilha;
  if (!planilhaPath || !Array.isArray(relatorio.resultados)) {
    console.error("Relatório inválido (falta execucao.planilha ou resultados).");
    process.exit(1);
  }

  const falhas = relatorio.resultados.filter((r) => !r.sucesso);
  if (falhas.length === 0) {
    console.log("Nenhuma falha para reprocessar neste relatório.");
    return;
  }

  const linhas = falhas
    .map(reconstruirLinhaDoRelatorio)
    .filter((l): l is LinhaPlanilha => l !== null);
  if (linhas.length === 0) {
    console.error("Não foi possível reconstruir linhas a partir dos itens do relatório (mesGeracao inválido?).");
    process.exit(1);
  }

  console.log(`Reprocessando ${linhas.length} linha(s) com falha do relatório.\n`);
  logResumoNormalizacaoCnpj(linhas);
  const auth = await resolveGesttaRuntimeAuth();
  logAuthSource(auth);
  const client = createGesttaClient(auth);
  const resultados: ResultadoLinha[] = [];
  const inicioReprocessamento = new Date().toISOString();

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    process.stdout.write(`[${i + 1}/${linhas.length}] CNPJ ${linha.cnpj} (${linha.responsavel})... `);
    const res = await processarLinha(client, linha);
    resultados.push(res);
    if (res.sucesso) console.log("OK");
    else console.log("FALHA:", res.mensagem);
    if (i < linhas.length - 1) await delay(DELAY_MS);
  }

  const sucesso = resultados.filter((r) => r.sucesso).length;
  const falha = resultados.length - sucesso;
  console.log("\n--- Resumo (reprocessamento) ---");
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falha: ${falha}`);

  const relatorioNovo = gerarRelatorioExecucao(
    planilhaPath,
    resultados,
    inicioReprocessamento,
    true,
    path.basename(caminhoRelatorio)
  );
  const caminhoSalvo = salvarRelatorio(relatorioNovo);
  if (caminhoSalvo) {
    atualizarIndice(caminhoSalvo, { total: resultados.length, sucesso, falha }, planilhaPath, inicioReprocessamento);
    console.log(`\nRelatório salvo: ${caminhoSalvo}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorioNovo, caminhoSalvo);
    if (caminhoXlsx) console.log(`Planilha Excel: ${caminhoXlsx}`);
  }
}

async function main(): Promise<void> {
  console.log("Automação Alterar Responsável (Gestta)\n");

  const args = parseArgs();
  if (args.reprocessarArquivo) {
    await mainReprocessar(args.reprocessarArquivo);
    return;
  }
  const planilhaPath = path.resolve(process.cwd(), getPlanilhaPath(null));
  console.log(`Planilha: ${planilhaPath}`);
  console.log("(Dica: use --selecionar para escolher no Explorer)\n");

  const linhas = lerPlanilha(planilhaPath);
  if (linhas.length === 0) {
    console.log("Nenhuma linha válida na planilha (CNPJ + RESPONSÁVEL obrigatórios).");
    return;
  }

  console.log(`Linhas a processar: ${linhas.length}\n`);
  logResumoNormalizacaoCnpj(linhas);

  if (process.env.API_3001_URL?.trim()) {
    const setores = await getNomesSetorCanonicos();
    if (setores.length > 0) {
      console.log(`Setores conhecidos (API 3001): ${setores.join(", ")}\n`);
    }
  }

  const inicioExecucao = new Date().toISOString();
  let resultados: ResultadoLinha[] = [];
  let indiceInicial = 0;

  const checkpoint = carregarCheckpoint(planilhaPath);
  if (checkpoint) {
    if (!args.continuar) {
      const resp = await perguntar("Checkpoint encontrado. Continuar da última execução? (s/n) ");
      if (resp === "s" || resp === "sim") {
        resultados = checkpoint.resultados;
        indiceInicial = checkpoint.indiceProximo;
        console.log(`Retomando da linha ${indiceInicial + 1}/${linhas.length}.\n`);
      }
    } else {
      resultados = checkpoint.resultados;
      indiceInicial = checkpoint.indiceProximo;
      console.log(`Continuando da linha ${indiceInicial + 1}/${linhas.length} (--continuar).\n`);
    }
  }

  const auth = await resolveGesttaRuntimeAuth();
  logAuthSource(auth);
  const client = createGesttaClient(auth);

  for (let i = indiceInicial; i < linhas.length; i++) {
    const linha = linhas[i];
    process.stdout.write(
      `[${i + 1}/${linhas.length}] CNPJ ${linha.cnpj} (${linha.responsavel})... `
    );
    const res = await processarLinha(client, linha);
    resultados.push(res);
    if (res.sucesso) {
      console.log("OK");
    } else {
      console.log("FALHA:", res.mensagem);
    }
    salvarCheckpoint(planilhaPath, inicioExecucao, resultados, i + 1);
    if (i < linhas.length - 1) await delay(DELAY_MS);
  }

  if (args.reprocessarFalhas) {
    const indicesFalha = resultados
      .map((r, i) => (r.sucesso ? -1 : i))
      .filter((i) => i >= 0);
    if (indicesFalha.length > 0) {
      console.log(`\n--- Reprocessando ${indicesFalha.length} falha(s) ---`);
      for (let j = 0; j < indicesFalha.length; j++) {
        const idxOriginal = indicesFalha[j];
        const linha = resultados[idxOriginal].linha;
        process.stdout.write(
          `[${j + 1}/${indicesFalha.length}] CNPJ ${linha.cnpj} (${linha.responsavel})... `
        );
        const resNovo = await processarLinha(client, linha);
        resultados[idxOriginal] = resNovo;
        if (resNovo.sucesso) console.log("OK");
        else console.log("FALHA:", resNovo.mensagem);
        salvarCheckpoint(planilhaPath, inicioExecucao, resultados, linhas.length);
        if (j < indicesFalha.length - 1) await delay(DELAY_MS);
      }
    }
  }

  const sucesso = resultados.filter((r) => r.sucesso).length;
  const falha = resultados.length - sucesso;

  console.log("\n--- Resumo ---");
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falha: ${falha}`);

  if (falha > 0) {
    console.log("\nFalhas:");
    resultados
      .filter((r) => !r.sucesso)
      .forEach((r) => {
        const etapa = r.etapaFalha ? ` [etapa: ${r.etapaFalha}]` : "";
        console.log(`  CNPJ ${r.linha.cnpj}: ${r.mensagem}${etapa}`);
      });
  }

  const relatorio = gerarRelatorioExecucao(planilhaPath, resultados, inicioExecucao);
  const caminhoRelatorio = salvarRelatorio(relatorio);
  if (caminhoRelatorio) {
    atualizarIndice(caminhoRelatorio, { total: resultados.length, sucesso, falha }, planilhaPath, inicioExecucao);
    console.log(`\nRelatório salvo: ${caminhoRelatorio}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoRelatorio);
    if (caminhoXlsx) console.log(`Planilha Excel: ${caminhoXlsx}`);
  }
  limparCheckpoint(planilhaPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
