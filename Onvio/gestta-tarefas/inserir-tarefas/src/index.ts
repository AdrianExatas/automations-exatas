import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { loadWorkspaceAuthArtifacts } from "@exatas/onvio-auth";
import { createGesttaClient } from "./api/client";
import {
  adicionarClientesNaTarefa,
  listarClientes,
  listarClientesDaTarefa,
  listarFuncionarios,
  listarTarefasDoCliente,
  listarTarefasRecorrentesAtivas,
  patchResponsavel,
  removerGroupCustomers,
} from "./api/endpoints";
import { listarFuncionariosLocal } from "./api/local-employees";
import { carregarCheckpoint, limparCheckpoint, salvarCheckpoint } from "./checkpoint";
import { logProgressEvent } from "./logger";
import { lerPlanilha } from "./planilha";
import {
  atualizarIndice,
  gerarRelatorioExecucao,
  salvarRelatorio,
  salvarRelatorioXlsx,
} from "./relatorio";
import { executarSincronizacaoTarefa, SyncTaskApi } from "./sync";
import {
  executarInclusaoAditiva,
  EmpresaTobiasResolvida,
  InclusaoAditivaApi,
  TarefaTobiasResolvida,
} from "./tobias-sync";
import {
  lerPlanilhaTobias,
  TAREFAS_FINANCEIRO_TOBIAS,
  TOTAL_EMPRESAS_TOBIAS_ESPERADO,
} from "./tobias";
import {
  ClienteGestta,
  FuncionarioLocal,
  GrupoTarefaResolvida,
  ProgressoLogEvento,
  ResumoPreflight,
  TarefaGestta,
  TarefaPlanilhaResolvida,
  UsuarioGestta,
} from "./types";
import {
  criarLookupFuncionariosLocais,
  resolverUsuarioComFallback,
} from "./user-resolution";
import { normalizarCnpj, normalizarNome, normalizarNomeTarefa } from "./utils";

dotenv.config();
if (!process.env.JWT_GESTTA && !process.env.GESTTA_JWT_TOKEN) {
  dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });
}

interface CliArgs {
  apply: boolean;
  dryRunFlag: boolean;
  continuar: boolean;
  tobias: boolean;
  planilhaArg: string | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const dryRunFlag = args.includes("--dry-run");
  const continuar = args.includes("--continuar") || args.includes("-c");
  const tobias = args.includes("--tobias");
  const planilhaArg = args.find((arg) => !arg.startsWith("-")) ?? null;
  return { apply, dryRunFlag, continuar, tobias, planilhaArg };
}

function getJwt(): string {
  const authArtifactPath = process.env.ONVIO_AUTH_ARTIFACT_PATH?.trim() || undefined;
  if (authArtifactPath) {
    const artifacts = loadWorkspaceAuthArtifacts(process.cwd(), authArtifactPath);
    const artifactJwt = artifacts?.gestta.jwt?.trim() || "";
    if (artifactJwt) return artifactJwt;
    throw new Error(`JWT Gestta nao encontrado no artefato de auth: ${authArtifactPath}.`);
  }

  const jwt = process.env.JWT_GESTTA || process.env.GESTTA_JWT_TOKEN || "";
  if (jwt) return jwt;

  const artifacts = loadWorkspaceAuthArtifacts(process.cwd(), authArtifactPath);
  const artifactJwt = artifacts?.gestta.jwt?.trim() || "";
  if (artifactJwt) {
    return artifactJwt;
  }

  throw new Error(
    "Defina JWT_GESTTA ou GESTTA_JWT_TOKEN no .env, ou gere shared/onvio-auth/runtime/latest-auth.json."
  );
}

function getPositiveIntegerEnv(name: string, defaultValue: number): number {
  const rawValue = process.env[name];
  if (!rawValue) return defaultValue;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Variavel ${name} invalida: use um inteiro positivo.`);
  }

  return Math.floor(parsed);
}

function getPlanilhaPath(planilhaArg: string | null): string {
  if (planilhaArg) return planilhaArg;

  const candidates = [
    process.env.PLANILHA_PATH,
    path.join(process.cwd(), "data", "PROVISAO DP.xlsx"),
    path.join(process.cwd(), "data", "PROVISÃO DP.xlsx"),
    path.join(process.cwd(), "data", "PROVISÃƒO DP.xlsx"),
  ].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    const resolved = path.isAbsolute(candidate)
      ? candidate
      : path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) return candidate;
  }

  return candidates[0];
}

function uniqueBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }
  return map;
}

function resolverCliente(clientes: ClienteGestta[], cnpj: string): ClienteGestta {
  const matches = clientes.filter((item) => normalizarCnpj(item.cnpj) === cnpj);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Cliente nao encontrado para CNPJ ${cnpj}.`);
  throw new Error(`CNPJ ${cnpj} retornou ${matches.length} clientes no Gestta.`);
}

function resolverTarefa(
  tasksByName: Map<string, TarefaGestta[]>,
  tarefa: string,
): TarefaGestta {
  const key = normalizarNomeTarefa(tarefa);
  const matches = (tasksByName.get(key) ?? []).filter((item) => item.active !== false);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Tarefa recorrente ativa nao encontrada: ${tarefa}.`);
  throw new Error(`Tarefa recorrente ambigua no Gestta: ${tarefa}.`);
}

async function carregarFuncionariosLocais(): Promise<{
  funcionarios: FuncionarioLocal[] | null;
  error?: string;
}> {
  try {
    const funcionarios = await listarFuncionariosLocal();
    return { funcionarios };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { funcionarios: null, error: message };
  }
}

async function fazerPreflight(client: ReturnType<typeof createGesttaClient>, planilhaPath: string): Promise<{
  grupos: GrupoTarefaResolvida[];
  resumo: ResumoPreflight;
}> {
  const linhas = lerPlanilha(planilhaPath);
  if (linhas.length === 0) {
    throw new Error("Nenhuma linha valida encontrada na planilha.");
  }

  const [clientes, usuarios, tarefas, funcionariosLocaisResult] = await Promise.all([
    listarClientes(client),
    listarFuncionarios(client),
    listarTarefasRecorrentesAtivas(client),
    carregarFuncionariosLocais(),
  ]);

  if (funcionariosLocaisResult.error) {
    logPreflight(
      "warn",
      `API local /api/employees indisponivel: ${funcionariosLocaisResult.error}. Seguiremos com Gestta como fonte principal.`,
    );
  }

  const usersByName = uniqueBy(usuarios, (item) => normalizarNome(item.name));
  const tasksByName = uniqueBy(tarefas, (item) => normalizarNomeTarefa(item.name));
  const localLookup = criarLookupFuncionariosLocais(
    funcionariosLocaisResult.funcionarios,
    funcionariosLocaisResult.error,
  );

  const resolvidas: TarefaPlanilhaResolvida[] = linhas.map((linha) => {
    const cliente = resolverCliente(clientes, linha.cnpj);
    const usuario = resolverUsuarioComFallback(usersByName, localLookup, linha.responsavel);
    const tarefa = resolverTarefa(tasksByName, linha.tarefa);

    return {
      ...linha,
      taskId: tarefa._id,
      taskNomeGestta: tarefa.name,
      customerId: cliente._id,
      customerNomeGestta: cliente.name,
      userId: usuario.userId,
      userNomeGestta: usuario.userNome,
      userOrigem: usuario.origem,
    };
  });

  const groupsByTask = new Map<string, GrupoTarefaResolvida>();
  for (const item of resolvidas) {
    const current = groupsByTask.get(item.taskId) ?? {
      taskId: item.taskId,
      taskNomePlanilha: item.tarefa,
      taskNomeGestta: item.taskNomeGestta,
      itens: [],
    };
    current.itens.push(item);
    groupsByTask.set(item.taskId, current);
  }

  return {
    grupos: [...groupsByTask.values()].sort((a, b) => a.taskNomePlanilha.localeCompare(b.taskNomePlanilha)),
    resumo: {
      totalLinhasPlanilha: linhas.length,
      totalTarefas: groupsByTask.size,
      totalEmpresas: resolvidas.length,
    },
  };
}

function imprimirResumoPreflight(resumo: ResumoPreflight, dryRun: boolean): void {
  console.log(`Modo: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`Linhas validas: ${resumo.totalLinhasPlanilha}`);
  console.log(`Empresas alvo: ${resumo.totalEmpresas}`);
  console.log(`Tarefas alvo: ${resumo.totalTarefas}\n`);
}

function logPreflight(
  nivel: ProgressoLogEvento["nivel"],
  mensagem: string,
): void {
  logProgressEvent({
    timestamp: new Date().toISOString(),
    nivel,
    etapa: "preflight",
    tarefa: "preflight",
    mensagem,
  });
}

function imprimirResumoFinal(results: Awaited<ReturnType<typeof executarSincronizacaoTarefa>>[]): void {
  const sucesso = results.filter((item) => item.sucesso).length;
  const falha = results.length - sucesso;

  console.log("\n--- Resumo ---");
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falha: ${falha}`);

  for (const result of results) {
    const prefix = result.sucesso ? "OK" : "FALHA";
    console.log(
      `${prefix} ${result.tarefaPlanilha}: atual=${result.vinculosAtuais}, extras=${result.extras}, ` +
        `inclusoes=${result.inclusoes}, patches=${result.patchLinks}. ${result.mensagem}`,
    );
    if (!result.sucesso && result.detalhes.length > 0) {
      for (const detail of result.detalhes) {
        console.log(`  - ${detail}`);
      }
    }
  }
}

function imprimirResumoInclusaoAditiva(results: Awaited<ReturnType<typeof executarInclusaoAditiva>>[]): void {
  const sucesso = results.filter((item) => item.sucesso).length;
  const falha = results.length - sucesso;

  console.log("\n--- Resumo da inclusao aditiva ---");
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Falha: ${falha}`);

  for (const result of results) {
    const prefix = result.sucesso ? "OK" : "FALHA";
    console.log(
      `${prefix} ${result.tarefaPlanilha}: atuais=${result.vinculosAtuais}, ` +
        `inclusoes=${result.inclusoes}, finais=${result.vinculosFinais ?? "nao validado"}. ${result.mensagem}`,
    );
    for (const detail of result.detalhes) {
      console.log(`  - ${detail}`);
    }
  }
}

function getTobiasPlanilhaPath(planilhaArg: string | null): string {
  if (!planilhaArg) {
    throw new Error("Informe o caminho da planilha ao usar --tobias.");
  }
  return path.resolve(process.cwd(), planilhaArg);
}

async function executarModoTobias(args: CliArgs): Promise<void> {
  if (args.continuar) {
    throw new Error("O modo --tobias nao usa checkpoint; remova --continuar.");
  }

  const dryRun = args.dryRunFlag || !args.apply;
  const planilhaPath = getTobiasPlanilhaPath(args.planilhaArg);
  const inicioExecucao = new Date().toISOString();

  if (!fs.existsSync(planilhaPath)) {
    throw new Error(`Planilha nao encontrada: ${planilhaPath}`);
  }

  const linhas = lerPlanilhaTobias(planilhaPath);
  if (linhas.length !== TOTAL_EMPRESAS_TOBIAS_ESPERADO) {
    throw new Error(
      `A aba Tobias deve conter ${TOTAL_EMPRESAS_TOBIAS_ESPERADO} CNPJs unicos; foram encontrados ${linhas.length}.`,
    );
  }

  console.log("CLI Gestta - Inclusao aditiva Tobias\n");
  console.log(`Modo: ${dryRun ? "dry-run" : "apply"}`);
  console.log(`Planilha: ${planilhaPath}`);
  console.log(`Empresas alvo: ${linhas.length}`);
  console.log(`Tarefas alvo: ${TAREFAS_FINANCEIRO_TOBIAS.length}\n`);

  const client = createGesttaClient(getJwt(), {
    timeoutMs: getPositiveIntegerEnv("GESTTA_HTTP_TIMEOUT_MS", 60000),
  });
  const [clientes, tarefas] = await Promise.all([
    listarClientes(client),
    listarTarefasRecorrentesAtivas(client),
  ]);
  const tarefasByName = uniqueBy(tarefas, (item) => normalizarNomeTarefa(item.name));
  const empresas: EmpresaTobiasResolvida[] = linhas.map((linha) => {
    const cliente = resolverCliente(clientes, linha.cnpj);
    return {
      customerId: cliente._id,
      customerName: cliente.name,
      cnpj: linha.cnpj,
    };
  });
  const tarefasAlvo: TarefaTobiasResolvida[] = TAREFAS_FINANCEIRO_TOBIAS.map((nome) => {
    const tarefa = resolverTarefa(tarefasByName, nome);
    return { taskId: tarefa._id, taskName: tarefa.name };
  });

  const api: InclusaoAditivaApi = {
    listTaskCustomers: (taskId) => listarClientesDaTarefa(client, taskId),
    addCustomersToTask: (taskId, customerIds) => adicionarClientesNaTarefa(client, taskId, customerIds),
  };
  const resultados: Awaited<ReturnType<typeof executarInclusaoAditiva>>[] = [];

  for (const tarefa of tarefasAlvo) {
    resultados.push(await executarInclusaoAditiva(api, tarefa, empresas, dryRun));
  }

  imprimirResumoInclusaoAditiva(resultados);
  const relatorio = gerarRelatorioExecucao(planilhaPath, dryRun, resultados, inicioExecucao);
  const caminhoJson = salvarRelatorio(relatorio);
  if (caminhoJson) {
    atualizarIndice(caminhoJson, relatorio);
    console.log(`\nRelatorio JSON: ${caminhoJson}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoJson);
    if (caminhoXlsx) console.log(`Relatorio XLSX: ${caminhoXlsx}`);
  }

  if (resultados.some((item) => !item.sucesso)) {
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  console.log("CLI Gestta - Inserir tarefas v1\n");

  const args = parseArgs();
  if (args.apply && args.dryRunFlag) {
    throw new Error("Use apenas um modo por execucao: --apply ou --dry-run.");
  }
  if (args.tobias) {
    await executarModoTobias(args);
    return;
  }
  const dryRun = args.dryRunFlag || !args.apply;
  const planilhaPath = path.resolve(process.cwd(), getPlanilhaPath(args.planilhaArg));
  const inicioExecucao = new Date().toISOString();

  console.log(`Planilha: ${planilhaPath}`);
  console.log(`Checkpoint: ${args.continuar ? "continuar" : "novo"}\n`);
  logPreflight("info", `Execucao iniciada em modo ${dryRun ? "dry-run" : "apply"}.`);

  if (!fs.existsSync(planilhaPath)) {
    throw new Error(`Planilha nao encontrada: ${planilhaPath}`);
  }

  const gesttaTimeoutMs = getPositiveIntegerEnv("GESTTA_HTTP_TIMEOUT_MS", 60000);
  const readRetries = getPositiveIntegerEnv("GESTTA_READ_RETRIES", 3);
  const readRetryDelayMs = getPositiveIntegerEnv("GESTTA_READ_RETRY_DELAY_MS", 1000);
  const customerTaskConcurrency = getPositiveIntegerEnv("GESTTA_CUSTOMER_TASK_CONCURRENCY", 5);

  const client = createGesttaClient(getJwt(), { timeoutMs: gesttaTimeoutMs });
  const { grupos, resumo } = await fazerPreflight(client, planilhaPath);
  const responsaveis = new Map<string, string>();
  for (const grupo of grupos) {
    for (const item of grupo.itens) {
      if (!responsaveis.has(item.userId)) {
        responsaveis.set(item.userId, `${item.userNomeGestta} [${item.userOrigem}]`);
      }
    }
  }
  logPreflight(
    "info",
    `Preflight concluido: ${resumo.totalEmpresas} empresa(s), ${resumo.totalTarefas} tarefa(s), ${responsaveis.size} responsavel(is) resolvido(s).`,
  );
  logPreflight("info", `Responsaveis resolvidos: ${[...responsaveis.values()].join(", ")}.`);
  imprimirResumoPreflight(resumo, dryRun);

  const api: SyncTaskApi = {
    listTaskCustomers: (taskId) => listarClientesDaTarefa(client, taskId),
    deleteGroupCustomers: (ids) => removerGroupCustomers(client, ids),
    addCustomersToTask: (taskId, customerIds) => adicionarClientesNaTarefa(client, taskId, customerIds),
    listCustomerTasks: (customerId) => listarTarefasDoCliente(client, customerId),
    patchTaskOwners: (input) => patchResponsavel(client, input),
  };

  let resultados: Awaited<ReturnType<typeof executarSincronizacaoTarefa>>[] = [];
  let indiceInicial = 0;

  if (args.continuar) {
    const checkpoint = carregarCheckpoint(planilhaPath, dryRun);
    if (checkpoint) {
      resultados = checkpoint.resultados;
      indiceInicial = checkpoint.indiceProximo;
      console.log(`Retomando da tarefa ${indiceInicial + 1}/${grupos.length}.\n`);
    }
  }

  for (let index = indiceInicial; index < grupos.length; index += 1) {
    const grupo = grupos[index];
    const taskIndex = index + 1;
    logProgressEvent({
      timestamp: new Date().toISOString(),
      nivel: "info",
      etapa: "iniciar",
      tarefa: grupo.taskNomePlanilha,
      taskIndex,
      taskTotal: grupos.length,
      mensagem: `Tarefa iniciada com ${grupo.itens.length} empresa(s).`,
    });
    const result = await executarSincronizacaoTarefa(api, grupo, dryRun, {
      taskIndex,
      taskTotal: grupos.length,
      readRetries,
      readRetryDelayMs,
      customerTaskConcurrency,
      emitLog: logProgressEvent,
    });
    resultados.push(result);
    logProgressEvent({
      timestamp: new Date().toISOString(),
      nivel: result.sucesso ? "success" : "error",
      etapa: "finalizar",
      tarefa: grupo.taskNomePlanilha,
      taskIndex,
      taskTotal: grupos.length,
      mensagem: result.sucesso ? "Tarefa finalizada com sucesso." : `Tarefa finalizada com falha: ${result.mensagem}`,
    });
    salvarCheckpoint(planilhaPath, dryRun, inicioExecucao, resultados, index + 1);
  }

  imprimirResumoFinal(resultados);

  const relatorio = gerarRelatorioExecucao(planilhaPath, dryRun, resultados, inicioExecucao);
  const caminhoJson = salvarRelatorio(relatorio);
  if (caminhoJson) {
    atualizarIndice(caminhoJson, relatorio);
    console.log(`\nRelatorio JSON: ${caminhoJson}`);
    const caminhoXlsx = salvarRelatorioXlsx(relatorio, caminhoJson);
    if (caminhoXlsx) console.log(`Relatorio XLSX: ${caminhoXlsx}`);
  }

  limparCheckpoint(planilhaPath, dryRun);

  if (resultados.some((item) => !item.sucesso)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
