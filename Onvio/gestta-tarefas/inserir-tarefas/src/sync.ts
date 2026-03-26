import { isAxiosError } from "axios";
import {
  ClienteResumo,
  ConfiguracaoResumo,
  ConfiguracaoTarefaCliente,
  DiagnosticoHttpEmpresa,
  DiffVinculos,
  DivergenciaResponsavel,
  EtapaFalha,
  GrupoPatchPlanejado,
  GrupoTarefaResolvida,
  LinkResumo,
  NecessidadePatch,
  PendenciaConfiguracao,
  ProgressoEtapasResumo,
  ProgressoLogEvento,
  ResultadoTarefa,
  ResponsavelResolvidoResumo,
  TarefaPlanilhaResolvida,
  VinculoTarefaCliente,
} from "./types";
import { chunkArray, normalizarNome } from "./utils";

const CHUNK_SIZE = 100;
const DEFAULT_POST_ADD_ATTEMPTS = 40;
const DEFAULT_POST_PATCH_ATTEMPTS = 30;
const DEFAULT_POLL_INTERVAL_MS = 3000;
const DEFAULT_READ_RETRIES = 3;
const DEFAULT_READ_RETRY_DELAY_MS = 1000;
const DEFAULT_CUSTOMER_TASK_CONCURRENCY = 5;

export interface SyncTaskApi {
  listTaskCustomers(taskId: string): Promise<VinculoTarefaCliente[]>;
  deleteGroupCustomers(ids: string[]): Promise<void>;
  addCustomersToTask(taskId: string, customerIds: string[]): Promise<void>;
  listCustomerTasks(customerId: string): Promise<ConfiguracaoTarefaCliente[]>;
  patchTaskOwners(input: {
    ids: string[];
    company_user: string;
    approve_type: string[];
  }): Promise<void>;
}

export interface ExecuteSyncOptions {
  postAddAttempts?: number;
  postPatchAttempts?: number;
  pollIntervalMs?: number;
  readRetries?: number;
  readRetryDelayMs?: number;
  customerTaskConcurrency?: number;
  wait?: (ms: number) => Promise<void>;
  taskIndex?: number;
  taskTotal?: number;
  emitLog?: (event: ProgressoLogEvento) => void;
}

interface CarregamentoClienteResultado {
  item: TarefaPlanilhaResolvida;
  config: ConfiguracaoResumo | null;
  teveRetry: boolean;
  retryMessages: string[];
  erroFatal?: DiagnosticoHttpEmpresa;
}

interface CarregamentoConfiguracoesResultado {
  configs: Map<string, ConfiguracaoResumo>;
  requestErrors: DiagnosticoHttpEmpresa[];
  clientesComRetry: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrencyLimit<T, TResult>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) return [];

  const results = new Array<TResult>(items.length);
  const concurrency = Math.max(1, Math.min(limit, items.length));
  let nextIndex = 0;

  const workers = Array.from({ length: concurrency }, async () => {
    for (;;) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) break;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  });

  await Promise.all(workers);
  return results;
}

function isRetryableReadError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  if (!error.response) return true;

  const status = error.response.status;
  return status === 429 || status >= 500;
}

function descreverErroLeitura(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : String(error);
  }

  if (error.code === "ECONNABORTED") {
    return "timeout";
  }

  if (!error.response) {
    return error.message || "erro de rede";
  }

  const status = error.response.status;
  const responseData = error.response.data;
  const responseMessage =
    responseData && typeof responseData === "object" && "message" in responseData
      ? (responseData as { message?: unknown }).message
      : undefined;

  if (typeof responseMessage === "string" && responseMessage.trim()) {
    return `HTTP ${status}: ${responseMessage.trim()}`;
  }

  const statusText = error.response.statusText?.trim();
  return statusText ? `HTTP ${status}: ${statusText}` : `HTTP ${status}`;
}

function normalizarTrechoMensagem(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncarMensagem(value: string, maxLength = 240): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function formatarListaResumida(values: string[], limit = 3): string {
  if (values.length === 0) return "[]";
  const sample = values.slice(0, limit).join(", ");
  return `[${sample}${values.length > limit ? ", ..." : ""}]`;
}

function resumirRespostaErro(error: unknown): string | undefined {
  if (!isAxiosError(error) || !error.response) return undefined;

  const responseData = error.response.data;
  if (typeof responseData === "string") {
    const normalized = normalizarTrechoMensagem(responseData);
    return normalized ? truncarMensagem(normalized) : undefined;
  }

  if (responseData == null) return undefined;

  try {
    const normalized = normalizarTrechoMensagem(JSON.stringify(responseData));
    return normalized ? truncarMensagem(normalized) : undefined;
  } catch {
    return undefined;
  }
}

function descreverErroPatch(error: unknown, patchGroup: GrupoPatchPlanejado): string {
  const endpoint = "PATCH /admin/group/customer/config";
  const parts = [
    `${endpoint} falhou`,
    `company_user=${patchGroup.companyUserId}`,
    `approve_type=${JSON.stringify(patchGroup.approveType)}`,
    `ids=${patchGroup.ids.length} ${formatarListaResumida(patchGroup.ids)}`,
    `customers=${patchGroup.customerIds.length} ${formatarListaResumida(patchGroup.customerIds)}`,
  ];

  if (!isAxiosError(error)) {
    parts.push(`erro=${error instanceof Error ? error.message : String(error)}`);
    return `${parts.join("; ")}.`;
  }

  if (error.code === "ECONNABORTED") {
    parts.push("erro=timeout");
  } else if (!error.response) {
    parts.push(`erro=${error.message || "erro de rede"}`);
  } else {
    const status = error.response.status;
    const statusText = error.response.statusText?.trim();
    parts.push(`erro=HTTP ${status}${statusText ? ` ${statusText}` : ""}`);
    const responseSnippet = resumirRespostaErro(error);
    if (responseSnippet) parts.push(`response=${responseSnippet}`);
  }

  return `${parts.join("; ")}.`;
}

function formatarDiagnosticoHttp(diagnostico: DiagnosticoHttpEmpresa): string {
  return (
    `${diagnostico.customerName} (${diagnostico.customerId}` +
    `${diagnostico.cnpj ? ` / ${diagnostico.cnpj}` : ""}) ` +
    `[${diagnostico.etapa}] apos ${diagnostico.tentativas} tentativa(s): ${diagnostico.ultimoErro}.`
  );
}

function normalizarCustomerId(customer: VinculoTarefaCliente["customer"]): string {
  if (typeof customer === "string") return customer;
  if (customer && typeof customer === "object" && "_id" in customer) {
    const value = (customer as { _id?: unknown })._id;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function normalizarCustomerName(customer: VinculoTarefaCliente["customer"]): string {
  if (customer && typeof customer === "object" && "name" in customer) {
    const value = (customer as { name?: unknown }).name;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function normalizarCustomerCnpj(customer: VinculoTarefaCliente["customer"]): string {
  if (customer && typeof customer === "object" && "cnpj" in customer) {
    const value = (customer as { cnpj?: unknown }).cnpj;
    return typeof value === "string" ? value : "";
  }
  return "";
}

export function resumirLinks(items: VinculoTarefaCliente[]): LinkResumo[] {
  return items
    .map((item) => ({
      id: item._id,
      customerId: normalizarCustomerId(item.customer),
      customerName: normalizarCustomerName(item.customer),
      cnpj: normalizarCustomerCnpj(item.customer),
      approveType: Array.isArray(item.approve_type) ? item.approve_type : [],
      active: item.active !== false,
    }))
    .filter((item) => Boolean(item.id && item.customerId));
}

function normalizarTaskId(companyTask: ConfiguracaoTarefaCliente["company_task"]): string {
  if (typeof companyTask === "string") return companyTask;
  if (companyTask && typeof companyTask === "object" && "_id" in companyTask) {
    const value = (companyTask as { _id?: unknown })._id;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function normalizarTaskName(companyTask: ConfiguracaoTarefaCliente["company_task"]): string {
  if (companyTask && typeof companyTask === "object" && "name" in companyTask) {
    const value = (companyTask as { name?: unknown }).name;
    return typeof value === "string" ? value : "";
  }
  return "";
}

function normalizarCompanyUserId(companyUser: ConfiguracaoTarefaCliente["company_user"]): string | undefined {
  if (typeof companyUser === "string") return companyUser;
  if (companyUser && typeof companyUser === "object" && "_id" in companyUser) {
    const value = (companyUser as { _id?: unknown })._id;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function normalizarCompanyUserName(companyUser: ConfiguracaoTarefaCliente["company_user"]): string | undefined {
  if (companyUser && typeof companyUser === "object" && "name" in companyUser) {
    const value = (companyUser as { name?: unknown }).name;
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

function toClienteResumo(item: TarefaPlanilhaResolvida): ClienteResumo {
  return {
    customerId: item.customerId,
    customerName: item.customerNomeGestta,
    cnpj: item.cnpj,
  };
}

function toClienteResumoFromLink(item: LinkResumo): ClienteResumo {
  return {
    customerId: item.customerId,
    customerName: item.customerName,
    cnpj: item.cnpj,
    linkId: item.id,
  };
}

function construirConfigsBasicasDaTarefa(
  group: GrupoTarefaResolvida,
  links: LinkResumo[],
): Map<string, ConfiguracaoResumo> {
  return new Map(
    links.map((item) => [
      item.customerId,
      {
        linkId: item.id,
        customerId: item.customerId,
        taskId: group.taskId,
        taskName: group.taskNomeGestta,
        companyUserId: undefined,
        companyUserName: undefined,
        approveType: item.approveType,
        active: item.active,
      },
    ] as const),
  );
}

function mesclarConfigsDaTarefa(
  baseConfigs: Map<string, ConfiguracaoResumo>,
  loadedConfigs: Map<string, ConfiguracaoResumo>,
): Map<string, ConfiguracaoResumo> {
  const merged = new Map(baseConfigs);

  for (const [customerId, loadedConfig] of loadedConfigs) {
    const current = merged.get(customerId);
    merged.set(
      customerId,
      current
        ? {
            ...current,
            ...loadedConfig,
            approveType: loadedConfig.approveType,
            active: loadedConfig.active,
          }
        : loadedConfig,
    );
  }

  return merged;
}

function createProgressoResumo(): ProgressoEtapasResumo {
  return {
    inclusoesSolicitadas: 0,
    configuracoesConfirmadas: 0,
    responsaveisValidados: 0,
    empresasComErro: 0,
  };
}

function emitLog(
  resultado: ResultadoTarefa,
  group: GrupoTarefaResolvida,
  options: Required<ExecuteSyncOptions>,
  event: Omit<ProgressoLogEvento, "timestamp" | "tarefa" | "taskIndex" | "taskTotal">,
): void {
  const fullEvent: ProgressoLogEvento = {
    timestamp: new Date().toISOString(),
    tarefa: group.taskNomePlanilha,
    taskIndex: options.taskIndex,
    taskTotal: options.taskTotal,
    ...event,
  };
  resultado.timeline?.push(fullEvent);
  options.emitLog(fullEvent);
}

function getCompanyPosition(
  group: GrupoTarefaResolvida,
  customerId: string,
): { companyIndex: number; companyTotal: number } {
  const index = group.itens.findIndex((item) => item.customerId === customerId);
  return {
    companyIndex: index >= 0 ? index + 1 : 0,
    companyTotal: group.itens.length,
  };
}

function toLogCompany(
  item:
    | { customerId: string; customerName: string; cnpj?: string }
    | TarefaPlanilhaResolvida
    | PendenciaConfiguracao
    | DivergenciaResponsavel
    | DiagnosticoHttpEmpresa
    | LinkResumo,
): { customerId: string; customerName: string; cnpj?: string } {
  if ("customerName" in item && typeof item.customerName === "string") {
    return {
      customerId: item.customerId,
      customerName: item.customerName,
      cnpj: item.cnpj,
    };
  }

  if ("customerNomeGestta" in item && typeof item.customerNomeGestta === "string") {
    return {
      customerId: item.customerId,
      customerName: item.customerNomeGestta,
      cnpj: item.cnpj,
    };
  }

  return {
    customerId: item.customerId,
    customerName: "",
    cnpj: item.cnpj,
  };
}

function logEmpresa(
  resultado: ResultadoTarefa,
  group: GrupoTarefaResolvida,
  options: Required<ExecuteSyncOptions>,
  etapa: ProgressoLogEvento["etapa"],
  nivel: ProgressoLogEvento["nivel"],
  item:
    | { customerId: string; customerName: string; cnpj?: string }
    | TarefaPlanilhaResolvida
    | PendenciaConfiguracao
    | DivergenciaResponsavel
    | DiagnosticoHttpEmpresa
    | LinkResumo,
  mensagem: string,
): void {
  const company = toLogCompany(item);
  const position = getCompanyPosition(group, company.customerId);
  emitLog(resultado, group, options, {
    nivel,
    etapa,
    companyIndex: position.companyIndex || undefined,
    companyTotal: position.companyTotal,
    customerId: company.customerId,
    customerName: company.customerName,
    cnpj: company.cnpj,
    mensagem,
  });
}

function getResponsaveisResolvidos(group: GrupoTarefaResolvida): ResponsavelResolvidoResumo[] {
  const uniques = new Map<string, ResponsavelResolvidoResumo>();

  for (const item of group.itens) {
    const key = normalizarNome(item.responsavel);
    if (uniques.has(key)) continue;
    uniques.set(key, {
      responsavel: item.userNomeGestta,
      userId: item.userId,
      origem: item.userOrigem,
    });
  }

  return [...uniques.values()].sort((a, b) => a.responsavel.localeCompare(b.responsavel));
}

export function calcularDiffVinculos(
  desiredItems: TarefaPlanilhaResolvida[],
  currentLinks: LinkResumo[],
): DiffVinculos {
  const desiredByCustomerId = new Map(
    desiredItems.map((item) => [item.customerId, item] as const),
  );

  const currentByCustomerId = new Map(
    currentLinks.map((link) => [link.customerId, link] as const),
  );

  const extras = currentLinks.filter((link) => !desiredByCustomerId.has(link.customerId));
  const missing = desiredItems.filter((item) => !currentByCustomerId.has(item.customerId));
  const presentes = currentLinks.filter((link) => desiredByCustomerId.has(link.customerId));

  return { extras, missing, presentes };
}

function selecionarConfiguracaoDaTarefa(
  customerId: string,
  taskId: string,
  items: ConfiguracaoTarefaCliente[],
): ConfiguracaoResumo | null {
  const matches = items.filter((item) => normalizarTaskId(item.company_task) === taskId);
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(`Cliente ${customerId} retornou mais de um vinculo para a tarefa ${taskId}.`);
  }

  const item = matches[0];
  return {
    linkId: item._id,
    customerId,
    taskId,
    taskName: normalizarTaskName(item.company_task),
    companyUserId: normalizarCompanyUserId(item.company_user),
    companyUserName: normalizarCompanyUserName(item.company_user),
    approveType: Array.isArray(item.approve_type) ? item.approve_type : [],
    active: item.active !== false,
  };
}

async function carregarConfiguracaoClienteComRetry(
  api: SyncTaskApi,
  taskId: string,
  item: TarefaPlanilhaResolvida,
  etapa: DiagnosticoHttpEmpresa["etapa"],
  options: Required<ExecuteSyncOptions>,
): Promise<CarregamentoClienteResultado> {
  const retryMessages: string[] = [];
  let teveRetry = false;

  for (let attempt = 1; attempt <= options.readRetries + 1; attempt += 1) {
    try {
      const allTasks = await api.listCustomerTasks(item.customerId);
      const config = selecionarConfiguracaoDaTarefa(item.customerId, taskId, allTasks);
      return {
        item,
        config,
        teveRetry,
        retryMessages,
      };
    } catch (error) {
      const ultimoErro = descreverErroLeitura(error);
      const retryable = isRetryableReadError(error);
      const podeRetry = retryable && attempt <= options.readRetries;

      if (podeRetry) {
        teveRetry = true;
        retryMessages.push(`consulta de configuracao falhou: ${ultimoErro}; retry ${attempt}/${options.readRetries}.`);
        await options.wait(options.readRetryDelayMs);
        continue;
      }

      return {
        item,
        config: null,
        teveRetry,
        retryMessages,
        erroFatal: {
          customerId: item.customerId,
          customerName: item.customerNomeGestta,
          cnpj: item.cnpj,
          etapa,
          tentativas: attempt,
          ultimoErro,
        },
      };
    }
  }

  return {
    item,
    config: null,
    teveRetry,
    retryMessages,
    erroFatal: {
      customerId: item.customerId,
      customerName: item.customerNomeGestta,
      cnpj: item.cnpj,
      etapa,
      tentativas: options.readRetries + 1,
      ultimoErro: "falha desconhecida ao consultar configuracao",
    },
  };
}

async function carregarConfiguracoesDaTarefa(
  api: SyncTaskApi,
  group: GrupoTarefaResolvida,
  resultado: ResultadoTarefa,
  etapa: DiagnosticoHttpEmpresa["etapa"],
  options: Required<ExecuteSyncOptions>,
): Promise<CarregamentoConfiguracoesResultado> {
  const configs = new Map<string, ConfiguracaoResumo>();
  const requestErrors: DiagnosticoHttpEmpresa[] = [];

  const resultados = await mapWithConcurrencyLimit(
    group.itens,
    options.customerTaskConcurrency,
    (item) => carregarConfiguracaoClienteComRetry(api, group.taskId, item, etapa, options),
  );

  let clientesComRetry = 0;

  for (const item of resultados) {
    if (item.teveRetry) clientesComRetry += 1;
    for (const retryMessage of item.retryMessages) {
      logEmpresa(resultado, group, options, etapa, "warn", item.item, retryMessage);
    }
    if (item.config) configs.set(item.item.customerId, item.config);
    if (item.erroFatal) requestErrors.push(item.erroFatal);
  }

  return { configs, requestErrors, clientesComRetry };
}

export function calcularNecessidadesDePatch(
  desiredItems: TarefaPlanilhaResolvida[],
  configs: Map<string, ConfiguracaoResumo>,
): { patches: NecessidadePatch[]; missingConfigs: string[] } {
  const patches: NecessidadePatch[] = [];
  const missingConfigs: string[] = [];

  for (const item of desiredItems) {
    const config = configs.get(item.customerId);
    if (!config) {
      missingConfigs.push(item.customerId);
      patches.push({
        customerId: item.customerId,
        customerName: item.customerNomeGestta,
        desiredUserId: item.userId,
        desiredUserName: item.userNomeGestta,
        currentUserId: undefined,
        approveType: [],
      });
      continue;
    }

    if (config.companyUserId === item.userId) continue;

    patches.push({
      linkId: config.linkId,
      customerId: item.customerId,
      customerName: item.customerNomeGestta,
      desiredUserId: item.userId,
      desiredUserName: item.userNomeGestta,
      currentUserId: config.companyUserId,
      approveType: config.approveType,
    });
  }

  return { patches, missingConfigs };
}

export function agruparPatches(patches: NecessidadePatch[]): GrupoPatchPlanejado[] {
  const grouped = new Map<string, GrupoPatchPlanejado>();

  for (const patch of patches) {
    const groupKey = `${patch.desiredUserId}::${JSON.stringify(patch.approveType)}`;
    const current = grouped.get(groupKey) ?? {
      companyUserId: patch.desiredUserId,
      companyUserName: patch.desiredUserName,
      approveType: patch.approveType,
      ids: [],
      customerIds: [],
    };

    if (patch.linkId) current.ids.push(patch.linkId);
    current.customerIds.push(patch.customerId);
    grouped.set(groupKey, current);
  }

  return [...grouped.values()];
}

function listarPendenciasConfiguracao(
  desiredItems: TarefaPlanilhaResolvida[],
  configs: Map<string, ConfiguracaoResumo>,
): PendenciaConfiguracao[] {
  return desiredItems
    .filter((item) => !configs.has(item.customerId))
    .map((item) => ({
      customerId: item.customerId,
      customerName: item.customerNomeGestta,
      cnpj: item.cnpj,
    }));
}

function listarVinculosEncontradosNaTarefa(
  desiredItems: TarefaPlanilhaResolvida[],
  linksByCustomerId: Map<string, LinkResumo>,
): ClienteResumo[] {
  return desiredItems
    .filter((item) => linksByCustomerId.has(item.customerId))
    .map((item) => {
      const link = linksByCustomerId.get(item.customerId);
      return {
        customerId: item.customerId,
        customerName: item.customerNomeGestta,
        cnpj: item.cnpj,
        linkId: link?.id,
      };
    });
}

function listarClientesAusentesNaTarefa(
  desiredItems: TarefaPlanilhaResolvida[],
  linksByCustomerId: Map<string, LinkResumo>,
): ClienteResumo[] {
  return desiredItems
    .filter((item) => !linksByCustomerId.has(item.customerId))
    .map(toClienteResumo);
}

function listarPendenciasValidacaoResponsavel(
  desiredItems: TarefaPlanilhaResolvida[],
  configs: Map<string, ConfiguracaoResumo>,
): ClienteResumo[] {
  return desiredItems
    .filter((item) => !configs.has(item.customerId))
    .map(toClienteResumo);
}

function listarDivergenciasResponsavel(
  desiredItems: TarefaPlanilhaResolvida[],
  configs: Map<string, ConfiguracaoResumo>,
): DivergenciaResponsavel[] {
  const divergencias: DivergenciaResponsavel[] = [];

  for (const item of desiredItems) {
    const config = configs.get(item.customerId);
    if (!config || config.companyUserId === item.userId) continue;
    divergencias.push({
      customerId: item.customerId,
      customerName: item.customerNomeGestta,
      cnpj: item.cnpj,
      expectedUserId: item.userId,
      expectedUserName: item.userNomeGestta,
      currentUserId: config.companyUserId,
      currentUserName: config.companyUserName,
    });
  }

  return divergencias;
}

function contarResponsaveisValidados(
  desiredItems: TarefaPlanilhaResolvida[],
  configs: Map<string, ConfiguracaoResumo>,
): number {
  let total = 0;

  for (const item of desiredItems) {
    const config = configs.get(item.customerId);
    if (config?.companyUserId === item.userId) total += 1;
  }

  return total;
}

async function aguardarVinculosNaTarefa(
  api: SyncTaskApi,
  group: GrupoTarefaResolvida,
  resultado: ResultadoTarefa,
  options: Required<ExecuteSyncOptions>,
): Promise<{
  linksByCustomerId: Map<string, LinkResumo>;
  vinculosEncontrados: ClienteResumo[];
  clientesAusentes: ClienteResumo[];
}> {
  const desiredCustomerIds = new Set(group.itens.map((item) => item.customerId));
  let linksByCustomerId = new Map<string, LinkResumo>();
  let vinculosEncontrados: ClienteResumo[] = [];
  let clientesAusentes: ClienteResumo[] = [];
  const configurados = new Set<string>();

  for (let attempt = 1; attempt <= options.postAddAttempts; attempt += 1) {
    let currentLinks: LinkResumo[];
    try {
      currentLinks = resumirLinks(await api.listTaskCustomers(group.taskId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      emitLog(resultado, group, options, {
        nivel: attempt === options.postAddAttempts ? "error" : "warn",
        etapa: "aguardar-configuracao",
        mensagem:
          `Tentativa ${attempt}/${options.postAddAttempts}: GET /admin/company/task/${group.taskId}/customer falhou: ${message}.`,
      });
      if (attempt === options.postAddAttempts) {
        throw new Error(`GET /admin/company/task/${group.taskId}/customer falhou: ${message}.`);
      }
      await options.wait(options.pollIntervalMs);
      continue;
    }

    const desiredLinks = currentLinks.filter((item) => desiredCustomerIds.has(item.customerId));
    linksByCustomerId = new Map(desiredLinks.map((item) => [item.customerId, item] as const));
    vinculosEncontrados = listarVinculosEncontradosNaTarefa(group.itens, linksByCustomerId);
    clientesAusentes = listarClientesAusentesNaTarefa(group.itens, linksByCustomerId);
    const sample = clientesAusentes.slice(0, 3).map((item) => item.customerName).join(", ");

    emitLog(resultado, group, options, {
      nivel: clientesAusentes.length === 0 ? "success" : "info",
      etapa: "aguardar-configuracao",
      mensagem:
        clientesAusentes.length === 0
          ? `Tentativa ${attempt}/${options.postAddAttempts}: todos os vinculos apareceram em GET /admin/company/task/${group.taskId}/customer.`
          : `Tentativa ${attempt}/${options.postAddAttempts}: ${vinculosEncontrados.length}/${group.itens.length} vinculo(s) presente(s) na listagem da tarefa, ` +
            `${clientesAusentes.length} ausente(s)` +
            `${sample ? ` (${sample}${clientesAusentes.length > 3 ? ", ..." : ""})` : ""}.`,
    });

    for (const item of group.itens) {
      if (!linksByCustomerId.has(item.customerId) || configurados.has(item.customerId)) continue;
      configurados.add(item.customerId);
      resultado.progressoEtapas!.configuracoesConfirmadas += 1;
      logEmpresa(resultado, group, options, "aguardar-configuracao", "success", item, "vinculo encontrado na tarefa.");
    }

    if (clientesAusentes.length === 0) {
      return {
        linksByCustomerId,
        vinculosEncontrados,
        clientesAusentes: [],
      };
    }

    if (attempt < options.postAddAttempts) {
      await options.wait(options.pollIntervalMs);
    }
  }

  return { linksByCustomerId, vinculosEncontrados, clientesAusentes };
}

async function aguardarResponsaveisAplicados(
  api: SyncTaskApi,
  group: GrupoTarefaResolvida,
  resultado: ResultadoTarefa,
  options: Required<ExecuteSyncOptions>,
): Promise<{
  pendenciasValidacao: ClienteResumo[];
  divergencias: DivergenciaResponsavel[];
  requestErrors: DiagnosticoHttpEmpresa[];
}> {
  let pendenciasValidacao: ClienteResumo[] = [];
  let divergencias: DivergenciaResponsavel[] = [];
  const validados = new Set<string>();

  for (let attempt = 1; attempt <= options.postPatchAttempts; attempt += 1) {
    const carregamento = await carregarConfiguracoesDaTarefa(
      api,
      group,
      resultado,
      "aguardar-propagacao",
      options,
    );
    const configs = carregamento.configs;
    pendenciasValidacao = listarPendenciasValidacaoResponsavel(group.itens, configs);
    divergencias = listarDivergenciasResponsavel(group.itens, configs);
    const samplePendencias = pendenciasValidacao.slice(0, 3).map((item) => item.customerName).join(", ");
    const sampleDivergencias = divergencias.slice(0, 3).map((item) => item.customerName).join(", ");
    const validadas = contarResponsaveisValidados(group.itens, configs);

    emitLog(resultado, group, options, {
      nivel:
        carregamento.requestErrors.length > 0
          ? "error"
          : divergencias.length === 0 && pendenciasValidacao.length === 0
            ? "success"
            : "info",
      etapa: "aguardar-propagacao",
      mensagem:
        carregamento.requestErrors.length > 0
          ? `Tentativa ${attempt}/${options.postPatchAttempts}: ${carregamento.requestErrors.length} empresa(s) com falha definitiva de leitura, ` +
            `${validadas}/${group.itens.length} validada(s) e ${carregamento.clientesComRetry} com retry.`
          : divergencias.length === 0 && pendenciasValidacao.length === 0
          ? `Tentativa ${attempt}/${options.postPatchAttempts}: responsavel validado para todas as empresas no endpoint do cliente.`
          : `Tentativa ${attempt}/${options.postPatchAttempts}: ${validadas}/${group.itens.length} validada(s), ` +
            `${divergencias.length} divergente(s), ${pendenciasValidacao.length} ainda nao visivel(is) em GET /admin/customer/:customerId/company/task ` +
            `e ${carregamento.clientesComRetry} com retry` +
            `${samplePendencias || sampleDivergencias
              ? ` (${samplePendencias || sampleDivergencias}${(samplePendencias ? pendenciasValidacao.length : divergencias.length) > 3 ? ", ..." : ""})`
              : ""}.`,
    });

    if (carregamento.requestErrors.length > 0) {
      return {
        pendenciasValidacao,
        divergencias,
        requestErrors: carregamento.requestErrors,
      };
    }

    for (const item of group.itens) {
      if (pendenciasValidacao.some((pendencia) => pendencia.customerId === item.customerId)) continue;
      if (divergencias.some((divergencia) => divergencia.customerId === item.customerId)) continue;
      if (validados.has(item.customerId)) continue;
      validados.add(item.customerId);
      resultado.progressoEtapas!.responsaveisValidados += 1;
      logEmpresa(resultado, group, options, "aguardar-propagacao", "success", item, `responsavel validado no endpoint do cliente: ${item.userNomeGestta}.`);
    }

    if (divergencias.length === 0 && pendenciasValidacao.length === 0) {
      return { pendenciasValidacao: [], divergencias: [], requestErrors: [] };
    }

    if (attempt < options.postPatchAttempts) {
      await options.wait(options.pollIntervalMs);
    }
  }

  return { pendenciasValidacao, divergencias, requestErrors: [] };
}

function criarResultadoBase(group: GrupoTarefaResolvida, dryRun: boolean): ResultadoTarefa {
  return {
    tarefaPlanilha: group.taskNomePlanilha,
    tarefaGestta: group.taskNomeGestta,
    taskId: group.taskId,
    dryRun,
    sucesso: false,
    totalEmpresasPlanilha: group.itens.length,
    vinculosAtuais: 0,
    extras: 0,
    inclusoes: 0,
    patchLinks: 0,
    patchGrupos: 0,
    mensagem: "",
    detalhes: [],
    responsaveisResolvidos: getResponsaveisResolvidos(group),
    vinculosAtuaisDetalhes: [],
    extrasPlanejados: [],
    inclusoesSolicitadas: [],
    vinculosEncontradosNaTarefa: [],
    clientesAusentesNaTarefa: [],
    pendenciasConfiguracao: [],
    pendenciasValidacaoResponsavel: [],
    divergenciasResponsavel: [],
    extrasRemovidos: [],
    falhasHttp: [],
    timeline: [],
    progressoEtapas: createProgressoResumo(),
  };
}

function failResultado(
  resultado: ResultadoTarefa,
  etapa: EtapaFalha,
  message: string,
  error?: unknown,
): ResultadoTarefa {
  const detail = error instanceof Error ? error.message : String(error ?? "");
  resultado.etapaFalha = etapa;
  resultado.mensagem = message;
  if (detail && detail !== message) resultado.detalhes.push(detail);
  return resultado;
}

function getDefaultOptions(options?: ExecuteSyncOptions): Required<ExecuteSyncOptions> {
  return {
    postAddAttempts: options?.postAddAttempts ?? DEFAULT_POST_ADD_ATTEMPTS,
    postPatchAttempts: options?.postPatchAttempts ?? DEFAULT_POST_PATCH_ATTEMPTS,
    pollIntervalMs: options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS,
    readRetries: options?.readRetries ?? DEFAULT_READ_RETRIES,
    readRetryDelayMs: options?.readRetryDelayMs ?? DEFAULT_READ_RETRY_DELAY_MS,
    customerTaskConcurrency: options?.customerTaskConcurrency ?? DEFAULT_CUSTOMER_TASK_CONCURRENCY,
    wait: options?.wait ?? delay,
    taskIndex: options?.taskIndex ?? 0,
    taskTotal: options?.taskTotal ?? 0,
    emitLog: options?.emitLog ?? (() => undefined),
  };
}

export async function executarSincronizacaoTarefa(
  api: SyncTaskApi,
  group: GrupoTarefaResolvida,
  dryRun: boolean,
  options?: ExecuteSyncOptions,
): Promise<ResultadoTarefa> {
  const resultado = criarResultadoBase(group, dryRun);
  const resolvedOptions = getDefaultOptions(options);

  let currentLinks: LinkResumo[];
  try {
    currentLinks = resumirLinks(await api.listTaskCustomers(group.taskId));
  } catch (error) {
    return failResultado(
      resultado,
      "listarVinculosAtuais",
      `Erro ao listar vinculos atuais da tarefa ${group.taskNomePlanilha}.`,
      error,
    );
  }

  const diffInicial = calcularDiffVinculos(group.itens, currentLinks);
  resultado.vinculosAtuais = currentLinks.length;
  resultado.extras = diffInicial.extras.length;
  resultado.inclusoes = diffInicial.missing.length;
  resultado.vinculosAtuaisDetalhes = currentLinks;
  resultado.extrasPlanejados = diffInicial.extras;
  resultado.inclusoesSolicitadas = diffInicial.missing.map(toClienteResumo);
  const currentLinksByCustomerId = new Map(
    currentLinks.map((item) => [item.customerId, item] as const),
  );
  resultado.vinculosEncontradosNaTarefa = listarVinculosEncontradosNaTarefa(group.itens, currentLinksByCustomerId);
  resultado.clientesAusentesNaTarefa = listarClientesAusentesNaTarefa(group.itens, currentLinksByCustomerId);
  resultado.pendenciasConfiguracao = resultado.clientesAusentesNaTarefa.map((item) => ({
    customerId: item.customerId,
    customerName: item.customerName,
    cnpj: item.cnpj,
  }));
  emitLog(resultado, group, resolvedOptions, {
    nivel: "info",
    etapa: "iniciar",
    mensagem:
      `Iniciando tarefa com ${group.itens.length} empresa(s): ` +
      `${resultado.vinculosAtuais} vinculo(s) atual(is), ${resultado.inclusoes} inclusao(oes), ` +
      `${resultado.extras} extra(s) e ${resultado.patchLinks} patch(es) previstos ate aqui.`,
  });
  emitLog(resultado, group, resolvedOptions, {
    nivel: "info",
    etapa: "listar-vinculos",
    mensagem:
      `Diff inicial: atuais=${resultado.vinculosAtuais}, extras=${resultado.extras}, inclusoes=${resultado.inclusoes}.`,
  });

  if (dryRun) {
    let configs: Map<string, ConfiguracaoResumo>;
    let configsValidacao: Map<string, ConfiguracaoResumo>;

    try {
      const carregamento = await carregarConfiguracoesDaTarefa(
        api,
        group,
        resultado,
        "aguardar-configuracao",
        resolvedOptions,
      );
      configs = carregamento.configs;
      resultado.falhasHttp = carregamento.requestErrors;
      if (carregamento.requestErrors.length > 0) {
        resultado.progressoEtapas!.empresasComErro += carregamento.requestErrors.length;
        resultado.detalhes.push(
          ...carregamento.requestErrors.map((item) => formatarDiagnosticoHttp(item)),
        );
        return failResultado(
          resultado,
          "aguardarConfiguracoes",
          `Falha ao consultar configuracoes de ${carregamento.requestErrors.length} empresa(s) no dry-run da tarefa ${group.taskNomePlanilha}.`,
        );
      }
      configsValidacao = carregamento.configs;
      configs = mesclarConfigsDaTarefa(
        construirConfigsBasicasDaTarefa(group, diffInicial.presentes),
        carregamento.configs,
      );
    } catch (error) {
      return failResultado(
        resultado,
        "aguardarConfiguracoes",
        `Erro ao carregar configuracoes da tarefa ${group.taskNomePlanilha} no dry-run.`,
        error,
      );
    }

    const { patches } = calcularNecessidadesDePatch(group.itens, configs);
    const patchGroups = agruparPatches(patches);
    resultado.patchLinks = patches.length;
    resultado.patchGrupos = patchGroups.length;
    resultado.vinculosFinais = group.itens.length;
    resultado.pendenciasValidacaoResponsavel = listarPendenciasValidacaoResponsavel(group.itens, configsValidacao);
    resultado.divergenciasResponsavel = listarDivergenciasResponsavel(group.itens, configs);
    resultado.sucesso = true;
    resultado.mensagem =
      `Dry-run: ${resultado.extras} remocoes, ${resultado.inclusoes} inclusoes e ` +
      `${resultado.patchLinks} patches previstos.`;
    resultado.detalhes.push(
      `Tarefa ${group.taskNomePlanilha}: atual=${resultado.vinculosAtuais}, desejado=${group.itens.length}.`,
    );
    emitLog(resultado, group, resolvedOptions, {
      nivel: "success",
      etapa: "finalizar",
      mensagem:
        `Dry-run concluido: ${resultado.inclusoes} inclusao(oes), ${resultado.extras} remocao(oes) e ` +
        `${resultado.patchLinks} patch(es) previstos.`,
    });
    return resultado;
  }

  try {
    emitLog(resultado, group, resolvedOptions, {
      nivel: "info",
      etapa: "adicionar-empresas",
      mensagem: `Enviando ${resultado.inclusoes} inclusao(oes) em lote.`,
    });
    for (const item of diffInicial.missing) {
      resultado.progressoEtapas!.inclusoesSolicitadas += 1;
      logEmpresa(resultado, group, resolvedOptions, "adicionar-empresas", "info", item, "inclusao solicitada.");
    }
    for (const chunk of chunkArray(diffInicial.missing.map((item) => item.customerId), CHUNK_SIZE)) {
      const chunkItems = diffInicial.missing.filter((item) => chunk.includes(item.customerId));
      emitLog(resultado, group, resolvedOptions, {
        nivel: "info",
        etapa: "adicionar-empresas",
        mensagem:
          `Chunk de inclusao enviado com ${chunk.length} empresa(s)` +
          `${chunkItems.length > 0 ? `: ${chunkItems.map((item) => item.customerNomeGestta).slice(0, 3).join(", ")}${chunkItems.length > 3 ? ", ..." : ""}` : ""}.`,
      });
      await api.addCustomersToTask(group.taskId, chunk);
    }
  } catch (error) {
    resultado.progressoEtapas!.empresasComErro += diffInicial.missing.length;
    return failResultado(
      resultado,
      "adicionarAusentes",
      `Erro ao adicionar empresas ausentes na tarefa ${group.taskNomePlanilha}.`,
      error,
    );
  }

  let patchGroups: GrupoPatchPlanejado[];
  try {
    const aguardado = await aguardarVinculosNaTarefa(api, group, resultado, resolvedOptions);
    resultado.vinculosEncontradosNaTarefa = aguardado.vinculosEncontrados;
    resultado.clientesAusentesNaTarefa = aguardado.clientesAusentes;
    resultado.pendenciasConfiguracao = aguardado.clientesAusentes.map((item) => ({
      customerId: item.customerId,
      customerName: item.customerName,
      cnpj: item.cnpj,
    }));

    if ((resultado.clientesAusentesNaTarefa?.length ?? 0) > 0) {
      resultado.progressoEtapas!.empresasComErro += resultado.clientesAusentesNaTarefa.length;
      resultado.detalhes.push(
        ...resultado.clientesAusentesNaTarefa!.map(
          (item) => `${item.customerName}: vinculo ainda ausente em GET /admin/company/task/${group.taskId}/customer (${item.customerId}).`,
        ),
      );
      for (const item of resultado.clientesAusentesNaTarefa) {
        logEmpresa(resultado, group, resolvedOptions, "aguardar-configuracao", "error", item, "vinculo ainda nao apareceu na listagem da tarefa.");
      }
      return failResultado(
        resultado,
        "aguardarConfiguracoes",
        `A tarefa ${group.taskNomePlanilha} nao apareceu em GET /admin/company/task/${group.taskId}/customer para todos os clientes apos a sincronizacao.`,
      );
    }

    const carregamento = await carregarConfiguracoesDaTarefa(
      api,
      group,
      resultado,
      "aguardar-configuracao",
      resolvedOptions,
    );
    resultado.falhasHttp = carregamento.requestErrors;

    if (carregamento.requestErrors.length > 0) {
      resultado.progressoEtapas!.empresasComErro += carregamento.requestErrors.length;
      resultado.detalhes.push(
        ...carregamento.requestErrors.map((item) => formatarDiagnosticoHttp(item)),
      );
      for (const item of carregamento.requestErrors) {
        logEmpresa(
          resultado,
          group,
          resolvedOptions,
          item.etapa,
          "error",
          item,
          `consulta de configuracao falhou apos ${item.tentativas} tentativa(s): ${item.ultimoErro}.`,
        );
      }
      return failResultado(
        resultado,
        "aguardarConfiguracoes",
        `Falha ao consultar GET /admin/customer/:customerId/company/task para ${carregamento.requestErrors.length} empresa(s) antes do patch da tarefa ${group.taskNomePlanilha}.`,
      );
    }

    resultado.pendenciasConfiguracao = listarPendenciasConfiguracao(group.itens, carregamento.configs);
    if (resultado.pendenciasConfiguracao.length > 0) {
      resultado.progressoEtapas!.empresasComErro += resultado.pendenciasConfiguracao.length;
      resultado.detalhes.push(
        ...resultado.pendenciasConfiguracao.map(
          (item) =>
            `${item.customerName}: configuracao da tarefa ainda nao visivel em GET /admin/customer/${item.customerId}/company/task.`,
        ),
      );
      for (const item of resultado.pendenciasConfiguracao) {
        logEmpresa(
          resultado,
          group,
          resolvedOptions,
          "aguardar-configuracao",
          "error",
          item,
          "configuracao da tarefa ainda nao visivel no endpoint do cliente.",
        );
      }
      return failResultado(
        resultado,
        "aguardarConfiguracoes",
        `A configuracao da tarefa ${group.taskNomePlanilha} ainda nao apareceu em GET /admin/customer/:customerId/company/task para ${resultado.pendenciasConfiguracao.length} empresa(s) apos a sincronizacao.`,
      );
    }

    const { patches } = calcularNecessidadesDePatch(group.itens, carregamento.configs);
    patchGroups = agruparPatches(patches);
    resultado.patchLinks = patches.length;
    resultado.patchGrupos = patchGroups.length;
    emitLog(resultado, group, resolvedOptions, {
      nivel: "info",
      etapa: "alterar-responsavel",
      mensagem: `Planejados ${resultado.patchLinks} patch(es) agrupados em ${resultado.patchGrupos} lote(s).`,
    });
    if (patchGroups.length === 0) {
      emitLog(resultado, group, resolvedOptions, {
        nivel: "success",
        etapa: "alterar-responsavel",
        mensagem: "Nenhum patch necessario: responsaveis ja conferem no endpoint do cliente.",
      });
    }
  } catch (error) {
    return failResultado(
      resultado,
      "aguardarConfiguracoes",
      `Erro ao aguardar configuracoes da tarefa ${group.taskNomePlanilha}.`,
      error,
    );
  }

  try {
    for (const [patchIndex, patchGroup] of patchGroups.entries()) {
      if (patchGroup.ids.length === 0) continue;
      const patchItems = group.itens.filter((item) => patchGroup.customerIds.includes(item.customerId));
      emitLog(resultado, group, resolvedOptions, {
        nivel: "info",
        etapa: "alterar-responsavel",
        mensagem:
          `Chunk de patch enviado para ${patchGroup.ids.length} vinculo(s), responsavel ${patchGroup.companyUserName}.`,
      });
      for (const item of patchItems) {
        logEmpresa(
          resultado,
          group,
          resolvedOptions,
          "alterar-responsavel",
          "info",
          item,
          `responsavel planejado: ${item.userNomeGestta}.`,
        );
      }
      try {
        await api.patchTaskOwners({
          ids: patchGroup.ids,
          company_user: patchGroup.companyUserId,
          approve_type: patchGroup.approveType,
        });
      } catch (error) {
        const detail = descreverErroPatch(error, patchGroup);
        resultado.progressoEtapas!.empresasComErro += patchItems.length;
        emitLog(resultado, group, resolvedOptions, {
          nivel: "error",
          etapa: "alterar-responsavel",
          mensagem:
            `Lote de patch ${patchIndex + 1}/${patchGroups.length} falhou para ${patchGroup.companyUserName}: ${detail}`,
        });
        return failResultado(
          resultado,
          "alterarResponsavel",
          `Erro ao alterar responsavel da tarefa ${group.taskNomePlanilha} no lote ${patchIndex + 1}/${patchGroups.length} (${patchGroup.ids.length} vinculo(s), responsavel ${patchGroup.companyUserName}).`,
          new Error(detail),
        );
      }
    }
  } catch (error) {
    return failResultado(
      resultado,
      "alterarResponsavel",
      `Erro ao alterar responsavel da tarefa ${group.taskNomePlanilha}.`,
      error,
    );
  }

  try {
    const aguardado = await aguardarResponsaveisAplicados(api, group, resultado, resolvedOptions);
    resultado.pendenciasValidacaoResponsavel = aguardado.pendenciasValidacao;
    resultado.divergenciasResponsavel = aguardado.divergencias;
    resultado.falhasHttp = aguardado.requestErrors;
  } catch (error) {
    return failResultado(
      resultado,
      "aguardarResponsavel",
      `Erro ao validar responsaveis da tarefa ${group.taskNomePlanilha}.`,
      error,
    );
  }

  if ((resultado.falhasHttp?.length ?? 0) > 0) {
    resultado.progressoEtapas!.empresasComErro += resultado.falhasHttp.length;
    resultado.detalhes.push(
      ...resultado.falhasHttp.map((item) => formatarDiagnosticoHttp(item)),
    );
    for (const item of resultado.falhasHttp) {
      logEmpresa(
        resultado,
        group,
        resolvedOptions,
        item.etapa,
        "error",
        item,
        `consulta de configuracao falhou apos ${item.tentativas} tentativa(s): ${item.ultimoErro}.`,
      );
    }
    return failResultado(
      resultado,
      "aguardarResponsavel",
      `Falha ao consultar GET /admin/customer/:customerId/company/task para ${resultado.falhasHttp.length} empresa(s) durante a validacao da tarefa ${group.taskNomePlanilha}.`,
    );
  }

  if ((resultado.pendenciasValidacaoResponsavel?.length ?? 0) > 0) {
    resultado.progressoEtapas!.empresasComErro += resultado.pendenciasValidacaoResponsavel.length;
    resultado.detalhes.push(
      ...resultado.pendenciasValidacaoResponsavel.map(
        (item) =>
          `${item.customerName}: responsavel ainda nao visivel em GET /admin/customer/${item.customerId}/company/task.`,
      ),
    );
    for (const item of resultado.pendenciasValidacaoResponsavel) {
      logEmpresa(
        resultado,
        group,
        resolvedOptions,
        "aguardar-propagacao",
        "error",
        item,
        "responsavel ainda nao visivel no endpoint do cliente.",
      );
    }
    return failResultado(
      resultado,
      "aguardarResponsavel",
      `Validacao do responsavel ainda pendente em GET /admin/customer/:customerId/company/task para ${resultado.pendenciasValidacaoResponsavel.length} empresa(s) da tarefa ${group.taskNomePlanilha}.`,
    );
  }

  if ((resultado.divergenciasResponsavel?.length ?? 0) > 0) {
    resultado.progressoEtapas!.empresasComErro += resultado.divergenciasResponsavel.length;
    resultado.detalhes.push(
      ...resultado.divergenciasResponsavel!.map(
        (item) =>
          `${item.customerName}: esperado "${item.expectedUserName}", ` +
          `obtido "${item.currentUserName ?? "sem responsavel"}".`,
      ),
    );
    for (const item of resultado.divergenciasResponsavel) {
      logEmpresa(
        resultado,
        group,
        resolvedOptions,
        "aguardar-propagacao",
        "error",
        item,
        `responsavel divergente: esperado ${item.expectedUserName}, obtido ${item.currentUserName ?? "sem responsavel"}.`,
      );
    }
    return failResultado(
      resultado,
      "aguardarResponsavel",
      `Validacao final falhou para a tarefa ${group.taskNomePlanilha}.`,
    );
  }

  const extrasRemovidos: LinkResumo[] = [];
  try {
    const extrasById = new Map(diffInicial.extras.map((item) => [item.id, item] as const));
    emitLog(resultado, group, resolvedOptions, {
      nivel: "info",
      etapa: "remover-extras",
      mensagem: `Removendo ${diffInicial.extras.length} vinculo(s) extra(s).`,
    });
    for (const chunk of chunkArray(diffInicial.extras.map((item) => item.id), CHUNK_SIZE)) {
      emitLog(resultado, group, resolvedOptions, {
        nivel: "info",
        etapa: "remover-extras",
        mensagem: `Chunk de remocao enviado com ${chunk.length} vinculo(s).`,
      });
      await api.deleteGroupCustomers(chunk);
      for (const id of chunk) {
        const extra = extrasById.get(id);
        if (extra) {
          extrasRemovidos.push(extra);
          logEmpresa(resultado, group, resolvedOptions, "remover-extras", "success", extra, "vinculo extra removido.");
        }
      }
    }
  } catch (error) {
    resultado.extrasRemovidos = extrasRemovidos;
    return failResultado(
      resultado,
      "removerExtras",
      `Erro ao remover vinculos extras da tarefa ${group.taskNomePlanilha}.`,
      error,
    );
  }

  resultado.extrasRemovidos = extrasRemovidos;
  resultado.vinculosFinais = group.itens.length;

  try {
    const finalLinks = resumirLinks(await api.listTaskCustomers(group.taskId));
    if (finalLinks.length > 0) resultado.vinculosFinais = finalLinks.length;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    resultado.detalhes.push(`Nao foi possivel recarregar os vinculos finais: ${message}`);
  }

  resultado.sucesso = true;
  resultado.mensagem =
    `Aplicado com sucesso: ${resultado.extras} remocoes, ${resultado.inclusoes} inclusoes e ` +
    `${resultado.patchLinks} patches.`;
  emitLog(resultado, group, resolvedOptions, {
    nivel: "success",
    etapa: "finalizar",
    mensagem:
      `Tarefa concluida: ${resultado.progressoEtapas?.responsaveisValidados ?? 0}/${group.itens.length} empresa(s) validada(s), ` +
      `${resultado.extrasRemovidos?.length ?? 0} extra(s) removido(s).`,
  });
  return resultado;
}
