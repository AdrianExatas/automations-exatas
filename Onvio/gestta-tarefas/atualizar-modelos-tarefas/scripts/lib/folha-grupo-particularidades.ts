import fs from "fs";
import path from "path";
import { AxiosInstance, isAxiosError } from "axios";
import * as XLSX from "xlsx";
import {
  customerIdOf,
  customerNameOf,
  listarClientesDaTarefa,
} from "../../src/endpoints";
import { GesttaTask } from "../../src/types";

export const DEFAULT_PARTICULARIDADES_DIR =
  "C:\\Users\\Exatas\\Downloads\\Planilhas\\Gerais\\Particularidades";

export const TASK_G1 = "FOLHA DE PAGAMENTO GERAL - GRUPO 1";
export const TASK_G2 = "FOLHA DE PAGAMENTO GERAL - GRUPO 2";
export const TASK_G1_WA = "FOLHA DE PAGAMENTO GERAL - GRUPO 1 - VIA WHATSAPP";
export const TASK_G2_WA = "FOLHA DE PAGAMENTO GERAL - GRUPO 2 - VIA WHATSAPP";
export const TARGET_NAMES = [TASK_G1, TASK_G2, TASK_G1_WA, TASK_G2_WA] as const;
export const REQUIRED_TASK_NAMES = [TASK_G1, TASK_G2] as const;

export type TargetTaskName = (typeof TARGET_NAMES)[number];
export type FolhaGrupo = "GRUPO 1" | "GRUPO 2";
export type EmpresaStatus =
  | "ok"
  | "ambos_grupos"
  | "grupo_errado"
  | "sem_tarefa"
  | "grupo_vazio_planilha"
  | "nao_encontrada"
  | "ambiguo"
  | "conflito_planilha";

export interface PlanilhaEmpresa {
  origemArquivo: string;
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  documentoDigits: string;
  responsavelPlanilha: string;
  grupoPlanilha?: FolhaGrupo;
  grupoBruto: string;
}

export interface ClienteGestta {
  _id: string;
  name: string;
  cnpj?: string;
  code?: string | number;
  active?: boolean;
}

export interface LinkAtual {
  taskId: string;
  taskName: TargetTaskName;
  grupo: FolhaGrupo;
  viaWhatsapp: boolean;
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

export interface RichTaskLink {
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

export interface KeepRow {
  taskName: TargetTaskName;
  taskId: string;
  linkId: string;
  customerId: string;
  codigo: string;
  empresa: string;
  cnpj: string;
  responsavelAtual: string;
  statusEmpresa: EmpresaStatus;
}

export interface RemovalRow extends LinkAtual {
  reason: "ambos_grupos" | "grupo_errado";
  grupoEsperado: FolhaGrupo;
  applyStatus?: "planned" | "ok" | "failed" | "skipped";
  applyDetail?: string;
}

export interface AdditionRow {
  taskName: TargetTaskName;
  taskId: string;
  customerId: string;
  codigoPlanilha: string;
  nomePlanilha: string;
  nomeGestta: string;
  cnpj: string;
  grupoEsperado: FolhaGrupo;
  fromTaskName?: TargetTaskName;
  responsibleId?: string;
  responsavelAtual?: string;
  applyStatus?: "planned" | "ok" | "failed" | "skipped";
  applyDetail?: string;
  newLinkId?: string;
}

export interface ClassificacaoEmpresa {
  origemArquivo: string;
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  grupoPlanilha?: FolhaGrupo;
  grupoBruto: string;
  status: EmpresaStatus;
  detalhe: string;
  customerId?: string;
  codigoGestta?: string;
  nomeGestta?: string;
  ativoGestta?: boolean;
  tarefasAtuais: string[];
  grupoGestta: string;
}

export interface PlanoFolhaGrupo {
  classificacoes: ClassificacaoEmpresa[];
  keeps: KeepRow[];
  removals: RemovalRow[];
  additions: AdditionRow[];
}

const LIMIT = 500;

export function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\u00a0/g, " ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanCode(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

export function axiosErrorDetail(error: unknown): string {
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

export function isTransientHttpError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  const status = error.response?.status;
  return status === 502 || status === 503 || status === 504 || status === 429;
}

export async function withRetry<T>(
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

export function parseGrupo(value: unknown): FolhaGrupo | undefined {
  const key = normalizeText(value).replace(/-/g, " ").replace(/\s+/g, " ");
  if (!key) return undefined;
  if (key === "GRUPO 1" || key === "GRUPO1" || key === "G1") return "GRUPO 1";
  if (key === "GRUPO 2" || key === "GRUPO2" || key === "G2") return "GRUPO 2";
  if (key.includes("GRUPO 1")) return "GRUPO 1";
  if (key.includes("GRUPO 2")) return "GRUPO 2";
  return undefined;
}

export function grupoOfTaskName(name: string): FolhaGrupo | undefined {
  const key = normalizeText(name);
  if (!key.includes("FOLHA DE PAGAMENTO GERAL")) return undefined;
  if (key.includes("GRUPO 1")) return "GRUPO 1";
  if (key.includes("GRUPO 2")) return "GRUPO 2";
  return undefined;
}

export function isWhatsAppTask(name: string): boolean {
  return normalizeText(name).includes("VIA WHATSAPP");
}

export function expectedNormalTask(grupo: FolhaGrupo): TargetTaskName {
  return grupo === "GRUPO 1" ? TASK_G1 : TASK_G2;
}

export function oppositeGrupo(grupo: FolhaGrupo): FolhaGrupo {
  return grupo === "GRUPO 1" ? "GRUPO 2" : "GRUPO 1";
}

function findSheetName(names: string[], needle: string): string | undefined {
  const key = normalizeText(needle);
  return names.find((name) => normalizeText(name).includes(key));
}

function headerIndex(
  headers: string[],
  matchers: Array<(header: string) => boolean>,
): number {
  for (const matcher of matchers) {
    const index = headers.findIndex(matcher);
    if (index >= 0) return index;
  }
  return -1;
}

function findHeaderRow(
  rows: (string | number | null)[][],
): { rowIndex: number; headers: string[] } | undefined {
  for (let i = 0; i < Math.min(6, rows.length); i += 1) {
    const headers = (rows[i] ?? []).map((cell) => normalizeText(cell));
    const hasCod = headers.some(
      (header) => header === "COD." || header === "COD" || header === "CODIGO",
    );
    const hasRazao = headers.some((header) => header.includes("RAZAO SOCIAL"));
    if (hasCod && hasRazao) return { rowIndex: i, headers };
  }
  return undefined;
}

function isJunkRow(codigo: string, nome: string, documento: string): boolean {
  if (!codigo && !nome && !documento) return true;
  if (codigo === "0" && (!nome || nome === "0") && !documento) return true;
  return false;
}

function parseWorkbook(
  filePath: string,
): { empresas: PlanilhaEmpresa[]; avisos: string[] } {
  const origemArquivo = path.basename(filePath);
  const workbook = XLSX.readFile(filePath);
  const identName = findSheetName(workbook.SheetNames, "Identific");
  const partName = findSheetName(workbook.SheetNames, "Particularidade");
  if (!identName || !partName) {
    throw new Error(
      `Abas Identificacao/Particularidade nao encontradas em ${origemArquivo}`,
    );
  }

  const identRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
    workbook.Sheets[identName],
    { header: 1, defval: null, raw: true },
  );
  const partRows = XLSX.utils.sheet_to_json<(string | number | null)[]>(
    workbook.Sheets[partName],
    { header: 1, defval: null, raw: true },
  );
  const identHeader = findHeaderRow(identRows);
  const partHeader = findHeaderRow(partRows);
  if (!identHeader || !partHeader) {
    throw new Error(`Cabecalho CÓD./RAZÃO SOCIAL nao encontrado em ${origemArquivo}`);
  }

  const identCod = headerIndex(identHeader.headers, [
    (h) => h === "COD." || h === "COD" || h === "CODIGO",
  ]);
  const identNome = headerIndex(identHeader.headers, [
    (h) => h.includes("RAZAO SOCIAL"),
  ]);
  const identDoc = headerIndex(identHeader.headers, [(h) => h.includes("CNPJ")]);
  const identResp = headerIndex(identHeader.headers, [
    (h) => h.includes("RESPONSAVEL INTERNO"),
  ]);
  const partCod = headerIndex(partHeader.headers, [
    (h) => h === "COD." || h === "COD" || h === "CODIGO",
  ]);
  const partNome = headerIndex(partHeader.headers, [
    (h) => h.includes("RAZAO SOCIAL"),
  ]);
  const partGrupo = headerIndex(partHeader.headers, [
    (h) => h.includes("DATA DE PAGAMENTO FOLHA"),
    (h) => h.includes("PAGAMENTO FOLHA"),
  ]);
  const partResp = headerIndex(partHeader.headers, [
    (h) => h.includes("RESPONSAVEL INTERNO"),
  ]);
  if (identCod < 0 || identNome < 0 || partCod < 0 || partGrupo < 0) {
    throw new Error(`Colunas obrigatorias ausentes em ${origemArquivo}`);
  }

  const identByCode = new Map<
    string,
    { nome: string; documento: string; responsavel: string }
  >();
  for (let i = identHeader.rowIndex + 1; i < identRows.length; i += 1) {
    const row = identRows[i] ?? [];
    const codigo = cleanCode(row[identCod]);
    const nome = row[identNome] == null ? "" : String(row[identNome]).trim();
    const documento =
      identDoc < 0 || row[identDoc] == null ? "" : String(row[identDoc]).trim();
    const responsavel =
      identResp < 0 || row[identResp] == null
        ? ""
        : String(row[identResp]).trim();
    if (isJunkRow(codigo, nome, documento) || !codigo) continue;
    identByCode.set(codigo, { nome, documento, responsavel });
  }

  const empresas: PlanilhaEmpresa[] = [];
  const avisos: string[] = [];
  for (let i = partHeader.rowIndex + 1; i < partRows.length; i += 1) {
    const row = partRows[i] ?? [];
    const codigo = cleanCode(row[partCod]);
    const nomePart =
      partNome < 0 || row[partNome] == null ? "" : String(row[partNome]).trim();
    const ident = identByCode.get(codigo);
    const nome = ident?.nome || nomePart;
    const documento = ident?.documento ?? "";
    if (isJunkRow(codigo, nome, documento)) continue;
    const grupoBruto =
      row[partGrupo] == null ? "" : String(row[partGrupo]).trim();
    const grupoPlanilha = parseGrupo(grupoBruto);
    if (grupoBruto && !grupoPlanilha) {
      avisos.push(
        `${origemArquivo} codigo=${codigo}: valor inesperado em DATA DE PAGAMENTO FOLHA: ${grupoBruto}`,
      );
    }
    empresas.push({
      origemArquivo,
      codigoPlanilha: codigo,
      nomePlanilha: nome,
      documento,
      documentoDigits: digitsOnly(documento),
      responsavelPlanilha:
        ident?.responsavel ||
        (partResp < 0 || row[partResp] == null
          ? ""
          : String(row[partResp]).trim()),
      grupoPlanilha,
      grupoBruto,
    });
  }
  return { empresas, avisos };
}

export function lerParticularidades(
  dirPath: string,
): { empresas: PlanilhaEmpresa[]; avisos: string[]; arquivos: string[] } {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Pasta de particularidades nao encontrada: ${dirPath}`);
  }
  const arquivos = fs
    .readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith(".xlsx") && !name.startsWith("~$"))
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((name) => path.join(dirPath, name));
  if (arquivos.length === 0) {
    throw new Error(`Nenhuma planilha .xlsx encontrada em ${dirPath}`);
  }
  const empresas: PlanilhaEmpresa[] = [];
  const avisos: string[] = [];
  for (const arquivo of arquivos) {
    try {
      const parsed = parseWorkbook(arquivo);
      empresas.push(...parsed.empresas);
      avisos.push(...parsed.avisos);
    } catch (error) {
      avisos.push(
        `${path.basename(arquivo)}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
  return {
    empresas,
    avisos,
    arquivos: arquivos.map((item) => path.basename(item)),
  };
}

export function codeOf(cliente: ClienteGestta): string {
  if (cliente.code == null || cliente.code === "") return "";
  return String(cliente.code).trim();
}

export async function listarClientes(
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

export function indexarClientes(clientes: ClienteGestta[]): {
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

export function resolverCliente(
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

export function findUniqueTaskByName(
  tasks: GesttaTask[],
  name: string,
): GesttaTask {
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

export function findTaskByNameOptional(
  tasks: GesttaTask[],
  name: string,
): GesttaTask | undefined {
  const key = normalizeText(name);
  const matches = tasks.filter((task) => normalizeText(task.name) === key);
  return matches.length === 1 ? matches[0] : undefined;
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

export async function snapshotLinks(
  client: AxiosInstance,
  tasks: Partial<Record<TargetTaskName, GesttaTask>>,
  indexes: ReturnType<typeof indexarClientes>,
): Promise<LinkAtual[]> {
  const links: LinkAtual[] = [];
  for (const name of TARGET_NAMES) {
    const task = tasks[name];
    if (!task) continue;
    const grupo = grupoOfTaskName(name);
    if (!grupo) continue;
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
        grupo,
        viaWhatsapp: isWhatsAppTask(name),
        linkId: link._id,
        customerId,
        customerCode: customerCodeOf(link, cliente),
        customerName: customerNameOf(asLink) ?? cliente?.name ?? customerId,
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

function grupoGesttaLabel(links: LinkAtual[]): string {
  const grupos = [...new Set(links.map((item) => item.grupo))];
  if (grupos.length === 0) return "";
  if (grupos.length === 1) return grupos[0];
  return "GRUPO 1+2";
}

export function montarPlano(
  planilha: PlanilhaEmpresa[],
  indexes: ReturnType<typeof indexarClientes>,
  tasks: Partial<Record<TargetTaskName, GesttaTask>>,
  currentLinks: LinkAtual[],
): PlanoFolhaGrupo {
  const linksByCustomer = new Map<string, LinkAtual[]>();
  for (const link of currentLinks) {
    const list = linksByCustomer.get(link.customerId) ?? [];
    list.push(link);
    linksByCustomer.set(link.customerId, list);
  }

  type Resolved = {
    empresa: PlanilhaEmpresa;
    status: "ok" | "nao_encontrada" | "ambiguo";
    detalhe: string;
    cliente?: ClienteGestta;
  };
  const resolved: Resolved[] = planilha.map((empresa) => {
    const match = resolverCliente(empresa, indexes);
    if (match.status !== "ok") {
      return { empresa, status: match.status, detalhe: match.detalhe };
    }
    return {
      empresa,
      status: "ok",
      detalhe: match.detalhe,
      cliente: match.cliente,
    };
  });

  const classificacoes: ClassificacaoEmpresa[] = [];
  const keeps: KeepRow[] = [];
  const removals: RemovalRow[] = [];
  const additions: AdditionRow[] = [];
  const seenRemoval = new Set<string>();
  const seenAddition = new Set<string>();

  const pushClassificacao = (
    item: Resolved,
    status: EmpresaStatus,
    detalhe: string,
    links: LinkAtual[] = [],
  ): void => {
    classificacoes.push({
      origemArquivo: item.empresa.origemArquivo,
      codigoPlanilha: item.empresa.codigoPlanilha,
      nomePlanilha: item.empresa.nomePlanilha,
      documento: item.empresa.documento,
      grupoPlanilha: item.empresa.grupoPlanilha,
      grupoBruto: item.empresa.grupoBruto,
      status,
      detalhe,
      customerId: item.cliente?._id,
      codigoGestta: item.cliente ? codeOf(item.cliente) : undefined,
      nomeGestta: item.cliente?.name,
      ativoGestta: item.cliente ? item.cliente.active !== false : undefined,
      tarefasAtuais: links.map((link) => link.taskName),
      grupoGestta: grupoGesttaLabel(links),
    });
  };

  const byCustomer = new Map<string, Resolved[]>();
  for (const item of resolved) {
    if (item.status !== "ok" || !item.cliente) {
      if (!item.empresa.grupoPlanilha) {
        pushClassificacao(
          item,
          "grupo_vazio_planilha",
          item.status === "ok"
            ? "DATA DE PAGAMENTO FOLHA vazio; sem correcao automatica"
            : `DATA DE PAGAMENTO FOLHA vazio; ${item.detalhe}`,
        );
      } else {
        pushClassificacao(item, item.status, item.detalhe);
      }
      continue;
    }
    const list = byCustomer.get(item.cliente._id) ?? [];
    list.push(item);
    byCustomer.set(item.cliente._id, list);
  }

  for (const [customerId, items] of byCustomer) {
    const cliente = items[0].cliente!;
    const links = linksByCustomer.get(customerId) ?? [];
    const gruposDefinidos = [
      ...new Set(
        items
          .map((item) => item.empresa.grupoPlanilha)
          .filter((grupo): grupo is FolhaGrupo => Boolean(grupo)),
      ),
    ];
    const semGrupo = items.filter((item) => !item.empresa.grupoPlanilha);

    if (gruposDefinidos.length === 0) {
      for (const item of items) {
        pushClassificacao(
          item,
          "grupo_vazio_planilha",
          "DATA DE PAGAMENTO FOLHA vazio; sem correcao automatica",
          links,
        );
      }
      continue;
    }

    if (gruposDefinidos.length > 1) {
      for (const item of items) {
        pushClassificacao(
          item,
          "conflito_planilha",
          `Grupos conflitantes na planilha: ${gruposDefinidos.join(" / ")}`,
          links,
        );
      }
      continue;
    }

    const esperado = gruposDefinidos[0];
    const desejados = links.filter((link) => link.grupo === esperado);
    const errados = links.filter((link) => link.grupo === oppositeGrupo(esperado));
    let status: EmpresaStatus = "ok";
    let detalhe = items[0].detalhe;
    if (desejados.length > 0 && errados.length > 0) {
      status = "ambos_grupos";
      detalhe = `Tem ${esperado} e ${oppositeGrupo(esperado)}; remover o grupo errado`;
    } else if (desejados.length === 0 && errados.length > 0) {
      status = "grupo_errado";
      detalhe = `Somente ${oppositeGrupo(esperado)}; mover para ${esperado}`;
    } else if (desejados.length === 0 && errados.length === 0) {
      status = "sem_tarefa";
      detalhe = `Sem Folha Geral G1/G2; adicionar ${expectedNormalTask(esperado)}`;
    } else {
      detalhe = `Alinhado em ${esperado}${
        desejados.some((link) => link.viaWhatsapp) ? " (inclui VIA WHATSAPP)" : ""
      }`;
    }
    if (semGrupo.length > 0) {
      detalhe += `; ${semGrupo.length} linha(s) sem grupo ignorada(s)`;
    }

    for (const item of items) {
      pushClassificacao(item, status, detalhe, links);
    }

    for (const link of desejados) {
      keeps.push({
        taskName: link.taskName,
        taskId: link.taskId,
        linkId: link.linkId,
        customerId: link.customerId,
        codigo: link.customerCode,
        empresa: link.customerName,
        cnpj: link.cnpj,
        responsavelAtual: link.companyUserName ?? "",
        statusEmpresa: status,
      });
    }

    if (status === "ok") continue;

    for (const link of errados) {
      if (seenRemoval.has(link.linkId)) continue;
      seenRemoval.add(link.linkId);
      removals.push({
        ...link,
        reason: status === "ambos_grupos" ? "ambos_grupos" : "grupo_errado",
        grupoEsperado: esperado,
        applyStatus: "planned",
      });
    }

    if (status === "sem_tarefa" || status === "grupo_errado") {
      const taskName = expectedNormalTask(esperado);
      const task = tasks[taskName];
      if (!task) {
        continue;
      }
      const addKey = `${task._id}:${customerId}`;
      if (seenAddition.has(addKey)) continue;
      seenAddition.add(addKey);
      const donor = [...errados, ...desejados].find((link) => link.companyUserId);
      const origem = items[0].empresa;
      additions.push({
        taskName,
        taskId: task._id,
        customerId,
        codigoPlanilha: origem.codigoPlanilha,
        nomePlanilha: origem.nomePlanilha,
        nomeGestta: cliente.name,
        cnpj: origem.documento || cliente.cnpj || "",
        grupoEsperado: esperado,
        fromTaskName: errados[0]?.taskName,
        responsibleId: donor?.companyUserId,
        responsavelAtual: donor?.companyUserName,
        applyStatus: "planned",
        applyDetail: donor?.companyUserId
          ? "Adicionar e preservar responsavel do vinculo Folha existente"
          : "Adicionar sem alterar responsavel",
      });
    }
  }

  classificacoes.sort(
    (a, b) =>
      a.codigoPlanilha.localeCompare(b.codigoPlanilha, undefined, {
        numeric: true,
      }) || a.nomePlanilha.localeCompare(b.nomePlanilha, "pt-BR"),
  );
  return { classificacoes, keeps, removals, additions };
}

export function emptySheet(headers: string[]): Record<string, string>[] {
  const row: Record<string, string> = {};
  for (const header of headers) row[header] = "";
  return [row];
}

export function contarStatus(
  classificacoes: ClassificacaoEmpresa[],
): Record<string, number> {
  return classificacoes.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}
