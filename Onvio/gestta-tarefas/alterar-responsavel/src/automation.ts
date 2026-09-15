/**
 * Core automation flow for changing Gestta task owners from a spreadsheet.
 */

import dotenv from "dotenv";
import path from "path";
import readline from "readline";
import { execSync } from "child_process";
import fs from "fs";
import type { AxiosInstance } from "axios";
import { resolveGesttaRuntimeAuth, type GesttaRuntimeAuth } from "./auth/runtime-auth";
import { createGesttaClient, isGesttaAuthFatalError } from "./api/client";
import { patchResponsavel } from "./api/endpoints";
import type { CompanyTaskItem } from "./api/endpoints";
import {
  buscarClientePorCnpj,
  buscarUsuarioPorNome,
  obterGroupCustomerItems,
  getNomesSetorCanonicos,
} from "./mapeamentos";
import { CAMPOS_OBRIGATORIOS_PLANILHA, lerPlanilha } from "./planilha";
import { LinhaPlanilha, ResultadoLinha, RollbackResponsavelItem, UsuarioGestta } from "./types";
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
import { executarReversaoRelatorio } from "./rollback";

const DELAY_MS = 500;
const LEGACY_LOCAL_ENV_PATH = path.resolve(process.cwd(), "..", "_local", ".env");
const LEGACY_AUTH_ENV_KEYS = new Set(["JWT_GESTTA", "GESTTA_JWT_TOKEN"]);

export interface AutomationRunOptions {
  planilhaPath: string;
  continuar?: boolean;
  ignorarCheckpoint?: boolean;
  reprocessarFalhas?: boolean;
  backupOnly?: boolean;
  interactiveCheckpoint?: boolean;
}

interface CliArgs {
  continuar: boolean;
  ignorarCheckpoint: boolean;
  reprocessarFalhas: boolean;
  backupOnly: boolean;
  reprocessarArquivo: string | null;
  reverterArquivo: string | null;
  planilhaArg: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

export function loadRuntimeEnv(): void {
  dotenv.config();
  loadLegacyLocalEnvFallback(LEGACY_LOCAL_ENV_PATH);
}

function logAuthSource(auth: GesttaRuntimeAuth): void {
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

function perguntar(pergunta: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(pergunta, (answer) => {
      rl.close();
      resolve((answer || "").trim().toLowerCase());
    });
  });
}

/**
 * Backup/preflight roda quando o operador pede --backup-only
 * ou quando a planilha usa coluna TAREFA (alteracao pontual).
 */
export function deveGerarBackupPreflight(
  backupOnly: boolean,
  linhas: Array<{ tarefa?: string }>
): boolean {
  return backupOnly || linhas.some((linha) => Boolean(linha.tarefa));
}

/** --backup-only sempre sai antes de qualquer PATCH. */
export function deveInterromperAposBackup(backupOnly: boolean): boolean {
  return backupOnly;
}

export function parseArgs(argv = process.argv.slice(2)): CliArgs {
  const continuar = argv.some((a) => a === "--continuar" || a === "-c");
  const ignorarCheckpoint = argv.some((a) => a === "--sem-checkpoint" || a === "--ignorar-checkpoint");
  const reprocessarFalhas = argv.some((a) => a === "--reprocessar-falhas" || a === "-r");
  const backupOnly = argv.some((a) => a === "--backup-only" || a === "--preflight");
  let reprocessarArquivo: string | null = null;
  const idx = argv.findIndex((a) => a === "--reprocessar");
  if (idx >= 0 && argv[idx + 1]) {
    reprocessarArquivo = path.resolve(process.cwd(), argv[idx + 1].trim());
  }
  let reverterArquivo: string | null = null;
  const idxReverter = argv.findIndex((a) => a === "--reverter");
  if (idxReverter >= 0 && argv[idxReverter + 1]) {
    reverterArquivo = path.resolve(process.cwd(), argv[idxReverter + 1].trim());
  }
  const planilhaArg = argv.find(
    (a) =>
      a !== "--selecionar" &&
      a !== "-s" &&
      a !== "--continuar" &&
      a !== "-c" &&
      a !== "--sem-checkpoint" &&
      a !== "--ignorar-checkpoint" &&
      a !== "--reprocessar-falhas" &&
      a !== "-r" &&
      a !== "--backup-only" &&
      a !== "--preflight" &&
      a !== "--reprocessar" &&
      a !== "--reverter" &&
      !a.startsWith("-")
  ) as string | undefined;
  return {
    continuar,
    ignorarCheckpoint,
    reprocessarFalhas,
    backupOnly,
    reprocessarArquivo: reprocessarArquivo && fs.existsSync(reprocessarArquivo) ? reprocessarArquivo : null,
    reverterArquivo,
    planilhaArg: planilhaArg?.trim() || null,
  };
}

function logResumoNormalizacaoCnpj(linhas: LinhaPlanilha[]): void {
  const ajustados = linhas.filter((linha) => linha.cnpjFoiAjustado).length;
  const invalidos = linhas.filter((linha) => linha.cnpjInvalido).length;

  if (ajustados > 0) {
    console.log(`CNPJs ajustados com zero a esquerda: ${ajustados}`);
  }
  if (invalidos > 0) {
    console.log(`Linhas com CNPJ invalido apos normalizacao: ${invalidos}`);
  }
  if (ajustados > 0 || invalidos > 0) {
    console.log("");
  }
}

function formatLinhaLog(linha: LinhaPlanilha): string {
  const empresa = linha.empresa ? ` - ${linha.empresa}` : "";
  return `CNPJ ${linha.cnpj}${empresa} (${linha.responsavel})`;
}

function getTaskName(item: CompanyTaskItem): string | undefined {
  const task = item.company_task;
  if (task && typeof task === "object") return task.name;
  return undefined;
}

function getDepartmentName(item: CompanyTaskItem): string | undefined {
  const task = item.company_task;
  if (task && typeof task === "object") return task.company_department?.name;
  return undefined;
}

function normalizarNomeTarefa(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ");
}

function filtrarItemsPorTarefaExata(items: CompanyTaskItem[], tarefa: string): CompanyTaskItem[] {
  const tarefaNormalizada = normalizarNomeTarefa(tarefa);
  return items.filter((item) => {
    const nome = getTaskName(item);
    return nome ? normalizarNomeTarefa(nome) === tarefaNormalizada : false;
  });
}

function getCompanyUserId(companyUser: CompanyTaskItem["company_user"]): string | undefined {
  if (typeof companyUser === "string") return companyUser;
  if (companyUser && typeof companyUser === "object") return companyUser._id;
  return undefined;
}

function getCompanyUserName(companyUser: CompanyTaskItem["company_user"]): string | undefined {
  if (companyUser && typeof companyUser === "object") return companyUser.name;
  return undefined;
}

function criarRollbackItems(
  linha: LinhaPlanilha,
  customerId: string,
  user: UsuarioGestta,
  items: CompanyTaskItem[]
): RollbackResponsavelItem[] {
  return items.map((item) => ({
    cnpj: linha.cnpj,
    ...(linha.empresa ? { empresa: linha.empresa } : {}),
    customerId,
    groupCustomerId: item._id,
    taskName: getTaskName(item),
    departmentName: getDepartmentName(item),
    previousCompanyUserId: getCompanyUserId(item.company_user),
    previousCompanyUserName: getCompanyUserName(item.company_user),
    appliedCompanyUserId: user._id,
    appliedCompanyUserName: user.name,
  }));
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
    const out = execSync(
      `powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPath}"`,
      { encoding: "utf8", timeout: 120000 }
    );
    const tempPath = (out || "").replace(/^\uFEFF/, "").trim();
    if (!tempPath || !fs.existsSync(tempPath)) return null;
    const filePath = fs.readFileSync(tempPath, "utf8").trim();
    fs.unlinkSync(tempPath);
    return filePath || null;
  } catch {
    return null;
  }
}

function getPlanilhaPath(reprocessarArquivo: string | null, argv = process.argv.slice(2)): string {
  const usarSeletor = argv.some((a) => a === "--selecionar" || a === "-s");
  if (usarSeletor) {
    const selecionado = selecionarPlanilhaNoExplorer();
    if (selecionado) return selecionado;
    console.log("Selecao cancelada.");
    process.exit(0);
  }

  const skip = new Set<string>();
  if (reprocessarArquivo) {
    const idx = argv.findIndex((a) => a === "--reprocessar");
    if (idx >= 0 && argv[idx + 1]) skip.add(argv[idx + 1]);
  }
  const arg = argv.find(
    (a) =>
      a !== "--selecionar" &&
      a !== "-s" &&
      a !== "--continuar" &&
      a !== "-c" &&
      a !== "--sem-checkpoint" &&
      a !== "--ignorar-checkpoint" &&
      a !== "--reprocessar-falhas" &&
      a !== "-r" &&
      a !== "--backup-only" &&
      a !== "--preflight" &&
      a !== "--reprocessar" &&
      a !== "--reverter" &&
      !a.startsWith("-") &&
      !skip.has(a)
  );
  if (arg && typeof arg === "string" && arg.trim()) {
    return arg.trim();
  }
  return (
    process.env.PLANILHA_PATH ||
    path.join(process.cwd(), "..", "_local", "data", "DP RESPONSAVEL.xlsx")
  );
}

export async function preflightGesttaAuth(client: AxiosInstance): Promise<void> {
  await client.get("/admin/company/user", { params: { active: true } });
}

export function prepararLinhasParaExecucao(linhas: LinhaPlanilha[]): LinhaPlanilha[] {
  if (!linhas.some((linha) => linha.tarefa)) return linhas;

  const porCnpj = new Map<string, LinhaPlanilha[]>();
  const semCnpj = linhas.filter((linha) => !linha.cnpj);
  for (const linha of linhas) {
    if (!linha.cnpj) continue;
    const atuais = porCnpj.get(linha.cnpj) ?? [];
    atuais.push(linha);
    porCnpj.set(linha.cnpj, atuais);
  }

  const conflitos: string[] = [];
  const deduplicadas: LinhaPlanilha[] = [...semCnpj];
  let duplicadosIguais = 0;

  for (const [cnpj, grupo] of porCnpj) {
    const responsaveis = new Set(grupo.map((linha) => normalizarNomeTarefa(linha.responsavel)));
    if (responsaveis.size > 1) {
      const detalhes = grupo
        .map((linha) => `COD ${linha.cod || "(sem cod)"} -> ${linha.responsavel}`)
        .join("; ");
      conflitos.push(`${cnpj}: ${detalhes}`);
      continue;
    }
    deduplicadas.push(grupo[0]);
    duplicadosIguais += grupo.length - 1;
  }

  if (conflitos.length > 0) {
    throw new Error(
      [
        "CNPJs duplicados com responsaveis diferentes; execucao bloqueada antes de qualquer PATCH.",
        ...conflitos.map((conflito) => `- ${conflito}`),
      ].join("\n")
    );
  }

  if (duplicadosIguais > 0) {
    console.warn(`CNPJs duplicados com mesmo responsavel deduplicados: ${duplicadosIguais}`);
  }

  return deduplicadas;
}

export async function processarLinha(
  client: AxiosInstance,
  linha: LinhaPlanilha
): Promise<ResultadoLinha> {
  const resultado: ResultadoLinha = {
    linha,
    sucesso: false,
    mensagem: "",
  };

  if (linha.cnpjInvalido || !linha.cnpj) {
    resultado.mensagem = "CNPJ invalido apos normalizacao";
    resultado.etapaFalha = "validarCnpj";
    return resultado;
  }

  let customer: Awaited<ReturnType<typeof buscarClientePorCnpj>>;
  try {
    customer = await buscarClientePorCnpj(client, linha.cnpj);
  } catch (err: unknown) {
    if (isGesttaAuthFatalError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar cliente: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarCliente";
    return resultado;
  }
  if (!customer) {
    resultado.mensagem = `Cliente nao encontrado para CNPJ ${linha.cnpj}`;
    return resultado;
  }
  resultado.customerId = customer._id;

  let user: Awaited<ReturnType<typeof buscarUsuarioPorNome>>;
  try {
    user = await buscarUsuarioPorNome(client, linha.responsavel);
  } catch (err: unknown) {
    if (isGesttaAuthFatalError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar funcionario: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarUsuario";
    return resultado;
  }
  if (!user) {
    resultado.mensagem = `Funcionario nao encontrado: "${linha.responsavel}"`;
    return resultado;
  }
  resultado.userId = user._id;

  let groupItems: CompanyTaskItem[];
  try {
    const departamentoOuSetor = linha.departamento || linha.setor;
    const itensCliente = await obterGroupCustomerItems(
      client,
      customer._id,
      linha.tarefa ? undefined : departamentoOuSetor
    );
    groupItems = linha.tarefa ? filtrarItemsPorTarefaExata(itensCliente, linha.tarefa) : itensCliente;
  } catch (err: unknown) {
    if (isGesttaAuthFatalError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao obter IDs group_customer: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "groupCustomerIds";
    return resultado;
  }
  const ids = groupItems.map((item) => item._id).filter(Boolean);
  resultado.groupIds = ids;

  if (linha.tarefa && ids.length > 1) {
    resultado.mensagem = `Mais de um vinculo encontrado para a tarefa "${linha.tarefa}"; responsavel nao alterado.`;
    resultado.etapaFalha = "semGroupCustomer";
    return resultado;
  }

  if (ids.length > 0) {
    resultado.rollbackItems = criarRollbackItems(linha, customer._id, user, groupItems);
    try {
      await patchResponsavel(client, { ids, company_user: user._id });
    } catch (err: unknown) {
      if (isGesttaAuthFatalError(err)) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      resultado.mensagem = `Erro ao alterar responsavel (PATCH): ${msg}`;
      resultado.erro = msg;
      resultado.etapaFalha = "patchResponsavel";
      return resultado;
    }
  } else {
    const filtro = linha.tarefa
      ? ` (tarefa: ${linha.tarefa})`
      : linha.departamento || linha.setor ? ` (departamento/setor: ${linha.departamento || linha.setor})` : "";
    resultado.mensagem = `Nenhum vinculo group_customer encontrado${filtro}; responsavel nao alterado.`;
    resultado.etapaFalha = "semGroupCustomer";
    return resultado;
  }

  resultado.sucesso = true;
  resultado.mensagem = "Responsavel alterado com sucesso.";
  return resultado;
}

export async function gerarBackupLinha(
  client: AxiosInstance,
  linha: LinhaPlanilha
): Promise<ResultadoLinha> {
  const resultado: ResultadoLinha = {
    linha,
    sucesso: false,
    mensagem: "",
  };

  if (linha.cnpjInvalido || !linha.cnpj) {
    resultado.mensagem = "CNPJ invalido apos normalizacao";
    resultado.etapaFalha = "validarCnpj";
    return resultado;
  }

  let customer: Awaited<ReturnType<typeof buscarClientePorCnpj>>;
  try {
    customer = await buscarClientePorCnpj(client, linha.cnpj);
  } catch (err: unknown) {
    if (isGesttaAuthFatalError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar cliente: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarCliente";
    return resultado;
  }
  if (!customer) {
    resultado.mensagem = `Cliente nao encontrado para CNPJ ${linha.cnpj}`;
    return resultado;
  }
  resultado.customerId = customer._id;

  let user: Awaited<ReturnType<typeof buscarUsuarioPorNome>>;
  try {
    user = await buscarUsuarioPorNome(client, linha.responsavel);
  } catch (err: unknown) {
    if (isGesttaAuthFatalError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao buscar funcionario: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "buscarUsuario";
    return resultado;
  }
  if (!user) {
    resultado.mensagem = `Funcionario nao encontrado: "${linha.responsavel}"`;
    return resultado;
  }
  resultado.userId = user._id;

  let groupItems: CompanyTaskItem[];
  try {
    const departamentoOuSetor = linha.departamento || linha.setor;
    const itensCliente = await obterGroupCustomerItems(
      client,
      customer._id,
      linha.tarefa ? undefined : departamentoOuSetor
    );
    groupItems = linha.tarefa ? filtrarItemsPorTarefaExata(itensCliente, linha.tarefa) : itensCliente;
  } catch (err: unknown) {
    if (isGesttaAuthFatalError(err)) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    resultado.mensagem = `Erro ao obter IDs group_customer: ${msg}`;
    resultado.erro = msg;
    resultado.etapaFalha = "groupCustomerIds";
    return resultado;
  }

  const ids = groupItems.map((item) => item._id).filter(Boolean);
  resultado.groupIds = ids;
  if (linha.tarefa && ids.length > 1) {
    resultado.mensagem = `Mais de um vinculo encontrado para a tarefa "${linha.tarefa}"; backup bloqueado para esta linha.`;
    resultado.etapaFalha = "semGroupCustomer";
    return resultado;
  }
  if (ids.length === 0) {
    const filtro = linha.tarefa
      ? ` (tarefa: ${linha.tarefa})`
      : linha.departamento || linha.setor ? ` (departamento/setor: ${linha.departamento || linha.setor})` : "";
    resultado.mensagem = `Nenhum vinculo group_customer encontrado${filtro}; backup nao criado para esta linha.`;
    resultado.etapaFalha = "semGroupCustomer";
    return resultado;
  }

  resultado.rollbackItems = criarRollbackItems(linha, customer._id, user, groupItems);
  resultado.sucesso = true;
  resultado.mensagem = "Backup criado; nenhum PATCH executado.";
  return resultado;
}

async function gerarBackupPreflight(
  client: AxiosInstance,
  planilhaPath: string,
  linhas: LinhaPlanilha[],
  inicioExecucao: string
): Promise<ResultadoLinha[]> {
  const resultados: ResultadoLinha[] = [];
  console.log("\n--- Backup/preflight (sem PATCH) ---");
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    process.stdout.write(`[${i + 1}/${linhas.length}] ${formatLinhaLog(linha)}... `);
    const res = await gerarBackupLinha(client, linha);
    resultados.push(res);
    if (res.sucesso) console.log("OK");
    else console.log("FALHA:", res.mensagem);
    if (i < linhas.length - 1) await delay(DELAY_MS);
  }

  const sucesso = resultados.filter((r) => r.sucesso).length;
  const falha = resultados.length - sucesso;
  const relatorio = gerarRelatorioExecucao(planilhaPath, resultados, inicioExecucao);
  relatorio.execucao.backup = true;
  const caminhoRelatorio = salvarRelatorio(relatorio, "backup");
  if (!caminhoRelatorio) {
    throw new Error("Backup/preflight nao foi salvo; execucao real bloqueada antes de qualquer PATCH.");
  }
  atualizarIndice(caminhoRelatorio, { total: resultados.length, sucesso, falha }, planilhaPath, inicioExecucao);
  console.log(`\nBackup salvo: ${caminhoRelatorio}`);
  const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoRelatorio);
  if (caminhoXlsx) console.log(`Planilha Excel do backup: ${caminhoXlsx}`);
  return resultados;
}

export async function runReprocessar(caminhoRelatorio: string): Promise<void> {
  console.log("Automacao Alterar Responsavel (Gestta) - Reprocessar falhas\n");

  let relatorio: RelatorioExecucao;
  try {
    const raw = fs.readFileSync(caminhoRelatorio, "utf8");
    relatorio = JSON.parse(raw) as RelatorioExecucao;
  } catch (err) {
    throw new Error(`Erro ao ler relatorio: ${err instanceof Error ? err.message : String(err)}`);
  }

  const planilhaPath = relatorio.execucao?.planilha;
  if (!planilhaPath || !Array.isArray(relatorio.resultados)) {
    throw new Error("Relatorio invalido (falta execucao.planilha ou resultados).");
  }

  const falhas = relatorio.resultados.filter((r) => !r.sucesso);
  if (falhas.length === 0) {
    console.log("Nenhuma falha para reprocessar neste relatorio.");
    return;
  }

  const linhas = falhas
    .map(reconstruirLinhaDoRelatorio)
    .filter((l): l is LinhaPlanilha => l !== null);
  if (linhas.length === 0) {
    throw new Error("Nao foi possivel reconstruir linhas a partir dos itens do relatorio.");
  }

  console.log(`Reprocessando ${linhas.length} linha(s) com falha do relatorio.\n`);
  logResumoNormalizacaoCnpj(linhas);
  const auth = await resolveGesttaRuntimeAuth();
  logAuthSource(auth);
  const client = createGesttaClient(auth);
  await preflightGesttaAuth(client);
  const resultados: ResultadoLinha[] = [];
  const inicioReprocessamento = new Date().toISOString();

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    process.stdout.write(`[${i + 1}/${linhas.length}] ${formatLinhaLog(linha)}... `);
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
    console.log(`\nRelatorio salvo: ${caminhoSalvo}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorioNovo, caminhoSalvo);
    if (caminhoXlsx) console.log(`Planilha Excel: ${caminhoXlsx}`);
  }
}

export async function runAutomation(options: AutomationRunOptions): Promise<void> {
  const planilhaPath = path.resolve(process.cwd(), options.planilhaPath);
  console.log(`Planilha: ${planilhaPath}`);
  console.log("(Dica: use --selecionar para escolher no Explorer)\n");

  let linhas = lerPlanilha(planilhaPath);
  if (linhas.length === 0) {
    console.log(`Nenhuma linha valida na planilha (${CAMPOS_OBRIGATORIOS_PLANILHA} obrigatorios).`);
    return;
  }
  linhas = prepararLinhasParaExecucao(linhas);

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
    if (options.ignorarCheckpoint) {
      console.log("Checkpoint encontrado, mas sera ignorado. Iniciando da primeira linha.\n");
      limparCheckpoint(planilhaPath);
    } else if (options.continuar) {
      resultados = checkpoint.resultados;
      indiceInicial = checkpoint.indiceProximo;
      console.log(`Continuando da linha ${indiceInicial + 1}/${linhas.length} (--continuar).\n`);
    } else if (options.interactiveCheckpoint !== false) {
      const resp = await perguntar("Checkpoint encontrado. Continuar da ultima execucao? (s/n) ");
      if (resp === "s" || resp === "sim") {
        resultados = checkpoint.resultados;
        indiceInicial = checkpoint.indiceProximo;
        console.log(`Retomando da linha ${indiceInicial + 1}/${linhas.length}.\n`);
      }
    }
  }

  const auth = await resolveGesttaRuntimeAuth();
  logAuthSource(auth);
  const client = createGesttaClient(auth);
  await preflightGesttaAuth(client);

  if (deveGerarBackupPreflight(Boolean(options.backupOnly), linhas)) {
    await gerarBackupPreflight(client, planilhaPath, linhas, inicioExecucao);
    if (deveInterromperAposBackup(Boolean(options.backupOnly))) {
      console.log("\nBackup/preflight concluido. Nenhum responsavel foi alterado.");
      return;
    }
    console.log("\n--- Execucao real ---");
  }

  for (let i = indiceInicial; i < linhas.length; i++) {
    const linha = linhas[i];
    process.stdout.write(
      `[${i + 1}/${linhas.length}] ${formatLinhaLog(linha)}... `
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

  if (options.reprocessarFalhas) {
    const indicesFalha = resultados
      .map((r, i) => (r.sucesso ? -1 : i))
      .filter((i) => i >= 0);
    if (indicesFalha.length > 0) {
      console.log(`\n--- Reprocessando ${indicesFalha.length} falha(s) ---`);
      for (let j = 0; j < indicesFalha.length; j++) {
        const idxOriginal = indicesFalha[j];
        const linha = resultados[idxOriginal].linha;
        process.stdout.write(
          `[${j + 1}/${indicesFalha.length}] ${formatLinhaLog(linha)}... `
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
        console.log(`  ${formatLinhaLog(r.linha)}: ${r.mensagem}${etapa}`);
      });
  }

  const relatorio = gerarRelatorioExecucao(planilhaPath, resultados, inicioExecucao);
  const caminhoRelatorio = salvarRelatorio(relatorio);
  if (caminhoRelatorio) {
    atualizarIndice(caminhoRelatorio, { total: resultados.length, sucesso, falha }, planilhaPath, inicioExecucao);
    console.log(`\nRelatorio salvo: ${caminhoRelatorio}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoRelatorio);
    if (caminhoXlsx) console.log(`Planilha Excel: ${caminhoXlsx}`);
  }
  limparCheckpoint(planilhaPath);
}

export async function runCli(argv = process.argv.slice(2)): Promise<void> {
  loadRuntimeEnv();
  console.log("Automacao Alterar Responsavel (Gestta)\n");

  const args = parseArgs(argv);
  if (args.reprocessarArquivo) {
    await runReprocessar(args.reprocessarArquivo);
    return;
  }
  if (args.reverterArquivo) {
    await executarReversaoRelatorio(args.reverterArquivo);
    return;
  }

  await runAutomation({
    planilhaPath: getPlanilhaPath(null, argv),
    continuar: args.continuar && !args.ignorarCheckpoint,
    ignorarCheckpoint: args.ignorarCheckpoint,
    reprocessarFalhas: args.reprocessarFalhas,
    backupOnly: args.backupOnly,
    interactiveCheckpoint: true,
  });
}
