import dotenv from "dotenv";
import path from "path";
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
import { limparCheckpoint, carregarCheckpoint, salvarCheckpoint } from "./checkpoint";
import { processarLinha } from "./execution";
import { buscarClientePorCnpj, getNomesSetorCanonicos } from "./mapeamentos";
import { deduplicarLinhasPorCnpjSetor, lerPlanilha } from "./planilha";
import {
  atualizarIndice,
  gerarRelatorioExecucao,
  salvarRelatorio,
  salvarRelatorioXlsx,
} from "./relatorio";
import { ModoExecucao, ResultadoLinha } from "./types";

const DELAY_MS = 500;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logAuthSource(auth: Awaited<ReturnType<typeof resolveGesttaRuntimeAuth>>): void {
  if (auth.source === "artifact") {
    console.log(`[auth] Usando JWT do artefato${auth.artifactPath ? `: ${auth.artifactPath}` : "."}`);
    return;
  }
  if (auth.source === "legacy-local-env") {
    console.log("[auth] Usando JWT legado de ../_local/.env.");
    return;
  }
  console.log("[auth] Usando JWT do ambiente local (.env/processo).");
}

function parseArgs(): {
  continuar: boolean;
  apply: boolean;
  planilhaArg: string | null;
} {
  const args = process.argv.slice(2);
  const continuar = args.some((item) => item === "--continuar" || item === "-c");
  const apply = args.some((item) => item === "--apply");
  const planilhaArg = args.find(
    (item) =>
      item !== "--selecionar" &&
      item !== "-s" &&
      item !== "--continuar" &&
      item !== "-c" &&
      item !== "--apply" &&
      !item.startsWith("-"),
  );

  return {
    continuar,
    apply,
    planilhaArg: planilhaArg?.trim() || null,
  };
}

function selecionarPlanilhaNoExplorer(): string | null {
  if (process.platform !== "win32") {
    console.error("A opcao --selecionar esta disponivel apenas no Windows.");
    return null;
  }

  const scriptPath = path.join(__dirname, "..", "scripts", "abrir-planilha.ps1");
  if (!fs.existsSync(scriptPath)) {
    console.error("Script do dialogo nao encontrado:", scriptPath);
    return null;
  }

  try {
    const out = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`, {
      encoding: "utf8",
      timeout: 120000,
    });
    const tempPath = (out || "").replace(/^\uFEFF/, "").trim();
    if (!tempPath || !fs.existsSync(tempPath)) return null;
    const filePath = fs.readFileSync(tempPath, "utf8").trim();
    fs.unlinkSync(tempPath);
    return filePath || null;
  } catch {
    return null;
  }
}

function getPlanilhaPath(): string {
  const args = process.argv.slice(2);
  const usarSeletor = args.some((item) => item === "--selecionar" || item === "-s");
  if (usarSeletor) {
    const selecionado = selecionarPlanilhaNoExplorer();
    if (selecionado) return selecionado;
    console.log("Selecao cancelada.");
    process.exit(0);
  }

  const parsed = parseArgs();
  if (parsed.planilhaArg) return parsed.planilhaArg;
  return process.env.PLANILHA_PATH || path.join(process.cwd(), "sheets", "EMPRESAS APROVAÇÃO FISCAL.xlsx");
}

function criarResultadosConflito(
  conflitos: ReturnType<typeof deduplicarLinhasPorCnpjSetor>["conflitos"],
): ResultadoLinha[] {
  return conflitos.map((item) => ({
    linha: item.linha,
    sucesso: false,
    mensagem: item.mensagem,
    etapaFalha: "conflitoDuplicidade",
  }));
}

async function main(): Promise<void> {
  const args = parseArgs();
  const modo: ModoExecucao = args.apply ? "apply" : "dry-run";

  console.log("Automacao Adicionar Validacao (Gestta)\n");
  console.log(`Modo: ${modo}`);

  const planilhaPath = path.resolve(process.cwd(), getPlanilhaPath());
  console.log(`Planilha: ${planilhaPath}`);
  console.log("(Dica: use --selecionar para escolher no Explorer)\n");

  const linhasLidas = lerPlanilha(planilhaPath);
  if (linhasLidas.length === 0) {
    console.log("Nenhuma linha valida encontrada na planilha (CNPJ, SETOR e VALIDAÇÃO sao obrigatorios).");
    return;
  }

  const dedupe = deduplicarLinhasPorCnpjSetor(linhasLidas);
  let resultados: ResultadoLinha[] = criarResultadosConflito(dedupe.conflitos);
  const linhas = dedupe.linhas;

  console.log(`Linhas lidas: ${linhasLidas.length}`);
  console.log(`Linhas processaveis: ${linhas.length}`);
  if (dedupe.duplicatasIgnoradas > 0) {
    console.log(`Duplicatas idempotentes ignoradas: ${dedupe.duplicatasIgnoradas}`);
  }
  if (dedupe.conflitos.length > 0) {
    console.log(`Conflitos de duplicidade: ${dedupe.conflitos.length}`);
  }
  console.log("");

  if (process.env.API_3001_URL?.trim()) {
    const setores = await getNomesSetorCanonicos();
    if (setores.length > 0) {
      console.log(`Setores conhecidos (API 3001): ${setores.join(", ")}\n`);
    }
  }

  const checkpoint = carregarCheckpoint(planilhaPath);
  let indiceInicial = 0;
  const inicioExecucao = new Date().toISOString();

  if (checkpoint && args.continuar) {
    resultados = checkpoint.resultados;
    indiceInicial = checkpoint.indiceProximo;
    console.log(`Continuando da linha ${indiceInicial + 1}/${linhas.length} (--continuar).\n`);
  } else if (checkpoint) {
    console.log("Checkpoint encontrado e ignorado. Use --continuar para retomar.\n");
  }

  const auth = await resolveGesttaRuntimeAuth();
  logAuthSource(auth);
  const client = createGesttaClient(auth);

  for (let i = indiceInicial; i < linhas.length; i += 1) {
    const linha = linhas[i];
    process.stdout.write(`[${i + 1}/${linhas.length}] CNPJ ${linha.cnpj} (${linha.validador})... `);
    const resultado = await processarLinha(client, linha, modo);
    resultados.push(resultado);
    console.log(resultado.sucesso ? "OK" : `FALHA: ${resultado.mensagem}`);
    salvarCheckpoint(planilhaPath, inicioExecucao, resultados, i + 1);
    if (i < linhas.length - 1) await delay(DELAY_MS);
  }

  const sucesso = resultados.filter((item) => item.sucesso).length;
  const falha = resultados.length - sucesso;

  console.log("\n--- Resumo ---");
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falha: ${falha}`);

  if (falha > 0) {
    console.log("\nFalhas:");
    for (const item of resultados.filter((resultado) => !resultado.sucesso)) {
      const etapa = item.etapaFalha ? ` [etapa: ${item.etapaFalha}]` : "";
      console.log(`  CNPJ ${item.linha.cnpj || item.linha.cnpjOriginal || ""}: ${item.mensagem}${etapa}`);
    }
  }

  const relatorio = gerarRelatorioExecucao(planilhaPath, modo, resultados, inicioExecucao);
  const caminhoRelatorio = salvarRelatorio(relatorio);
  if (caminhoRelatorio) {
    atualizarIndice(caminhoRelatorio, { total: resultados.length, sucesso, falha }, planilhaPath, inicioExecucao, modo);
    console.log(`\nRelatorio salvo: ${caminhoRelatorio}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoRelatorio);
    if (caminhoXlsx) console.log(`Planilha Excel: ${caminhoXlsx}`);
  }

  limparCheckpoint(planilhaPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
