import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { createGesttaClient } from "./api/client";
import { listarTarefasRecorrentesAtivas } from "./api/endpoints";
import { resolveGesttaRuntimeAuth } from "./auth/runtime-auth";
import { TarefaGestta } from "./types";
import { normalizarTexto } from "./utils";

const SETORES_MATRIZ = [
  "Pessoal",
  "Fiscal",
  "Financeiro",
  "Contábil",
  "Sucesso do Cliente",
];

const SETOR_ORDER = new Map(SETORES_MATRIZ.map((setor, index) => [setor, index]));

export interface LinhaTarefaAnual {
  Setor: string;
  Tarefa: string;
  "ID Gestta": string;
  Tipo: string;
  Subtipo: string;
  Frequência: string;
  Mês: string | number;
  "Dia do mês": string | number;
  "Dia útil": string | number;
  Status: string;
}

export interface LinhaResumoAnual {
  Setor: string;
  "Total de tarefas anuais": number;
}

export interface LevantamentoAnuais {
  resumo: LinhaResumoAnual[];
  tarefas: LinhaTarefaAnual[];
}

function getRelatoriosDir(outputDir?: string): string {
  const configured = outputDir?.trim() || process.env.GESTTA_RELATORIOS_DIR?.trim();
  return configured ? path.resolve(configured) : path.join(process.cwd(), "relatorios");
}

function timestampFileName(): string {
  const now = new Date();
  return (
    `tarefas-anuais-setores_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-` +
    `${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-` +
    `${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}.xlsx`
  );
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getFrequencyDateValue(tarefa: TarefaGestta, key: string): string | number {
  const frequencyDate = getRecord(tarefa.frequency_date);
  const value = frequencyDate?.[key];
  if (value == null || value === "") return "";
  if (typeof value === "string" || typeof value === "number") return value;
  return String(value);
}

function getSetorRaw(tarefa: TarefaGestta): string {
  return String(tarefa.company_department?.name ?? "").trim();
}

export function normalizarSetorRelatorio(setor: unknown): string {
  const original = String(setor ?? "").trim();
  const key = normalizarTexto(original);

  if (!key) return "Sem setor";
  if (key === "DP" || key === "PESSOAL" || key === "DEPARTAMENTO PESSOAL") return "Pessoal";
  if (key === "FISCAL" || key.startsWith("FISCAL ")) return "Fiscal";
  if (key === "FINANCEIRO") return "Financeiro";
  if (key === "CONTABIL") return "Contábil";
  if (key === "SUCESSO DO CLIENTE" || key === "CS" || key === "CUSTOMER SUCCESS") {
    return "Sucesso do Cliente";
  }

  return original;
}

export function filtrarTarefasAnuaisAtivas(tarefas: TarefaGestta[]): TarefaGestta[] {
  return tarefas.filter(
    (tarefa) =>
      tarefa.active !== false &&
      normalizarTexto(tarefa.type) === "RECURRENT" &&
      normalizarTexto(tarefa.frequency) === "YEARLY",
  );
}

function compararSetores(a: string, b: string): number {
  const ordemA = SETOR_ORDER.get(a);
  const ordemB = SETOR_ORDER.get(b);

  if (ordemA != null && ordemB != null) return ordemA - ordemB;
  if (ordemA != null) return -1;
  if (ordemB != null) return 1;
  if (a === "Sem setor" && b !== "Sem setor") return 1;
  if (b === "Sem setor" && a !== "Sem setor") return -1;
  return a.localeCompare(b, "pt-BR");
}

export function montarLevantamentoAnuais(tarefasGestta: TarefaGestta[]): LevantamentoAnuais {
  const tarefasAnuais = filtrarTarefasAnuaisAtivas(tarefasGestta);
  const contagem = new Map<string, number>();

  for (const setor of SETORES_MATRIZ) {
    contagem.set(setor, 0);
  }

  const tarefas = tarefasAnuais
    .map<LinhaTarefaAnual>((tarefa) => {
      const setor = normalizarSetorRelatorio(getSetorRaw(tarefa));
      contagem.set(setor, (contagem.get(setor) ?? 0) + 1);

      return {
        Setor: setor,
        Tarefa: tarefa.name,
        "ID Gestta": tarefa._id,
        Tipo: String(tarefa.type ?? ""),
        Subtipo: String(tarefa.subtype ?? ""),
        Frequência: String(tarefa.frequency ?? ""),
        Mês: getFrequencyDateValue(tarefa, "month"),
        "Dia do mês": getFrequencyDateValue(tarefa, "month_day"),
        "Dia útil": getFrequencyDateValue(tarefa, "business_day"),
        Status: tarefa.active === false ? "Inativa" : "Ativa",
      };
    })
    .sort((a, b) => compararSetores(a.Setor, b.Setor) || a.Tarefa.localeCompare(b.Tarefa, "pt-BR"));

  const resumo = [...contagem.entries()]
    .map<LinhaResumoAnual>(([Setor, total]) => ({
      Setor,
      "Total de tarefas anuais": total,
    }))
    .sort((a, b) => compararSetores(a.Setor, b.Setor));

  return { resumo, tarefas };
}

function createSheetWithHeaders<T extends object>(
  rows: T[],
  headers: string[],
): XLSX.WorkSheet {
  if (rows.length === 0) return XLSX.utils.aoa_to_sheet([headers]);
  return XLSX.utils.json_to_sheet(rows as Record<string, unknown>[], { header: headers });
}

export function salvarLevantamentoAnuaisXlsx(
  levantamento: LevantamentoAnuais,
  outputDir?: string,
): string {
  const dir = getRelatoriosDir(outputDir);
  fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, timestampFileName());
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    createSheetWithHeaders(levantamento.resumo, ["Setor", "Total de tarefas anuais"]),
    "Resumo",
  );

  XLSX.utils.book_append_sheet(
    workbook,
    createSheetWithHeaders(levantamento.tarefas, [
      "Setor",
      "Tarefa",
      "ID Gestta",
      "Tipo",
      "Subtipo",
      "Frequência",
      "Mês",
      "Dia do mês",
      "Dia útil",
      "Status",
    ]),
    "Tarefas",
  );

  XLSX.writeFile(workbook, filePath);
  return filePath;
}

export async function executarLevantamentoAnuais(outputDir?: string): Promise<string> {
  const auth = await resolveGesttaRuntimeAuth();
  const client = createGesttaClient(auth);
  const tarefas = await listarTarefasRecorrentesAtivas(client);
  const levantamento = montarLevantamentoAnuais(tarefas);
  return salvarLevantamentoAnuaisXlsx(levantamento, outputDir);
}

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  return args[index + 1];
}

async function main(): Promise<void> {
  dotenv.config();
  dotenv.config({ path: path.resolve(process.cwd(), "..", ".env") });

  const outputDir = getArgValue(process.argv.slice(2), "--output-dir");
  console.log("Levantamento de tarefas anuais por setor\n");
  const xlsxPath = await executarLevantamentoAnuais(outputDir);
  console.log(`Relatorio XLSX: ${xlsxPath}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
