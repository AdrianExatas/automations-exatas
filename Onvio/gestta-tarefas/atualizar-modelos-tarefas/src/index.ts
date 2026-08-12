import fs from "fs";
import path from "path";
import { getJwt } from "./auth";
import { createGesttaClient } from "./client";
import {
  atualizarModeloTarefa,
  criarStep,
  customerIdOf,
  customerNameOf,
  listarClientesDaTarefa,
  listarSteps,
  listarTarefasRecorrentes,
  obterTarefa,
  regenerarTarefasCliente,
} from "./endpoints";
import {
  applyModelOverrides,
  payloadsEqual,
  summarizeTask,
  toUpdatePayload,
} from "./payload";
import {
  ActionResult,
  BackupTaskEntry,
  CliArgs,
  GesttaTask,
  Manifest,
  ManifestAction,
  RegenerationResult,
} from "./types";

function parseArgs(argv: string[]): CliArgs {
  const applyFlag = argv.includes("--apply");
  const dryRunFlag = argv.includes("--dry-run");
  // Default = dry-run. Se ambos vierem, dry-run vence (seguro).
  const apply = applyFlag && !dryRunFlag;
  const skipRegen = argv.includes("--skip-regen");
  const skipChecklists = argv.includes("--skip-checklists");

  const manifestFlag = argv.findIndex((a) => a === "--manifest");
  const manifestPath =
    manifestFlag >= 0 && argv[manifestFlag + 1]
      ? path.resolve(argv[manifestFlag + 1])
      : path.resolve(__dirname, "..", "manifesto", "dp-consultivo.json");

  const reportsFlag = argv.findIndex((a) => a === "--reports-dir");
  const reportsDir =
    reportsFlag >= 0 && argv[reportsFlag + 1]
      ? path.resolve(argv[reportsFlag + 1])
      : path.resolve(__dirname, "..", "..", "relatorios");

  return {
    apply,
    dryRun: !apply,
    skipRegen,
    skipChecklists,
    manifestPath,
    reportsDir,
  };
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function loadManifest(filePath: string): Manifest {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Manifest;
  if (!raw?.actions || !Array.isArray(raw.actions)) {
    throw new Error(`Manifesto invalido: ${filePath}`);
  }
  return raw;
}

function groupModelActions(
  actions: ManifestAction[],
): Map<string, ManifestAction[]> {
  const map = new Map<string, ManifestAction[]>();
  for (const action of actions) {
    if (action.op === "addSteps") continue;
    const list = map.get(action.taskId) ?? [];
    list.push(action);
    map.set(action.taskId, list);
  }
  return map;
}

function expectedNamesFor(
  actions: ManifestAction[],
  task: GesttaTask,
): Set<string> {
  const names = new Set<string>([task.name]);
  for (const action of actions) {
    if ("expectedName" in action && action.expectedName) {
      names.add(action.expectedName);
    }
    if (action.op === "rename") {
      names.add(action.name);
    }
  }
  return names;
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function currentCompetence(now = new Date()): { month: number; year: number } {
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.apply ? "apply" : "dry-run";
  console.log(`[atualizar-modelos] modo=${mode}`);
  console.log(`[atualizar-modelos] manifesto=${args.manifestPath}`);

  const manifest = loadManifest(args.manifestPath);
  const client = createGesttaClient(getJwt());

  const allTasks = await listarTarefasRecorrentes(client);
  const byId = new Map(allTasks.map((t) => [t._id, t]));

  const modelActionsByTask = groupModelActions(manifest.actions);
  const startedAt = new Date().toISOString();
  const ts = stamp();

  const backupTasks: BackupTaskEntry[] = [];
  const results: ActionResult[] = [];
  const checklistManualRoteiro: Array<Record<string, unknown>> = [];

  for (const [taskId, actions] of modelActionsByTask) {
    const listed = byId.get(taskId);
    if (!listed) {
      results.push({
        op: actions[0].op,
        taskId,
        name: ("expectedName" in actions[0] && actions[0].expectedName) || taskId,
        result: "failure",
        detail: "Tarefa nao encontrada em GET /admin/company/task?type=RECURRENT",
      });
      continue;
    }

    const task = await obterTarefa(client, taskId);
    const acceptedNames = expectedNamesFor(actions, task);
    if (!acceptedNames.has(task.name)) {
      results.push({
        op: actions[0].op,
        taskId,
        name: task.name,
        result: "failure",
        detail: `Nome vivo diverge do esperado. vivo="${task.name}" aceitos=${JSON.stringify([...acceptedNames])}`,
        before: summarizeTask(task),
      });
      continue;
    }

    const restorePayload = toUpdatePayload(task);
    const intendedPayload = applyModelOverrides(task, actions);
    const willUpdate = !payloadsEqual(restorePayload, intendedPayload);

    backupTasks.push({
      id: taskId,
      name: task.name,
      originalTask: task,
      restorePayload,
      intendedPayload,
      willUpdate,
      actionOps: actions.map((a) => a.op),
    });

    if (!willUpdate) {
      const result: ActionResult = {
        op: actions[0].op,
        taskId,
        name: task.name,
        result: args.apply ? "skipped" : "planned",
        detail: "Payload ja esta no estado desejado",
        before: summarizeTask(task),
        after: summarizeTask(task),
        intendedPayload,
        restorePayload,
      };

      const freqAction = actions.find(
        (a) => a.op === "setFrequencyBusinessDay",
      );
      if (
        args.apply &&
        freqAction &&
        freqAction.op === "setFrequencyBusinessDay" &&
        freqAction.regenerateTaskGen &&
        !args.skipRegen
      ) {
        const competence = currentCompetence();
        const links = await listarClientesDaTarefa(client, taskId);
        const regen: RegenerationResult[] = [];
        for (const link of links) {
          const customerId = customerIdOf(link);
          const customerName = customerNameOf(link);
          try {
            const rg = await regenerarTarefasCliente(
              client,
              customerId,
              competence,
            );
            regen.push({
              customerId,
              customerName,
              result: rg.erase.ok && rg.generate.ok ? "success" : "failure",
              erase: rg.erase,
              generate: rg.generate,
            });
          } catch (error: unknown) {
            regen.push({
              customerId,
              customerName,
              result: "failure",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        result.regeneration = regen;
        result.detail =
          "Payload ja no estado desejado; regeneracao task-gen executada";
      }

      results.push(result);
      continue;
    }

    if (!args.apply) {
      results.push({
        op: actions[0].op,
        taskId,
        name: task.name,
        result: "planned",
        detail: `Dry-run: ${actions.map((a) => a.op).join("+")}`,
        before: summarizeTask(task),
        intendedPayload,
        restorePayload,
      });
      continue;
    }

    try {
      const updated = await atualizarModeloTarefa(
        client,
        taskId,
        intendedPayload,
      );
      const result: ActionResult = {
        op: actions[0].op,
        taskId,
        name: updated.name,
        result: "success",
        before: summarizeTask(task),
        after: summarizeTask(updated),
        intendedPayload,
        restorePayload,
      };

      const freqAction = actions.find(
        (a) => a.op === "setFrequencyBusinessDay",
      );
      if (
        freqAction &&
        freqAction.op === "setFrequencyBusinessDay" &&
        freqAction.regenerateTaskGen &&
        !args.skipRegen
      ) {
        const competence = currentCompetence();
        const links = await listarClientesDaTarefa(client, taskId);
        const regen: RegenerationResult[] = [];
        for (const link of links) {
          const customerId = customerIdOf(link);
          const customerName = customerNameOf(link);
          try {
            const rg = await regenerarTarefasCliente(
              client,
              customerId,
              competence,
            );
            regen.push({
              customerId,
              customerName,
              result: rg.erase.ok && rg.generate.ok ? "success" : "failure",
              erase: rg.erase,
              generate: rg.generate,
            });
          } catch (error: unknown) {
            regen.push({
              customerId,
              customerName,
              result: "failure",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        result.regeneration = regen;
        if (regen.some((r) => r.result === "failure")) {
          result.detail =
            "Modelo atualizado, mas regeneracao task-gen teve falha parcial";
        }
      }

      results.push(result);
      console.log(`[ok] ${updated.name} (${actions.map((a) => a.op).join("+")})`);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? JSON.stringify(
              (error as { response?: { data?: unknown } }).response?.data,
            )
          : error instanceof Error
            ? error.message
            : String(error);
      results.push({
        op: actions[0].op,
        taskId,
        name: task.name,
        result: "failure",
        detail: message,
        before: summarizeTask(task),
        intendedPayload,
        restorePayload,
      });
      console.error(`[fail] ${task.name}: ${message}`);
    }
  }

  // Checklists / steps
  const stepActions = manifest.actions.filter((a) => a.op === "addSteps");
  for (const action of stepActions) {
    if (action.op !== "addSteps") continue;

    let task: GesttaTask;
    try {
      task = await obterTarefa(client, action.taskId);
    } catch (error: unknown) {
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: action.expectedName || action.expectedNameAfterRename || action.taskId,
        result: "failure",
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const rename = manifest.actions.find(
      (a) => a.op === "rename" && a.taskId === action.taskId,
    );
    const acceptedNames = new Set<string>();
    if (action.expectedName) acceptedNames.add(action.expectedName);
    if (action.expectedNameAfterRename) {
      acceptedNames.add(action.expectedNameAfterRename);
    }
    if (rename && rename.op === "rename") {
      acceptedNames.add(rename.expectedName);
      acceptedNames.add(rename.name);
    }
    if (acceptedNames.size > 0 && !acceptedNames.has(task.name)) {
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: task.name,
        result: "failure",
        detail: `Nome vivo diverge para checklist. vivo="${task.name}" aceitos=${JSON.stringify([...acceptedNames])}`,
      });
      continue;
    }

    const existing = await listarSteps(client, action.taskId);
    const existingNames = new Set(existing.map((s) => s.name.trim().toLowerCase()));
    const missing = action.steps.filter(
      (s) => !existingNames.has(s.name.trim().toLowerCase()),
    );

    checklistManualRoteiro.push({
      taskId: action.taskId,
      taskName: task.name,
      existingSteps: existing,
      toAdd: missing,
      alreadyPresent: action.steps.filter((s) =>
        existingNames.has(s.name.trim().toLowerCase()),
      ),
    });

    if (args.skipChecklists) {
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: task.name,
        result: "skipped",
        detail: "skip-checklists",
      });
      continue;
    }

    if (missing.length === 0) {
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: task.name,
        result: args.apply ? "skipped" : "planned",
        detail: "Todos os steps ja existem",
        stepsAdded: [],
      });
      continue;
    }

    if (!args.apply) {
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: task.name,
        result: "planned",
        detail: `Dry-run: adicionar ${missing.length} step(s)`,
        stepsAdded: missing.map((s) => s.name),
      });
      continue;
    }

    try {
      let order =
        existing.reduce((max, s) => Math.max(max, s.order || 0), 0) + 1;
      const added: string[] = [];
      for (const step of missing) {
        await criarStep(client, action.taskId, {
          name: step.name,
          order,
          required: step.required !== false,
        });
        added.push(step.name);
        order += 1;
      }
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: task.name,
        result: "success",
        stepsAdded: added,
      });
      console.log(`[ok] checklist ${task.name}: +${added.length}`);
    } catch (error: unknown) {
      results.push({
        op: "addSteps",
        taskId: action.taskId,
        name: task.name,
        result: "failure",
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const backupPath = path.join(
    args.reportsDir,
    `backup_dp_consultivo_${ts}.json`,
  );
  const execPath = path.join(
    args.reportsDir,
    `execucao_dp_consultivo_${ts}.json`,
  );
  const checklistPath = path.join(
    args.reportsDir,
    `checklist_dp_consultivo_${ts}.json`,
  );

  const regenerationResults = results.flatMap((r) =>
    (r.regeneration || []).map((rg) => ({
      taskId: r.taskId,
      taskName: r.name,
      ...rg,
    })),
  );
  const regenPath =
    regenerationResults.length > 0
      ? path.join(args.reportsDir, `regeneracao_dp_consultivo_${ts}.json`)
      : null;

  writeJson(backupPath, {
    schemaVersion: 1,
    kind: "gestta-dp-consultivo-backup",
    createdAt: startedAt,
    mode,
    manifestId: manifest.id,
    manifestPath: args.manifestPath,
    taskCount: backupTasks.length,
    tasks: backupTasks,
  });

  const summary = {
    targeted: results.length,
    success: results.filter((r) => r.result === "success").length,
    planned: results.filter((r) => r.result === "planned").length,
    skipped: results.filter((r) => r.result === "skipped").length,
    failure: results.filter((r) => r.result === "failure").length,
  };

  writeJson(execPath, {
    schemaVersion: 1,
    kind: "gestta-dp-consultivo-update-report",
    startedAt,
    finishedAt: new Date().toISOString(),
    mode,
    manifestId: manifest.id,
    backupPath,
    checklistPath,
    regenerationPath: regenPath,
    summary,
    results,
  });

  writeJson(checklistPath, {
    schemaVersion: 1,
    kind: "gestta-dp-consultivo-checklist-report",
    createdAt: new Date().toISOString(),
    mode,
    appliedViaApi: args.apply && !args.skipChecklists,
    note:
      "API descoberta: GET/POST /admin/company/task/{taskId}/step ; DELETE /admin/company/task/step/{stepId}",
    roteiroManualUi: [
      "Admin Gestta → Modelos de tarefa → abrir a tarefa",
      "Aba/seção de etapas (checklist)",
      "Incluir os itens listados em toAdd (se ainda faltarem)",
      "FGTS: VERIFICAÇÃO DE PENDENCIA FGTS (2 itens)",
      "RF DP: VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP) (3 itens)",
    ],
    tasks: checklistManualRoteiro,
  });

  if (regenPath) {
    writeJson(regenPath, {
      schemaVersion: 1,
      kind: "gestta-dp-consultivo-regeneration-report",
      startedAt,
      finishedAt: new Date().toISOString(),
      competence: currentCompetence(),
      backupPath,
      summary: {
        targeted: regenerationResults.length,
        success: regenerationResults.filter((r) => r.result === "success")
          .length,
        failure: regenerationResults.filter((r) => r.result === "failure")
          .length,
      },
      results: regenerationResults,
    });
  }

  console.log(`[relatorio] backup=${backupPath}`);
  console.log(`[relatorio] execucao=${execPath}`);
  console.log(`[relatorio] checklist=${checklistPath}`);
  if (regenPath) console.log(`[relatorio] regeneracao=${regenPath}`);
  console.log(`[resumo] ${JSON.stringify(summary)}`);

  if (summary.failure > 0) process.exitCode = 1;
}

run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
