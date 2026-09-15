/** Relatório Excel antes/depois da configuração e regeneração SPED/ICMS. */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { getJwt } from "../src/auth";
import { createGesttaClient } from "../src/client";
import { buscarTarefasGeradasCliente, obterTarefa } from "../src/endpoints";
import { GesttaTask } from "../src/types";

const REPORTS = path.resolve(__dirname, "..", "..", "relatorios");
const CONFIG_BACKUP = path.join(REPORTS, "backup_sped_icms_config_2026-09-01T14-59-40-069Z.json");
const REGEN_BACKUP = path.join(REPORTS, "backup_regeneracao_sped_icms_setembro_2026-09-01T15-07-46-880Z.json");
const OUTPUT = path.join(REPORTS, "relatorio_antes_depois_sped_icms_setembro_2026-09-01.xlsx");

interface BeforeModel { id: string; name: string; originalTask: GesttaTask }
interface RegenTarget { customerId: string; customerName: string; departmentId: string; modelNames: string[]; before: Generated[] }
interface Generated { instanceId: string; name: string; status: string; competenceDate?: string; legalDate?: string; dueDate?: string; owner?: string | null }

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function dateBr(value: unknown): string {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function meta(task: GesttaTask): string | number {
  const legal = task.frequency_date?.month_day;
  const offset = task.accountancy;
  return legal == null || offset == null ? "" : legal + offset;
}

function taskValues(task: GesttaTask): Record<string, string | number> {
  return {
    legal: task.frequency_date?.month_day ?? "",
    meta: meta(task),
    offset: task.accountancy ?? "",
    postpone: task.postpone ? "sim" : "não",
    businessDay: task.business_day ? "sim" : "não",
    businessDayMeta: task.business_day_accountancy ? "sim" : "não",
  };
}

async function retry<T>(fn: () => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await fn(); } catch (error) { last = error; await new Promise((resolve) => setTimeout(resolve, 600 * (attempt + 1))); }
  }
  throw last;
}

async function parallel<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length); let next = 0;
  async function worker(): Promise<void> { for (;;) { const index = next++; if (index >= items.length) return; result[index] = await fn(items[index]); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return result;
}

function styleTable(sheet: XLSX.WorkSheet): void {
  const ref = sheet["!ref"]; if (!ref) return;
  const range = XLSX.utils.decode_range(ref); sheet["!autofilter"] = { ref };
  (sheet as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = { xSplit: 0, ySplit: 1 };
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: col })]; headers.push(String(cell?.v ?? ""));
    if (cell) (cell as XLSX.CellObject & { s?: unknown }).s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } }, alignment: { wrapText: true, vertical: "center" } };
  }
  sheet["!rows"] = [{ hpt: 30 }];
  sheet["!cols"] = headers.map((header, col) => {
    let width = header.length; for (let row = 1; row <= range.e.r; row += 1) width = Math.max(width, String(sheet[XLSX.utils.encode_cell({ r: row, c: col })]?.v ?? "").length);
    return { wch: Math.min(Math.max(width + 2, 12), 52) };
  });
}

function sheet(headers: string[], rows: Array<Array<string | number>>): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]); styleTable(ws); return ws;
}

async function main(): Promise<void> {
  const config = readJson<{ tasks: BeforeModel[] }>(CONFIG_BACKUP);
  const regen = readJson<{ targets: RegenTarget[] }>(REGEN_BACKUP);
  const client = createGesttaClient(getJwt());
  const afterModels = await parallel(config.tasks, 2, async (item) => retry(() => obterTarefa(client, item.id)));
  const modelRows = config.tasks.map((before, index) => {
    const after = afterModels[index]; const old = taskValues(before.originalTask); const now = taskValues(after);
    const changed = Object.keys(old).some((key) => old[key] !== now[key]);
    return [before.name, before.id, old.legal, now.legal, old.meta, now.meta, old.offset, now.offset, old.postpone, now.postpone, old.businessDay, now.businessDay, old.businessDayMeta, now.businessDayMeta, changed ? "ALTERADO" : "JÁ CONFORME"];
  });
  const afterByTarget = await parallel(regen.targets, 3, async (target) => {
    const all = await retry(() => buscarTarefasGeradasCliente(client, target.customerId, ["OPEN", "IMPEDIMENT"]));
    const names = new Set(target.modelNames);
    return all.filter((task) => names.has(task.name)).map((task) => {
      const raw = task as unknown as Record<string, unknown>; const owner = raw.owner as { name?: string } | undefined;
      return { instanceId: task._id, name: task.name, status: task.status, competenceDate: String(task.competence_date ?? ""), legalDate: String(task.legal_date ?? ""), dueDate: String(task.due_date ?? ""), owner: owner?.name ?? "" } satisfies Generated;
    });
  });
  const taskRows: Array<Array<string | number>> = [];
  let beforeCount = 0; let afterCount = 0;
  for (const [index, target] of regen.targets.entries()) {
    const before = target.before ?? []; const after = afterByTarget[index]; beforeCount += before.length; afterCount += after.length;
    const beforeByName = new Map(before.map((item) => [item.name, item])); const afterByName = new Map(after.map((item) => [item.name, item]));
    for (const name of new Set([...beforeByName.keys(), ...afterByName.keys()])) {
      const old = beforeByName.get(name); const now = afterByName.get(name);
      taskRows.push([target.customerName, target.customerId, name, old?.instanceId ?? "", now?.instanceId ?? "", old?.status ?? "", now?.status ?? "", dateBr(old?.competenceDate), dateBr(now?.competenceDate), dateBr(old?.legalDate), dateBr(now?.legalDate), dateBr(old?.dueDate), dateBr(now?.dueDate), old?.owner ?? "", now?.owner ?? "", old && now && old.instanceId !== now.instanceId ? "REGENERADA" : now ? "MANTIDA/GERADA" : "NÃO ENCONTRADA"]);
    }
  }
  taskRows.sort((a, b) => String(a[0]).localeCompare(String(b[0]), "pt-BR") || String(a[2]).localeCompare(String(b[2]), "pt-BR"));
  const changedModels = modelRows.filter((row) => row.at(-1) === "ALTERADO").length;
  const workbook = XLSX.utils.book_new();
  const summary = XLSX.utils.aoa_to_sheet([
    ["RELATÓRIO ANTES E AGORA — SPED E ICMS", ""],
    ["Gerado em", new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })],
    ["Modelos comparados", config.tasks.length],
    ["Modelos alterados", changedModels],
    ["Modelos já conformes", config.tasks.length - changedModels],
    ["Instâncias antes da regeneração", beforeCount],
    ["Instâncias atuais", afterCount],
    ["Competência regenerada", "09/2026 (vencimentos de setembro)"],
    ["Backup de modelos", path.basename(CONFIG_BACKUP)],
    ["Backup de tarefas", path.basename(REGEN_BACKUP)],
  ]);
  summary["!cols"] = [{ wch: 38 }, { wch: 90 }];
  for (const cellAddress of ["A1", "B1"]) { const cell = summary[cellAddress]; if (cell) (cell as XLSX.CellObject & { s?: unknown }).s = { font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 }, fill: { patternType: "solid", fgColor: { rgb: "1F4E78" } } }; }
  XLSX.utils.book_append_sheet(workbook, summary, "Resumo");
  XLSX.utils.book_append_sheet(workbook, sheet(["Modelo", "ID", "Legal antes", "Legal agora", "Meta antes", "Meta agora", "Offset antes", "Offset agora", "Postergar antes", "Postergar agora", "Dia útil legal antes", "Dia útil legal agora", "Dia útil meta antes", "Dia útil meta agora", "Situação"], modelRows), "Modelos antes e agora");
  XLSX.utils.book_append_sheet(workbook, sheet(["Cliente", "ID cliente", "Modelo", "Instância antes", "Instância agora", "Status antes", "Status agora", "Competência antes", "Competência agora", "Legal antes", "Legal agora", "Meta antes", "Meta agora", "Responsável antes", "Responsável agora", "Situação"], taskRows), "Tarefas setembro");
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true }); XLSX.writeFile(workbook, OUTPUT, { compression: true });
  console.log(`[antes-depois-sped-icms] relatório=${OUTPUT}; modelos=${config.tasks.length}; tarefas=${beforeCount}->${afterCount}`);
}

main().catch((error) => { console.error("[antes-depois-sped-icms] falha", error); process.exitCode = 1; });
