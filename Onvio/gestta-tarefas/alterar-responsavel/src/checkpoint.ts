/**
 * Checkpoint para retomar execução após interrupção.
 * Persiste resultados já processados e o índice da próxima linha na pasta relatorios.
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ResultadoLinha } from "./types";

const PASTA_RELATORIOS = "relatorios";

export interface DadosCheckpoint {
  planilhaPath: string;
  inicioExecucao: string;
  resultados: ResultadoLinha[];
  indiceProximo: number;
}

/** Diretório base (Alterar-responsavel). */
function getRelatoriosDir(): string {
  return path.join(process.cwd(), PASTA_RELATORIOS);
}

/**
 * Gera identificador estável para a planilha (primeiros 8 caracteres do hash).
 */
export function getIdFromPlanilhaPath(planilhaPath: string): string {
  return crypto.createHash("sha256").update(planilhaPath, "utf8").digest("hex").slice(0, 8);
}

/**
 * Retorna o caminho do arquivo de checkpoint para o id dado.
 */
export function getCheckpointPath(id: string): string {
  return path.join(getRelatoriosDir(), `checkpoint_${id}.json`);
}

/**
 * Serializa mesGeracao para JSON (objeto { month, year } já é serializável).
 * ResultadoLinha.linha.mesGeracao é { month, year }, ok para JSON.
 */
function serializarResultado(r: ResultadoLinha): ResultadoLinha {
  return {
    ...r,
    linha: {
      ...r.linha,
      mesGeracao: { ...r.linha.mesGeracao },
    },
  };
}

/**
 * Desserializa resultado do JSON (garantir mesGeracao como objeto).
 */
function desserializarResultado(raw: unknown): ResultadoLinha | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const linha = o.linha as Record<string, unknown> | undefined;
  if (!linha || typeof linha.mesGeracao !== "object") return null;
  const mg = linha.mesGeracao as { month?: number; year?: number };
  if (typeof mg.month !== "number" || typeof mg.year !== "number") return null;
  return {
    linha: {
      cod: String(linha.cod ?? ""),
      cnpj: String(linha.cnpj ?? ""),
      empresa: linha.empresa != null ? String(linha.empresa) : undefined,
      responsavel: String(linha.responsavel ?? ""),
      mesGeracao: { month: mg.month, year: mg.year },
      departamento: linha.departamento != null ? String(linha.departamento) : undefined,
      setor: linha.setor != null ? String(linha.setor) : undefined,
    },
    sucesso: Boolean(o.sucesso),
    mensagem: String(o.mensagem ?? ""),
    customerId: o.customerId != null ? String(o.customerId) : undefined,
    userId: o.userId != null ? String(o.userId) : undefined,
    groupIds: Array.isArray(o.groupIds) ? (o.groupIds as string[]) : undefined,
    rollbackItems: Array.isArray(o.rollbackItems)
      ? (o.rollbackItems as ResultadoLinha["rollbackItems"])
      : undefined,
    erro: o.erro != null ? String(o.erro) : undefined,
    etapaFalha: o.etapaFalha as ResultadoLinha["etapaFalha"],
  };
}

/**
 * Carrega checkpoint se existir e o planilhaPath bater.
 * Retorna { resultados, indiceProximo } ou null.
 */
export function carregarCheckpoint(planilhaPath: string): {
  resultados: ResultadoLinha[];
  indiceProximo: number;
} | null {
  const id = getIdFromPlanilhaPath(planilhaPath);
  const checkpointPath = getCheckpointPath(id);
  if (!fs.existsSync(checkpointPath)) return null;

  try {
    const raw = fs.readFileSync(checkpointPath, "utf8");
    const data = JSON.parse(raw) as DadosCheckpoint;
    if (data.planilhaPath !== planilhaPath) return null;
    if (!Array.isArray(data.resultados)) return null;
    const resultados = data.resultados
      .map(desserializarResultado)
      .filter((r): r is ResultadoLinha => r !== null);
    const indiceProximo = typeof data.indiceProximo === "number" && data.indiceProximo >= 0
      ? data.indiceProximo
      : 0;
    return { resultados, indiceProximo };
  } catch {
    console.error("[checkpoint] Arquivo corrompido ou inválido; iniciando do zero.");
    return null;
  }
}

/**
 * Grava o checkpoint. Em erro, loga e não lança.
 */
export function salvarCheckpoint(
  planilhaPath: string,
  inicioExecucao: string,
  resultados: ResultadoLinha[],
  indiceProximo: number
): void {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const id = getIdFromPlanilhaPath(planilhaPath);
    const checkpointPath = getCheckpointPath(id);
    const dados: DadosCheckpoint = {
      planilhaPath,
      inicioExecucao,
      resultados: resultados.map(serializarResultado),
      indiceProximo,
    };
    fs.writeFileSync(checkpointPath, JSON.stringify(dados, null, 2), "utf8");
  } catch (err) {
    console.warn("[checkpoint] Erro ao salvar checkpoint:", err instanceof Error ? err.message : err);
  }
}

/**
 * Remove o arquivo de checkpoint da planilha (ao finalizar execução com sucesso).
 */
export function limparCheckpoint(planilhaPath: string): void {
  try {
    const id = getIdFromPlanilhaPath(planilhaPath);
    const checkpointPath = getCheckpointPath(id);
    if (fs.existsSync(checkpointPath)) {
      fs.unlinkSync(checkpointPath);
    }
  } catch (err) {
    console.warn("[checkpoint] Erro ao remover checkpoint:", err instanceof Error ? err.message : err);
  }
}
