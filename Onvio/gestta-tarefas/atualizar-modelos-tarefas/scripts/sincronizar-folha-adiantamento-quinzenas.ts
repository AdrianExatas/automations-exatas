/**
 * Backup e sincronização das Folhas de Adiantamento com a planilha de quinzenas.
 * Não altera checklist, frequência nem documentos dos modelos.
 * Não mexe em gêmeos VIA WHATSAPP.
 *
 *   npx ts-node scripts/sincronizar-folha-adiantamento-quinzenas.ts --backup-only
 *   npx ts-node scripts/sincronizar-folha-adiantamento-quinzenas.ts --dry-run
 *   npx ts-node scripts/sincronizar-folha-adiantamento-quinzenas.ts --apply
 *   npx ts-node scripts/sincronizar-folha-adiantamento-quinzenas.ts --rollback relatorios/backup_....json
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
  customerNameOf,
  listarClientesDaTarefa,
  listarTarefasDoCliente,
  listarTarefasRecorrentes,
  patchGroupCustomerConfig,
  removerGroupCustomers,
} from "../src/endpoints";
import { GesttaTask } from "../src/types";

const DEFAULT_EXCEL =
  "C:\\Users\\Exatas\\Downloads\\Empresas com Quinzenas.xlsx";
const LIMIT = 500;
const POLL_ATTEMPTS = 20;
const POLL_MS = 3000;

const TASK_40 = "FOLHA (ADIANTAMENTO 40%)";
const TASK_40_2 = "FOLHA (ADIANTAMENTO 40%) - 2";
const TASK_50 = "FOLHA (ADIANTAMENTO 50%)";
const TARGET_NAMES = [TASK_40, TASK_40_2, TASK_50] as const;
type TargetTaskName = (typeof TARGET_NAMES)[number];

interface PlanilhaEmpresa {
  linha: number;
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  documentoDigits: string;
  tipo: number;
  data: number;
  responsavelPlanilha: string;
  targetTaskName: TargetTaskName;
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

interface LinkAtual {
  taskId: string;
  taskName: TargetTaskName;
  linkId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  cnpj: string;
  cnpjDigits: string;
  companyUserId?: string;
  companyUserName?: string;
  approve?: boolean;
  approvers: string[];
  approveType: string[];
}

interface UnresolvedEmpresa {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  targetTaskName: TargetTaskName;
  status: "nao_encontrada" | "ambiguo" | "tipo_invalido";
  detalhe: string;
}

interface KeepRow {
  taskName: TargetTaskName;
  taskId: string;
  linkId: string;
  customerId: string;
  codigo: string;
  empresa: string;
  cnpj: string;
  responsavelAtual: string;
}

interface RemovalRow extends LinkAtual {
  reason: "fora da planilha" | "tarefa errada";
  applyStatus?: "planned" | "ok" | "failed" | "skipped";
  applyDetail?: string;
}

interface AdditionRow {
  taskName: TargetTaskName;
  taskId: string;
  customerId: string;
  codigoPlanilha: string;
  nomePlanilha: string;
  nomeGestta: string;
  cnpj: string;
  fromTaskName?: TargetTaskName;
  responsavelPlanilha: string;
  responsibleId?: string;
  applyStatus?: "planned" | "ok" | "failed" | "skipped";
  applyDetail?: string;
  newLinkId?: string;
}

interface BackupFile {
  generatedAt: string;
  mode: "backup-only" | "dry-run" | "apply";
  sourceExcel: string;
  tasks: Record<TargetTaskName, { id: string; name: string }>;
  currentLinks: LinkAtual[];
  keeps: KeepRow[];
  removals: RemovalRow[];
  additions: AdditionRow[];
  unresolved: UnresolvedEmpresa[];
}

interface RichTaskLink {
  _id: string;
  company_task?: string | { _id: string };
  company_user?: string | { _id?: string; name?: string } | null;
  approve?: boolean;
  approvers?: string[];
  approve_type?: string[];
  customer:
    | string
    | { _id: string; name?: string; code?: string | number; cnpj?: string };
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
    .replace(/\u00a0/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function cleanCode(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "")
    .replace(",", ".")
    .trim();
  if (!text) return undefined;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : undefined;
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

function parseArgs(argv: string[]): {
  apply: boolean;
  backupOnly: boolean;
  dryRun: boolean;
  excelPath: string;
  reportsDir: string;
  rollbackPath?: string;
} {
  const rollbackFlag = argv.findIndex((item) => item === "--rollback");
  const applyFlag = argv.includes("--apply");
  const backupOnly = argv.includes("--backup-only");
  return {
    apply: applyFlag && !backupOnly && rollbackFlag < 0,
    backupOnly,
    dryRun: !applyFlag || argv.includes("--dry-run") || backupOnly,
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

function mapTargetTask(tipo: number, data: number): TargetTaskName | undefined {
  if (tipo === 0.5) return TASK_50;
  if (tipo === 0.4 && data === 20) return TASK_40_2;
  if (tipo === 0.4 && data === 15) return TASK_40;
  return undefined;
}

function lerPlanilha(excelPath: string): PlanilhaEmpresa[] {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`Planilha nao encontrada: ${excelPath}`);
  }
  const workbook = XLSX.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  });
  const empresas: PlanilhaEmpresa[] = [];
  for (let i = 2; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    const codigo = cleanCode(row[0]);
    const nome = row[1] == null ? "" : String(row[1]).trim();
    const documento = row[2] == null ? "" : String(row[2]).trim();
    if (!codigo && !nome && !documento) continue;
    const tipo = asNumber(row[3]);
    const data = asNumber(row[4]);
    const target =
      tipo != null && data != null ? mapTargetTask(tipo, data) : undefined;
    empresas.push({
      linha: i + 1,
      codigoPlanilha: codigo,
      nomePlanilha: nome,
      documento,
      documentoDigits: digitsOnly(documento),
      tipo: tipo ?? Number.NaN,
      data: data ?? Number.NaN,
      responsavelPlanilha: row[5] == null ? "" : String(row[5]).trim(),
      targetTaskName: target ?? TASK_40,
    });
  }
  return empresas;
}

function findUniqueTaskByName(tasks: GesttaTask[], name: string): GesttaTask {
  const key = normalizeText(name);
  const matches = tasks.filter((task) => normalizeText(task.name) === key);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(`Modelo nao encontrado no Gestta: ${name}`);
  }
  throw new Error(
    `Modelo ambiguo (${matches.length}): ${name} -> ${matches
      .map((item) => item._id)
      .join(", ")}`,
  );
}

function codeOf(cliente: ClienteGestta): string {
  if (cliente.code == null || cliente.code === "") return "";
  return String(cliente.code).trim();
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
    return {
      status: "nao_encontrada",
      detalhe: `CNPJ ${empresa.documento} nao encontrado no Gestta`,
    };
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

function userIdOf(link: RichTaskLink): string | undefined {
  const user = link.company_user;
  if (!user) return undefined;
  return typeof user === "string" ? user : user._id;
}

function userNameOf(link: RichTaskLink): string | undefined {
  const user = link.company_user;
  if (!user || typeof user === "string") return undefined;
  return user.name;
}

function customerCodeOf(link: RichTaskLink, cliente?: ClienteGestta): string {
  const customer = link.customer;
  if (customer && typeof customer !== "string" && customer.code != null) {
    return String(customer.code).trim();
  }
  return cliente ? codeOf(cliente) : "";
}

function customerCnpjOf(link: RichTaskLink, cliente?: ClienteGestta): string {
  const customer = link.customer;
  if (customer && typeof customer !== "string" && customer.cnpj) {
    return String(customer.cnpj);
  }
  return cliente?.cnpj ?? "";
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

async function waitForLink(
  client: AxiosInstance,
  customerId: string,
  taskId: string,
): Promise<{ _id: string }> {
  for (let attempt = 1; attempt <= POLL_ATTEMPTS; attempt += 1) {
    const links = await listarClientesDaTarefa(client, taskId);
    const found = links.find((item) => customerIdOf(item) === customerId);
    if (found) return found;
    await sleep(POLL_MS);
  }
  throw new Error(
    `Vinculo da tarefa ${taskId} nao apareceu para o cliente ${customerId} apos ${POLL_ATTEMPTS} tentativas.`,
  );
}

function taskIdOfConfig(config: { company_task?: string | { _id?: string } }): string {
  const task = config.company_task;
  if (!task) return "";
  return typeof task === "string" ? task : task._id ?? "";
}

async function snapshotLinks(
  client: AxiosInstance,
  tasks: Record<TargetTaskName, GesttaTask>,
  indexes: ReturnType<typeof indexarClientes>,
): Promise<LinkAtual[]> {
  const links: LinkAtual[] = [];
  for (const name of TARGET_NAMES) {
    const task = tasks[name];
    const raw = (await listarClientesDaTarefa(
      client,
      task._id,
    )) as RichTaskLink[];
    for (const link of raw) {
      const asLink = link as unknown as Parameters<typeof customerIdOf>[0];
      const customerId = customerIdOf(asLink);
      const cliente = indexes.byId.get(customerId);
      const cnpj = customerCnpjOf(link, cliente);
      links.push({
        taskId: task._id,
        taskName: name,
        linkId: link._id,
        customerId,
        customerCode: customerCodeOf(link, cliente),
        customerName:
          customerNameOf(asLink) ?? cliente?.name ?? customerId,
        cnpj,
        cnpjDigits: digitsOnly(cnpj),
        companyUserId: userIdOf(link),
        companyUserName: userNameOf(link),
        approve: link.approve,
        approvers: Array.isArray(link.approvers)
          ? link.approvers.map(String)
          : [],
        approveType: Array.isArray(link.approve_type)
          ? link.approve_type.map(String)
          : [],
      });
    }
    console.log(`[snapshot] ${name}: ${raw.length} vinculo(s)`);
  }
  return links;
}

function buildPlan(
  planilha: PlanilhaEmpresa[],
  indexes: ReturnType<typeof indexarClientes>,
  tasks: Record<TargetTaskName, GesttaTask>,
  currentLinks: LinkAtual[],
  users: UsuarioGestta[],
): {
  keeps: KeepRow[];
  removals: RemovalRow[];
  additions: AdditionRow[];
  unresolved: UnresolvedEmpresa[];
} {
  const unresolved: UnresolvedEmpresa[] = [];
  const desiredByTask = new Map<TargetTaskName, Set<string>>();
  const desiredByTaskDoc = new Map<TargetTaskName, Set<string>>();
  const desiredEmpresaByCustomer = new Map<string, PlanilhaEmpresa>();
  for (const name of TARGET_NAMES) {
    desiredByTask.set(name, new Set());
    desiredByTaskDoc.set(name, new Set());
  }

  for (const empresa of planilha) {
    const mapped = mapTargetTask(empresa.tipo, empresa.data);
    if (!mapped) {
      unresolved.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        targetTaskName: empresa.targetTaskName,
        status: "tipo_invalido",
        detalhe: `Tipo/data invalidos: tipo=${empresa.tipo} data=${empresa.data}`,
      });
      continue;
    }
    if (empresa.documentoDigits) {
      desiredByTaskDoc.get(mapped)!.add(empresa.documentoDigits);
    }
    const resolved = resolverCliente(empresa, indexes);
    if (resolved.status !== "ok") {
      unresolved.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        targetTaskName: mapped,
        status: resolved.status,
        detalhe: resolved.detalhe,
      });
      continue;
    }
    desiredByTask.get(mapped)!.add(resolved.cliente._id);
    desiredEmpresaByCustomer.set(resolved.cliente._id, {
      ...empresa,
      targetTaskName: mapped,
    });
  }

  const shouldKeep = (link: LinkAtual): boolean => {
    if (desiredByTask.get(link.taskName)!.has(link.customerId)) return true;
    if (
      link.cnpjDigits &&
      desiredByTaskDoc.get(link.taskName)!.has(link.cnpjDigits)
    ) {
      return true;
    }
    return false;
  };

  const currentByTaskCustomer = new Map<string, LinkAtual>();
  for (const link of currentLinks) {
    currentByTaskCustomer.set(`${link.taskId}:${link.customerId}`, link);
  }

  const keeps: KeepRow[] = [];
  const removals: RemovalRow[] = [];
  for (const link of currentLinks) {
    if (shouldKeep(link)) {
      keeps.push({
        taskName: link.taskName,
        taskId: link.taskId,
        linkId: link.linkId,
        customerId: link.customerId,
        codigo: link.customerCode,
        empresa: link.customerName,
        cnpj: link.cnpj,
        responsavelAtual: link.companyUserName ?? "",
      });
      continue;
    }
    const desired = desiredEmpresaByCustomer.get(link.customerId);
    removals.push({
      ...link,
      reason: desired && desired.targetTaskName !== link.taskName
        ? "tarefa errada"
        : "fora da planilha",
      applyStatus: "planned",
    });
  }

  const additions: AdditionRow[] = [];
  for (const [customerId, empresa] of desiredEmpresaByCustomer) {
    const task = tasks[empresa.targetTaskName];
    const already = currentByTaskCustomer.get(`${task._id}:${customerId}`);
    if (already) continue;
    const cliente = indexes.byId.get(customerId);
    const currentOther = currentLinks.find(
      (link) =>
        link.customerId === customerId &&
        link.taskName !== empresa.targetTaskName,
    );
    const user = findUserByName(users, empresa.responsavelPlanilha);
    additions.push({
      taskName: empresa.targetTaskName,
      taskId: task._id,
      customerId,
      codigoPlanilha: empresa.codigoPlanilha,
      nomePlanilha: empresa.nomePlanilha,
      nomeGestta: cliente?.name ?? empresa.nomePlanilha,
      cnpj: empresa.documento,
      fromTaskName: currentOther?.taskName,
      responsavelPlanilha: empresa.responsavelPlanilha,
      responsibleId: user?._id,
      applyStatus: "planned",
      applyDetail: user
        ? "Adicionar e gravar responsavel da planilha"
        : empresa.responsavelPlanilha
          ? `Adicionar; responsavel nao encontrado: ${empresa.responsavelPlanilha}`
          : "Adicionar sem responsavel da planilha",
    });
  }

  return { keeps, removals, additions, unresolved };
}

function emptySheet(headers: string[]): Record<string, string>[] {
  const row: Record<string, string> = {};
  for (const header of headers) row[header] = "";
  return [row];
}

function writeReports(
  reportsDir: string,
  prefix: string,
  backup: BackupFile,
): { excelPath: string; jsonPath: string } {
  const inventario = backup.currentLinks.map((link) => ({
    Tarefa: link.taskName,
    "ID modelo": link.taskId,
    Código: link.customerCode,
    Empresa: link.customerName,
    CNPJ: link.cnpj,
    Responsável: link.companyUserName ?? "",
    "ID vínculo": link.linkId,
    "Customer ID": link.customerId,
  }));
  const manter = backup.keeps.map((row) => ({
    Tarefa: row.taskName,
    Código: row.codigo,
    Empresa: row.empresa,
    CNPJ: row.cnpj,
    Responsável: row.responsavelAtual,
    "ID vínculo": row.linkId,
  }));
  const remover = backup.removals.map((row) => ({
    Tarefa: row.taskName,
    Motivo: row.reason,
    Código: row.customerCode,
    Empresa: row.customerName,
    CNPJ: row.cnpj,
    Responsável: row.companyUserName ?? "",
    "ID vínculo": row.linkId,
    Status: row.applyStatus ?? "",
    Detalhe: row.applyDetail ?? "",
  }));
  const adicionar = backup.additions.map((row) => ({
    Tarefa: row.taskName,
    "Vem de": row.fromTaskName ?? "",
    "Código planilha": row.codigoPlanilha,
    Empresa: row.nomeGestta,
    CNPJ: row.cnpj,
    "Responsável planilha": row.responsavelPlanilha,
    "ID responsável": row.responsibleId ?? "",
    Status: row.applyStatus ?? "",
    Detalhe: row.applyDetail ?? "",
    "ID vínculo novo": row.newLinkId ?? "",
  }));
  const naoResolvidas = backup.unresolved.map((row) => ({
    "Código planilha": row.codigoPlanilha,
    Empresa: row.nomePlanilha,
    CNPJ: row.documento,
    Destino: row.targetTaskName,
    Status: row.status,
    Detalhe: row.detalhe,
  }));
  const resumo: Array<{
    Tarefa: string;
    "Inventário atual": number;
    Manter: number;
    Remover: number;
    Adicionar: number;
    "Esperado planilha": number;
  }> = TARGET_NAMES.map((name) => ({
    Tarefa: name,
    "Inventário atual": backup.currentLinks.filter((item) => item.taskName === name)
      .length,
    Manter: backup.keeps.filter((item) => item.taskName === name).length,
    Remover: backup.removals.filter((item) => item.taskName === name).length,
    Adicionar: backup.additions.filter((item) => item.taskName === name).length,
    "Esperado planilha":
      backup.keeps.filter((item) => item.taskName === name).length +
      backup.additions.filter((item) => item.taskName === name).length,
  }));
  resumo.push({
    Tarefa: "NÃO RESOLVIDAS",
    "Inventário atual": backup.unresolved.length,
    Manter: 0,
    Remover: 0,
    Adicionar: 0,
    "Esperado planilha": backup.unresolved.length,
  });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      inventario.length > 0
        ? inventario
        : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
    ),
    "Inventario atual",
  );
  if (backup.mode !== "backup-only") {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        manter.length > 0 ? manter : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
      ),
      "Manter",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        remover.length > 0 ? remover : emptySheet(["Tarefa", "Empresa", "Motivo"]),
      ),
      "Remover",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        adicionar.length > 0
          ? adicionar
          : emptySheet(["Tarefa", "Empresa", "CNPJ"]),
      ),
      "Adicionar",
    );
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(
        naoResolvidas.length > 0
          ? naoResolvidas
          : emptySheet(["Código planilha", "Empresa", "Status"]),
      ),
      "Nao resolvidas",
    );
  }
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(resumo),
    "Resumo",
  );

  const excelPath = path.join(reportsDir, `${prefix}.xlsx`);
  const jsonPath = path.join(reportsDir, `${prefix}.json`);
  XLSX.writeFile(workbook, excelPath);
  fs.writeFileSync(jsonPath, JSON.stringify(backup, null, 2), "utf8");
  return { excelPath, jsonPath };
}

async function applyPlan(
  client: AxiosInstance,
  backup: BackupFile,
  backupPath: string,
): Promise<void> {
  const persist = () => {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  };
  persist();

  for (const [index, addition] of backup.additions.entries()) {
    const progress = `${index + 1}/${backup.additions.length}`;
    try {
      await withRetry(`add ${addition.codigoPlanilha} ${addition.taskName}`, () =>
        adicionarClientesNaTarefa(client, addition.taskId, [addition.customerId]),
      );
      const link = await withRetry(
        `waitLink ${addition.codigoPlanilha} ${addition.taskName}`,
        () => waitForLink(client, addition.customerId, addition.taskId),
      );
      addition.newLinkId = link._id;
      if (addition.responsibleId) {
        try {
          await withRetry(
            `patchUser ${addition.codigoPlanilha} ${addition.taskName}`,
            () =>
              patchGroupCustomerConfig(client, {
                ids: [link._id],
                company_user: addition.responsibleId,
              }),
          );
        } catch (error) {
          console.warn(
            `  aviso responsavel ${addition.codigoPlanilha}: ${axiosErrorDetail(error)}`,
          );
        }
      }
      addition.applyStatus = "ok";
      addition.applyDetail = `adicionado link=${link._id}`;
      console.log(`[ADD ${progress}] ${addition.codigoPlanilha} ${addition.taskName}`);
    } catch (error) {
      addition.applyStatus = "failed";
      addition.applyDetail = axiosErrorDetail(error);
      console.error(
        `[ADD ${progress}] ${addition.codigoPlanilha} FALHOU: ${addition.applyDetail}`,
      );
    }
    persist();
    await sleep(200);
  }

  const linkIds = backup.removals.map((item) => item.linkId).filter(Boolean);
  for (let i = 0; i < linkIds.length; i += 50) {
    const chunk = backup.removals.slice(i, i + 50);
    const ids = chunk.map((item) => item.linkId);
    try {
      await withRetry(`remove chunk=${i / 50 + 1}`, () =>
        removerGroupCustomers(client, ids),
      );
      for (const item of chunk) {
        item.applyStatus = "ok";
        item.applyDetail = "removido";
      }
      console.log(
        `[REMOVE] ${i + 1}-${Math.min(i + 50, linkIds.length)}/${linkIds.length}`,
      );
    } catch (error) {
      for (const item of chunk) {
        item.applyStatus = "failed";
        item.applyDetail = axiosErrorDetail(error);
      }
      console.error(`[REMOVE] chunk falhou: ${axiosErrorDetail(error)}`);
    }
    persist();
    await sleep(200);
  }
}

async function rollback(
  client: AxiosInstance,
  backupPath: string,
): Promise<void> {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8")) as BackupFile;
  console.log(`[rollback] arquivo=${backupPath}`);

  for (const addition of [...backup.additions].reverse()) {
    if (addition.applyStatus !== "ok") continue;
    console.log(
      `[rollback add] ${addition.codigoPlanilha} ${addition.taskName}`,
    );
    const atuais = await listarTarefasDoCliente(client, addition.customerId);
    const onTarget = atuais.find(
      (item) => taskIdOfConfig(item) === addition.taskId,
    );
    if (onTarget) {
      await removerGroupCustomers(client, [onTarget._id]);
    }
    await sleep(150);
  }

  for (const removed of [...backup.removals].reverse()) {
    if (removed.applyStatus !== "ok") continue;
    console.log(
      `[rollback remove] ${removed.customerCode} ${removed.taskName}`,
    );
    const atuais = await listarTarefasDoCliente(client, removed.customerId);
    const already = atuais.find(
      (item) => taskIdOfConfig(item) === removed.taskId,
    );
    let linkId = already?._id;
    if (!already) {
      await adicionarClientesNaTarefa(client, removed.taskId, [
        removed.customerId,
      ]);
      const restored = await waitForLink(
        client,
        removed.customerId,
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
    await sleep(150);
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

  const mode: BackupFile["mode"] = args.apply
    ? "apply"
    : args.backupOnly
      ? "backup-only"
      : "dry-run";
  console.log(`[folha-quinzenas] modo=${mode}`);
  console.log(`[folha-quinzenas] planilha=${args.excelPath}`);

  const planilha = lerPlanilha(args.excelPath);
  const mappedCounts = {
    [TASK_40]: planilha.filter((item) => mapTargetTask(item.tipo, item.data) === TASK_40)
      .length,
    [TASK_40_2]: planilha.filter(
      (item) => mapTargetTask(item.tipo, item.data) === TASK_40_2,
    ).length,
    [TASK_50]: planilha.filter((item) => mapTargetTask(item.tipo, item.data) === TASK_50)
      .length,
  };
  console.log(
    `[folha-quinzenas] planilha=${planilha.length} 40%=${mappedCounts[TASK_40]} 40%-2=${mappedCounts[TASK_40_2]} 50%=${mappedCounts[TASK_50]}`,
  );

  console.log("[folha-quinzenas] carregando clientes...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const indexes = indexarClientes([...ativos, ...inativos]);

  console.log("[folha-quinzenas] carregando usuarios/modelos...");
  const users = await listarFuncionarios(client);
  const allTasks = await listarTarefasRecorrentes(client);
  const tasks = {
    [TASK_40]: findUniqueTaskByName(allTasks, TASK_40),
    [TASK_40_2]: findUniqueTaskByName(allTasks, TASK_40_2),
    [TASK_50]: findUniqueTaskByName(allTasks, TASK_50),
  };
  for (const name of TARGET_NAMES) {
    console.log(`[folha-quinzenas] ${name} = ${tasks[name]._id}`);
  }

  const currentLinks = await snapshotLinks(client, tasks, indexes);
  const planned = args.backupOnly
    ? { keeps: [], removals: [], additions: [], unresolved: [] }
    : buildPlan(planilha, indexes, tasks, currentLinks, users);

  const backup: BackupFile = {
    generatedAt: new Date().toISOString(),
    mode,
    sourceExcel: args.excelPath,
    tasks: {
      [TASK_40]: { id: tasks[TASK_40]._id, name: TASK_40 },
      [TASK_40_2]: { id: tasks[TASK_40_2]._id, name: TASK_40_2 },
      [TASK_50]: { id: tasks[TASK_50]._id, name: TASK_50 },
    },
    currentLinks,
    keeps: planned.keeps,
    removals: planned.removals,
    additions: planned.additions,
    unresolved: planned.unresolved,
  };

  const dateStamp = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(
    args.reportsDir,
    `backup_folha_adiantamento_quinzenas_${stamp()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`[folha-quinzenas] backup=${backupPath}`);
  console.log(
    `[folha-quinzenas] inventario=${currentLinks.length} manter=${planned.keeps.length} remover=${planned.removals.length} adicionar=${planned.additions.length} naoResolvidas=${planned.unresolved.length}`,
  );

  if (args.apply) {
    if (planned.unresolved.length > 0) {
      console.warn(
        `[folha-quinzenas] ${planned.unresolved.length} empresa(s) nao resolvida(s); apply segue so com matches. Remocoes usam CNPJ/codigo da planilha como trava.`,
      );
    }
    await applyPlan(client, backup, backupPath);
  }

  const prefix = args.apply
    ? `execucao_folha_adiantamento_quinzenas_${dateStamp}`
    : args.backupOnly
      ? `backup_folha_adiantamento_quinzenas_${dateStamp}`
      : `planejado_folha_adiantamento_quinzenas_${dateStamp}`;
  const { excelPath, jsonPath } = writeReports(args.reportsDir, prefix, backup);
  console.log(`[folha-quinzenas] Excel: ${excelPath}`);
  console.log(`[folha-quinzenas] JSON: ${jsonPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
