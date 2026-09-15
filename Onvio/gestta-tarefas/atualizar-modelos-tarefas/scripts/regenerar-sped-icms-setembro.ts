/**
 * Regenera as tarefas com vencimento em setembro/2026 após a alteração dos
 * modelos SPED/EFD e ICMS. O task-gen recebe o mês de vencimento (09/2026),
 * embora a instância exibida tenha competence_date em 08/2026.
 *
 * Uso seguro (padrão): npx ts-node scripts/regenerar-sped-icms-setembro.ts
 * Aplicação efetiva:     npx ts-node scripts/regenerar-sped-icms-setembro.ts --apply
 */
import fs from "fs";
import path from "path";
import { AxiosInstance } from "axios";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  apagarGeracaoCliente,
  buscarTarefasGeradasCliente,
  customerIdOf,
  customerNameOf,
  gerarTarefasCliente,
  listarClientesDaTarefa,
  obterTarefa,
} from "../src/endpoints";
import { payloadsEqual, toUpdatePayload } from "../src/payload";
import { GesttaTask, TaskCustomerLink, TaskUpdatePayload } from "../src/types";

const COMPETENCE = { month: 9, year: 2026 };
const REPORTS_DIR = path.resolve(__dirname, "..", "..", "relatorios");
const CONFIG_EXECUTION = path.resolve(
  REPORTS_DIR,
  "execucao_sped_icms_config_2026-09-01T14-59-40-069Z.json",
);

interface ConfigExecution {
  changes: Array<{
    task: { id: string; name: string };
    intended: TaskUpdatePayload;
  }>;
}

interface ScopedModel {
  task: GesttaTask;
  intended: TaskUpdatePayload;
  customerLinks: Array<{ customerId: string; customerName: string; active: boolean }>;
}

interface RegenTarget {
  customerId: string;
  customerName: string;
  departmentId: string;
  modelNames: string[];
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function departmentIdOf(task: GesttaTask): string {
  return typeof task.company_department === "string"
    ? task.company_department
    : task.company_department._id;
}

function loadExecution(filePath: string): ConfigExecution {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Relatório de configuração não encontrado: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as ConfigExecution;
  if (!Array.isArray(parsed.changes) || parsed.changes.length !== 33) {
    throw new Error("Relatório de configuração inválido: esperados 33 modelos");
  }
  return parsed;
}

async function withConcurrency<T, R>(
  values: T[],
  limit: number,
  fn: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next++;
      if (index >= values.length) return;
      results[index] = await fn(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return results;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function retryRead<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(750 * (attempt + 1));
    }
  }
  throw lastError;
}

function taskSnapshot(task: GesttaTask): Record<string, unknown> {
  return {
    id: task._id,
    name: task.name,
    departmentId: departmentIdOf(task),
    legal: task.frequency_date?.month_day ?? null,
    offset: task.accountancy ?? null,
    postpone: Boolean(task.postpone),
    businessDay: Boolean(task.business_day),
    businessDayAccountancy: Boolean(task.business_day_accountancy),
  };
}

async function resolveModels(
  client: AxiosInstance,
  execution: ConfigExecution,
): Promise<ScopedModel[]> {
  return withConcurrency(execution.changes, 2, async (entry) => {
    const task = await retryRead(() => obterTarefa(client, entry.task.id));
    if (task.name !== entry.task.name) {
      throw new Error(`Modelo ${entry.task.id} mudou de nome: ${task.name}`);
    }
    const actual = toUpdatePayload(task);
    if (!payloadsEqual(actual, entry.intended)) {
      throw new Error(`Modelo fora da configuração aprovada: ${task.name}`);
    }
    const links = await retryRead(() => listarClientesDaTarefa(client, task._id));
    return {
      task,
      intended: entry.intended,
      customerLinks: links.map((link) => ({
        customerId: customerIdOf(link),
        customerName: customerNameOf(link) ?? "",
        active: (link as TaskCustomerLink & { active?: boolean }).active !== false,
      })),
    };
  });
}

function regenerationTargets(models: ScopedModel[]): RegenTarget[] {
  const byPair = new Map<string, RegenTarget>();
  for (const model of models) {
    const departmentId = departmentIdOf(model.task);
    for (const link of model.customerLinks.filter((item) => item.active)) {
      const key = `${link.customerId}|${departmentId}`;
      const existing = byPair.get(key) ?? {
        customerId: link.customerId,
        customerName: link.customerName,
        departmentId,
        modelNames: [],
      };
      if (!existing.modelNames.includes(model.task.name)) {
        existing.modelNames.push(model.task.name);
      }
      byPair.set(key, existing);
    }
  }
  return [...byPair.values()].sort(
    (a, b) =>
      a.departmentId.localeCompare(b.departmentId) ||
      a.customerName.localeCompare(b.customerName, "pt-BR"),
  );
}

async function generatedSnapshot(
  client: AxiosInstance,
  target: RegenTarget,
): Promise<Record<string, unknown>[]> {
  const tasks = await retryRead(() =>
    buscarTarefasGeradasCliente(client, target.customerId, ["OPEN", "IMPEDIMENT"]),
  );
  const targetNames = new Set(target.modelNames);
  return tasks
    .filter((task) => targetNames.has(task.name))
    .map((task) => {
      const raw = task as unknown as Record<string, unknown>;
      const owner = raw.owner as { name?: string } | undefined;
      return {
        instanceId: task._id,
        name: task.name,
        status: task.status,
        competenceDate: task.competence_date ?? null,
        legalDate: task.legal_date ?? null,
        dueDate: task.due_date ?? null,
        owner: owner?.name ?? null,
      };
    });
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply") && !process.argv.includes("--dry-run");
  const startAtIndex = process.argv.indexOf("--start-at");
  const startAt =
    startAtIndex >= 0 && process.argv[startAtIndex + 1]
      ? Number(process.argv[startAtIndex + 1])
      : 1;
  const stampValue = stamp();
  const client = createGesttaClient(getJwt());
  const execution = loadExecution(CONFIG_EXECUTION);
  const models = await resolveModels(client, execution);
  const targets = regenerationTargets(models);
  if (!Number.isInteger(startAt) || startAt < 1 || startAt > targets.length + 1) {
    throw new Error(`--start-at deve estar entre 1 e ${targets.length + 1}`);
  }
  const targetsToProcess = targets.slice(startAt - 1);
  const before = await withConcurrency(targets, 5, (target) => generatedSnapshot(client, target));
  const backupPath = path.join(REPORTS_DIR, `backup_regeneracao_sped_icms_setembro_${stampValue}.json`);
  const planPath = path.join(REPORTS_DIR, `planejado_regeneracao_sped_icms_setembro_${stampValue}.json`);
  const baseReport = {
    schemaVersion: 1,
    kind: "gestta-sped-icms-setembro-regeneration",
    createdAt: new Date().toISOString(),
    mode: apply ? "apply" : "dry-run",
    competence: COMPETENCE,
    rationale: "O task-gen recebe 09/2026 para regenerar as tarefas com vencimento em setembro/2026; a competência exibida nelas é 08/2026.",
    configurationExecution: CONFIG_EXECUTION,
    summary: {
      models: models.length,
      customerDepartmentPairs: targets.length,
      customerDepartmentPairsThisRun: targetsToProcess.length,
      startAt,
      currentTargetInstances: before.reduce((total, rows) => total + rows.length, 0),
    },
    targets: targets.map((target, index) => ({ ...target, before: before[index] })),
  };
  writeJson(backupPath, {
    schemaVersion: 1,
    kind: "gestta-sped-icms-setembro-regeneration-backup",
    createdAt: new Date().toISOString(),
    competence: COMPETENCE,
    models: models.map((model) => ({ task: taskSnapshot(model.task), customerLinks: model.customerLinks })),
    targets: baseReport.targets,
  });
  writeJson(planPath, baseReport);
  console.log(`[regen-sped-icms] modo=${apply ? "apply" : "dry-run"}; competência=${COMPETENCE.month}/${COMPETENCE.year}`);
  console.log(`[regen-sped-icms] modelos=${models.length}; clientes/departamento=${targets.length}; instâncias atuais=${baseReport.summary.currentTargetInstances}`);
  console.log(`[regen-sped-icms] backup=${backupPath}`);
  console.log(`[regen-sped-icms] planejamento=${planPath}`);
  if (!apply) return;

  const results: Array<Record<string, unknown>> = [];
  for (const [index, target] of targetsToProcess.entries()) {
    const progress = `${startAt + index}/${targets.length}`;
    try {
      const erase = await apagarGeracaoCliente(client, target.customerId, {
        ...COMPETENCE,
        company_department: target.departmentId,
        force_erase_interaction: false,
      });
      // Nunca gere novamente se a exclusão segura falhar; isso evita duplicação.
      if (!erase.ok) {
        results.push({ ...target, result: "failure_erase", erase });
        console.log(`[regen-sped-icms ${progress}] falha ao apagar: ${target.customerName} (${erase.status})`);
        continue;
      }
      const generate = await gerarTarefasCliente(client, target.customerId, {
        ...COMPETENCE,
        company_department: target.departmentId,
      });
      const after = generate.ok ? await generatedSnapshot(client, target) : [];
      const result = generate.ok ? "success" : "failure_generate";
      results.push({ ...target, result, erase, generate, after });
      console.log(`[regen-sped-icms ${progress}] ${result}: ${target.customerName}`);
    } catch (error) {
      results.push({
        ...target,
        result: "failure_exception",
        error: error instanceof Error ? error.message : String(error),
      });
      console.log(`[regen-sped-icms ${progress}] exceção: ${target.customerName}`);
    }
  }
  const executionPath = path.join(REPORTS_DIR, `execucao_regeneracao_sped_icms_setembro_${stampValue}.json`);
  const failures = results.filter((item) => String(item.result).startsWith("failure"));
  writeJson(executionPath, {
    ...baseReport,
    finishedAt: new Date().toISOString(),
    summary: {
      ...baseReport.summary,
      success: results.filter((item) => item.result === "success").length,
      failures: failures.length,
      regeneratedTargetInstances: results.reduce(
        (total, item) => total + (Array.isArray(item.after) ? item.after.length : 0),
        0,
      ),
    },
    results,
  });
  console.log(`[regen-sped-icms] execução=${executionPath}`);
  if (failures.length > 0) {
    throw new Error(`${failures.length} regenerações falharam; consulte ${executionPath}`);
  }
}

main().catch((error) => {
  console.error("[regen-sped-icms] falha", error);
  process.exitCode = 1;
});
