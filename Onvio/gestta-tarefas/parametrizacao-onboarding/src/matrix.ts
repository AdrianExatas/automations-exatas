import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import {
  AreaParametrizacao,
  MatrizPreview,
  ParametrizacaoInput,
  TarefaMatriz,
} from "./types";
import { extrairUfDaTarefa, normalizarChave, normalizarTexto } from "./utils";

export const DEFAULT_MATRIX_FILE = "PLANILHA GERAL TAREFAS POR REGIME.xlsx";

const AREA_SHEETS: Record<AreaParametrizacao, string> = {
  dp: "DP",
  fiscal: "FISCAL - NORMAL",
  financeiro: "FINANCEIRO",
  contabil: "CONTÁBIL",
  sucesso_cliente: "SUCESSO DO CLIENTE",
};

const CONTROLE_KEYS: Record<AreaParametrizacao | "fiscal_sn", string> = {
  dp: "DP",
  fiscal: "FISCAL NORMAL",
  fiscal_sn: "FISCAL SN",
  financeiro: "FINANCEIRO",
  contabil: "CONTÁBIL",
  sucesso_cliente: "SUCESSO DO CLIENTE",
};

const ANALISE_PARCELAMENTOS_TAREFAS: Array<{
  area: Extract<AreaParametrizacao, "fiscal">;
  tarefa: string;
}> = [
  {
    area: "fiscal",
    tarefa: "ANÁLISE DE PARCELAMENTOS (EMPRESA ENTRANTE) - FISCAL",
  },
];

type Row = unknown[];

export function getDefaultMatrixPath(): string {
  const configured = process.env.MATRIX_PATH?.trim();
  if (configured) {
    return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
  }
  return path.resolve(process.cwd(), DEFAULT_MATRIX_FILE);
}

function getSheetRows(workbook: XLSX.WorkBook, sheetName: string): Row[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Aba nao encontrada na matriz: ${sheetName}.`);
  return XLSX.utils.sheet_to_json<Row>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
}

function lerResponsaveisControle(workbook: XLSX.WorkBook): Map<string, string> {
  const rows = getSheetRows(workbook, "CONTROLE");
  const responsaveis = new Map<string, string>();

  for (const row of rows) {
    const departamento = String(row[0] ?? "").trim();
    const colaborador = String(row[2] ?? "").trim();
    if (!departamento || !colaborador || normalizarChave(departamento) === "DEPARTAMENTO") continue;
    responsaveis.set(normalizarChave(departamento), colaborador);
  }

  return responsaveis;
}

function getResponsavelPadrao(
  responsaveis: Map<string, string>,
  area: AreaParametrizacao,
  input: ParametrizacaoInput,
): string {
  const controleKey =
    area === "fiscal" && input.regimeFiscal === "simples_nacional"
      ? CONTROLE_KEYS.fiscal_sn
      : CONTROLE_KEYS[area];
  const responsavel = responsaveis.get(normalizarChave(controleKey));
  if (!responsavel) throw new Error(`Responsavel padrao nao encontrado no CONTROLE para ${controleKey}.`);
  return responsavel;
}

function isLinhaDeTarefa(row: Row): boolean {
  const tarefa = String(row[0] ?? "").trim();
  if (!tarefa) return false;

  const key = normalizarChave(tarefa);
  return ![
    "TAREFASDEPARAMETRIZACAOGESTTA",
    "TAREFAS",
    "ATENCAO",
    "ANTESDEPREENCHERATABELAINDIQUEOSEUREGIME",
    "LEGENDA",
    "FREQUENCIA",
    "LOCALIDADE",
    "SUPERVISOR",
  ].includes(key);
}

function hasMarker(row: Row, marker: string): boolean {
  const wanted = normalizarTexto(marker);
  return row.some((cell) => normalizarTexto(cell) === wanted);
}

function deveIncluir(row: Row, input: ParametrizacaoInput): boolean {
  const isPremiumRow = hasMarker(row, "PLANO PREMIUM");
  const ativaNaColunaB = normalizarTexto(row[1]) === "SIM";

  if (!ativaNaColunaB && !(input.planoPremium && isPremiumRow)) return false;
  if (normalizarTexto(row[2]) === "SIM" && !input.incluirAnuais) return false;
  if (isPremiumRow && !input.planoPremium) return false;
  if (hasMarker(row, "Supervisor") && !input.supervisor) return false;

  const ufDaTarefa = extrairUfDaTarefa(String(row[0] ?? ""));
  if (ufDaTarefa && input.uf && ufDaTarefa !== input.uf.toUpperCase()) return false;

  return true;
}

function getFiscalSheet(input: ParametrizacaoInput): string {
  return input.regimeFiscal === "simples_nacional" ? "SIMPLES NACIONAL" : AREA_SHEETS.fiscal;
}

function adicionarAnaliseParcelamentos(
  tarefas: TarefaMatriz[],
  responsaveis: Map<string, string>,
  input: ParametrizacaoInput,
): void {
  if (!input.adicionarAnaliseParcelamentos) return;

  for (const item of ANALISE_PARCELAMENTOS_TAREFAS) {
    tarefas.push({
      area: item.area,
      aba: "OPCOES",
      tarefa: item.tarefa,
      responsavel: getResponsavelPadrao(responsaveis, item.area, input),
      anual: false,
      premium: false,
      supervisor: false,
      linha: 0,
    });
  }
}

export function calcularPreviewMatriz(
  matrixPath: string,
  input: ParametrizacaoInput,
): MatrizPreview {
  if (!fs.existsSync(matrixPath)) {
    throw new Error(`Matriz nao encontrada: ${matrixPath}`);
  }

  const workbook = XLSX.readFile(matrixPath, { type: "file" });
  const responsaveis = lerResponsaveisControle(workbook);
  const tarefas: TarefaMatriz[] = [];
  const avisos: string[] = [];

  for (const area of input.areas) {
    const aba = area === "fiscal" ? getFiscalSheet(input) : AREA_SHEETS[area];
    const responsavel = getResponsavelPadrao(responsaveis, area, input);
    const rows = getSheetRows(workbook, aba);
    const before = tarefas.length;

    rows.forEach((row, index) => {
      if (index < 2 || !isLinhaDeTarefa(row) || !deveIncluir(row, input)) return;

      const tarefa = String(row[0] ?? "").trim();
      tarefas.push({
        area,
        aba,
        tarefa,
        responsavel,
        anual: normalizarTexto(row[2]) === "SIM",
        premium: hasMarker(row, "PLANO PREMIUM"),
        supervisor: hasMarker(row, "Supervisor"),
        uf: extrairUfDaTarefa(tarefa),
        linha: index + 1,
      });
    });

    if (tarefas.length === before) {
      avisos.push(`Area ${aba} foi selecionada, mas nao gerou tarefas com a regra atual.`);
    }
  }

  adicionarAnaliseParcelamentos(tarefas, responsaveis, input);

  const dedup = new Map<string, TarefaMatriz>();
  for (const tarefa of tarefas) {
    const key = `${normalizarChave(tarefa.tarefa)}::${normalizarChave(tarefa.responsavel)}`;
    if (!dedup.has(key)) dedup.set(key, tarefa);
  }

  return {
    tarefas: [...dedup.values()].sort((a, b) => a.aba.localeCompare(b.aba) || a.tarefa.localeCompare(b.tarefa)),
    avisos,
  };
}
