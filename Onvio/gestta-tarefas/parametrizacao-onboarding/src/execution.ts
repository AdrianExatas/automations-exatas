import { calcularPreviewMatriz } from "./matrix";
import { resolverClientePorCnpj } from "./customer";
import {
  AreaParametrizacao,
  ClienteGestta,
  ConfiguracaoTarefaCliente,
  MatrizPreview,
  ParametrizacaoInput,
  RelatorioExecucao,
  ResultadoTarefa,
  TarefaGestta,
  TarefaMatriz,
  TarefaResolvida,
  TimelineEvento,
  UsuarioGestta,
  VinculoTarefaCliente,
} from "./types";
import { getPositiveIntegerEnv, normalizarChave, normalizarCnpj } from "./utils";

export interface GesttaApi {
  listarClientes(): Promise<ClienteGestta[]>;
  listarFuncionarios(): Promise<UsuarioGestta[]>;
  listarTarefasRecorrentesAtivas(): Promise<TarefaGestta[]>;
  listarClientesDaTarefa(taskId: string): Promise<VinculoTarefaCliente[]>;
  adicionarClienteNaTarefa(taskId: string, customerId: string): Promise<void>;
  listarTarefasDoCliente(customerId: string): Promise<ConfiguracaoTarefaCliente[]>;
  patchResponsavel(body: { ids: string[]; company_user: string; approve_type: string[] }): Promise<void>;
}

export interface ExecutionOptions {
  matrixPath: string;
  input: ParametrizacaoInput;
  dryRun: boolean;
  api?: GesttaApi;
  emitLog?: (message: string) => void;
  wait?: (ms: number) => Promise<void>;
  readRetries?: number;
  readRetryDelayMs?: number;
  shouldCancel?: () => boolean;
}

interface ResolvedPreflight {
  preview: MatrizPreview;
  cliente: ClienteGestta;
  tarefas: TarefaResolvida[];
}

const PREFIXOS_TAREFA_CAIXA_POSTAL_SEFAZ = [
  normalizarChave("VERIFICAÇÃO DE CAIXA POSTAL SEFAZ SN -"),
  normalizarChave("VERIFICAÇÃO DE CAIXA POSTAL SEFAZ FISC NORMAL -"),
];

const DEPARTAMENTOS_POR_AREA: Record<AreaParametrizacao, string[]> = {
  dp: ["DP", "Departamento Pessoal"],
  fiscal: ["Fiscal"],
  financeiro: ["Financeiro"],
  contabil: ["Contabil"],
  sucesso_cliente: ["Sucesso do Cliente"],
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createRealApi(): Promise<GesttaApi> {
  const requireFn = eval("require") as NodeRequire;
  const { resolveGesttaRuntimeAuth } = requireFn("./auth/runtime-auth") as typeof import("./auth/runtime-auth");
  const { createGesttaClient } = requireFn("./api/client") as typeof import("./api/client");
  const endpoints = requireFn("./api/endpoints") as typeof import("./api/endpoints");
  const auth = await resolveGesttaRuntimeAuth();
  const client = createGesttaClient(auth, {
    timeoutMs: getPositiveIntegerEnv("GESTTA_HTTP_TIMEOUT_MS", 60000),
  });

  return {
    listarClientes: () => endpoints.listarClientes(client),
    listarFuncionarios: () => endpoints.listarFuncionarios(client),
    listarTarefasRecorrentesAtivas: () => endpoints.listarTarefasRecorrentesAtivas(client),
    listarClientesDaTarefa: (taskId) => endpoints.listarClientesDaTarefa(client, taskId),
    adicionarClienteNaTarefa: (taskId, customerId) => endpoints.adicionarClienteNaTarefa(client, taskId, customerId),
    listarTarefasDoCliente: (customerId) => endpoints.listarTarefasDoCliente(client, customerId),
    patchResponsavel: (body) => endpoints.patchResponsavel(client, body),
  };
}

function normalizarCustomerId(customer: VinculoTarefaCliente["customer"]): string {
  if (typeof customer === "string") return customer;
  if (customer && typeof customer === "object" && "_id" in customer) {
    const value = (customer as { _id?: unknown })._id;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function normalizarTaskId(companyTask: ConfiguracaoTarefaCliente["company_task"]): string {
  if (typeof companyTask === "string") return companyTask;
  if (companyTask && typeof companyTask === "object" && "_id" in companyTask) {
    const value = (companyTask as { _id?: unknown })._id;
    return typeof value === "string" ? value : "";
  }
  return "";
}

type ConfiguracaoAplicavel = Pick<
  ConfiguracaoTarefaCliente | VinculoTarefaCliente,
  "_id" | "company_user" | "approve_type"
>;

function normalizarCompanyUserId(companyUser: ConfiguracaoAplicavel["company_user"]): string | undefined {
  if (typeof companyUser === "string") return companyUser;
  if (companyUser && typeof companyUser === "object" && "_id" in companyUser) {
    const value = (companyUser as { _id?: unknown })._id;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function normalizarCompanyUserName(companyUser: ConfiguracaoAplicavel["company_user"]): string | undefined {
  if (companyUser && typeof companyUser === "object" && "name" in companyUser) {
    const value = (companyUser as { name?: unknown }).name;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function uniqueByName<T extends { name: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = normalizarChave(item.name);
    const current = map.get(key) ?? [];
    current.push(item);
    map.set(key, current);
  }
  return map;
}

function listarDepartamentos(matches: TarefaGestta[]): string {
  const departamentos = matches.map((item) => item.company_department?.name?.trim() || "sem departamento");
  return [...new Set(departamentos)].join(", ");
}

function isTarefaCaixaPostalSefaz(tarefa: string): boolean {
  const key = normalizarChave(tarefa);
  return PREFIXOS_TAREFA_CAIXA_POSTAL_SEFAZ.some(
    (prefixo) => key.startsWith(prefixo) && key.length > prefixo.length,
  );
}

function resolverTarefas(tasksByName: Map<string, TarefaGestta[]>, tarefaMatriz: TarefaMatriz): TarefaGestta[] {
  const key = normalizarChave(tarefaMatriz.tarefa);
  const matches = (tasksByName.get(key) ?? []).filter((item) => item.active !== false);
  if (matches.length === 1) return matches;
  if (matches.length === 0) {
    throw new Error(`Tarefa recorrente ativa nao encontrada no Gestta: ${tarefaMatriz.tarefa}.`);
  }
  if (isTarefaCaixaPostalSefaz(tarefaMatriz.tarefa)) return matches;

  const departamentosEsperados = new Set(DEPARTAMENTOS_POR_AREA[tarefaMatriz.area].map(normalizarChave));
  const matchesDoDepartamento = matches.filter((task) => {
    const departamento = task.company_department?.name;
    return departamento ? departamentosEsperados.has(normalizarChave(departamento)) : false;
  });
  if (matchesDoDepartamento.length === 1) return matchesDoDepartamento;

  throw new Error(
    `Tarefa recorrente ambigua no Gestta: ${tarefaMatriz.tarefa}. ` +
      `Area da matriz: ${tarefaMatriz.area}. Departamentos encontrados: ${listarDepartamentos(matches)}.`,
  );
}

function resolverUsuario(usersByName: Map<string, UsuarioGestta[]>, responsavel: string): UsuarioGestta {
  const matches = (usersByName.get(normalizarChave(responsavel)) ?? []).filter((item) => item.active !== false);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Responsavel nao encontrado no Gestta: ${responsavel}.`);
  throw new Error(`Responsavel ambiguo no Gestta: ${responsavel}.`);
}

function selecionarConfiguracao(
  customerId: string,
  taskId: string,
  items: ConfiguracaoTarefaCliente[],
): ConfiguracaoTarefaCliente | null {
  const matches = items.filter((item) => normalizarTaskId(item.company_task) === taskId);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(`Cliente ${customerId} retornou mais de um vinculo para a tarefa ${taskId}.`);
  }
  return matches[0];
}

function selecionarLinkCliente(
  customerId: string,
  links: VinculoTarefaCliente[],
): VinculoTarefaCliente | null {
  const matches = links.filter((link) => normalizarCustomerId(link.customer) === customerId);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(`Cliente ${customerId} retornou mais de um vinculo na listagem da tarefa.`);
  }
  return matches[0];
}

async function aguardarConfiguracao(
  api: GesttaApi,
  customerId: string,
  taskId: string,
  options: Required<Pick<ExecutionOptions, "wait" | "readRetries" | "readRetryDelayMs">>,
): Promise<ConfiguracaoTarefaCliente | null> {
  for (let attempt = 0; attempt <= options.readRetries; attempt += 1) {
    const config = selecionarConfiguracao(customerId, taskId, await api.listarTarefasDoCliente(customerId));
    if (config) return config;
    if (attempt < options.readRetries) await options.wait(options.readRetryDelayMs);
  }
  return null;
}

async function aguardarLinkClienteNaTarefa(
  api: GesttaApi,
  customerId: string,
  taskId: string,
  options: Required<Pick<ExecutionOptions, "wait" | "readRetries" | "readRetryDelayMs">>,
): Promise<VinculoTarefaCliente | null> {
  for (let attempt = 0; attempt <= options.readRetries; attempt += 1) {
    const link = selecionarLinkCliente(customerId, await api.listarClientesDaTarefa(taskId));
    if (link) return link;
    if (attempt < options.readRetries) await options.wait(options.readRetryDelayMs);
  }
  return null;
}

function createLogger(
  timeline: TimelineEvento[],
  emitLog?: (message: string) => void,
): (nivel: TimelineEvento["nivel"], etapa: string, mensagem: string, tarefa?: string) => void {
  return (nivel, etapa, mensagem, tarefa) => {
    const event: TimelineEvento = {
      timestamp: new Date().toISOString(),
      nivel,
      etapa,
      tarefa,
      mensagem,
    };
    timeline.push(event);
    emitLog?.(`[${nivel}] ${etapa}${tarefa ? ` | ${tarefa}` : ""}: ${mensagem}\n`);
  };
}

async function fazerPreflight(
  api: GesttaApi,
  matrixPath: string,
  input: ParametrizacaoInput,
  log: ReturnType<typeof createLogger>,
): Promise<ResolvedPreflight> {
  const preview = calcularPreviewMatriz(matrixPath, input);
  log("info", "preflight", `${preview.tarefas.length} tarefa(s) calculada(s) pela matriz.`);
  for (const aviso of preview.avisos) log("warn", "preflight", aviso);

  const [clientes, usuarios, tarefasGestta] = await Promise.all([
    api.listarClientes(),
    api.listarFuncionarios(),
    api.listarTarefasRecorrentesAtivas(),
  ]);

  const cliente = resolverClientePorCnpj(clientes, input.cnpj);
  const tasksByName = uniqueByName(tarefasGestta);
  const usersByName = uniqueByName(usuarios);

  const tarefas = preview.tarefas.flatMap((item) => {
    const tarefasResolvidas = resolverTarefas(tasksByName, item);
    const usuario = resolverUsuario(usersByName, item.responsavel);
    return tarefasResolvidas.map((tarefa) => ({
      ...item,
      taskId: tarefa._id,
      taskNomeGestta: tarefa.name,
      userId: usuario._id,
      userNomeGestta: usuario.name,
    }));
  });

  log("info", "preflight", `Cliente resolvido: ${cliente.name} (${cliente._id}).`);
  return { preview, cliente, tarefas };
}

function criarResultadoBase(item: TarefaMatriz, dryRun: boolean): ResultadoTarefa {
  return {
    area: item.area,
    aba: item.aba,
    tarefaPlanilha: item.tarefa,
    responsavelPlanilha: item.responsavel,
    dryRun,
    sucesso: false,
    jaVinculada: false,
    inclusaoSolicitada: false,
    patchResponsavel: false,
    mensagem: "",
    detalhes: [],
  };
}

async function executarTarefa(
  api: GesttaApi,
  customerId: string,
  item: TarefaResolvida,
  dryRun: boolean,
  options: Required<Pick<ExecutionOptions, "wait" | "readRetries" | "readRetryDelayMs">>,
  log: ReturnType<typeof createLogger>,
): Promise<ResultadoTarefa> {
  const resultado = {
    ...criarResultadoBase(item, dryRun),
    tarefaGestta: item.taskNomeGestta,
    taskId: item.taskId,
    responsavelGestta: item.userNomeGestta,
    userId: item.userId,
  };

  try {
    const links = await api.listarClientesDaTarefa(item.taskId);
    let link = selecionarLinkCliente(customerId, links);
    const jaVinculada = Boolean(link);
    resultado.jaVinculada = jaVinculada;
    resultado.inclusaoSolicitada = !jaVinculada;

    log("info", "listar-vinculos", jaVinculada ? "Empresa ja vinculada." : "Empresa sera vinculada.", item.tarefa);

    let config: ConfiguracaoAplicavel | null = link;
    if (!config || !normalizarCompanyUserId(config.company_user)) {
      const configCliente = selecionarConfiguracao(
        customerId,
        item.taskId,
        await api.listarTarefasDoCliente(customerId),
      );
      if (configCliente) config = configCliente;
    }
    if (config === link && link) {
      resultado.detalhes.push("Usando vinculo da listagem da tarefa como fonte principal da configuracao.");
    }
    if (!dryRun && !jaVinculada) {
      await api.adicionarClienteNaTarefa(item.taskId, customerId);
      log("info", "adicionar-empresa", "Vinculo solicitado no Gestta.", item.tarefa);
      link = await aguardarLinkClienteNaTarefa(api, customerId, item.taskId, options);
      if (!link) {
        resultado.mensagem = "Vinculo da empresa nao apareceu na listagem da tarefa apos a inclusao.";
        return resultado;
      }
      config = link;
      try {
        const configCliente = selecionarConfiguracao(
          customerId,
          item.taskId,
          await api.listarTarefasDoCliente(customerId),
        );
        if (configCliente) {
          config = configCliente;
        } else {
          resultado.detalhes.push("Endpoint do cliente ainda nao confirmou a configuracao; usando o ID do vinculo retornado pela tarefa para aplicar o responsavel.");
          log("info", "aguardar-configuracao", "Usando vinculo da tarefa como fonte principal da configuracao.", item.tarefa);
        }
      } catch (error) {
        resultado.detalhes.push(
          `Endpoint do cliente indisponivel; usando vinculo da tarefa. ${error instanceof Error ? error.message : String(error)}`,
        );
        log("warn", "aguardar-configuracao", "Endpoint do cliente falhou; usando vinculo da tarefa.", item.tarefa);
      }
    }

    const currentUserId = config ? normalizarCompanyUserId(config.company_user) : undefined;
    const currentUserName = config ? normalizarCompanyUserName(config.company_user) : undefined;
    const precisaPatch = currentUserId !== item.userId;
    resultado.patchResponsavel = precisaPatch;

    if (dryRun) {
      resultado.sucesso = true;
      resultado.mensagem =
        `${jaVinculada ? "Ja vinculada" : "Vinculo sera criado"}; ` +
        `${precisaPatch ? "responsavel sera ajustado" : "responsavel ja confere"}.`;
      if (currentUserName) resultado.detalhes.push(`Responsavel atual: ${currentUserName}.`);
      return resultado;
    }

    if (!config) {
      resultado.mensagem = "Configuracao da tarefa nao apareceu no endpoint do cliente e o vinculo nao foi localizado na tarefa.";
      return resultado;
    }

    if (precisaPatch) {
      await api.patchResponsavel({
        ids: [config._id],
        company_user: item.userId,
        approve_type: Array.isArray(config.approve_type) ? config.approve_type : [],
      });
      log("info", "alterar-responsavel", `Responsavel ajustado para ${item.userNomeGestta}.`, item.tarefa);

      const validated = await aguardarLinkClienteNaTarefa(api, customerId, item.taskId, options);
      const validatedUserId = validated ? normalizarCompanyUserId(validated.company_user) : undefined;
      if (validatedUserId && validatedUserId !== item.userId) {
        resultado.mensagem = `Responsavel divergente apos patch: esperado ${item.userNomeGestta}, obtido ${normalizarCompanyUserName(validated?.company_user) ?? "sem responsavel"}.`;
        return resultado;
      }
      if (!validatedUserId) {
        resultado.detalhes.push("Patch de responsavel enviado, mas o Gestta ainda nao retornou o responsavel atualizado para validacao final.");
      }
    }

    resultado.sucesso = true;
    resultado.mensagem =
      `${jaVinculada ? "Vinculo preservado" : "Vinculo criado"}; ` +
      `${precisaPatch ? "responsavel ajustado" : "responsavel preservado"}.`;
    return resultado;
  } catch (error) {
    resultado.mensagem = error instanceof Error ? error.message : String(error);
    resultado.detalhes.push(resultado.mensagem);
    log("error", "tarefa", resultado.mensagem, item.tarefa);
    return resultado;
  }
}

export async function executarParametrizacao(options: ExecutionOptions): Promise<RelatorioExecucao> {
  const inicio = new Date().toISOString();
  const timeline: TimelineEvento[] = [];
  const log = createLogger(timeline, options.emitLog);
  const wait = options.wait ?? delay;
  const readRetries = options.readRetries ?? getPositiveIntegerEnv("GESTTA_READ_RETRIES", 5);
  const readRetryDelayMs = options.readRetryDelayMs ?? getPositiveIntegerEnv("GESTTA_READ_RETRY_DELAY_MS", 2000);

  let api = options.api;
  if (!api) {
    api = await createRealApi();
  }

  const { preview, cliente, tarefas } = await fazerPreflight(api, options.matrixPath, options.input, log);
  const resultados: ResultadoTarefa[] = [];

  for (const [index, tarefa] of tarefas.entries()) {
    if (options.shouldCancel?.()) {
      throw new Error("Execucao cancelada pelo usuario.");
    }

    log("info", "iniciar-tarefa", `${index + 1}/${tarefas.length}`, tarefa.tarefa);
    const resultado = await executarTarefa(
      api,
      cliente._id,
      tarefa,
      options.dryRun,
      { wait, readRetries, readRetryDelayMs },
      log,
    );
    resultados.push(resultado);
    log(resultado.sucesso ? "success" : "error", "finalizar-tarefa", resultado.mensagem, tarefa.tarefa);
  }

  const sucesso = resultados.filter((item) => item.sucesso).length;
  return {
    execucao: {
      inicio,
      fim: new Date().toISOString(),
      dryRun: options.dryRun,
      cnpj: normalizarCnpj(options.input.cnpj),
      customerId: cliente._id,
      customerName: cliente.name,
      regimeFiscal: options.input.regimeFiscal,
      areas: options.input.areas,
      totalTarefasCalculadas: preview.tarefas.length,
      sucesso,
      falha: resultados.length - sucesso,
      avisos: preview.avisos,
    },
    resultados,
    timeline,
  };
}
