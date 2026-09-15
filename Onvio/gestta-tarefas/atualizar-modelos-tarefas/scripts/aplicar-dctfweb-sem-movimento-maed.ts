/**
 * Troca reversível: remove vínculos do setor Pessoal nas 247 empresas MAED
 * sem movimento e vincula TRANSMISSÃO DA DCTFWEB SEM MOVIMENTO - JAN/DEZ.
 *
 *   npx ts-node scripts/aplicar-dctfweb-sem-movimento-maed.ts
 *   npx ts-node scripts/aplicar-dctfweb-sem-movimento-maed.ts --dry-run
 *   npx ts-node scripts/aplicar-dctfweb-sem-movimento-maed.ts --apply
 *   npx ts-node scripts/aplicar-dctfweb-sem-movimento-maed.ts --rollback relatorios/backup_....json
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
import { departmentIdOf } from "../src/payload";
import { CustomerTaskConfig, GesttaTask } from "../src/types";

const DEFAULT_EXCEL =
  "C:\\Users\\Exatas\\Downloads\\Levantamento de Maed sem movimento.xlsx";
const TASK_JAN = "TRANSMISSÃO DA DCTFWEB SEM MOVIMENTO - JAN";
const TASK_DEZ = "TRANSMISSÃO DA DCTFWEB SEM MOVIMENTO - DEZ";
const TARGET_NAMES = [TASK_JAN, TASK_DEZ] as const;
const LIMIT = 500;
const POLL_ATTEMPTS = 20;
const POLL_MS = 3000;

interface PlanilhaEmpresa {
  codigoPlanilha: string;
  nomePlanilha: string;
  documento: string;
  documentoDigits: string;
}

interface ClienteGestta {
  _id: string;
  name: string;
  cnpj?: string;
  code?: string | number;
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
}

interface AddedTarget {
  taskId: string;
  taskName: string;
  alreadyLinked: boolean;
  newLinkId?: string;
  action: "add" | "skip";
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
  removedPessoal: RemovedLink[];
  addedTargets: AddedTarget[];
  responsibleId?: string;
  responsibleName?: string;
  applyStatus?: "ok" | "skipped" | "failed" | "planned";
  applyDetail?: string;
}

interface BackupFile {
  generatedAt: string;
  mode: "apply" | "dry-run";
  sourceExcel: string;
  targetTaskIds: { jan: string; dez: string };
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

function normalizarSetor(setor: unknown): string {
  const key = normalizeText(setor);
  if (!key) return "Sem setor";
  if (key === "DP" || key === "PESSOAL" || key === "DEPARTAMENTO PESSOAL") {
    return "Pessoal";
  }
  return String(setor ?? "").trim() || "Sem setor";
}

function isPessoal(setor: unknown): boolean {
  return normalizarSetor(setor) === "Pessoal";
}

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

function asArray<T>(data: unknown, docsKey = "docs"): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && docsKey in data) {
    const docs = (data as Record<string, unknown>)[docsKey];
    return Array.isArray(docs) ? (docs as T[]) : [];
  }
  return [];
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

function userIdOf(config: CustomerTaskConfig): string | undefined {
  const user = config.company_user;
  if (!user) return undefined;
  return typeof user === "string" ? user : user._id;
}

function userNameOf(config: CustomerTaskConfig): string | undefined {
  const user = config.company_user;
  if (!user || typeof user === "string") return undefined;
  return user.name;
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
  onlyCodes?: Set<string>;
} {
  const rollbackFlag = argv.findIndex((item) => item === "--rollback");
  const applyFlag = argv.includes("--apply");
  const dryRunFlag = argv.includes("--dry-run");
  const onlyRaw = getArgValue(argv, "--only");
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
    onlyCodes: onlyRaw
      ? new Set(
          onlyRaw
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        )
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
    const codigo = row[0];
    const nome = row[1];
    const documento = row[2];
    if (codigo == null && !nome && !documento) continue;
    empresas.push({
      codigoPlanilha: codigo == null ? "" : String(codigo).trim(),
      nomePlanilha: nome == null ? "" : String(nome).trim(),
      documento: documento == null ? "" : String(documento).trim(),
      documentoDigits: digitsOnly(documento),
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

async function listarDepartamentos(
  client: AxiosInstance,
): Promise<Map<string, string>> {
  const deptNames = new Map<string, string>();
  const { data } = await client.get<
    | { docs?: Array<{ _id: string; name: string }> }
    | Array<{ _id: string; name: string }>
  >("/admin/company/department", { params: { limit: LIMIT, page: 1 } });
  for (const dept of asArray<{ _id: string; name: string }>(data)) {
    deptNames.set(dept._id, dept.name);
  }
  return deptNames;
}

function indexarClientes(clientes: ClienteGestta[]): {
  byDoc: Map<string, ClienteGestta[]>;
  byCode: Map<string, ClienteGestta[]>;
} {
  const byDoc = new Map<string, ClienteGestta[]>();
  const byCode = new Map<string, ClienteGestta[]>();
  for (const cliente of clientes) {
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
  return { byDoc, byCode };
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

function deptNameOf(
  model: GesttaTask,
  deptNames: Map<string, string>,
): string {
  const dept = model.company_department;
  if (dept && typeof dept === "object" && dept.name) return dept.name;
  const id = departmentIdOf(model);
  return deptNames.get(id) ?? id;
}

function modelFromCatalog(
  config: CustomerTaskConfig,
  byId: Map<string, GesttaTask>,
): GesttaTask | undefined {
  const task = config.company_task;
  if (task && typeof task === "object" && task._id) {
    return byId.get(task._id) ?? task;
  }
  const id = taskIdOf(config);
  return id ? byId.get(id) : undefined;
}

function pickResponsible(
  removed: RemovedLink[],
): { id?: string; name?: string } {
  const counts = new Map<string, { count: number; name?: string }>();
  for (const item of removed) {
    if (!item.companyUserId) continue;
    const current = counts.get(item.companyUserId) ?? {
      count: 0,
      name: item.companyUserName,
    };
    current.count += 1;
    current.name = item.companyUserName ?? current.name;
    counts.set(item.companyUserId, current);
  }
  let bestId: string | undefined;
  let bestCount = 0;
  let bestName: string | undefined;
  for (const [id, info] of counts) {
    if (info.count > bestCount) {
      bestId = id;
      bestCount = info.count;
      bestName = info.name;
    }
  }
  return { id: bestId, name: bestName };
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

function writeReports(
  reportsDir: string,
  prefix: string,
  planos: EmpresaPlan[],
  meta: Record<string, unknown>,
): { excelPath: string; jsonPath: string } {
  const remocoes = planos.flatMap((empresa) =>
    empresa.removedPessoal.map((item) => ({
      "Código planilha": empresa.codigoPlanilha,
      "Código Gestta": empresa.codigoGestta ?? "",
      Empresa: empresa.nomeGestta ?? empresa.nomePlanilha,
      Documento: empresa.documento,
      Tarefa: item.taskName,
      "ID modelo": item.taskId,
      "ID vínculo": item.linkId,
      Responsável: item.companyUserName ?? "",
      Status: empresa.applyStatus ?? "planned",
    })),
  );

  const inclusoes = planos.flatMap((empresa) =>
    empresa.addedTargets.map((item) => ({
      "Código planilha": empresa.codigoPlanilha,
      "Código Gestta": empresa.codigoGestta ?? "",
      Empresa: empresa.nomeGestta ?? empresa.nomePlanilha,
      Documento: empresa.documento,
      Tarefa: item.taskName,
      "ID modelo": item.taskId,
      Ação: item.action,
      "Já vinculada": item.alreadyLinked ? "sim" : "não",
      "ID vínculo novo": item.newLinkId ?? "",
      Status: empresa.applyStatus ?? "planned",
    })),
  );

  const empresasSheet = planos.map((empresa) => ({
    "Código planilha": empresa.codigoPlanilha,
    "Nome planilha": empresa.nomePlanilha,
    Documento: empresa.documento,
    "Resolve status": empresa.resolveStatus,
    Detalhe: empresa.detalhe,
    "Código Gestta": empresa.codigoGestta ?? "",
    "Nome Gestta": empresa.nomeGestta ?? "",
    "Customer ID": empresa.customerId ?? "",
    "Qtd remoções Pessoal": empresa.removedPessoal.length,
    "Já tinha JAN": empresa.addedTargets.find((t) => t.taskName === TASK_JAN)
      ?.alreadyLinked
      ? "sim"
      : "não",
    "Já tinha DEZ": empresa.addedTargets.find((t) => t.taskName === TASK_DEZ)
      ?.alreadyLinked
      ? "sim"
      : "não",
    "A adicionar": empresa.addedTargets.filter((t) => t.action === "add").length,
    "Apply status": empresa.applyStatus ?? "",
    "Apply detalhe": empresa.applyDetail ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      remocoes.length > 0
        ? remocoes
        : [
            {
              "Código planilha": "",
              Empresa: "",
              Tarefa: "",
              Status: "",
            },
          ],
    ),
    "Remocoes Pessoal",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(
      inclusoes.length > 0
        ? inclusoes
        : [
            {
              "Código planilha": "",
              Empresa: "",
              Tarefa: "",
              Ação: "",
              Status: "",
            },
          ],
    ),
    "Inclusoes JAN DEZ",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.json_to_sheet(empresasSheet),
    "Empresas",
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

async function buildPlans(
  client: AxiosInstance,
  empresasPlanilha: PlanilhaEmpresa[],
  indexes: ReturnType<typeof indexarClientes>,
  byTaskId: Map<string, GesttaTask>,
  deptNames: Map<string, string>,
  jan: GesttaTask,
  dez: GesttaTask,
): Promise<EmpresaPlan[]> {
  const targets = [
    { task: jan, name: TASK_JAN },
    { task: dez, name: TASK_DEZ },
  ];
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
        removedPessoal: [],
        addedTargets: [],
        applyStatus: "skipped",
        applyDetail: resolved.detalhe,
      });
      console.log(`[${progress}] ${empresa.codigoPlanilha} ${resolved.status}`);
      continue;
    }

    const cliente = resolved.cliente;
    try {
      const configs = await listarTarefasDoCliente(client, cliente._id);
      const removedPessoal: RemovedLink[] = [];
      const linkedTaskIds = new Set<string>();

      for (const config of configs) {
        const model = modelFromCatalog(config, byTaskId);
        if (!model) continue;
        linkedTaskIds.add(model._id);
        const deptName = deptNameOf(model, deptNames);
        if (!isPessoal(deptName)) continue;
        // Não remover os próprios alvos JAN/DEZ se já forem Pessoal
        if (
          model._id === jan._id ||
          model._id === dez._id ||
          normalizeText(model.name) === normalizeText(TASK_JAN) ||
          normalizeText(model.name) === normalizeText(TASK_DEZ)
        ) {
          continue;
        }
        removedPessoal.push({
          linkId: config._id,
          taskId: model._id,
          taskName: model.name,
          companyUserId: userIdOf(config),
          companyUserName: userNameOf(config),
          approve: config.approve,
          approvers: Array.isArray(config.approvers)
            ? config.approvers.map(String)
            : [],
          approveType: Array.isArray(config.approve_type)
            ? config.approve_type.map(String)
            : [],
        });
      }

      const responsible = pickResponsible(removedPessoal);
      const addedTargets: AddedTarget[] = targets.map(({ task, name }) => {
        const alreadyLinked = linkedTaskIds.has(task._id);
        return {
          taskId: task._id,
          taskName: name,
          alreadyLinked,
          action: alreadyLinked ? "skip" : "add",
        };
      });

      planos.push({
        codigoPlanilha: empresa.codigoPlanilha,
        nomePlanilha: empresa.nomePlanilha,
        documento: empresa.documento,
        customerId: cliente._id,
        codigoGestta: codeOf(cliente),
        nomeGestta: cliente.name,
        resolveStatus: "ok",
        detalhe: resolved.detalhe,
        removedPessoal,
        addedTargets,
        responsibleId: responsible.id,
        responsibleName: responsible.name,
        applyStatus: "planned",
        applyDetail: `remover=${removedPessoal.length}; adicionar=${addedTargets.filter((t) => t.action === "add").length}`,
      });
      console.log(
        `[${progress}] ${empresa.codigoPlanilha} ${cliente.name}: -${removedPessoal.length} Pessoal +${addedTargets.filter((t) => t.action === "add").length} JAN/DEZ`,
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
        removedPessoal: [],
        addedTargets: [],
        applyStatus: "failed",
        applyDetail: axiosErrorDetail(error),
      });
      console.warn(
        `[${progress}] ERRO ${empresa.codigoPlanilha}: ${axiosErrorDetail(error)}`,
      );
    }

    if ((index + 1) % 25 === 0) await sleep(150);
  }

  return planos;
}

async function applyPlans(
  client: AxiosInstance,
  planos: EmpresaPlan[],
  backupPath: string,
  janId: string,
  dezId: string,
): Promise<void> {
  const backup: BackupFile = {
    generatedAt: new Date().toISOString(),
    mode: "apply",
    sourceExcel: DEFAULT_EXCEL,
    targetTaskIds: { jan: janId, dez: dezId },
    empresas: planos,
  };
  const persist = () => {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  };
  persist();

  for (const [index, empresa] of planos.entries()) {
    const progress = `${index + 1}/${planos.length}`;
    if (empresa.resolveStatus !== "ok" || !empresa.customerId) {
      empresa.applyStatus = "skipped";
      persist();
      continue;
    }

    try {
      for (const target of empresa.addedTargets) {
        if (target.action !== "add") continue;
        await withRetry(`add ${empresa.codigoPlanilha} ${target.taskName}`, () =>
          adicionarClientesNaTarefa(client, target.taskId, [empresa.customerId!]),
        );
        const link = await withRetry(
          `waitLink ${empresa.codigoPlanilha} ${target.taskName}`,
          () => waitForLink(client, empresa.customerId!, target.taskId),
        );
        target.newLinkId = link._id;
        if (empresa.responsibleId) {
          try {
            await withRetry(
              `patchUser ${empresa.codigoPlanilha} ${target.taskName}`,
              () =>
                patchGroupCustomerConfig(client, {
                  ids: [link._id],
                  company_user: empresa.responsibleId,
                }),
            );
          } catch (error) {
            console.warn(
              `  aviso responsavel ${empresa.codigoPlanilha} ${target.taskName}: ${axiosErrorDetail(error)}`,
            );
          }
        }
        await sleep(250);
      }

      const linkIds = empresa.removedPessoal
        .map((item) => item.linkId)
        .filter(Boolean);
      for (let i = 0; i < linkIds.length; i += 50) {
        const chunk = linkIds.slice(i, i + 50);
        await withRetry(
          `remove ${empresa.codigoPlanilha} chunk=${i / 50 + 1}`,
          () => removerGroupCustomers(client, chunk),
        );
        await sleep(200);
      }

      empresa.applyStatus = "ok";
      empresa.applyDetail = `removidos=${linkIds.length}; adicionados=${empresa.addedTargets.filter((t) => t.action === "add").length}`;
      console.log(`[APPLY ${progress}] ${empresa.codigoPlanilha} ok`);
    } catch (error) {
      empresa.applyStatus = "failed";
      empresa.applyDetail = axiosErrorDetail(error);
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

    for (const removed of empresa.removedPessoal) {
      const atuais = await listarTarefasDoCliente(client, empresa.customerId);
      const already = atuais.find(
        (item) => taskIdOf(item) === removed.taskId,
      );
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
    }

    for (const added of empresa.addedTargets) {
      if (added.action !== "add") continue;
      const atuais = await listarTarefasDoCliente(client, empresa.customerId);
      const onTarget = atuais.find((item) => taskIdOf(item) === added.taskId);
      if (onTarget) {
        await removerGroupCustomers(client, [onTarget._id]);
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

  console.log(
    `[dctfweb-sem-movimento] modo=${args.apply ? "apply" : "dry-run"}`,
  );
  console.log(`[dctfweb-sem-movimento] planilha=${args.excelPath}`);

  let empresasPlanilha = lerPlanilha(args.excelPath);
  if (args.onlyCodes && args.onlyCodes.size > 0) {
    empresasPlanilha = empresasPlanilha.filter((item) =>
      args.onlyCodes!.has(item.codigoPlanilha),
    );
    console.log(
      `[dctfweb-sem-movimento] filtro --only=${[...args.onlyCodes].join(",")}`,
    );
  }
  console.log(
    `[dctfweb-sem-movimento] empresas=${empresasPlanilha.length}`,
  );

  console.log("[dctfweb-sem-movimento] carregando clientes...");
  const ativos = await listarClientes(client, true);
  const inativos = await listarClientes(client, false);
  const byIdCliente = new Map<string, ClienteGestta>();
  for (const cliente of [...ativos, ...inativos]) {
    if (!byIdCliente.has(cliente._id)) byIdCliente.set(cliente._id, cliente);
  }
  const indexes = indexarClientes([...byIdCliente.values()]);

  console.log("[dctfweb-sem-movimento] carregando departamentos/modelos...");
  const deptNames = await listarDepartamentos(client);
  const allTasks = await listarTarefasRecorrentes(client);
  const byTaskId = new Map(allTasks.map((task) => [task._id, task]));
  const jan = findUniqueTaskByName(allTasks, TASK_JAN);
  const dez = findUniqueTaskByName(allTasks, TASK_DEZ);
  console.log(`[dctfweb-sem-movimento] JAN=${jan._id} DEZ=${dez._id}`);

  // Garantia: destinos devem existir; se não forem Pessoal, ainda assim vinculamos
  // (pedido do usuário), mas a remoção continua restrita a Pessoal.
  for (const name of TARGET_NAMES) {
    if (!allTasks.some((task) => normalizeText(task.name) === normalizeText(name))) {
      throw new Error(`Modelo obrigatorio ausente: ${name}`);
    }
  }

  const planos = await buildPlans(
    client,
    empresasPlanilha,
    indexes,
    byTaskId,
    deptNames,
    jan,
    dez,
  );

  const totalRemocoes = planos.reduce(
    (sum, item) => sum + item.removedPessoal.length,
    0,
  );
  const totalInclusoes = planos.reduce(
    (sum, item) =>
      sum + item.addedTargets.filter((target) => target.action === "add").length,
    0,
  );
  console.log(
    `[dctfweb-sem-movimento] planejado remocoes=${totalRemocoes} inclusoes=${totalInclusoes}`,
  );

  const dateStamp = new Date().toISOString().slice(0, 10);
  const onlySuffix = args.onlyCodes ? `_retry_${stamp().slice(0, 19)}` : "";
  const prefix = args.apply
    ? `execucao_dctfweb_sem_movimento_maed_${dateStamp}${onlySuffix}`
    : `planejado_dctfweb_sem_movimento_maed_${dateStamp}${onlySuffix}`;

  if (args.apply) {
    const backupPath = path.join(
      args.reportsDir,
      `backup_dctfweb_sem_movimento_maed_${stamp()}.json`,
    );
    console.log(`[dctfweb-sem-movimento] backup=${backupPath}`);
    await applyPlans(client, planos, backupPath, jan._id, dez._id);
  }

  const { excelPath, jsonPath } = writeReports(args.reportsDir, prefix, planos, {
    generatedAt: new Date().toISOString(),
    mode: args.apply ? "apply" : "dry-run",
    sourceExcel: args.excelPath,
    targetTasks: {
      jan: { id: jan._id, name: TASK_JAN },
      dez: { id: dez._id, name: TASK_DEZ },
    },
    totals: {
      empresas: planos.length,
      remocoes: totalRemocoes,
      inclusoes: totalInclusoes,
      ok: planos.filter((item) => item.applyStatus === "ok").length,
      failed: planos.filter((item) => item.applyStatus === "failed").length,
      skipped: planos.filter((item) => item.applyStatus === "skipped").length,
    },
  });

  console.log(`[dctfweb-sem-movimento] Excel: ${excelPath}`);
  console.log(`[dctfweb-sem-movimento] JSON: ${jsonPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
