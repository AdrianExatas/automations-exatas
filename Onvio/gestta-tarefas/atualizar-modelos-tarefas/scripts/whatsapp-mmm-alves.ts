/**
 * Troca reversível das empresas 604/607/630 para modelos VIA WHATSAPP.
 * Não edita checklists dos modelos originais.
 *
 *   npx ts-node scripts/whatsapp-mmm-alves.ts --excel-only
 *   npx ts-node scripts/whatsapp-mmm-alves.ts --dry-run
 *   npx ts-node scripts/whatsapp-mmm-alves.ts --apply
 *   npx ts-node scripts/whatsapp-mmm-alves.ts --rollback relatorios/backup_....json
 */
import fs from "fs";
import path from "path";
import { isAxiosError } from "axios";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  adicionarClientesNaTarefa,
  atualizarModeloTarefa,
  copiarModeloTarefa,
  criarStep,
  customerIdOf,
  listarClientesDaTarefa,
  listarSteps,
  listarTarefasDoCliente,
  listarTarefasRecorrentes,
  obterTarefa,
  patchGroupCustomerConfig,
  removerGroupCustomers,
} from "../src/endpoints";
import { departmentIdOf, toUpdatePayload } from "../src/payload";
import {
  CustomerTaskConfig,
  GesttaStep,
  GesttaTask,
} from "../src/types";

const WA_STEP = "ENVIAR DOCUMENTAÇÃO POR WHATSAPP PARA O CLIENTE";
const DARF_WA_ID = "69efd4267b7bdd6de31db06b";
const HONORARIOS_WA_ID = "6846c4b905c6b61f4e4c3563";
const POLL_ATTEMPTS = 20;
const POLL_MS = 3000;

const CUSTOMERS = [
  {
    code: "604",
    cnpj: "05230649000112",
    id: "685c13175c930038c7bcc9f3",
    name: "MMM UTILIDADES DO LAR LTDA",
  },
  {
    code: "607",
    cnpj: "13800072000165",
    id: "685dbe49c8f21be1257d0939",
    name: "ALVES FRANCA COMERCIO DE MOVEIS LTDA",
  },
  {
    code: "630",
    cnpj: "05230649000201",
    id: "68a8713aa0c854a40985238e",
    name: "MMM UTILIDADES DO LAR LTDA",
  },
] as const;

const KEEP = [
  "13º SALÁRIO ADIANTAMENTO",
  "13º SALÁRIO INTEGRAL",
  "ANÁLISE DE EMPRESA SEM MOVIMENTO - DP",
  "CONSULTAR FAP",
  "LIGAÇÃO AO CLIENTE - ACOMPANHAMENTO CS",
];

const REUSE: Array<{ current: string; waName: string; waId?: string; reactivate?: boolean }> = [
  { current: "13º DCTFWEB", waName: "13º DCTFWEB - VIA WHATSAPP" },
  {
    current: "DARF PIS/COFINS (CUMULATIVO)",
    waName: "DARF PIS/COFINS (CUMULATIVO) - VIA WHATSAPP",
    waId: DARF_WA_ID,
  },
  { current: "DCTFWEB - MIT", waName: "DCTFWEB - MIT - VIA WHATSAPP" },
  { current: "DCTFWEB - SETOR PESSOAL", waName: "DCTFWEB - SETOR PESSOAL - VIA WHATSAPP" },
  { current: "EFD CONTRIBUIÇÕES", waName: "EFD CONTRIBUIÇÕES - VIA WHATSAPP" },
  { current: "FGTS DIGITAL", waName: "FGTS DIGITAL - VIA WHATSAPP" },
  { current: "FGTS DIGITAL CONSIGNADO", waName: "FGTS DIGITAL CONSIGNADO - VIA WHATSAPP" },
  {
    current: "GUIA IR E CSLL - LUCRO PRESUMIDO (TRIMESTRAL)",
    waName: "GUIA IR E CSLL - LUCRO PRESUMIDO (TRIMESTRAL) - VIA WHATSAPP",
  },
  { current: "IRPJ e CSLL EM COTAS", waName: "IRPJ e CSLL EM COTAS - VIA WHATSAPP" },
  { current: "REINF - SETOR FISCAL NORMAL", waName: "REINF - SETOR FISCAL NORMAL - VIA WHATSAPP" },
  {
    current: "HONORÁRIOS EXATAS",
    waName: "HONORÁRIOS EXATAS - VIA WHATSAPP",
    waId: HONORARIOS_WA_ID,
    reactivate: true,
  },
];

const CREATE = [
  "EFD ICMS IPI - NORMAL (SERGIPE)",
  "ICMS NORMAL (SERGIPE)",
  "ICMS ANTECIPADO - NORMAL (SERGIPE)",
  "GUIA DIFERENCIAL DE ALÍQUOTAS (SERGIPE)",
  "INCLUSÃO NOTAS AGÍL SEFAZ ( LUCRO REL / PRESUMIDO )",
  "FOLHA DE PAGAMENTO GERAL - GRUPO 1",
  "FOLHA DE PAGAMENTO GERAL - GRUPO 2",
  "COMPROVANTE DE RENDIMENTO",
  "CONSULTAR EXTRATOR DIRF",
  "ECF - ESCRITURAÇÃO CONTÁBIL FISCAL",
  "FOLHA (ADIANTAMENTO 40%) - 2",
  "FOLHA (ADIANTAMENTO 50%)",
  "PLR - PARTICIPAÇÃO NOS LUCROS",
  "VERIFICAÇÃO DE PENDENCIA FGTS",
  "VERIFICAR PENDENCIAS - RECEITA FEDERAL (DP)",
  "VERIFICAR PENDÊNCIAS SEFAZ/RECEITA FEDERAL (NORMAL)",
];

type ActionKind = "keep" | "reuse" | "create";

interface PlannedRow {
  code: string;
  empresa: string;
  cnpj: string;
  customerId: string;
  linkId: string;
  sourceTaskId: string;
  sourceTaskName: string;
  deptName: string;
  responsibleId?: string;
  responsibleName?: string;
  approve?: boolean;
  approvers: string[];
  approveType: string[];
  notifyCustomer: boolean;
  notifyWhatsapp: boolean;
  documents: string[];
  documentNames: string[];
  enviaCliente: string;
  action: ActionKind;
  targetTaskName: string;
  targetTaskId?: string;
  reactivate?: boolean;
  detail: string;
}

interface SwapBackup {
  code: string;
  customerId: string;
  customerName: string;
  cnpj: string;
  sourceTaskId: string;
  sourceTaskName: string;
  targetTaskId: string;
  targetTaskName: string;
  oldLinkId: string;
  newLinkId?: string;
  companyUserId?: string;
  companyUserName?: string;
  approve?: boolean;
  approvers: string[];
  approveType: string[];
}

interface BackupFile {
  generatedAt: string;
  createdTaskIds: string[];
  reactivatedTaskIds: string[];
  swaps: SwapBackup[];
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[º°]/g, "O")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
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

function classify(name: string): {
  action: ActionKind;
  targetTaskName: string;
  waId?: string;
  reactivate?: boolean;
} {
  const key = normalizeName(name);
  if (KEEP.some((item) => normalizeName(item) === key)) {
    return { action: "keep", targetTaskName: name };
  }
  const reuse = REUSE.find((item) => normalizeName(item.current) === key);
  if (reuse) {
    return {
      action: "reuse",
      targetTaskName: reuse.waName,
      waId: reuse.waId,
      reactivate: reuse.reactivate,
    };
  }
  if (CREATE.some((item) => normalizeName(item) === key)) {
    return { action: "create", targetTaskName: `${name} - VIA WHATSAPP` };
  }
  return { action: "keep", targetTaskName: name };
}

function enviaDescricao(task: GesttaTask, steps: GesttaStep[]): string {
  const parts: string[] = [];
  if (task.notify_customer) parts.push("notify_customer");
  if (task.notify_whatsapp) parts.push("notify_whatsapp");
  if ((task.company_documents ?? []).length > 0) {
    parts.push(`documentos=${(task.company_documents ?? []).length}`);
  }
  const stepText = steps.map((step) => step.name).join(" ").toLowerCase();
  if (/(cliente|whatsapp|portal|onvio|enviar|envio|encaminhar|avisar)/.test(stepText)) {
    parts.push("checklist menciona envio/cliente");
  }
  return parts.length > 0 ? parts.join("; ") : "não envia (interno)";
}

function parseArgs(argv: string[]): {
  excelOnly: boolean;
  apply: boolean;
  rollbackPath?: string;
} {
  const rollbackFlag = argv.findIndex((item) => item === "--rollback");
  return {
    excelOnly: argv.includes("--excel-only"),
    apply: argv.includes("--apply") && !argv.includes("--dry-run"),
    rollbackPath:
      rollbackFlag >= 0 && argv[rollbackFlag + 1]
        ? path.resolve(argv[rollbackFlag + 1])
        : undefined,
  };
}

function findTaskByName(tasks: GesttaTask[], name: string): GesttaTask | undefined {
  const key = normalizeName(name);
  const matches = tasks.filter((task) => normalizeName(task.name) === key);
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) return undefined;
  const withoutCoruja = matches.filter((task) => !/coruja/i.test(task.name));
  if (withoutCoruja.length === 1) return withoutCoruja[0];
  return withoutCoruja[0] ?? matches[0];
}

async function waitForLink(
  client: ReturnType<typeof createGesttaClient>,
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
    `Vínculo da tarefa ${taskId} não apareceu para o cliente ${customerId} após ${POLL_ATTEMPTS} tentativas.`,
  );
}

async function copySteps(
  client: ReturnType<typeof createGesttaClient>,
  sourceTaskId: string,
  targetTaskId: string,
): Promise<void> {
  const sourceSteps = [...(await listarSteps(client, sourceTaskId))].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0),
  );
  const targetSteps = await listarSteps(client, targetTaskId);
  const existing = new Set(targetSteps.map((step) => normalizeName(step.name)));
  let order = targetSteps.reduce((max, step) => Math.max(max, step.order ?? 0), 0);

  for (const step of sourceSteps) {
    const name = (step.name ?? "").trim();
    if (!name) continue;
    if (existing.has(normalizeName(name))) continue;
    order += 1;
    await criarStep(client, targetTaskId, {
      name,
      order,
      required: Boolean(step.required),
    });
    existing.add(normalizeName(name));
  }

  if (![...existing].some((name) => name.includes("WHATSAPP"))) {
    order += 1;
    await criarStep(client, targetTaskId, {
      name: WA_STEP,
      order,
      required: true,
    });
  }
}

async function unlinkAllCustomers(
  client: ReturnType<typeof createGesttaClient>,
  taskId: string,
): Promise<number> {
  const links = await listarClientesDaTarefa(client, taskId);
  const ids = links.map((link) => link._id).filter(Boolean);
  for (let i = 0; i < ids.length; i += 100) {
    await removerGroupCustomers(client, ids.slice(i, i + 100));
    await sleep(150);
  }
  return ids.length;
}

async function ensureWhatsappModel(
  client: ReturnType<typeof createGesttaClient>,
  allTasks: GesttaTask[],
  source: GesttaTask,
  targetName: string,
  apply: boolean,
  createdIds: string[],
): Promise<{ taskId: string; created: boolean; existed: boolean }> {
  const existing = findTaskByName(allTasks, targetName);
  if (existing) {
    return { taskId: existing._id, created: false, existed: true };
  }
  if (!apply) {
    return { taskId: `planned:${normalizeName(targetName)}`, created: true, existed: false };
  }

  const copied = await copiarModeloTarefa(client, source._id);
  createdIds.push(copied._id);
  try {
    const removed = await unlinkAllCustomers(client, copied._id);
    const payload = toUpdatePayload(copied, {
      name: targetName,
      active: true,
    });
    const renamed = await atualizarModeloTarefa(client, copied._id, payload);
    await copySteps(client, source._id, copied._id);
    allTasks.push(renamed);
    console.log(`  clone ${source.name} copiou e removeu ${removed} vínculo(s)`);
    await sleep(200);
    return { taskId: copied._id, created: true, existed: false };
  } catch (error) {
    try {
      await client.delete(`/admin/company/task/${copied._id}`, { data: {} });
    } catch {
      // o backup ainda lista createdIds para rollback/desativar
    }
    throw error;
  }
}

async function reactivateHonorarios(
  client: ReturnType<typeof createGesttaClient>,
  source: GesttaTask,
  apply: boolean,
  reactivatedIds: string[],
): Promise<void> {
  if (!apply) return;
  const current = await obterTarefa(client, HONORARIOS_WA_ID);
  const payload = toUpdatePayload(current, { active: true });
  await atualizarModeloTarefa(client, HONORARIOS_WA_ID, payload);
  await copySteps(client, source._id, HONORARIOS_WA_ID);
  if (!reactivatedIds.includes(HONORARIOS_WA_ID)) reactivatedIds.push(HONORARIOS_WA_ID);
}

function writeExcel(rows: PlannedRow[], filePath: string): void {
  const sheetRows = rows.map((row) => ({
    Código: row.code,
    Empresa: row.empresa,
    CNPJ: row.cnpj,
    "Tarefa atual": row.sourceTaskName,
    Departamento: row.deptName,
    Responsável: row.responsibleName ?? "",
    "Envia ao cliente": row.enviaCliente,
    Documentos: row.documentNames.join(" | "),
    Ação: row.action,
    Substituto: row.action === "keep" ? "(mantém)" : row.targetTaskName,
    "ID atual": row.sourceTaskId,
    "ID destino": row.targetTaskId ?? "",
    Detalhe: row.detail,
  }));
  const summary = CUSTOMERS.map((customer) => {
    const subset = rows.filter((row) => row.code === customer.code);
    return {
      Código: customer.code,
      Empresa: customer.name,
      Total: subset.length,
      Reusar: subset.filter((row) => row.action === "reuse").length,
      Criar: subset.filter((row) => row.action === "create").length,
      Manter: subset.filter((row) => row.action === "keep").length,
    };
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sheetRows), "Tarefas atuais");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), "Resumo");
  XLSX.writeFile(workbook, filePath);
}

async function loadCatalog(
  client: ReturnType<typeof createGesttaClient>,
): Promise<{
  deptNames: Map<string, string>;
  docNames: Map<string, string>;
  allTasks: GesttaTask[];
}> {
  const deptNames = new Map<string, string>();
  const docNames = new Map<string, string>();
  const { data: deptData } = await client.get<{ docs?: Array<{ _id: string; name: string }> } | Array<{ _id: string; name: string }>>(
    "/admin/company/department",
    { params: { limit: 500, page: 1 } },
  );
  const depts = Array.isArray(deptData) ? deptData : deptData.docs ?? [];
  for (const dept of depts) deptNames.set(dept._id, dept.name);

  const { data: docData } = await client.get<{ docs?: Array<{ _id: string; name: string }> } | Array<{ _id: string; name: string }>>(
    "/admin/company/document",
    { params: { limit: 500, page: 1, search: "" } },
  );
  const docs = Array.isArray(docData) ? docData : docData.docs ?? [];
  for (const doc of docs) docNames.set(doc._id, doc.name);

  const allTasks = await listarTarefasRecorrentes(client);
  return { deptNames, docNames, allTasks };
}

async function buildPlan(
  client: ReturnType<typeof createGesttaClient>,
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
): Promise<PlannedRow[]> {
  const { deptNames, docNames, allTasks } = catalog;
  const modelCache = new Map<string, GesttaTask>();
  const stepCache = new Map<string, GesttaStep[]>();
  const rows: PlannedRow[] = [];

  for (const customer of CUSTOMERS) {
    const configs = await listarTarefasDoCliente(client, customer.id);
    for (const config of configs) {
      const sourceTaskId = taskIdOf(config);
      if (!sourceTaskId) continue;
      if (!modelCache.has(sourceTaskId)) {
        modelCache.set(sourceTaskId, await obterTarefa(client, sourceTaskId));
        stepCache.set(sourceTaskId, await listarSteps(client, sourceTaskId));
      }
      const model = modelCache.get(sourceTaskId)!;
      const steps = stepCache.get(sourceTaskId) ?? [];
      const classified = classify(model.name);
      const deptId = departmentIdOf(model);
      const documents = model.company_documents ?? [];
      let targetTaskId = classified.waId;
      if (!targetTaskId && classified.action === "reuse") {
        targetTaskId = findTaskByName(allTasks, classified.targetTaskName)?._id;
      }
      rows.push({
        code: customer.code,
        empresa: customer.name,
        cnpj: customer.cnpj,
        customerId: customer.id,
        linkId: config._id,
        sourceTaskId,
        sourceTaskName: model.name,
        deptName: deptNames.get(deptId) ?? deptId,
        responsibleId: userIdOf(config),
        responsibleName: userNameOf(config),
        approve: config.approve,
        approvers: Array.isArray(config.approvers) ? config.approvers.map(String) : [],
        approveType: Array.isArray(config.approve_type) ? config.approve_type.map(String) : [],
        notifyCustomer: Boolean(model.notify_customer),
        notifyWhatsapp: Boolean(model.notify_whatsapp),
        documents,
        documentNames: documents.map((id) => docNames.get(id) ?? id),
        enviaCliente: enviaDescricao(model, steps),
        action: classified.action,
        targetTaskName: classified.targetTaskName,
        targetTaskId,
        reactivate: classified.reactivate,
        detail:
          classified.action === "keep"
            ? "Tarefa interna / sem substituto WhatsApp"
            : classified.action === "reuse"
              ? classified.reactivate
                ? "Reativar modelo WA inativo e copiar docs/steps"
                : "Reusar gêmeo VIA WHATSAPP existente"
              : "Criar clone do modelo atual + step WhatsApp",
      });
    }
  }
  return rows.sort((a, b) => a.code.localeCompare(b.code) || a.sourceTaskName.localeCompare(b.sourceTaskName));
}

async function applyPlan(
  client: ReturnType<typeof createGesttaClient>,
  rows: PlannedRow[],
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
  apply: boolean,
  reportsDir: string,
): Promise<void> {
  const createdTaskIds: string[] = [];
  const reactivatedTaskIds: string[] = [];
  const swaps: SwapBackup[] = [];
  const backupPath = path.join(
    reportsDir,
    `${apply ? "backup" : "planned"}_whatsapp_mmm_alves_${stamp()}.json`,
  );
  const persistBackup = () => {
    const backup: BackupFile = {
      generatedAt: new Date().toISOString(),
      createdTaskIds,
      reactivatedTaskIds,
      swaps,
    };
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  };
  const uniqueCreates = new Map<string, PlannedRow>();
  for (const row of rows.filter((item) => item.action === "create")) {
    if (!uniqueCreates.has(row.sourceTaskId)) uniqueCreates.set(row.sourceTaskId, row);
  }

  for (const row of uniqueCreates.values()) {
    const source = await obterTarefa(client, row.sourceTaskId);
    try {
      const ensured = await ensureWhatsappModel(
        client,
        catalog.allTasks,
        source,
        row.targetTaskName,
        apply,
        createdTaskIds,
      );
      if (
        ensured.taskId &&
        !ensured.taskId.startsWith("planned:") &&
        !createdTaskIds.includes(ensured.taskId)
      ) {
        createdTaskIds.push(ensured.taskId);
      }
      for (const item of rows) {
        if (item.sourceTaskId === row.sourceTaskId && item.action === "create") {
          item.targetTaskId = ensured.taskId;
          item.detail = ensured.existed
            ? "Gêmeo já existia; reusando em vez de criar de novo"
            : apply
              ? `Clone criado (${ensured.taskId})`
              : "Clone planejado";
        }
      }
      console.log(
        `${apply ? "CREATE" : "PLAN-CREATE"} ${row.sourceTaskName} -> ${row.targetTaskName} (${ensured.taskId})`,
      );
      persistBackup();
    } catch (error) {
      throw new Error(`Falha ao criar ${row.targetTaskName}: ${axiosErrorDetail(error)}`);
    }
  }

  const honorarios = rows.find((row) => row.reactivate);
  if (honorarios) {
    const source = await obterTarefa(client, honorarios.sourceTaskId);
    await reactivateHonorarios(client, source, apply, reactivatedTaskIds);
    for (const row of rows.filter((item) => item.reactivate)) {
      row.targetTaskId = HONORARIOS_WA_ID;
    }
    console.log(`${apply ? "REACTIVATE" : "PLAN-REACTIVATE"} ${honorarios.targetTaskName}`);
  }

  const toSwap = rows.filter((row) => row.action !== "keep");
  for (const [index, row] of toSwap.entries()) {
    if (!row.targetTaskId) {
      throw new Error(`Sem ID de destino para ${row.sourceTaskName} (${row.code})`);
    }
    const swap: SwapBackup = {
      code: row.code,
      customerId: row.customerId,
      customerName: row.empresa,
      cnpj: row.cnpj,
      sourceTaskId: row.sourceTaskId,
      sourceTaskName: row.sourceTaskName,
      targetTaskId: row.targetTaskId,
      targetTaskName: row.targetTaskName,
      oldLinkId: row.linkId,
      companyUserId: row.responsibleId,
      companyUserName: row.responsibleName,
      approve: row.approve,
      approvers: row.approvers,
      approveType: row.approveType,
    };

    console.log(
      `${apply ? "SWAP" : "PLAN-SWAP"} ${index + 1}/${toSwap.length} ${row.code} ${row.sourceTaskName} -> ${row.targetTaskName}`,
    );

    if (!apply) {
      swaps.push(swap);
      continue;
    }

    const atuais = await listarTarefasDoCliente(client, row.customerId);
    const stillOnSource = atuais.find(
      (item) => item._id === row.linkId || taskIdOf(item) === row.sourceTaskId,
    );
    const targetLinks = await listarClientesDaTarefa(client, row.targetTaskId);
    const alreadyOnTarget = targetLinks.find((item) => customerIdOf(item) === row.customerId);

    if (alreadyOnTarget) {
      swap.newLinkId = alreadyOnTarget._id;
    } else {
      await adicionarClientesNaTarefa(client, row.targetTaskId, [row.customerId]);
      const newLink = await waitForLink(client, row.customerId, row.targetTaskId);
      swap.newLinkId = newLink._id;
    }

    if (row.responsibleId && swap.newLinkId) {
      try {
        await patchGroupCustomerConfig(client, {
          ids: [swap.newLinkId],
          company_user: row.responsibleId,
          approve_type: row.approveType ?? [],
        });
      } catch (error) {
        console.warn(
          `  aviso: não atualizou responsável de ${row.code} ${row.sourceTaskName}: ${axiosErrorDetail(error)}`,
        );
      }
    }

    if (stillOnSource && stillOnSource._id !== swap.newLinkId) {
      await removerGroupCustomers(client, [stillOnSource._id]);
    }
    swaps.push(swap);
    persistBackup();
    await sleep(200);
  }

  persistBackup();
  console.log(`Backup: ${backupPath}`);
}

async function rollback(
  client: ReturnType<typeof createGesttaClient>,
  backupPath: string,
): Promise<void> {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8")) as BackupFile;
  for (const swap of [...backup.swaps].reverse()) {
    console.log(`ROLLBACK ${swap.code} ${swap.targetTaskName} -> ${swap.sourceTaskName}`);
    const current = await listarTarefasDoCliente(client, swap.customerId);
    const onSource = current.find((item) => taskIdOf(item) === swap.sourceTaskId);
    if (!onSource) {
      await adicionarClientesNaTarefa(client, swap.sourceTaskId, [swap.customerId]);
      const restored = await waitForLink(client, swap.customerId, swap.sourceTaskId);
      if (swap.companyUserId) {
        await patchGroupCustomerConfig(client, {
          ids: [restored._id],
          company_user: swap.companyUserId,
          approve: swap.approve,
          approvers: swap.approvers,
          approve_type: swap.approveType,
        });
      }
    }
    const onTarget = (await listarTarefasDoCliente(client, swap.customerId)).find(
      (item) => taskIdOf(item) === swap.targetTaskId,
    );
    if (onTarget) {
      await removerGroupCustomers(client, [onTarget._id]);
    }
    await sleep(200);
  }

  for (const taskId of [...backup.createdTaskIds, ...backup.reactivatedTaskIds]) {
    try {
      const task = await obterTarefa(client, taskId);
      const payload = toUpdatePayload(task, { active: false });
      await atualizarModeloTarefa(client, taskId, payload);
      console.log(`Desativado ${task.name} (${taskId})`);
    } catch (error) {
      console.warn(`Não desativou ${taskId}: ${axiosErrorDetail(error)}`);
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const reportsDir = path.resolve(__dirname, "..", "..", "relatorios");
  fs.mkdirSync(reportsDir, { recursive: true });
  const client = createGesttaClient(getJwt());

  if (args.rollbackPath) {
    await rollback(client, args.rollbackPath);
    return;
  }

  const catalog = await loadCatalog(client);
  const rows = await buildPlan(client, catalog);
  const excelPath = path.join(
    reportsDir,
    `inventario_whatsapp_mmm_alves_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
  writeExcel(rows, excelPath);
  console.log(`Excel: ${excelPath}`);
  console.log(
    `Linhas=${rows.length} reusar=${rows.filter((r) => r.action === "reuse").length} criar=${rows.filter((r) => r.action === "create").length} manter=${rows.filter((r) => r.action === "keep").length}`,
  );

  const jsonPath = excelPath.replace(/\.xlsx$/, ".json");
  fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf8");

  if (args.excelOnly) return;
  await applyPlan(client, rows, catalog, args.apply, reportsDir);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
