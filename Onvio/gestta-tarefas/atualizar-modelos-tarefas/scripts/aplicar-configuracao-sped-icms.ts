/**
 * Aplica a configuração aprovada na aba "COMO DEVE SER".
 *
 * Uso seguro (padrão): npx ts-node scripts/aplicar-configuracao-sped-icms.ts
 * Aplicação efetiva:     npx ts-node scripts/aplicar-configuracao-sped-icms.ts --apply
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  atualizarModeloTarefa,
  buscarTarefasGeradasCliente,
  customerIdOf,
  customerNameOf,
  listarClientesDaTarefa,
  listarTarefasRecorrentes,
  obterTarefa,
} from "../src/endpoints";
import { payloadsEqual, toUpdatePayload } from "../src/payload";
import { GesttaTask, TaskCustomerLink, TaskUpdatePayload } from "../src/types";

const DEFAULT_SOURCE = "C:\\Users\\Exatas\\Downloads\\SPED e ICMS Normal - Data meta e legal por estado.xlsx";
const REPORTS_DIR = path.resolve(__dirname, "..", "..", "relatorios");
const EXPECTED_EFD_COUNT = 20;
const EXPECTED_ICMS_COUNT = 13;

interface SheetRow {
  rowNumber: number;
  efdName?: string;
  efdLegal?: number;
  efdMeta?: number;
  efdOffset?: number;
  icmsName: string;
  icmsLegal?: number;
  icmsMeta?: number;
  icmsOffset?: number;
  postpone: boolean;
  businessDay: boolean;
}

interface DesiredChange {
  kind: "EFD" | "ICMS";
  sourceRows: number[];
  name: string;
  normalizedName: string;
  legal: number;
  meta: number;
  offset: number;
  postpone: boolean;
  businessDay: boolean;
}

interface ResolvedChange extends DesiredChange {
  task: GesttaTask;
  before: TaskUpdatePayload;
  intended: TaskUpdatePayload;
  willUpdate: boolean;
  customerLinks: Array<{ customerId: string; customerName: string; linkActive: boolean }>;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function requiredText(value: unknown, label: string): string {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${label} ausente`);
  return result;
}

function requiredDay(value: unknown, label: string): number {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`${label} inválido: ${String(value)}`);
  }
  return day;
}

function requiredOffset(value: unknown, label: string): number {
  const offset = Number(value);
  if (!Number.isInteger(offset)) {
    throw new Error(`${label} inválido: ${String(value)}`);
  }
  return offset;
}

function booleanPtBr(value: unknown, label: string): boolean {
  const normalized = normalize(value);
  if (normalized === "SIM") return true;
  if (normalized === "NAO") return false;
  throw new Error(`${label} deve ser Sim ou Não; recebido: ${String(value)}`);
}

function businessDayFromNote(value: unknown, label: string): boolean {
  const normalized = normalize(value);
  if (normalized === "HABILITAR DIA UTIL") return true;
  if (normalized === "NAO HABILITAR DIA UTIL") return false;
  throw new Error(
    `${label} deve ser Habilitar dia útil ou Não habilitar dia útil; recebido: ${String(value)}`,
  );
}

function parseSheet(sourcePath: string): SheetRow[] {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Planilha não encontrada: ${sourcePath}`);
  }
  const workbook = XLSX.readFile(sourcePath);
  const sheet = workbook.Sheets["COMO DEVE SER"];
  if (!sheet) throw new Error('Aba "COMO DEVE SER" não encontrada');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });
  const parsed: SheetRow[] = [];
  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const efdName = String(row[0] ?? "").trim();
    const icmsName = String(row[4] ?? "").trim();
    if (!efdName && !icmsName) continue;
    const rowNumber = index + 1;
    const base = {
      rowNumber,
      icmsName: requiredText(icmsName, `Linha ${rowNumber}: ICMS de referência`),
      postpone: booleanPtBr(row[8], `Linha ${rowNumber}: Postergar`),
      businessDay: businessDayFromNote(row[9], `Linha ${rowNumber}: Observação`),
    };
    if (!efdName) {
      parsed.push({
        ...base,
        icmsLegal: requiredDay(row[5], `Linha ${rowNumber}: data legal ICMS`),
        icmsMeta: requiredDay(row[6], `Linha ${rowNumber}: data meta ICMS`),
        icmsOffset: requiredOffset(row[7], `Linha ${rowNumber}: offset ICMS`),
      });
      continue;
    }
    parsed.push({
      ...base,
      efdName,
      efdLegal: requiredDay(row[1], `Linha ${rowNumber}: data legal EFD`),
      efdMeta: requiredDay(row[2], `Linha ${rowNumber}: data meta EFD`),
      efdOffset: requiredOffset(row[3], `Linha ${rowNumber}: offset EFD`),
      icmsLegal: requiredDay(row[5], `Linha ${rowNumber}: data legal ICMS`),
      icmsMeta:
        String(row[6] ?? "").trim() === ""
          ? undefined
          : requiredDay(row[6], `Linha ${rowNumber}: data meta ICMS`),
      icmsOffset:
        String(row[7] ?? "").trim() === ""
          ? undefined
          : requiredOffset(row[7], `Linha ${rowNumber}: offset ICMS`),
    });
  }
  return parsed;
}

function addOrValidate(
  changes: Map<string, DesiredChange>,
  change: DesiredChange,
): void {
  const existing = changes.get(change.normalizedName);
  if (!existing) {
    changes.set(change.normalizedName, change);
    return;
  }
  const equal =
    existing.legal === change.legal &&
    existing.meta === change.meta &&
    existing.offset === change.offset &&
    existing.postpone === change.postpone &&
    existing.businessDay === change.businessDay;
  if (!equal) {
    throw new Error(
      `Configurações conflitantes para ${change.kind} ${change.name}: linhas ${existing.sourceRows.join(", ")} e ${change.sourceRows.join(", ")}`,
    );
  }
  existing.sourceRows.push(...change.sourceRows);
}

function desiredChanges(rows: SheetRow[]): { efd: DesiredChange[]; icms: DesiredChange[] } {
  const efd = new Map<string, DesiredChange>();
  const icms = new Map<string, DesiredChange>();
  for (const row of rows) {
    if (row.efdName) {
      const change: DesiredChange = {
        kind: "EFD",
        sourceRows: [row.rowNumber],
        name: row.efdName,
        normalizedName: normalize(row.efdName),
        legal: row.efdLegal!,
        meta: row.efdMeta!,
        offset: row.efdOffset!,
        postpone: row.postpone,
        businessDay: row.businessDay,
      };
      addOrValidate(efd, change);
    }
    const isParana = normalize(row.icmsName) === "ICMS NORMAL (PARANA)";
    const change: DesiredChange = {
      kind: "ICMS",
      sourceRows: [row.rowNumber],
      name: row.icmsName,
      normalizedName: normalize(row.icmsName),
      legal: row.icmsLegal!,
      // Decisão aprovada: ICMS Paraná fica explicitamente em 12 / 9 / -3.
      meta: isParana ? 9 : row.icmsMeta!,
      offset: isParana ? -3 : row.icmsOffset!,
      postpone: row.postpone,
      businessDay: row.businessDay,
    };
    if (normalize(change.name) === "ICMS NORMAL (MARANHAO)") {
      // Decisão aprovada para o conflito NORMAL x SN: sem postergar e sem dia útil.
      change.postpone = false;
      change.businessDay = false;
    }
    addOrValidate(icms, change);
  }
  if (efd.size !== EXPECTED_EFD_COUNT || icms.size !== EXPECTED_ICMS_COUNT) {
    throw new Error(
      `Escopo inesperado na planilha: EFD=${efd.size}/${EXPECTED_EFD_COUNT}; ICMS=${icms.size}/${EXPECTED_ICMS_COUNT}`,
    );
  }
  return { efd: [...efd.values()], icms: [...icms.values()] };
}

function payloadFor(task: GesttaTask, desired: DesiredChange): TaskUpdatePayload {
  return toUpdatePayload(task, {
    frequency_date: {
      business_day: task.frequency_date?.business_day ?? null,
      start_day: task.frequency_date?.start_day ?? null,
      month_day: desired.legal,
      month: task.frequency_date?.month ?? null,
      week_day: task.frequency_date?.week_day ?? null,
    },
    accountancy: desired.offset,
    postpone: desired.postpone,
    business_day: desired.businessDay,
    business_day_accountancy: desired.businessDay,
  });
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function withConcurrency<T, R>(
  values: T[],
  limit: number,
  fn: (value: T) => Promise<R>,
): Promise<R[]> {
  const result = new Array<R>(values.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= values.length) return;
      result[index] = await fn(values[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return result;
}

function taskSummary(task: GesttaTask): Record<string, unknown> {
  return {
    id: task._id,
    name: task.name,
    active: task.active !== false,
    legal: task.frequency_date?.month_day ?? null,
    meta:
      task.frequency_date?.month_day != null && task.accountancy != null
        ? task.frequency_date.month_day + task.accountancy
        : null,
    offset: task.accountancy ?? null,
    postpone: Boolean(task.postpone),
    businessDay: Boolean(task.business_day),
    businessDayAccountancy: Boolean(task.business_day_accountancy),
    customerCount: task.group_customer_count ?? null,
  };
}

async function resolveChanges(
  client: ReturnType<typeof createGesttaClient>,
  allTasks: GesttaTask[],
  desired: DesiredChange[],
): Promise<ResolvedChange[]> {
  const activeByName = new Map<string, GesttaTask[]>();
  for (const task of allTasks.filter((item) => item.active !== false)) {
    const key = normalize(task.name);
    const list = activeByName.get(key) ?? [];
    list.push(task);
    activeByName.set(key, list);
  }
  const selected = desired.map((item) => {
    const matches = activeByName.get(item.normalizedName) ?? [];
    if (matches.length !== 1) {
      throw new Error(
        `${item.kind} ${item.name}: esperado 1 modelo ativo; encontrados ${matches.length}`,
      );
    }
    return { desired: item, taskId: matches[0]._id };
  });
  return withConcurrency(selected, 5, async ({ desired: item, taskId }) => {
    const task = await obterTarefa(client, taskId);
    const links = await listarClientesDaTarefa(client, taskId);
    const customerLinks = links.map((link) => ({
      customerId: customerIdOf(link),
      customerName: customerNameOf(link) ?? "",
      linkActive: (link as TaskCustomerLink & { active?: boolean }).active !== false,
    }));
    const before = toUpdatePayload(task);
    const intended = payloadFor(task, item);
    return {
      ...item,
      task,
      before,
      intended,
      willUpdate: !payloadsEqual(before, intended),
      customerLinks,
    };
  });
}

async function inventoryGeneratedTasks(
  client: ReturnType<typeof createGesttaClient>,
  changes: ResolvedChange[],
): Promise<unknown[]> {
  const modelsByCustomer = new Map<string, Set<string>>();
  for (const change of changes) {
    for (const link of change.customerLinks) {
      const names = modelsByCustomer.get(link.customerId) ?? new Set<string>();
      names.add(change.task.name);
      modelsByCustomer.set(link.customerId, names);
    }
  }
  const entries = await withConcurrency([...modelsByCustomer.entries()], 5, async ([customerId, names]) => {
    const tasks = await buscarTarefasGeradasCliente(client, customerId, ["OPEN", "IMPEDIMENT"]);
    return tasks
      .filter((task) => names.has(task.name))
      .map((task) => {
        const raw = task as unknown as Record<string, unknown>;
        const owner = raw.owner as { name?: string } | undefined;
        return {
          customerId,
          customerName: (task.customer as { name?: string } | undefined)?.name ?? "",
          modelName: task.name,
          status: task.status,
          competenceDate: task.competence_date ?? null,
          legalDate: task.legal_date ?? null,
          dueDate: task.due_date ?? null,
          owner: owner?.name ?? null,
          instanceId: task._id,
        };
      });
  });
  return entries.flat();
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
  const sourceFlag = process.argv.indexOf("--source");
  const sourcePath = path.resolve(
    sourceFlag >= 0 && process.argv[sourceFlag + 1]
      ? process.argv[sourceFlag + 1]
      : DEFAULT_SOURCE,
  );
  const stamp = timestamp();
  const client = createGesttaClient(getJwt());
  const sheetRows = parseSheet(sourcePath);
  const desired = desiredChanges(sheetRows);
  const allTasks = await listarTarefasRecorrentes(client);
  const efd = await resolveChanges(client, allTasks, desired.efd);
  const icms = await resolveChanges(client, allTasks, desired.icms);
  const changes = [...efd, ...icms];
  const generatedTasks = await inventoryGeneratedTasks(client, changes);
  const backupPath = path.join(REPORTS_DIR, `backup_sped_icms_config_${stamp}.json`);
  const planPath = path.join(REPORTS_DIR, `planejado_sped_icms_config_${stamp}.json`);
  const baseReport = {
    schemaVersion: 1,
    kind: "gestta-sped-icms-config",
    sourcePath,
    createdAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    summary: {
      efdModels: efd.length,
      icmsModels: icms.length,
      totalModels: changes.length,
      willUpdate: changes.filter((item) => item.willUpdate).length,
      customerLinks: changes.reduce((total, item) => total + item.customerLinks.length, 0),
      generatedOpenOrImpediment: generatedTasks.length,
    },
    changes: changes.map((item) => ({
      kind: item.kind,
      sourceRows: item.sourceRows,
      desired: {
        name: item.name,
        legal: item.legal,
        meta: item.meta,
        offset: item.offset,
        postpone: item.postpone,
        businessDay: item.businessDay,
        businessDayAccountancy: item.businessDay,
      },
      task: taskSummary(item.task),
      before: item.before,
      intended: item.intended,
      willUpdate: item.willUpdate,
      customerLinks: item.customerLinks,
    })),
    generatedTasks,
  };
  writeJson(backupPath, {
    schemaVersion: 1,
    kind: "gestta-sped-icms-config-backup",
    createdAt: new Date().toISOString(),
    sourcePath,
    tasks: changes.map((item) => ({
      id: item.task._id,
      name: item.task.name,
      originalTask: item.task,
      restorePayload: item.before,
    })),
  });
  writeJson(planPath, baseReport);
  console.log(`[sped-icms] modo=${apply ? "apply" : "dry-run"}`);
  console.log(`[sped-icms] EFD=${efd.length}; ICMS=${icms.length}; atualizar=${baseReport.summary.willUpdate}`);
  console.log(`[sped-icms] backup=${backupPath}`);
  console.log(`[sped-icms] planejamento=${planPath}`);
  if (!apply) return;

  const results: Array<Record<string, unknown>> = [];
  for (const item of changes) {
    if (!item.willUpdate) {
      results.push({ id: item.task._id, name: item.task.name, result: "skipped_already_compliant" });
      continue;
    }
    try {
      await atualizarModeloTarefa(client, item.task._id, item.intended);
      const after = await obterTarefa(client, item.task._id);
      const actual = toUpdatePayload(after);
      if (!payloadsEqual(actual, item.intended)) {
        throw new Error("leitura pós-atualização diverge do payload esperado");
      }
      results.push({
        id: item.task._id,
        name: item.task.name,
        result: "success",
        after: taskSummary(after),
      });
    } catch (error) {
      const failurePath = path.join(REPORTS_DIR, `execucao_sped_icms_config_${stamp}.json`);
      writeJson(failurePath, { ...baseReport, backupPath, results, failure: String(error) });
      throw new Error(`Falha ao atualizar ${item.task.name}. Backup disponível em ${backupPath}. ${String(error)}`);
    }
  }
  const executionPath = path.join(REPORTS_DIR, `execucao_sped_icms_config_${stamp}.json`);
  writeJson(executionPath, { ...baseReport, backupPath, results, finishedAt: new Date().toISOString() });
  console.log(`[sped-icms] execução concluída=${executionPath}`);
}

main().catch((error) => {
  console.error("[sped-icms] falha", error);
  process.exitCode = 1;
});
