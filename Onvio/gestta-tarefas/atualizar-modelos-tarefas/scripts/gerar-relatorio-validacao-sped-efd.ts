/**
 * Relatório somente leitura para validação fiscal da alteração de recorrências
 * do SPED EFD ICMS IPI.
 *
 * Executar: npx ts-node scripts/gerar-relatorio-validacao-sped-efd.ts
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import {
  buscarTarefasGeradasCliente,
  customerIdOf,
  customerNameOf,
  listarClientesDaTarefa,
  listarTarefasRecorrentes,
} from "../src/endpoints";
import { GesttaTask, TaskCustomerLink } from "../src/types";

const REPORT_PATH = path.resolve(
  __dirname,
  "..",
  "..",
  "relatorios",
  "validacao_sped_efd_icms_ipi_2026-09-01.xlsx",
);

type ModelKind = "NORMAL" | "SN";

interface TargetModel {
  task: GesttaTask;
  state: string;
  kind: ModelKind;
  whatsapp: boolean;
  links: TaskCustomerLink[];
  reference?: GesttaTask;
  currentLegal: number;
  currentMeta: number;
  proposedLegal?: number;
  proposedMeta?: number;
  proposedOffset?: number;
  result: string;
}

interface GeneratedRow {
  modelName: string;
  customerId: string;
  customerName: string;
  linkActive: string;
  taskId: string;
}

function normalize(value: string | undefined | null): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stateOf(name: string): string {
  const match = name.match(/\(([^)]+)\)/);
  return normalize(match?.[1]);
}

function isWhatsapp(name: string): boolean {
  return normalize(name).includes("VIA WHATSAPP");
}

function isSn(name: string): boolean {
  return /\bSN\b/.test(normalize(name));
}

function day(value: number | null | undefined, label: string): number {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 31) {
    throw new Error(`${label} inválido: ${String(value)}`);
  }
  return Number(value);
}

function metaOf(task: GesttaTask): number {
  const legal = day(task.frequency_date?.month_day, `${task.name}: data legal`);
  const offset = Number(task.accountancy);
  if (!Number.isInteger(offset)) {
    throw new Error(`${task.name}: offset de meta inválido (${String(task.accountancy)})`);
  }
  return legal + offset;
}

function nameOfReference(task: GesttaTask | undefined): string {
  return task?.name ?? "SEM REFERÊNCIA CONFIGURADA";
}

function resultFor(target: Omit<TargetModel, "result">): string {
  if (!target.reference) return "PENDÊNCIA FISCAL — NÃO ALTERAR";
  if (target.links.length === 0) {
    return "SEM IMPACTO IMEDIATO — ALTERAR MODELO";
  }
  return "ALTERAR MODELO";
}

function dateInSaoPaulo(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

async function withConcurrency<T, R>(
  values: T[],
  limit: number,
  work: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let next = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      results[index] = await work(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, () => worker()),
  );
  return results;
}

function applyTableStyle(sheet: XLSX.WorkSheet, headerRow: number): void {
  const ref = sheet["!ref"];
  if (!ref) return;
  const range = XLSX.utils.decode_range(ref);
  sheet["!autofilter"] = { ref };
  (sheet as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: headerRow,
  };
  sheet["!rows"] = Array.from({ length: range.e.r + 1 }, (_, index) =>
    index === headerRow - 1 ? { hpt: 30 } : { hpt: 18 },
  );

  const headerFill = "1F4E78";
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const address = XLSX.utils.encode_cell({ r: headerRow - 1, c: column });
    const cell = sheet[address];
    if (!cell) continue;
    (cell as XLSX.CellObject & { s?: unknown }).s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: headerFill } },
      alignment: { vertical: "center", wrapText: true },
    };
  }

  const headers = Array.from({ length: range.e.c - range.s.c + 1 }, (_, index) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: headerRow - 1, c: index })];
    return String(cell?.v ?? "");
  });
  const statusColumn = headers.findIndex((item) =>
    /resultado|classificação/i.test(item),
  );
  if (statusColumn >= 0) {
    for (let row = headerRow; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: statusColumn })];
      if (!cell) continue;
      const text = String(cell.v ?? "");
      const color = text.includes("PENDÊNCIA")
        ? "F4CCCC"
        : text.includes("SEM IMPACTO")
          ? "FFF2CC"
          : "D9EAD3";
      (cell as XLSX.CellObject & { s?: unknown }).s = {
        fill: { patternType: "solid", fgColor: { rgb: color } },
        alignment: { vertical: "center", wrapText: true },
      };
    }
  }
  sheet["!cols"] = headers.map((header, column) => {
    let maxLength = header.length;
    for (let row = headerRow; row <= range.e.r; row += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })];
      maxLength = Math.max(maxLength, String(cell?.v ?? "").length);
    }
    return { wch: Math.min(Math.max(maxLength + 2, 12), 55) };
  });
}

function buildTable(
  headers: string[],
  rows: Array<Array<string | number>>,
): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  applyTableStyle(sheet, 1);
  return sheet;
}

async function main(): Promise<void> {
  const client = createGesttaClient(getJwt());
  const allTasks = await listarTarefasRecorrentes(client);
  const activeEfd = allTasks.filter(
    (task) => task.active && normalize(task.name).startsWith("EFD ICMS IPI"),
  );
  const activeIcms = allTasks.filter(
    (task) => task.active && normalize(task.name).startsWith("ICMS NORMAL"),
  );
  const targetTasks = activeEfd.filter((task) => {
    const name = normalize(task.name);
    return name.includes(" NORMAL ") || isSn(task.name);
  });

  const targetsWithoutLinks = targetTasks.map((task) => ({ task }));
  const targetLinks = await withConcurrency(targetsWithoutLinks, 5, async ({ task }) => ({
    task,
    links: await listarClientesDaTarefa(client, task._id),
  }));

  const targets: TargetModel[] = targetLinks.map(({ task, links }) => {
    const kind: ModelKind = isSn(task.name) ? "SN" : "NORMAL";
    const state = stateOf(task.name);
    const candidates = activeIcms.filter(
      (icms) =>
        stateOf(icms.name) === state &&
        !isWhatsapp(icms.name) &&
        (kind === "SN" ? true : !normalize(icms.name).includes("SIMPLES NACIONAL")),
    );
    const reference =
      kind === "SN"
        ? candidates.find((item) => normalize(item.name).includes("SIMPLES NACIONAL")) ??
          candidates.find((item) => !normalize(item.name).includes("SIMPLES NACIONAL"))
        : candidates[0];
    const currentLegal = day(task.frequency_date?.month_day, `${task.name}: data legal`);
    const currentMeta = metaOf(task);
    const referenceMeta = reference ? metaOf(reference) : undefined;
    const proposedLegal = reference ? 15 : undefined;
    const proposedMeta = referenceMeta == null ? undefined : referenceMeta + 1;
    const proposedOffset =
      proposedMeta == null || proposedLegal == null
        ? undefined
        : proposedMeta - proposedLegal;
    const partial = {
      task,
      state,
      kind,
      whatsapp: isWhatsapp(task.name),
      links,
      reference,
      currentLegal,
      currentMeta,
      proposedLegal,
      proposedMeta,
      proposedOffset,
    };
    return { ...partial, result: resultFor(partial) };
  });

  const planned = targets.filter((item) => item.reference);
  const pending = targets.filter((item) => !item.reference);
  const linkCount = targets.reduce((total, item) => total + item.links.length, 0);
  if (targets.length !== 20 || planned.length !== 19 || pending.length !== 1 || linkCount !== 121) {
    throw new Error(
      `Levantamento fora do esperado: modelos=${targets.length}, alterar=${planned.length}, pendências=${pending.length}, vínculos=${linkCount}`,
    );
  }

  const generatedTargets = new Map<string, GeneratedRow[]>();
  for (const target of planned) {
    for (const link of target.links) {
      const customerId = customerIdOf(link);
      const rows = generatedTargets.get(customerId) ?? [];
      rows.push({
        modelName: target.task.name,
        customerId,
        customerName: customerNameOf(link) ?? "",
        linkActive:
          (link as TaskCustomerLink & { active?: boolean }).active === false
            ? "não"
            : "sim",
        taskId: target.task._id,
      });
      generatedTargets.set(customerId, rows);
    }
  }

  console.log(`[sped-efd] modelos=${targets.length}; vínculos=${linkCount}; clientes consultados=${generatedTargets.size}`);
  const generatedByCustomer = await withConcurrency(
    [...generatedTargets.entries()],
    5,
    async ([customerId, rows]) => ({
      customerId,
      rows,
      tasks: await buscarTarefasGeradasCliente(client, customerId, ["OPEN", "IMPEDIMENT"]),
    }),
  );
  const generatedRows: Array<Array<string | number>> = [];
  for (const item of generatedByCustomer) {
    const expected = new Map(item.rows.map((row) => [row.modelName, row]));
    for (const task of item.tasks) {
      const target = expected.get(task.name);
      if (!target) continue;
      const raw = task as unknown as Record<string, unknown>;
      const owner = raw.owner as { name?: string } | undefined;
      generatedRows.push([
        target.customerName || String((task.customer as { name?: string } | undefined)?.name ?? ""),
        target.customerId,
        target.modelName,
        target.taskId,
        target.linkActive,
        task.status,
        dateInSaoPaulo(task.competence_date),
        dateInSaoPaulo(task.legal_date),
        dateInSaoPaulo(task.due_date),
        owner?.name ?? "",
        task._id,
      ]);
    }
  }
  generatedRows.sort((a, b) =>
    String(a[0]).localeCompare(String(b[0]), "pt-BR") ||
    String(a[6]).localeCompare(String(b[6]), "pt-BR") ||
    String(a[2]).localeCompare(String(b[2]), "pt-BR"),
  );

  const modelRows = targets
    .slice()
    .sort((a, b) => a.task.name.localeCompare(b.task.name, "pt-BR"))
    .map((item) => [
      item.task.name,
      item.task._id,
      item.state,
      item.kind,
      item.whatsapp ? "sim" : "não",
      item.links.length,
      item.currentLegal,
      item.currentMeta,
      Number(item.task.accountancy),
      nameOfReference(item.reference),
      item.reference ? metaOf(item.reference) : "",
      item.proposedLegal ?? "",
      item.proposedMeta ?? "",
      item.proposedOffset ?? "",
      item.result,
    ]);

  const summaryRows: Array<Array<string | number>> = [
    ["RELATÓRIO DE VALIDAÇÃO FISCAL", ""],
    ["Assunto", "Alteração de recorrências do SPED — EFD ICMS IPI"],
    ["Levantamento", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
    ["Regra proposta", "Data legal do SPED: dia 15; data meta: 1 dia após a data meta do ICMS NORMAL da UF."],
    ["Modelos EFD ativos no escopo", targets.length],
    ["Vínculos de clientes no escopo", linkCount],
    ["Modelos a alterar", planned.length],
    ["Vínculos dos modelos a alterar", planned.reduce((total, item) => total + item.links.length, 0)],
    ["Pendências fiscais", pending.length],
    ["Tarefas geradas não finalizadas encontradas", generatedRows.length],
    ["Ação necessária do Fiscal", "Validar as linhas classificadas como ALTERAR MODELO e definir a regra do Paraná. Nenhuma alteração foi executada."],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 42 }, { wch: 115 }];
  summarySheet["!rows"] = summaryRows.map((_, index) => ({ hpt: index === 0 ? 30 : 28 }));
  for (const address of ["A1", "B1"]) {
    const cell = summarySheet[address];
    if (cell) {
      (cell as XLSX.CellObject & { s?: unknown }).s = {
        font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 },
        fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } },
        alignment: { vertical: "center", wrapText: true },
      };
    }
  }
  for (let row = 1; row < summaryRows.length; row += 1) {
    const label = summarySheet[XLSX.utils.encode_cell({ r: row, c: 0 })];
    const value = summarySheet[XLSX.utils.encode_cell({ r: row, c: 1 })];
    if (label) (label as XLSX.CellObject & { s?: unknown }).s = { font: { bold: true }, alignment: { vertical: "center", wrapText: true } };
    if (value) (value as XLSX.CellObject & { s?: unknown }).s = { alignment: { vertical: "center", wrapText: true } };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo para validação");
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(
      [
        "Modelo EFD ICMS IPI",
        "ID do modelo",
        "UF",
        "Regime",
        "Via WhatsApp",
        "Clientes vinculados",
        "Data legal atual",
        "Data meta atual",
        "Offset atual",
        "ICMS NORMAL de referência",
        "Meta ICMS referência",
        "Nova data legal",
        "Nova data meta",
        "Novo offset",
        "Resultado da validação",
      ],
      modelRows,
    ),
    "Modelos — antes e proposta",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(
      [
        "Cliente",
        "ID do cliente",
        "Modelo EFD ICMS IPI",
        "ID do modelo",
        "Vínculo ativo",
        "Status",
        "Competência",
        "Data legal atual",
        "Data meta atual",
        "Responsável",
        "ID da instância",
      ],
      generatedRows.length > 0
        ? generatedRows
        : [["Nenhuma tarefa não finalizada encontrada", "", "", "", "", "", "", "", "", "", ""]],
    ),
    "Tarefas geradas",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildTable(
      ["Modelo", "ID do modelo", "Clientes", "Situação", "Justificativa", "Encaminhamento ao Fiscal"],
      pending.map((item) => [
        item.task.name,
        item.task._id,
        item.links.length,
        "PENDÊNCIA FISCAL — NÃO ALTERAR",
        "Não existe modelo ICMS NORMAL correspondente para definir a meta do SPED.",
        "Definir a referência de ICMS e a data meta; manter o modelo sem alterações até essa validação.",
      ]),
    ),
    "Pendências",
  );
  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  XLSX.writeFile(workbook, REPORT_PATH, { compression: true });
  console.log(`[sped-efd] relatório=${REPORT_PATH}`);
}

main().catch((error) => {
  console.error("[sped-efd] falha", error);
  process.exitCode = 1;
});
