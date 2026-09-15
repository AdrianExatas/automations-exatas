/**
 * Levantamento somente leitura: vínculos e instâncias geradas (ago/set 2026)
 * em que o setor canônico da tarefa diverge do setor do colaborador atribuído.
 *
 *   npx ts-node scripts/levantamento-setor-tarefa-vs-colaborador.ts
 *   npx ts-node scripts/levantamento-setor-tarefa-vs-colaborador.ts --concurrency 6
 */
import fs from "fs";
import path from "path";
import axios, { AxiosInstance } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  buscarTarefasGeradasCliente,
  customerIdOf,
  customerNameOf,
  GeneratedCustomerTask,
  listarClientesDaTarefa,
  listarTarefasRecorrentes,
} from "../src/endpoints";
import { GesttaTask, TaskCustomerLink } from "../src/types";
import {
  axiosErrorDetail,
  ClienteGestta,
  codeOf,
  digitsOnly,
  emptySheet,
  getArgValue,
  indexarClientes,
  listarClientes,
  withRetry,
} from "./lib/folha-grupo-particularidades";

const COMPETENCES = ["2026-08", "2026-09"] as const;
type CompetenceKey = (typeof COMPETENCES)[number];

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  IMPEDIMENT: "Impedimento",
  DONE: "Concluída",
  DISCONSIDERED: "Desconsiderada",
  IGNORED: "Ignorada",
  DELAYED: "Atrasada",
  REVIEW: "Revisão",
};

const LIMIT = 500;

type OrigemSetor = "cadastro Gestta" | "API 3001" | "inferido pelos vínculos";

interface Args {
  reportsDir: string;
  concurrency: number;
}

interface UsuarioGestta {
  _id: string;
  name: string;
  email?: string;
  active?: boolean;
  company_departments?: unknown;
  [key: string]: unknown;
}

interface RichTaskLink extends TaskCustomerLink {
  company_user?: string | { _id?: string; name?: string } | null;
  customer:
    | string
    | { _id: string; name?: string; code?: string | number; cnpj?: string };
}

interface VinculoLinha {
  linkId: string;
  taskId: string;
  taskName: string;
  modeloAtivo: boolean;
  setorTarefaBruto: string;
  setorTarefa: string;
  customerId: string;
  codigoGestta: string;
  nomeGestta: string;
  cnpj: string;
  ativoGestta?: boolean;
  companyUserId: string;
  companyUserName: string;
  userActive?: boolean;
  setoresColaboradorBrutos: string[];
  setoresColaborador: string[];
  setorColaborador: string;
  origemSetor: OrigemSetor | "";
}

interface InstanciaLinha extends VinculoLinha {
  instanciaId: string;
  competence: CompetenceKey;
  status: string;
  competenceDate: string;
  legalDate: string;
  dueDate: string;
  closeDate: string;
  instanciaUserId: string;
  instanciaUserName: string;
  instanciaSetor: string;
  instanciaOrigemSetor: OrigemSetor | "";
  aindaDiverge: boolean;
}

interface ColaboradorLinha {
  userId: string;
  nome: string;
  email: string;
  ativo?: boolean;
  setoresBrutos: string[];
  setoresCanonicos: string[];
  setorDisplay: string;
  origemSetor: OrigemSetor | "";
  qtdVinculos: number;
  qtdDivergentes: number;
  setorInferido: string;
}

function parseArgs(argv: string[]): Args {
  const concurrencyRaw = getArgValue(argv, "--concurrency");
  const concurrency = concurrencyRaw ? Number(concurrencyRaw) : 6;
  return {
    reportsDir: path.resolve(
      getArgValue(argv, "--reports-dir") ||
        path.join(__dirname, "..", "..", "relatorios"),
    ),
    concurrency:
      Number.isFinite(concurrency) && concurrency >= 1
        ? Math.min(Math.floor(concurrency), 12)
        : 6,
  };
}

function stampDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function asArray<T>(data: unknown, docsKey = "docs"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && docsKey in data) {
    const docs = (data as Record<string, unknown>)[docsKey];
    return Array.isArray(docs) ? (docs as T[]) : [];
  }
  return [];
}

function normalizeKey(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizarSetor(setor: unknown): string {
  const original = String(setor ?? "").trim();
  const key = normalizeKey(original);
  if (!key) return "Sem setor";
  if (key === "DP" || key === "PESSOAL" || key === "DEPARTAMENTO PESSOAL") {
    return "Pessoal";
  }
  if (key === "FISCAL" || key.startsWith("FISCAL ")) return "Fiscal";
  if (key === "FINANCEIRO") return "Financeiro";
  if (key === "CONTABIL") return "Contábil";
  if (key === "SUCESSO DO CLIENTE" || key === "CS" || key === "CUSTOMER SUCCESS") {
    return "Sucesso do Cliente";
  }
  return original;
}

function uniqueCanonical(setores: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const setor of setores) {
    const canonical = normalizarSetor(setor);
    if (!canonical || canonical === "Sem setor" || seen.has(canonical)) continue;
    seen.add(canonical);
    out.push(canonical);
  }
  return out.sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function displaySetores(setores: string[]): string {
  if (setores.length === 0) return "Sem setor";
  return setores.join(" + ");
}

function departmentIdOf(model: GesttaTask): string {
  const dept = model.company_department;
  if (!dept) return "";
  return typeof dept === "string" ? dept : dept._id;
}

function deptNameOf(model: GesttaTask, deptNames: Map<string, string>): string {
  const dept = model.company_department;
  if (dept && typeof dept === "object" && dept.name) return dept.name;
  const id = departmentIdOf(model);
  return deptNames.get(id) ?? id;
}

function idOfUnknown(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value) {
    return String((value as { _id?: unknown })._id ?? "");
  }
  return "";
}

function nameOfUnknown(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return name == null ? "" : String(name);
  }
  return "";
}

function looksLikeObjectId(value: string): boolean {
  return /^[a-f0-9]{24}$/i.test(value);
}

function userIdOf(link: RichTaskLink): string {
  return idOfUnknown(link.company_user);
}

function userNameOf(
  value: unknown,
  userId: string,
  usersById: Map<string, UsuarioGestta>,
): string {
  if (value && typeof value === "object") {
    const name = nameOfUnknown(value).trim();
    if (name && !looksLikeObjectId(name)) return name;
  }
  return usersById.get(userId)?.name?.trim() || "";
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

function departmentNamesOfUser(
  user: UsuarioGestta | undefined,
  deptNames: Map<string, string>,
): string[] {
  if (!user) return [];
  const raw =
    user.company_departments ??
    user.company_department ??
    user.departments ??
    user.department;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const names: string[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      names.push(deptNames.get(item) ?? item);
      continue;
    }
    if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const name = rec.name != null ? String(rec.name).trim() : "";
      const id = rec._id != null ? String(rec._id) : "";
      names.push(name || deptNames.get(id) || id);
    }
  }
  return names.map((name) => name.trim()).filter(Boolean);
}

function majoritySetor(counts: Map<string, number>): string[] {
  if (counts.size === 0) return [];
  const max = Math.max(...counts.values());
  return [...counts.entries()]
    .filter(([, qtd]) => qtd === max)
    .map(([setor]) => setor)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function isDivergente(setorTarefa: string, setoresColaborador: string[]): boolean {
  if (!setorTarefa || setorTarefa === "Sem setor") return false;
  if (setoresColaborador.length === 0) return false;
  return !setoresColaborador.includes(setorTarefa);
}

function competenceOf(value: unknown): string | undefined {
  if (!value) return undefined;
  const raw = String(value);
  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    if (year && month) return `${year}-${month}`;
  }
  const match = /^(\d{4})-(\d{2})/.exec(raw);
  return match ? `${match[1]}-${match[2]}` : undefined;
}

function isCompetence(value: string | undefined): value is CompetenceKey {
  return value === "2026-08" || value === "2026-09";
}

function formatDate(value: unknown): string {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return year && month && day ? `${day}/${month}/${year}` : raw;
}

function statusLabel(status: string): string {
  const key = String(status || "").toUpperCase();
  return STATUS_LABEL[key] || status || "";
}

function competenceLabel(competence: CompetenceKey): string {
  return competence === "2026-08" ? "Agosto/2026" : "Setembro/2026";
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

async function listarDepartamentos(
  client: AxiosInstance,
): Promise<Map<string, string>> {
  const deptNames = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data } = await client.get<
      | { docs?: Array<{ _id: string; name: string }>; hasNextPage?: boolean }
      | Array<{ _id: string; name: string }>
    >("/admin/company/department", { params: { limit: LIMIT, page } });
    const depts = asArray<{ _id: string; name: string }>(data);
    for (const dept of depts) deptNames.set(dept._id, dept.name);
    const hasNext =
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Boolean((data as { hasNextPage?: boolean }).hasNextPage);
    if (!hasNext || depts.length === 0) break;
    page += 1;
  }
  return deptNames;
}

async function listarFuncionarios(
  client: AxiosInstance,
  active?: boolean,
): Promise<UsuarioGestta[]> {
  const usuarios: UsuarioGestta[] = [];
  let page = 1;
  for (;;) {
    const params: Record<string, string | number | boolean> = {
      limit: LIMIT,
      page,
    };
    if (active !== undefined) params.active = active;
    const { data } = await client.get<
      UsuarioGestta[] | { docs?: UsuarioGestta[]; hasNextPage?: boolean }
    >("/admin/company/user", { params });
    const docs = asArray<UsuarioGestta>(data);
    usuarios.push(...docs);
    const hasNext =
      data &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      Boolean((data as { hasNextPage?: boolean }).hasNextPage);
    if (!hasNext || docs.length === 0) break;
    page += 1;
  }
  return usuarios;
}

async function listarSetoresApi3001(): Promise<Map<string, string>> {
  const base = (
    process.env.API_3001_URL ||
    process.env.LOCAL_API_URL ||
    ""
  ).replace(/\/+$/, "");
  if (!base) return new Map();
  const byKey = new Map<string, string>();
  try {
    const client = axios.create({
      baseURL: base,
      timeout: 8000,
      headers: { accept: "application/json" },
    });
    let offset = 0;
    for (;;) {
      const { data } = await client.get<{
        data?: Array<Record<string, unknown>>;
        total?: number;
        limit?: number;
      }>("/api/employees", { params: { limit: LIMIT, offset } });
      const pagina = Array.isArray(data?.data) ? data.data : [];
      for (const item of pagina) {
        const deptRaw =
          item.department_name ??
          item.department ??
          (item.department && typeof item.department === "object"
            ? (item.department as { name?: unknown }).name
            : undefined);
        const setor = String(deptRaw ?? "").trim();
        if (!setor) continue;
        const id = String(item.employee_id ?? item._id ?? "").trim();
        const name = String(item.name ?? "").trim();
        if (id) byKey.set(`id:${id}`, setor);
        if (name) byKey.set(`name:${normalizeKey(name)}`, setor);
      }
      if (pagina.length === 0) break;
      offset += pagina.length;
      if (typeof data?.total === "number" && offset >= data.total) break;
      if (pagina.length < (data?.limit || LIMIT)) break;
    }
  } catch {
    return new Map();
  }
  return byKey;
}

function modelIdOfGenerated(
  task: GeneratedCustomerTask,
  byId: Map<string, GesttaTask>,
  byName: Map<string, GesttaTask[]>,
): GesttaTask | undefined {
  const rec = task as GeneratedCustomerTask & { company_task?: unknown };
  const id = idOfUnknown(rec.company_task);
  if (id && byId.has(id)) return byId.get(id);
  const matches = byName.get(normalizeKey(task.name)) ?? [];
  return matches.length === 1 ? matches[0] : undefined;
}

function writeWorkbook(
  filePath: string,
  resumo: Array<Record<string, string | number>>,
  divergentes: VinculoLinha[],
  instancias: InstanciaLinha[],
  semResponsavel: VinculoLinha[],
  setorIndefinido: VinculoLinha[],
  colaboradores: ColaboradorLinha[],
): void {
  const vinculoSheet = (rows: VinculoLinha[]) =>
    rows.map((row) => ({
      "Código Gestta": row.codigoGestta,
      Empresa: row.nomeGestta,
      CNPJ: row.cnpj,
      "Ativo Gestta":
        row.ativoGestta == null ? "" : row.ativoGestta ? "sim" : "não",
      Tarefa: row.taskName,
      "Setor da tarefa (bruto)": row.setorTarefaBruto,
      "Setor da tarefa": row.setorTarefa,
      "Modelo ativo": row.modeloAtivo ? "sim" : "não",
      Responsável: row.companyUserName,
      "Setor do colaborador": row.setorColaborador,
      "Setores do colaborador": row.setoresColaborador.join(" | "),
      "Setores brutos": row.setoresColaboradorBrutos.join(" | "),
      "Origem do setor": row.origemSetor,
      "Usuário ativo":
        row.userActive == null ? "" : row.userActive ? "sim" : "não",
      "ID modelo": row.taskId,
      "ID vínculo": row.linkId,
      "ID usuário": row.companyUserId,
      "Customer ID": row.customerId,
    }));

  const instanciaSheet = instancias.map((row) => ({
    "Código Gestta": row.codigoGestta,
    Empresa: row.nomeGestta,
    CNPJ: row.cnpj,
    Tarefa: row.taskName,
    "Setor da tarefa": row.setorTarefa,
    Competência: competenceLabel(row.competence),
    Status: statusLabel(row.status),
    "Data competência": row.competenceDate,
    Meta: row.dueDate || row.closeDate,
    "Data legal": row.legalDate,
    "Responsável do vínculo": row.companyUserName,
    "Setor no vínculo": row.setorColaborador,
    "Responsável da instância": row.instanciaUserName,
    "Setor na instância": row.instanciaSetor,
    "Origem do setor": row.instanciaOrigemSetor || row.origemSetor,
    "Ainda diverge": row.aindaDiverge ? "sim" : "não",
    "ID instância": row.instanciaId,
    "ID modelo": row.taskId,
    "Customer ID": row.customerId,
  }));

  const colaboradorSheet = colaboradores.map((row) => ({
    Colaborador: row.nome,
    Email: row.email,
    Ativo: row.ativo == null ? "" : row.ativo ? "sim" : "não",
    "Setor (cadastro)": row.setorDisplay,
    "Setores canônicos": row.setoresCanonicos.join(" | "),
    "Setores brutos": row.setoresBrutos.join(" | "),
    "Origem do setor": row.origemSetor,
    "Setor inferido pelos vínculos": row.setorInferido,
    "Qtd vínculos": row.qtdVinculos,
    "Qtd divergentes": row.qtdDivergentes,
    "ID usuário": row.userId,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(resumo.length > 0 ? resumo : emptySheet(["Item", "Qtd"])),
    "Resumo",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      divergentes.length > 0
        ? vinculoSheet(divergentes)
        : emptySheet(["Código Gestta", "Empresa", "Tarefa"]),
    ),
    "Vinculos divergentes",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      instanciaSheet.length > 0
        ? instanciaSheet
        : emptySheet(["Código Gestta", "Empresa", "Tarefa", "Competência"]),
    ),
    "Instancias geradas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      semResponsavel.length > 0
        ? vinculoSheet(semResponsavel)
        : emptySheet(["Código Gestta", "Empresa", "Tarefa"]),
    ),
    "Sem responsavel",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      setorIndefinido.length > 0
        ? vinculoSheet(setorIndefinido)
        : emptySheet(["Código Gestta", "Empresa", "Responsável"]),
    ),
    "Setor indefinido",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      colaboradorSheet.length > 0
        ? colaboradorSheet
        : emptySheet(["Colaborador", "Setor (cadastro)"]),
    ),
    "Colaboradores",
  );
  XLSX.writeFile(workbook, filePath);
}

function sortVinculos(rows: VinculoLinha[]): VinculoLinha[] {
  return rows.slice().sort((a, b) => {
    const setor = a.setorTarefa.localeCompare(b.setorTarefa, "pt-BR");
    if (setor) return setor;
    const colab = a.setorColaborador.localeCompare(b.setorColaborador, "pt-BR");
    if (colab) return colab;
    const tarefa = a.taskName.localeCompare(b.taskName, "pt-BR");
    if (tarefa) return tarefa;
    return a.codigoGestta.localeCompare(b.codigoGestta, undefined, {
      numeric: true,
    });
  });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  fs.mkdirSync(args.reportsDir, { recursive: true });

  const client = createGesttaClient(getJwt());
  console.log("[setor-vs-colaborador] carregando departamentos...");
  const deptNames = await listarDepartamentos(client);
  console.log(`[setor-vs-colaborador] departamentos=${deptNames.size}`);

  console.log("[setor-vs-colaborador] carregando usuarios...");
  const [ativosUsers, inativosUsers] = await Promise.all([
    listarFuncionarios(client, true),
    listarFuncionarios(client, false),
  ]);
  const usersById = new Map<string, UsuarioGestta>();
  for (const user of [...ativosUsers, ...inativosUsers]) {
    if (!usersById.has(user._id)) usersById.set(user._id, user);
  }
  console.log(`[setor-vs-colaborador] usuarios=${usersById.size}`);

  console.log("[setor-vs-colaborador] tentando API 3001 /api/employees...");
  const setoresLocal = await listarSetoresApi3001();
  console.log(
    `[setor-vs-colaborador] api3001 setores=${setoresLocal.size || "indisponivel"}`,
  );

  console.log("[setor-vs-colaborador] carregando clientes...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const indexes = indexarClientes([...ativos, ...inativos]);
  console.log(
    `[setor-vs-colaborador] clientes=${indexes.byId.size} (ativos=${ativos.length} inativos=${inativos.length})`,
  );

  console.log("[setor-vs-colaborador] carregando modelos recorrentes...");
  const models = await listarTarefasRecorrentes(client);
  const byTaskId = new Map(models.map((task) => [task._id, task]));
  const byTaskName = new Map<string, GesttaTask[]>();
  for (const model of models) {
    const key = normalizeKey(model.name);
    const list = byTaskName.get(key) ?? [];
    list.push(model);
    byTaskName.set(key, list);
  }
  console.log(`[setor-vs-colaborador] modelos recorrentes=${models.length}`);

  let doneModels = 0;
  const vinculosRaw = await mapPool(models, args.concurrency, async (model) => {
    const links = (await withRetry(`vinculos ${model.name}`, () =>
      listarClientesDaTarefa(client, model._id),
    )) as RichTaskLink[];
    doneModels += 1;
    if (doneModels % 25 === 0 || doneModels === models.length) {
      console.log(
        `[setor-vs-colaborador] modelos ${doneModels}/${models.length}`,
      );
    }
    return { model, links };
  });

  const cadastroByUser = new Map<
    string,
    { brutos: string[]; canonicos: string[] }
  >();
  for (const user of usersById.values()) {
    const brutos = departmentNamesOfUser(user, deptNames);
    cadastroByUser.set(user._id, {
      brutos,
      canonicos: uniqueCanonical(brutos),
    });
  }

  const countsByUser = new Map<string, Map<string, number>>();
  const allVinculos: VinculoLinha[] = [];

  for (const { model, links } of vinculosRaw) {
    const setorTarefaBruto = deptNameOf(model, deptNames);
    const setorTarefa = normalizarSetor(setorTarefaBruto);
    for (const link of links) {
      const asLink = link as unknown as Parameters<typeof customerIdOf>[0];
      const customerId = customerIdOf(asLink);
      if (!customerId) continue;
      const cliente = indexes.byId.get(customerId);
      const companyUserId = userIdOf(link);
      const companyUserName = userNameOf(
        link.company_user,
        companyUserId,
        usersById,
      );
      if (companyUserId && setorTarefa !== "Sem setor") {
        const counts = countsByUser.get(companyUserId) ?? new Map<string, number>();
        counts.set(setorTarefa, (counts.get(setorTarefa) ?? 0) + 1);
        countsByUser.set(companyUserId, counts);
      }
      allVinculos.push({
        linkId: link._id,
        taskId: model._id,
        taskName: model.name,
        modeloAtivo: model.active !== false,
        setorTarefaBruto,
        setorTarefa,
        customerId,
        codigoGestta: customerCodeOf(link, cliente),
        nomeGestta:
          customerNameOf(asLink) || cliente?.name || customerId,
        cnpj: customerCnpjOf(link, cliente),
        ativoGestta: cliente?.active,
        companyUserId,
        companyUserName,
        userActive: usersById.get(companyUserId)?.active,
        setoresColaboradorBrutos: [],
        setoresColaborador: [],
        setorColaborador: "",
        origemSetor: "",
      });
    }
  }

  console.log(`[setor-vs-colaborador] vinculos=${allVinculos.length}`);

  const resolvedByUser = new Map<
    string,
    {
      brutos: string[];
      canonicos: string[];
      origem: OrigemSetor | "";
      inferido: string[];
    }
  >();

  const userIds = new Set<string>();
  for (const row of allVinculos) {
    if (row.companyUserId) userIds.add(row.companyUserId);
  }
  for (const userId of usersById.keys()) userIds.add(userId);

  for (const userId of userIds) {
    const user = usersById.get(userId);
    const cadastro = cadastroByUser.get(userId);
    const inferido = majoritySetor(countsByUser.get(userId) ?? new Map());
    let brutos = cadastro?.brutos ?? [];
    let canonicos = cadastro?.canonicos ?? [];
    let origem: OrigemSetor | "" = canonicos.length > 0 ? "cadastro Gestta" : "";

    if (canonicos.length === 0 && setoresLocal.size > 0) {
      const local =
        setoresLocal.get(`id:${userId}`) ||
        (user?.name ? setoresLocal.get(`name:${normalizeKey(user.name)}`) : undefined);
      if (local) {
        brutos = [local];
        canonicos = uniqueCanonical([local]);
        origem = "API 3001";
      }
    }

    if (canonicos.length === 0 && inferido.length > 0) {
      canonicos = inferido;
      origem = "inferido pelos vínculos";
    }

    resolvedByUser.set(userId, {
      brutos,
      canonicos,
      origem,
      inferido,
    });
  }

  for (const row of allVinculos) {
    if (!row.companyUserId) continue;
    const resolved = resolvedByUser.get(row.companyUserId);
    row.setoresColaboradorBrutos = resolved?.brutos ?? [];
    row.setoresColaborador = resolved?.canonicos ?? [];
    row.setorColaborador = displaySetores(row.setoresColaborador);
    row.origemSetor = resolved?.origem ?? "";
  }

  const semResponsavel = sortVinculos(
    allVinculos.filter((row) => !row.companyUserId),
  );
  const comResponsavel = allVinculos.filter((row) => Boolean(row.companyUserId));
  const setorIndefinido = sortVinculos(
    comResponsavel.filter((row) => row.setoresColaborador.length === 0),
  );
  const divergentes = sortVinculos(
    comResponsavel.filter((row) =>
      isDivergente(row.setorTarefa, row.setoresColaborador),
    ),
  );

  const paresDivergentes = new Map<string, VinculoLinha[]>();
  for (const row of divergentes) {
    const key = `${row.customerId}::${row.taskId}`;
    const list = paresDivergentes.get(key) ?? [];
    list.push(row);
    paresDivergentes.set(key, list);
  }
  const customerIdsDivergentes = [
    ...new Set(divergentes.map((row) => row.customerId)),
  ].sort((a, b) => a.localeCompare(b));

  console.log(
    `[setor-vs-colaborador] divergentes=${divergentes.length} empresas=${customerIdsDivergentes.length} semResponsavel=${semResponsavel.length} setorIndefinido=${setorIndefinido.length}`,
  );

  const instancias: InstanciaLinha[] = [];
  const falhasGeradas: Array<{ customerId: string; erro: string }> = [];
  let doneGeradas = 0;
  await mapPool(customerIdsDivergentes, args.concurrency, async (customerId) => {
    try {
      const geradas = await withRetry(`search ${customerId}`, () =>
        buscarTarefasGeradasCliente(client, customerId),
      );
      for (const task of geradas) {
        const competence = competenceOf(task.competence_date);
        if (!isCompetence(competence)) continue;
        const model = modelIdOfGenerated(task, byTaskId, byTaskName);
        if (!model) continue;
        const pares = paresDivergentes.get(`${customerId}::${model._id}`);
        if (!pares || pares.length === 0) continue;
        const vinculo = pares[0];
        const instanciaUserId = idOfUnknown(task.company_user);
        const instanciaUserName = userNameOf(
          task.company_user,
          instanciaUserId,
          usersById,
        );
        const resolvedInst =
          (instanciaUserId && resolvedByUser.get(instanciaUserId)) ||
          resolvedByUser.get(vinculo.companyUserId);
        const setoresInst = resolvedInst?.canonicos ?? [];
        const aindaDiverge = instanciaUserId
          ? isDivergente(vinculo.setorTarefa, setoresInst)
          : true;
        if (!aindaDiverge && instanciaUserId !== vinculo.companyUserId) continue;
        instancias.push({
          ...vinculo,
          instanciaId: String(task._id || ""),
          competence,
          status: String(task.status || ""),
          competenceDate: formatDate(task.competence_date),
          legalDate: formatDate(task.legal_date),
          dueDate: formatDate(task.due_date),
          closeDate: formatDate(task.close_date),
          instanciaUserId,
          instanciaUserName,
          instanciaSetor: displaySetores(setoresInst),
          instanciaOrigemSetor: resolvedInst?.origem ?? "",
          aindaDiverge,
        });
      }
    } catch (error) {
      falhasGeradas.push({
        customerId,
        erro: axiosErrorDetail(error),
      });
    }
    doneGeradas += 1;
    if (
      doneGeradas % 25 === 0 ||
      doneGeradas === customerIdsDivergentes.length
    ) {
      console.log(
        `[setor-vs-colaborador] instancias ${doneGeradas}/${customerIdsDivergentes.length}`,
      );
    }
  });

  instancias.sort((a, b) => {
    const comp = a.competence.localeCompare(b.competence);
    if (comp) return comp;
    const setor = a.setorTarefa.localeCompare(b.setorTarefa, "pt-BR");
    if (setor) return setor;
    const tarefa = a.taskName.localeCompare(b.taskName, "pt-BR");
    if (tarefa) return tarefa;
    return a.codigoGestta.localeCompare(b.codigoGestta, undefined, {
      numeric: true,
    });
  });

  const paresResumo = new Map<string, number>();
  for (const row of divergentes) {
    const key = `${row.setorTarefa} → ${row.setorColaborador}`;
    paresResumo.set(key, (paresResumo.get(key) ?? 0) + 1);
  }
  const paresOrdenados = [...paresResumo.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
  );

  const vinculosPorUser = new Map<string, number>();
  const divergentesPorUser = new Map<string, number>();
  for (const row of comResponsavel) {
    vinculosPorUser.set(
      row.companyUserId,
      (vinculosPorUser.get(row.companyUserId) ?? 0) + 1,
    );
  }
  for (const row of divergentes) {
    divergentesPorUser.set(
      row.companyUserId,
      (divergentesPorUser.get(row.companyUserId) ?? 0) + 1,
    );
  }

  const colaboradores: ColaboradorLinha[] = [...usersById.values()]
    .map((user) => {
      const resolved = resolvedByUser.get(user._id);
      return {
        userId: user._id,
        nome: user.name,
        email: user.email ?? "",
        ativo: user.active,
        setoresBrutos: resolved?.brutos ?? [],
        setoresCanonicos: resolved?.canonicos ?? [],
        setorDisplay: displaySetores(resolved?.canonicos ?? []),
        origemSetor: resolved?.origem ?? "",
        qtdVinculos: vinculosPorUser.get(user._id) ?? 0,
        qtdDivergentes: divergentesPorUser.get(user._id) ?? 0,
        setorInferido: displaySetores(resolved?.inferido ?? []),
      };
    })
    .sort(
      (a, b) =>
        b.qtdDivergentes - a.qtdDivergentes ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );

  const paresComInstancia = new Set(
    instancias.map((row) => `${row.customerId}::${row.taskId}`),
  );
  const divergentesSemInstancia = divergentes.filter(
    (row) => !paresComInstancia.has(`${row.customerId}::${row.taskId}`),
  ).length;

  const resumo = [
    { Item: "Modelos recorrentes consultados", Qtd: models.length },
    { Item: "Vínculos totais", Qtd: allVinculos.length },
    { Item: "Vínculos divergentes", Qtd: divergentes.length },
    {
      Item: "Empresas com vínculo divergente",
      Qtd: customerIdsDivergentes.length,
    },
    {
      Item: "Instâncias geradas ago/set com divergência",
      Qtd: instancias.filter((item) => item.aindaDiverge).length,
    },
    { Item: "Instâncias geradas listadas", Qtd: instancias.length },
    {
      Item: "Vínculos divergentes sem instância ago/set",
      Qtd: divergentesSemInstancia,
    },
    { Item: "Vínculos sem responsável", Qtd: semResponsavel.length },
    { Item: "Vínculos com setor do colaborador indefinido", Qtd: setorIndefinido.length },
    { Item: "Falhas ao buscar instâncias", Qtd: falhasGeradas.length },
    ...paresOrdenados.map(([par, qtd]) => ({
      Item: `Par ${par}`,
      Qtd: qtd,
    })),
  ];

  const day = stampDate();
  const xlsxPath = path.join(
    args.reportsDir,
    `levantamento_setor_tarefa_vs_colaborador_${day}.xlsx`,
  );
  const jsonPath = path.join(
    args.reportsDir,
    `levantamento_setor_tarefa_vs_colaborador_${day}.json`,
  );

  writeWorkbook(
    xlsxPath,
    resumo,
    divergentes,
    instancias,
    semResponsavel,
    setorIndefinido,
    colaboradores,
  );

  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        criterio:
          "Setor canônico da tarefa (company_department do modelo) não está entre os setores canônicos do colaborador (company_departments no Gestta; fallback API 3001 ou setor mais frequente dos vínculos). Fiscal - Simples Nacional conta como Fiscal. Competências das instâncias: 2026-08 e 2026-09.",
        competences: COMPETENCES,
        resumo,
        totais: {
          modelos: models.length,
          vinculos: allVinculos.length,
          divergentes: divergentes.length,
          empresasDivergentes: customerIdsDivergentes.length,
          instancias: instancias.length,
          instanciasAindaDivergem: instancias.filter((item) => item.aindaDiverge)
            .length,
          semResponsavel: semResponsavel.length,
          setorIndefinido: setorIndefinido.length,
        },
        pares: paresOrdenados.map(([par, qtd]) => ({ par, qtd })),
        falhasGeradas,
        divergentes,
        instancias,
        semResponsavel,
        setorIndefinido,
        colaboradores,
      },
      null,
      2,
    ),
  );

  console.log(`[setor-vs-colaborador] excel=${xlsxPath}`);
  console.log(`[setor-vs-colaborador] json=${jsonPath}`);
  for (const item of resumo.slice(0, 10)) {
    console.log(`  ${item.Item}: ${item.Qtd}`);
  }
  for (const [par, qtd] of paresOrdenados.slice(0, 15)) {
    console.log(`  ${par}: ${qtd}`);
  }
  if (falhasGeradas.length > 0) {
    console.warn(
      `[setor-vs-colaborador] falhas de instancias=${falhasGeradas.length}`,
    );
  }
}

main().catch((error) => {
  console.error("[setor-vs-colaborador] falhou:", axiosErrorDetail(error));
  process.exit(1);
});
