import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ResultadoTarefa } from "./types";

const PASTA_RELATORIOS = "relatorios";

interface DadosCheckpoint {
  planilhaPath: string;
  dryRun: boolean;
  inicioExecucao: string;
  resultados: ResultadoTarefa[];
  indiceProximo: number;
}

function getRelatoriosDir(): string {
  return path.join(process.cwd(), PASTA_RELATORIOS);
}

function getId(planilhaPath: string, dryRun: boolean): string {
  return crypto
    .createHash("sha256")
    .update(`${planilhaPath}::${dryRun ? "dry-run" : "apply"}`, "utf8")
    .digest("hex")
    .slice(0, 8);
}

function getCheckpointPath(planilhaPath: string, dryRun: boolean): string {
  return path.join(getRelatoriosDir(), `checkpoint_${getId(planilhaPath, dryRun)}.json`);
}

export function carregarCheckpoint(
  planilhaPath: string,
  dryRun: boolean,
): { resultados: ResultadoTarefa[]; indiceProximo: number } | null {
  const checkpointPath = getCheckpointPath(planilhaPath, dryRun);
  if (!fs.existsSync(checkpointPath)) return null;

  try {
    const raw = fs.readFileSync(checkpointPath, "utf8");
    const data = JSON.parse(raw) as DadosCheckpoint;
    if (data.planilhaPath !== planilhaPath || data.dryRun !== dryRun) return null;
    if (!Array.isArray(data.resultados)) return null;
    if (typeof data.indiceProximo !== "number" || data.indiceProximo < 0) return null;
    return { resultados: data.resultados, indiceProximo: data.indiceProximo };
  } catch {
    return null;
  }
}

export function salvarCheckpoint(
  planilhaPath: string,
  dryRun: boolean,
  inicioExecucao: string,
  resultados: ResultadoTarefa[],
  indiceProximo: number,
): void {
  try {
    const dir = getRelatoriosDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const payload: DadosCheckpoint = {
      planilhaPath,
      dryRun,
      inicioExecucao,
      resultados,
      indiceProximo,
    };

    fs.writeFileSync(
      getCheckpointPath(planilhaPath, dryRun),
      JSON.stringify(payload, null, 2),
      "utf8",
    );
  } catch (error) {
    console.warn("[checkpoint] Erro ao salvar checkpoint:", error instanceof Error ? error.message : error);
  }
}

export function limparCheckpoint(planilhaPath: string, dryRun: boolean): void {
  try {
    const checkpointPath = getCheckpointPath(planilhaPath, dryRun);
    if (fs.existsSync(checkpointPath)) fs.unlinkSync(checkpointPath);
  } catch (error) {
    console.warn("[checkpoint] Erro ao remover checkpoint:", error instanceof Error ? error.message : error);
  }
}
