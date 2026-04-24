import crypto from "crypto";
import fs from "fs";
import path from "path";
import { LinhaPlanilha, ResultadoLinha } from "./types";

const PASTA_RELATORIOS = "relatorios";

interface DadosCheckpoint {
  planilhaPath: string;
  inicioExecucao: string;
  resultados: ResultadoLinha[];
  indiceProximo: number;
}

function getRelatoriosDir(): string {
  return path.join(process.cwd(), PASTA_RELATORIOS);
}

export function getIdFromPlanilhaPath(planilhaPath: string): string {
  return crypto.createHash("sha256").update(planilhaPath, "utf8").digest("hex").slice(0, 8);
}

function getCheckpointPath(id: string): string {
  return path.join(getRelatoriosDir(), `checkpoint_${id}.json`);
}

function desserializarLinha(raw: unknown): LinhaPlanilha | null {
  if (!raw || typeof raw !== "object") return null;
  const linha = raw as Record<string, unknown>;

  return {
    numero: String(linha.numero ?? ""),
    empresa: String(linha.empresa ?? ""),
    cnpj: String(linha.cnpj ?? ""),
    cnpjOriginal: linha.cnpjOriginal != null ? String(linha.cnpjOriginal) : undefined,
    cnpjFoiAjustado: linha.cnpjFoiAjustado === true ? true : undefined,
    cnpjInvalido: linha.cnpjInvalido === true ? true : undefined,
    setor: String(linha.setor ?? ""),
    responsavel: String(linha.responsavel ?? ""),
    validador: String(linha.validador ?? ""),
  };
}

function desserializarResultado(raw: unknown): ResultadoLinha | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const linha = desserializarLinha(item.linha);
  if (!linha) return null;

  return {
    linha,
    sucesso: Boolean(item.sucesso),
    customerId: item.customerId != null ? String(item.customerId) : undefined,
    approverId: item.approverId != null ? String(item.approverId) : undefined,
    groupIds: Array.isArray(item.groupIds) ? item.groupIds.map(String) : undefined,
    mensagem: String(item.mensagem ?? ""),
    erro: item.erro != null ? String(item.erro) : undefined,
    etapaFalha: item.etapaFalha as ResultadoLinha["etapaFalha"],
  };
}

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
    if (data.planilhaPath !== planilhaPath || !Array.isArray(data.resultados)) return null;

    const resultados = data.resultados
      .map(desserializarResultado)
      .filter((item): item is ResultadoLinha => item !== null);
    const indiceProximo =
      typeof data.indiceProximo === "number" && data.indiceProximo >= 0
        ? data.indiceProximo
        : 0;
    return { resultados, indiceProximo };
  } catch {
    console.error("[checkpoint] Arquivo corrompido ou invalido; iniciando do zero.");
    return null;
  }
}

export function salvarCheckpoint(
  planilhaPath: string,
  inicioExecucao: string,
  resultados: ResultadoLinha[],
  indiceProximo: number,
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
      resultados,
      indiceProximo,
    };
    fs.writeFileSync(checkpointPath, JSON.stringify(dados, null, 2), "utf8");
  } catch (err) {
    console.warn("[checkpoint] Erro ao salvar checkpoint:", err instanceof Error ? err.message : err);
  }
}

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
