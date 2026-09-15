/**
 * Troca DP nas 16 empresas pró-labore:
 * adiciona DIRF, DCTFWEB Setor Pessoal e Folha G1 com o dono da planilha;
 * remove TRANSMISSÃO DA DCTFWEB SEM MOVIMENTO JAN/DEZ.
 *
 *   npx ts-node scripts/aplicar-dp-pro-labore.ts
 *   npx ts-node scripts/aplicar-dp-pro-labore.ts --dry-run
 *   npx ts-node scripts/aplicar-dp-pro-labore.ts --apply
 *   npx ts-node scripts/aplicar-dp-pro-labore.ts --rollback relatorios/backup_....json
 */
import fs from "fs";
import path from "path";
import { AxiosInstance, isAxiosError } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  adicionarClientesNaTarefa,
  customerIdOf,
  listarClientesDaTarefa,
  listarTarefasDoCliente,
  listarTarefasRecorrentes,
  patchGroupCustomerConfig,
  removerGroupCustomers,
} from "../src/endpoints";
import { CustomerTaskConfig, GesttaTask, TaskCustomerLink } from "../src/types";

type RichTaskLink = TaskCustomerLink & {
  company_user?: string | { _id?: string; name?: string } | null;
  active?: boolean;
};

const DEFAULT_EXCEL = path.join(
  __dirname,
  "..",
  "..",
  "relatorios",
  "levantamento_dp_pro_labore_2026-08-27.xlsx",
);

const TASK_DIRF = "CONSULTAR EXTRATOR DIRF";
const TASK_DCTFWEB = "DCTFWEB - SETOR PESSOAL";
const TASK_FOLHA_G1 = "FOLHA DE PAGAMENTO GERAL - GRUPO 1";
const TASK_JAN = "TRANSMISSÃO DA DCTFWEB SEM MOVIMENTO - JAN";
const TASK_DEZ = "TRANSMISSÃO DA DCTFWEB SEM MOVIMENTO - DEZ";

const ADD_NAMES = [TASK_DIRF, TASK_DCTFWEB, TASK_FOLHA_G1] as const;
const REMOVE_NAMES = [TASK_JAN, TASK_DEZ] as const;

const FALLBACK_RESPONSAVEL: Record<string, string> = {
  "401": "Juliana Pereira",
  "706": "Juliana Barreto",
};

const DEFAULT_RESPONSAVEL = "Kamilly Vitoria";
const LIMIT = 500;
const POLL_ATTEMPTS = 15;
const POLL_MS = 1500;

type ApplyStatus = "ok" | "skipped" | "failed" | "planned";

interface PlanilhaEmpresa {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  documentoDigits: string;
  responsavelPlanilha: string;
  customerIdPlanilha?: string;
}

interface ClienteGestta {
  _id: string;
  name: string;
  cnpj?: string;
  code?: string | number;
  active?: boolean;
}

interface UsuarioGestta {
  _id: string;
  name: string;
  active?: boolean;
}

interface RemovedLink {
  linkId: string;
  taskId: string;
  taskName: string;
  companyUserId?: string;
  companyUserName?: string;
  approve?: boolean;
  approvers: string[];
  approveType: string[];
  applyStatus?: ApplyStatus;
  applyDetail?: string;
}

interface AddedTarget {
  taskId: string;
  taskName: string;
  alreadyLinked: boolean;
  linkId?: string;
  newLinkId?: string;
  action: "add" | "skip";
  applyStatus?: ApplyStatus;
  applyDetail?: string;
  patchedUser?: boolean;
}

interface Verificacao {
  temDirf: boolean;
  temDctfweb: boolean;
  temFolhaG1: boolean;
  donoDirf: string;
  donoDctfweb: string;
  donoFolhaG1: string;
  aindaTemJan: boolean;
  aindaTemDez: boolean;
  ok: boolean;
  detalhe: string;
}

interface EmpresaPlan {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  customerId?: string;
  codigoGestta?: string;
  nomeGestta?: string;
  resolveStatus: "ok" | "nao_encontrada" | "ambiguo" | "erro";
  detalhe: string;
  responsavelPlanilha: string;
  responsibleId?: string;
  responsibleName?: string;
  removedSemMovimento: RemovedLink[];
  addedTargets: AddedTarget[];
  snapshotPessoal: Array<{
    linkId: string;
    taskId: string;
    taskName: string;
    companyUserId?: string;
    companyUserName?: string;
  }>;
  applyStatus?: ApplyStatus;
  applyDetail?: string;
  problemas: string[];
  verificacao?: Verificacao;
}

interface BackupFile {
  generatedAt: string;
  mode: "apply" | "dry-run";
  sourceExcel: string;
  addTaskIds: Record<string, string>;
  removeTaskIds: Record<string, string>;
  empresas: EmpresaPlan[];
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

function axiosErrorDetail(error: unknown): string {
  if (!isAxiosError(error)) {
    return error instanceof Error ? error.message : String(error);
  }
  const status = error.response?.status;
  const data = error.response?.data;
  let body = "";
  try {
    body = data == null ? "" : JSON.stringify(data).slice(0, 500);
  } catch {
    body = "";
  }
  return `HTTP ${status ?? "?"}: ${error.message}${body ? ` ${body}` : ""}`;
}

function taskIdOf(config: CustomerTaskConfig): string {
  const task = config.company_task;
  if (!task) return "";
  return typeof task === "string" ? task : task._id;
}

function taskNameOf(config: CustomerTaskConfig): string {
  const task = config.company_task;
  if (!task || typeof task === "string") return "";
  return task.name ?? "";
}

function userIdOf(config: CustomerTaskConfig): string | undefined {
  const user = config.company_user;
  if (!user) return undefined;
  return typeof user === "string" ? user : user._id;
}

function userNameOf(config?: CustomerTaskConfig | RichTaskLink): string | undefined {
  if (!config) return undefined;
  const user = config.company_user;
  if (!user || typeof user === "string") return undefined;
  return user.name;
}

function userIdFromLink(link?: CustomerTaskConfig | RichTaskLink): string | undefined {
  if (!link) return undefined;
  const user = link.company_user;
  if (!user) return undefined;
  return typeof user === "string" ? user : user._id;
}

async function indexarVinculosDaTarefa(
  client: AxiosInstance,
  taskId: string,
): Promise<Map<string, RichTaskLink>> {
  const links = (await listarClientesDaTarefa(client, taskId)) as RichTaskLink[];
  const byCustomer = new Map<string, RichTaskLink>();
  for (const link of links) {
    const customerId = customerIdOf(link);
    if (customerId) byCustomer.set(customerId, link);
  }
  return byCustomer;
}

function codeOf(cliente: ClienteGestta): string {
  if (cliente.code == null || cliente.code === "") return "";
  return String(cliente.code).trim();
}

function parseArgs(argv: string[]): {
  apply: boolean;
  dryRun: boolean;
  excelPath: string;
  reportsDir: string;
  rollbackPath?: string;
} {
  const rollbackFlag = argv.findIndex((item) => item === "--rollback");
  const applyFlag = argv.includes("--apply");
  const dryRunFlag = argv.includes("--dry-run");
  return {
    apply: applyFlag && !dryRunFlag && rollbackFlag < 0,
    dryRun: !applyFlag || dryRunFlag,
    excelPath: path.resolve(getArgValue(argv, "--excel") || DEFAULT_EXCEL),
    reportsDir: path.resolve(
      getArgValue(argv, "--reports-dir") ||
        path.join(__dirname, "..", "..", "relatorios"),
    ),
    rollbackPath:
      rollbackFlag >= 0 && argv[rollbackFlag + 1]
        ? path.resolve(argv[rollbackFlag + 1])
        : undefined,
  };
}

function isTransientHttpError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 502 || status === 503 || status === 504 || status === 429;
}

async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientHttpError(error) || attempt === attempts) throw error;
      const waitMs = attempt * 2000;
      console.warn(
        `  retry ${attempt}/${attempts} ${label}: ${axiosErrorDetail(error)} (aguardando ${waitMs}ms)`,
      );
      await sleep(waitMs);
    }
  }
  throw lastError;
}

function headerIndex(headers: unknown[], ...candidates: string[]): number {
  const keys = candidates.map((item) => normalizeText(item));
  for (let i = 0; i < headers.length; i += 1) {
    const current = normalizeText(headers[i]);
    if (keys.includes(current)) return i;
  }
  return -1;
}

function cell(row: unknown[], index: number): string {
  if (index < 0) return "";
  const value = row[index];
  if (value == null) return "";
  return String(value).trim();
}

function lerPlanilha(excelPath: string): PlanilhaEmpresa[] {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Planilha nao encontrada: ${excelPath}`);
  }
  const workbook = XLSX.readFile(excelPath);
  const preferred =
    workbook.SheetNames.find((name) =>
      ["empresas", "pro labore", "pro-labore"].includes(normalizeText(name).toLowerCase()),
    ) ?? workbook.SheetNames[0];
  const sheet = workbook.Sheets[preferred];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  if (rows.length < 2) return [];
  const headers = rows[0] ?? [];
  const colCodigo = headerIndex(headers, "Codigo", "Código");
  const colEmpresa = headerIndex(headers, "Empresa planilha", "Empresa");
  const colCnpj = headerIndex(headers, "CNPJ");
  const colResponsavel = headerIndex(
    headers,
    "Responsavel sugerido",
    "Responsável sugerido",
    "Responsavel interno",
    "Responsável interno",
  );
  const colCustomer = headerIndex(headers, "Customer ID");
  const empresas: PlanilhaEmpresa[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const codigo = cell(row, colCodigo >= 0 ? colCodigo : 0);
    const nome = cell(row, colEmpresa >= 0 ? colEmpresa : 1);
    const documento = cell(row, colCnpj >= 0 ? colCnpj : 2);
    if (!codigo && !nome && !documento) continue;
    const sugerido = cell(row, colResponsavel);
    empresas.push({
      codigoPlanilha: codigo,
      nomePlanilha: nome,
      documento,
      documentoDigits: digitsOnly(documento),
      responsavelPlanilha:
        sugerido ||
        FALLBACK_RESPONSAVEL[codigo] ||
        DEFAULT_RESPONSAVEL,
      customerIdPlanilha: cell(row, colCustomer) || undefined,
    });
  }
  return empresas;
}

async function listarClientes(
  client: AxiosInstance,
  active?: boolean,
): Promise<ClienteGestta[]> {
  const clientes: ClienteGestta[] = [];
  let page = 1;
  for (;;) {
    const params: Record<string, string | number | boolean> = {
      limit: LIMIT,
      page,
      search: "",
    };
    if (active !== undefined) params.active = active;
    const { data } = await client.get<{
      docs?: ClienteGestta[];
      hasNextPage?: boolean;
    }>("/admin/customer", { params });
    clientes.push(...(data.docs ?? []));
    if (!data.hasNextPage) break;
    page += 1;
  }
  return clientes;
}

async function listarFuncionarios(
  client: AxiosInstance,
): Promise<UsuarioGestta[]> {
  const first = await client.get<
    UsuarioGestta[] | { docs?: UsuarioGestta[]; hasNextPage?: boolean }
  >("/admin/company/user", {
    params: { active: true, limit: LIMIT, page: 1 },
  });
  if (Array.isArray(first.data)) return first.data;
  const usuarios = [...(first.data.docs ?? [])];
  let page = 2;
  let hasNextPage = Boolean(first.data.hasNextPage);
  while (hasNextPage) {
    const { data } = await client.get<{
      docs?: UsuarioGestta[];
      hasNextPage?: boolean;
    }>("/admin/company/user", {
      params: { active: true, limit: LIMIT, page },
    });
    usuarios.push(...(data.docs ?? []));
    hasNextPage = Boolean(data.hasNextPage);
    page += 1;
  }
  return usuarios;
}

function indexarClientes(clientes: ClienteGestta[]): {
  byId: Map<string, ClienteGestta>;
  byDoc: Map<string, ClienteGestta[]>;
  byCode: Map<string, ClienteGestta[]>;
} {
  const byId = new Map<string, ClienteGestta>();
  const byDoc = new Map<string, ClienteGestta[]>();
  const byCode = new Map<string, ClienteGestta[]>();
  for (const cliente of clientes) {
    if (!byId.has(cliente._id)) byId.set(cliente._id, cliente);
    const doc = digitsOnly(cliente.cnpj);
    if (doc) {
      const list = byDoc.get(doc) ?? [];
      list.push(cliente);
      byDoc.set(doc, list);
    }
    const code = codeOf(cliente);
    if (code) {
      const list = byCode.get(code) ?? [];
      list.push(cliente);
      byCode.set(code, list);
    }
  }
  return { byId, byDoc, byCode };
}

function escolherUnico(
  matches: ClienteGestta[],
): { ok: true; cliente: ClienteGestta } | { ok: false; detalhe: string } {
  if (matches.length === 0) {
    return { ok: false, detalhe: "Nenhum cliente correspondente" };
  }
  if (matches.length === 1) return { ok: true, cliente: matches[0] };
  const ativos = matches.filter((item) => item.active !== false);
  if (ativos.length === 1) return { ok: true, cliente: ativos[0] };
  const ids = [...new Set(matches.map((item) => item._id))];
  if (ids.length === 1) return { ok: true, cliente: matches[0] };
  return {
    ok: false,
    detalhe: `Ambiguo: ${matches.length} clientes (${ids.slice(0, 5).join(", ")})`,
  };
}

function resolverCliente(
  empresa: PlanilhaEmpresa,
  indexes: ReturnType<typeof indexarClientes>,
):
  | { status: "ok"; cliente: ClienteGestta; detalhe: string }
  | { status: "nao_encontrada" | "ambiguo"; detalhe: string } {
  if (empresa.customerIdPlanilha) {
    const byId = indexes.byId.get(empresa.customerIdPlanilha);
    if (byId) {
      return { status: "ok", cliente: byId, detalhe: "Resolvido por Customer ID" };
    }
  }
  if (empresa.documentoDigits) {
    const byDoc = indexes.byDoc.get(empresa.documentoDigits) ?? [];
    const picked = escolherUnico(byDoc);
    if (picked.ok) {
      return {
        status: "ok",
        cliente: picked.cliente,
        detalhe: "Resolvido por documento",
      };
    }
    if (byDoc.length > 1) return { status: "ambiguo", detalhe: picked.detalhe };
  }
  if (empresa.codigoPlanilha) {
    const byCode = indexes.byCode.get(empresa.codigoPlanilha) ?? [];
    const picked = escolherUnico(byCode);
    if (picked.ok) {
      return {
        status: "ok",
        cliente: picked.cliente,
        detalhe: "Resolvido por codigo Gestta",
      };
    }
    if (byCode.length > 1) return { status: "ambiguo", detalhe: picked.detalhe };
  }
  return {
    status: "nao_encontrada",
    detalhe: "CNPJ/codigo nao encontrados no Gestta",
  };
}

function findUniqueTaskByName(tasks: GesttaTask[], name: string): GesttaTask {
  const key = normalizeText(name);
  const matches = tasks.filter((task) => normalizeText(task.name) === key);
  if (matches.length === 0) {
    throw new Error(`Modelo nao encontrado no Gestta: ${name}`);
  }
  const ativos = matches.filter((task) => task.active !== false);
  if (ativos.length === 1) {
    if (matches.length > 1) {
      console.log(
        `[dp-pro-labore] modelo ${name}: usando ativo ${ativos[0]._id} (ignorando inativos: ${matches
          .filter((task) => task._id !== ativos[0]._id)
          .map((task) => task._id)
          .join(", ")})`,
      );
    }
    return ativos[0];
  }
  if (matches.length === 1) return matches[0];
  throw new Error(
    `Modelo ambiguo (${matches.length}): ${name} -> ${matches
      .map((item) => `${item._id}${item.active === false ? " (inativo)" : ""}`)
      .join(", ")}`,
  );
}

function findUserByName(
  users: UsuarioGestta[],
  name: string,
): UsuarioGestta | undefined {
  const key = normalizeText(name);
  if (!key) return undefined;
  const matches = users.filter((user) => normalizeText(user.name) === key);
  if (matches.length === 1) return matches[0];
  const ativos = matches.filter((user) => user.active !== false);
  if (ativos.length === 1) return ativos[0];
  return undefined;
}

function isRemoveTarget(name: string): boolean {
  const key = normalizeText(name);
  return REMOVE_NAMES.some((item) => normalizeText(item) === key);
}

function isAddTarget(name: string): boolean {
  const key = normalizeText(name);
  return ADD_NAMES.some((item) => normalizeText(item) === key);
}

async function waitForLink(
  client: AxiosInstance,
  customerId: string,
  taskId: string,
): Promise<RichTaskLink> {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
    const byCustomer = await indexarVinculosDaTarefa(client, taskId);
    const found = byCustomer.get(customerId);
    if (found) return found;
    await sleep(POLL_MS);
  }
  throw new Error(
    `Vinculo da tarefa ${taskId} nao apareceu para o cliente ${customerId} apos ${POLL_ATTEMPTS} tentativas.`,
  );
}

function emptySheet(headers: string[]): Record<string, string>[] {
  const row: Record<string, string> = {};
  for (const header of headers) row[header] = "";
  return [row];
}

function writeReports(
  reportsDir: string,
  prefix: string,
  planos: EmpresaPlan[],
  meta: Record<string, unknown>,
): { excelPath: string; jsonPath: string } {
  const inclusoes = planos.flatMap((empresa) =>
    empresa.addedTargets.map((item) => ({
      Código: empresa.codigoPlanilha,
      Empresa: empresa.nomeGestta ?? empresa.nomePlanilha,
      CNPJ: empresa.documento,
      Tarefa: item.taskName,
      Ação: item.action,
      "Já vinculada": item.alreadyLinked ? "sim" : "não",
      "ID vínculo": item.linkId ?? item.newLinkId ?? "",
      "Dono gravado": item.patchedUser ? "sim" : "não",
      "Responsável esperado": empresa.responsibleName ?? empresa.responsavelPlanilha,
      Status: item.applyStatus ?? empresa.applyStatus ?? "planned",
      Detalhe: item.applyDetail ?? "",
    })),
  );
  const remocoes = planos.flatMap((empresa) =>
    empresa.removedSemMovimento.map((item) => ({
      Código: empresa.codigoPlanilha,
      Empresa: empresa.nomeGestta ?? empresa.nomePlanilha,
      CNPJ: empresa.documento,
      Tarefa: item.taskName,
      "ID vínculo": item.linkId,
      "Responsável anterior": item.companyUserName ?? "",
      Status: item.applyStatus ?? empresa.applyStatus ?? "planned",
      Detalhe: item.applyDetail ?? "",
    })),
  );
  const empresasSheet = planos.map((empresa) => ({
    Código: empresa.codigoPlanilha,
    "Nome planilha": empresa.nomePlanilha,
    CNPJ: empresa.documento,
    "Nome Gestta": empresa.nomeGestta ?? "",
    "Customer ID": empresa.customerId ?? "",
    "Resolve status": empresa.resolveStatus,
    "Responsável planilha": empresa.responsavelPlanilha,
    "Responsável Gestta": empresa.responsibleName ?? "",
    "Qtd adicionar": empresa.addedTargets.filter((item) => item.action === "add")
      .length,
    "Qtd já vinculadas": empresa.addedTargets.filter(
      (item) => item.action === "skip",
    ).length,
    "Qtd remover JAN/DEZ": empresa.removedSemMovimento.length,
    "Apply status": empresa.applyStatus ?? "",
    "Apply detalhe": empresa.applyDetail ?? "",
    "Verificação ok": empresa.verificacao
      ? empresa.verificacao.ok
        ? "sim"
        : "não"
      : "",
    "Verificação": empresa.verificacao?.detalhe ?? "",
    Problemas: empresa.problemas.join(" | "),
  }));
  const problemas = planos
    .filter(
      (empresa) =>
        empresa.problemas.length > 0 ||
        empresa.applyStatus === "failed" ||
        empresa.applyStatus === "skipped" ||
        empresa.verificacao?.ok === false,
    )
    .map((empresa) => ({
      Código: empresa.codigoPlanilha,
      Empresa: empresa.nomeGestta ?? empresa.nomePlanilha,
      CNPJ: empresa.documento,
      Status: empresa.applyStatus ?? "",
      Problemas: [
        ...empresa.problemas,
        empresa.verificacao && !empresa.verificacao.ok
          ? empresa.verificacao.detalhe
          : "",
        empresa.applyDetail ?? "",
      ]
        .filter(Boolean)
        .join(" | "),
    }));
  const verificadas = planos.filter((item) => item.verificacao);
  const resumo = [
    { Item: "Empresas", Qtd: planos.length },
    {
      Item: "Inclusões planejadas",
      Qtd: planos.reduce(
        (sum, item) =>
          sum + item.addedTargets.filter((target) => target.action === "add").length,
        0,
      ),
    },
    {
      Item: "Já vinculadas (skip add)",
      Qtd: planos.reduce(
        (sum, item) =>
          sum + item.addedTargets.filter((target) => target.action === "skip")
            .length,
        0,
      ),
    },
    {
      Item: "Remoções JAN/DEZ",
      Qtd: planos.reduce(
        (sum, item) => sum + item.removedSemMovimento.length,
        0,
      ),
    },
    { Item: "Apply ok", Qtd: planos.filter((item) => item.applyStatus === "ok").length },
    {
      Item: "Apply failed",
      Qtd: planos.filter((item) => item.applyStatus === "failed").length,
    },
    {
      Item: "Apply skipped",
      Qtd: planos.filter((item) => item.applyStatus === "skipped").length,
    },
    {
      Item: "Verificação ok",
      Qtd: verificadas.filter((item) => item.verificacao?.ok).length,
    },
    {
      Item: "Verificação falhou",
      Qtd: verificadas.filter((item) => item.verificacao && !item.verificacao.ok)
        .length,
    },
    { Item: "Linhas em Problemas", Qtd: problemas.length },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(resumo),
    "Resumo",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      inclusoes.length > 0
        ? inclusoes
        : emptySheet(["Código", "Empresa", "Tarefa", "Ação", "Status"]),
    ),
    "Inclusoes",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      remocoes.length > 0
        ? remocoes
        : emptySheet(["Código", "Empresa", "Tarefa", "Status"]),
    ),
    "Remocoes",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(empresasSheet),
    "Empresas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      problemas.length > 0
        ? problemas
        : emptySheet(["Código", "Empresa", "CNPJ", "Status", "Problemas"]),
    ),
    "Problemas",
  );

  const excelPath = path.join(reportsDir, `${prefix}.xlsx`);
  const jsonPath = path.join(reportsDir, `${prefix}.json`);
  XLSX.writeFile(workbook, excelPath);
  fs.writeFileSync(
    jsonPath,
    JSON.stringify({ ...meta, empresas: planos }, null, 2),
    "utf8",
  );
  return { excelPath, jsonPath };
}

function avaliarVerificacao(
  addByTaskId: Map<string, RichTaskLink | undefined>,
  removeByTaskId: Map<string, RichTaskLink | undefined>,
  addTasks: GesttaTask[],
  removeTasks: GesttaTask[],
  expectedUserId?: string,
  expectedUserName?: string,
): Verificacao {
  const byName = new Map<string, RichTaskLink | undefined>();
  for (const task of addTasks) {
    byName.set(normalizeText(task.name), addByTaskId.get(task._id));
  }
  const dirf = byName.get(normalizeText(TASK_DIRF));
  const dctf = byName.get(normalizeText(TASK_DCTFWEB));
  const folha = byName.get(normalizeText(TASK_FOLHA_G1));
  const jan = removeTasks.find(
    (task) => normalizeText(task.name) === normalizeText(TASK_JAN),
  );
  const dez = removeTasks.find(
    (task) => normalizeText(task.name) === normalizeText(TASK_DEZ),
  );
  const janLink = jan ? removeByTaskId.get(jan._id) : undefined;
  const dezLink = dez ? removeByTaskId.get(dez._id) : undefined;
  const donoOk = (link?: RichTaskLink): boolean => {
    if (!link || !expectedUserId) return false;
    return userIdFromLink(link) === expectedUserId;
  };
  const parts: string[] = [];
  if (!dirf) parts.push("falta DIRF");
  else if (!donoOk(dirf)) {
    parts.push(`DIRF dono=${userNameOf(dirf) || "vazio"}`);
  }
  if (!dctf) parts.push("falta DCTFWEB Setor Pessoal");
  else if (!donoOk(dctf)) {
    parts.push(`DCTFWEB dono=${userNameOf(dctf) || "vazio"}`);
  }
  if (!folha) parts.push("falta Folha G1");
  else if (!donoOk(folha)) {
    parts.push(`Folha G1 dono=${userNameOf(folha) || "vazio"}`);
  }
  if (janLink) parts.push("ainda tem JAN sem movimento");
  if (dezLink) parts.push("ainda tem DEZ sem movimento");
  return {
    temDirf: Boolean(dirf),
    temDctfweb: Boolean(dctf),
    temFolhaG1: Boolean(folha),
    donoDirf: userNameOf(dirf) ?? "",
    donoDctfweb: userNameOf(dctf) ?? "",
    donoFolhaG1: userNameOf(folha) ?? "",
    aindaTemJan: Boolean(janLink),
    aindaTemDez: Boolean(dezLink),
    ok: parts.length === 0,
    detalhe: parts.length === 0
      ? `ok; dono=${expectedUserName ?? ""}`
      : parts.join("; "),
  };
}

async function verificarEmpresa(
  client: AxiosInstance,
  customerId: string,
  addTasks: GesttaTask[],
  removeTasks: GesttaTask[],
  expectedUserId?: string,
  expectedUserName?: string,
): Promise<Verificacao> {
  const addByTaskId = new Map<string, RichTaskLink | undefined>();
  const removeByTaskId = new Map<string, RichTaskLink | undefined>();
  for (const task of addTasks) {
    const byCustomer = await indexarVinculosDaTarefa(client, task._id);
    addByTaskId.set(task._id, byCustomer.get(customerId));
  }
  for (const task of removeTasks) {
    const byCustomer = await indexarVinculosDaTarefa(client, task._id);
    removeByTaskId.set(task._id, byCustomer.get(customerId));
  }
  return avaliarVerificacao(
    addByTaskId,
    removeByTaskId,
    addTasks,
    removeTasks,
    expectedUserId,
    expectedUserName,
  );
}

async function buildPlans(
  client: AxiosInstance,
  empresasPlanilha: PlanilhaEmpresa[],
  indexes: ReturnType<typeof indexarClientes>,
  addTasks: GesttaTask[],
  removeTasks: GesttaTask[],
  users: UsuarioGestta[],
): Promise<EmpresaPlan[]> {
  const addByName = new Map(
    addTasks.map((task) => [normalizeText(task.name), task]),
  );
  const addLinksByTask = new Map<string, Map<string, RichTaskLink>>();
  for (const task of addTasks) {
    console.log(`[dp-pro-labore] indexando vinculos atuais: ${task.name}`);
    addLinksByTask.set(task._id, await indexarVinculosDaTarefa(client, task._id));
  }
  const planos: EmpresaPlan[] = [];

  for (const [index, empresa] of empresasPlanilha.entries()) {
    const progress = `${index + 1}/${empresasPlanilha.length}`;
    const resolved = resolverCliente(empresa, indexes);
    if (resolved.status !== "ok") {
      planos.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        resolveStatus: resolved.status,
        detalhe: resolved.detalhe,
        responsavelPlanilha: empresa.responsavelPlanilha,
        removedSemMovimento: [],
        addedTargets: [],
        snapshotPessoal: [],
        applyStatus: "skipped",
        applyDetail: resolved.detalhe,
        problemas: [resolved.detalhe],
      });
      console.log(`[${progress}] ${empresa.codigoPlanilha} ${resolved.status}`);
      continue;
    }

    const cliente = resolved.cliente;
    const user = findUserByName(users, empresa.responsavelPlanilha);
    if (!user) {
      planos.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        customerId: cliente._id,
        codigoGestta: codeOf(cliente),
        nomeGestta: cliente.name,
        resolveStatus: "ok",
        detalhe: resolved.detalhe,
        responsavelPlanilha: empresa.responsavelPlanilha,
        removedSemMovimento: [],
        addedTargets: [],
        snapshotPessoal: [],
        applyStatus: "skipped",
        applyDetail: `Responsavel nao encontrado no Gestta: ${empresa.responsavelPlanilha}`,
        problemas: [
          `Responsavel nao encontrado no Gestta: ${empresa.responsavelPlanilha}. Nao adicionou vinculo mudo e nao removeu JAN/DEZ.`,
        ],
      });
      console.log(
        `[${progress}] ${empresa.codigoPlanilha} SKIP sem dono: ${empresa.responsavelPlanilha}`,
      );
      continue;
    }

    try {
      const configs = await listarTarefasDoCliente(client, cliente._id);
      const snapshotPessoal = configs
        .filter((config) => {
          const name = taskNameOf(config);
          return isAddTarget(name) || isRemoveTarget(name);
        })
        .map((config) => ({
          linkId: config._id,
          taskId: taskIdOf(config),
          taskName: taskNameOf(config),
          companyUserId: userIdOf(config),
          companyUserName: userNameOf(config),
        }));
      for (const task of addTasks) {
        const alreadyLink = addLinksByTask.get(task._id)?.get(cliente._id);
        if (!alreadyLink) continue;
        if (snapshotPessoal.some((item) => item.taskId === task._id)) continue;
        snapshotPessoal.push({
          linkId: alreadyLink._id,
          taskId: task._id,
          taskName: task.name,
          companyUserId: userIdFromLink(alreadyLink),
          companyUserName: userNameOf(alreadyLink),
        });
      }
      const removedSemMovimento: RemovedLink[] = [];
      for (const config of configs) {
        const name = taskNameOf(config);
        if (!isRemoveTarget(name)) continue;
        const modelId = taskIdOf(config);
        const catalog = removeTasks.find((task) => task._id === modelId);
        removedSemMovimento.push({
          linkId: config._id,
          taskId: modelId,
          taskName: catalog?.name ?? name,
          companyUserId: userIdOf(config),
          companyUserName: userNameOf(config),
          approve: config.approve,
          approvers: Array.isArray(config.approvers)
            ? config.approvers.map(String)
            : [],
          approveType: Array.isArray(config.approve_type)
            ? config.approve_type.map(String)
            : [],
          applyStatus: "planned",
        });
      }
      const addedTargets: AddedTarget[] = ADD_NAMES.map((name) => {
        const task = addByName.get(normalizeText(name));
        if (!task) {
          throw new Error(`Modelo obrigatorio ausente no mapa: ${name}`);
        }
        const already =
          addLinksByTask.get(task._id)?.get(cliente._id) ??
          configs.find((config) => taskIdOf(config) === task._id);
        return {
          taskId: task._id,
          taskName: task.name,
          alreadyLinked: Boolean(already),
          linkId: already?._id,
          action: already ? "skip" : "add",
          applyStatus: "planned",
          applyDetail: already
            ? "Ja vinculada; vai gravar dono da planilha"
            : "Adicionar e gravar dono da planilha",
        };
      });
      const problemas: string[] = [];
      planos.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        customerId: cliente._id,
        codigoGestta: codeOf(cliente),
        nomeGestta: cliente.name,
        resolveStatus: "ok",
        detalhe: resolved.detalhe,
        responsavelPlanilha: empresa.responsavelPlanilha,
        responsibleId: user._id,
        responsibleName: user.name,
        removedSemMovimento,
        addedTargets,
        snapshotPessoal,
        applyStatus: "planned",
        applyDetail: `adicionar=${addedTargets.filter((item) => item.action === "add").length}; ja=${addedTargets.filter((item) => item.action === "skip").length}; remover=${removedSemMovimento.length}`,
        problemas,
      });
      console.log(
        `[${progress}] ${empresa.codigoPlanilha} ${cliente.name}: +${addedTargets.filter((item) => item.action === "add").length} skip=${addedTargets.filter((item) => item.action === "skip").length} -${removedSemMovimento.length} dono=${user.name}`,
      );
    } catch (error) {
      planos.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        customerId: cliente._id,
        codigoGestta: codeOf(cliente),
        nomeGestta: cliente.name,
        resolveStatus: "erro",
        detalhe: axiosErrorDetail(error),
        responsavelPlanilha: empresa.responsavelPlanilha,
        responsibleId: user._id,
        responsibleName: user.name,
        removedSemMovimento: [],
        addedTargets: [],
        snapshotPessoal: [],
        applyStatus: "failed",
        applyDetail: axiosErrorDetail(error),
        problemas: [axiosErrorDetail(error)],
      });
      console.warn(
        `[${progress}] ERRO ${empresa.codigoPlanilha}: ${axiosErrorDetail(error)}`,
      );
    }
    await sleep(120);
  }

  return planos;
}

async function applyPlans(
  client: AxiosInstance,
  planos: EmpresaPlan[],
  backupPath: string,
  addTasks: GesttaTask[],
  removeTasks: GesttaTask[],
): Promise<void> {
  const persist = () => {
    const backup: BackupFile = JSON.parse(
      fs.readFileSync(backupPath, "utf8"),
    ) as BackupFile;
    backup.empresas = planos;
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  };

  for (const [index, empresa] of planos.entries()) {
    const progress = `${index + 1}/${planos.length}`;
    if (empresa.resolveStatus !== "ok" || !empresa.customerId || !empresa.responsibleId) {
      if (!empresa.applyStatus || empresa.applyStatus === "planned") {
        empresa.applyStatus = "skipped";
      }
      persist();
      continue;
    }

    try {
      for (const target of empresa.addedTargets) {
        let linkId = target.linkId;
        if (target.action === "add") {
          try {
            await withRetry(`add ${empresa.codigoPlanilha} ${target.taskName}`, () =>
              adicionarClientesNaTarefa(client, target.taskId, [empresa.customerId!]),
            );
          } catch (error) {
            console.warn(
              `  add aviso ${empresa.codigoPlanilha} ${target.taskName}: ${axiosErrorDetail(error)}; tentando vinculo existente`,
            );
          }
          const link = await withRetry(
            `waitLink ${empresa.codigoPlanilha} ${target.taskName}`,
            () => waitForLink(client, empresa.customerId!, target.taskId),
          );
          linkId = link._id;
          target.newLinkId = link._id;
          target.linkId = link._id;
          target.applyStatus = "ok";
          target.applyDetail = `adicionado link=${link._id}`;
        }
        if (!linkId) {
          const link = await waitForLink(
            client,
            empresa.customerId,
            target.taskId,
          );
          linkId = link._id;
          target.linkId = link._id;
        }
        await withRetry(
          `patchUser ${empresa.codigoPlanilha} ${target.taskName}`,
          () =>
            patchGroupCustomerConfig(client, {
              ids: [linkId!],
              company_user: empresa.responsibleId,
            }),
        );
        target.patchedUser = true;
        if (target.action === "skip") {
          target.applyStatus = "ok";
          target.applyDetail = `ja vinculada; dono atualizado link=${linkId}`;
        }
        await sleep(200);
      }

      const addFailed = empresa.addedTargets.some(
        (item) => item.applyStatus === "failed" || !item.patchedUser,
      );
      if (addFailed) {
        throw new Error(
          "Inclusao/dono incompletos; JAN/DEZ nao removidos nesta empresa",
        );
      }

      const linkIds = empresa.removedSemMovimento
        .map((item) => item.linkId)
        .filter(Boolean);
      if (linkIds.length > 0) {
        await withRetry(`remove ${empresa.codigoPlanilha}`, () =>
          removerGroupCustomers(client, linkIds),
        );
        for (const item of empresa.removedSemMovimento) {
          item.applyStatus = "ok";
          item.applyDetail = "removido";
        }
      }

      empresa.verificacao = await verificarEmpresa(
        client,
        empresa.customerId,
        addTasks,
        removeTasks,
        empresa.responsibleId,
        empresa.responsibleName,
      );
      if (!empresa.verificacao.ok) {
        empresa.applyStatus = "failed";
        empresa.applyDetail = empresa.verificacao.detalhe;
        empresa.problemas.push(empresa.verificacao.detalhe);
        console.error(
          `[APPLY ${progress}] ${empresa.codigoPlanilha} DIVERGIU: ${empresa.verificacao.detalhe}`,
        );
      } else {
        empresa.applyStatus = "ok";
        empresa.applyDetail = `adicionados=${empresa.addedTargets.filter((item) => item.action === "add").length}; dono=${empresa.responsibleName}; removidos=${linkIds.length}`;
        console.log(`[APPLY ${progress}] ${empresa.codigoPlanilha} ok`);
      }
    } catch (error) {
      empresa.applyStatus = "failed";
      empresa.applyDetail = axiosErrorDetail(error);
      empresa.problemas.push(axiosErrorDetail(error));
      console.error(
        `[APPLY ${progress}] ${empresa.codigoPlanilha} FALHOU: ${empresa.applyDetail}`,
      );
    }
    persist();
    await sleep(150);
  }
}

async function rollback(
  client: AxiosInstance,
  backupPath: string,
): Promise<void> {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8")) as BackupFile;
  console.log(`[rollback] arquivo=${backupPath}`);

  for (const empresa of [...backup.empresas].reverse()) {
    if (!empresa.customerId) continue;
    console.log(
      `[rollback] ${empresa.codigoPlanilha} ${empresa.nomeGestta ?? empresa.nomePlanilha}`,
    );

    for (const added of empresa.addedTargets) {
      if (added.action !== "add") continue;
      if (added.applyStatus !== "ok" && !added.newLinkId) continue;
      const atuais = await listarTarefasDoCliente(client, empresa.customerId);
      const onTarget = atuais.find((item) => taskIdOf(item) === added.taskId);
      if (onTarget) {
        await removerGroupCustomers(client, [onTarget._id]);
      }
      await sleep(120);
    }

    for (const removed of empresa.removedSemMovimento) {
      const atuais = await listarTarefasDoCliente(client, empresa.customerId);
      const already = atuais.find((item) => taskIdOf(item) === removed.taskId);
      let linkId = already?._id;
      if (!already) {
        await adicionarClientesNaTarefa(client, removed.taskId, [
          empresa.customerId,
        ]);
        const restored = await waitForLink(
          client,
          empresa.customerId,
          removed.taskId,
        );
        linkId = restored._id;
      }
      if (linkId && removed.companyUserId) {
        try {
          await patchGroupCustomerConfig(client, {
            ids: [linkId],
            company_user: removed.companyUserId,
            approve: removed.approve,
            approvers: removed.approvers,
            approve_type: removed.approveType,
          });
        } catch (error) {
          console.warn(
            `  aviso restaurar responsavel ${removed.taskName}: ${axiosErrorDetail(error)}`,
          );
        }
      }
      await sleep(120);
    }
  }
  console.log("[rollback] concluido");
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.reportsDir, { recursive: true });
  const client = createGesttaClient(getJwt());

  if (args.rollbackPath) {
    await rollback(client, args.rollbackPath);
    return;
  }

  console.log(`[dp-pro-labore] modo=${args.apply ? "apply" : "dry-run"}`);
  console.log(`[dp-pro-labore] planilha=${args.excelPath}`);

  const empresasPlanilha = lerPlanilha(args.excelPath);
  console.log(`[dp-pro-labore] empresas=${empresasPlanilha.length}`);
  if (empresasPlanilha.length === 0) {
    throw new Error("Nenhuma empresa encontrada na planilha.");
  }

  console.log("[dp-pro-labore] carregando clientes e usuarios...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const byIdCliente = new Map<string, ClienteGestta>();
  for (const cliente of [...ativos, ...inativos]) {
    if (!byIdCliente.has(cliente._id)) byIdCliente.set(cliente._id, cliente);
  }
  const indexes = indexarClientes([...byIdCliente.values()]);
  const users = await listarFuncionarios(client);

  console.log("[dp-pro-labore] carregando modelos recorrentes...");
  const allTasks = await listarTarefasRecorrentes(client);
  const addTasks = ADD_NAMES.map((name) => findUniqueTaskByName(allTasks, name));
  const removeTasks = REMOVE_NAMES.map((name) =>
    findUniqueTaskByName(allTasks, name),
  );
  for (const task of addTasks) {
    console.log(`[dp-pro-labore] ADD ${task.name} = ${task._id}`);
  }
  for (const task of removeTasks) {
    console.log(`[dp-pro-labore] REMOVE ${task.name} = ${task._id}`);
  }

  const planos = await buildPlans(
    client,
    empresasPlanilha,
    indexes,
    addTasks,
    removeTasks,
    users,
  );

  const totalRemocoes = planos.reduce(
    (sum, item) => sum + item.removedSemMovimento.length,
    0,
  );
  const totalInclusoes = planos.reduce(
    (sum, item) =>
      sum + item.addedTargets.filter((target) => target.action === "add").length,
    0,
  );
  console.log(
    `[dp-pro-labore] planejado remocoes=${totalRemocoes} inclusoes=${totalInclusoes}`,
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  const prefix = args.apply
    ? `execucao_dp_pro_labore_${dateStamp}_correcao`
    : `planejado_dp_pro_labore_${dateStamp}`;

  const backupPath = path.join(
    args.reportsDir,
    `backup_dp_pro_labore_${stamp()}.json`,
  );
  const backup: BackupFile = {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    sourceExcel: args.excelPath,
    addTaskIds: Object.fromEntries(addTasks.map((task) => [task.name, task._id])),
    removeTaskIds: Object.fromEntries(
      removeTasks.map((task) => [task.name, task._id]),
    ),
    empresas: planos,
  };
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`[dp-pro-labore] backup=${backupPath}`);

  if (args.apply) {
    await applyPlans(client, planos, backupPath, addTasks, removeTasks);
  }

  const { excelPath, jsonPath } = writeReports(args.reportsDir, prefix, planos, {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    sourceExcel: args.excelPath,
    backupPath,
    addTaskIds: backup.addTaskIds,
    removeTaskIds: backup.removeTaskIds,
    totals: {
      empresas: planos.length,
      remocoes: totalRemocoes,
      inclusoes: totalInclusoes,
      ok: planos.filter((item) => item.applyStatus === "ok").length,
      failed: planos.filter((item) => item.applyStatus === "failed").length,
      skipped: planos.filter((item) => item.applyStatus === "skipped").length,
      verificacaoOk: planos.filter((item) => item.verificacao?.ok).length,
      verificacaoFalhou: planos.filter(
        (item) => item.verificacao && !item.verificacao.ok,
      ).length,
    },
  });

  const problemas = planos.filter(
    (item) =>
      item.problemas.length > 0 ||
      item.applyStatus === "failed" ||
      item.applyStatus === "skipped" ||
      item.verificacao?.ok === false,
  );
  console.log(`[dp-pro-labore] Excel: ${excelPath}`);
  console.log(`[dp-pro-labore] JSON: ${jsonPath}`);
  if (problemas.length > 0) {
    console.warn(`[dp-pro-labore] PROBLEMAS=${problemas.length}`);
    for (const item of problemas) {
      console.warn(
        `  - ${item.codigoPlanilha} ${item.nomeGestta ?? item.nomePlanilha}: ${
          item.problemas.join(" | ") || item.applyDetail || item.verificacao?.detalhe
        }`,
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
