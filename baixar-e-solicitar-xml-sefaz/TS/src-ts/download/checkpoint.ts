import { createHash } from "node:crypto";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { PATHS } from "../core/config.js";
import { FileConfig } from "../core/constants.js";
import { readJsonFile, writeJsonAtomic } from "../utils/fs.js";

export interface ArquivoInfoCheckpoint {
  url: string;
  nome: string;
  dt_solicitacao: string;
  tipo_download: string;
}

export interface DownloadCheckpoint {
  timestamp?: string;
  pagina_atual: number;
  arquivos_baixados: Set<string>;
  arquivos_info: ArquivoInfoCheckpoint[];
  tipos_contagem: Record<string, number>;
  total_baixados: number;
  data_solicitacao?: string;
  tipo: "download";
}

type RawCheckpoint = Record<string, unknown>;

export const CHECKPOINT_FILE = join(PATHS.checkpointsDir, "download_checkpoint.json");
export const CURSOR_CHECKPOINT_FILE = join(PATHS.checkpointsDir, "download_cursor_checkpoint.json");
export const LEGACY_BACKUP_FILE = join(PATHS.checkpointsDir, "download_checkpoint.json.bak");

function checksum(payload: Record<string, unknown>): string {
  const copy = { ...payload };
  delete copy.checksum;
  return createHash("md5").update(pythonJsonDumps(copy)).digest("hex");
}

function pythonJsonDumps(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(pythonJsonDumps).join(", ")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entryValue]) => `${JSON.stringify(key)}: ${pythonJsonDumps(entryValue)}`).join(", ")}}`;
  }
  return JSON.stringify(value);
}

function compactarArquivosBaixados(arquivosBaixados: Set<string>): ArquivoInfoCheckpoint[] {
  const byUrl = new Map<string, ArquivoInfoCheckpoint>();
  for (const item of arquivosBaixados) {
    try {
      const parsed = JSON.parse(item) as Partial<ArquivoInfoCheckpoint>;
      if (!parsed.url) {
        continue;
      }
      byUrl.set(parsed.url, {
        url: String(parsed.url),
        nome: String(parsed.nome ?? ""),
        dt_solicitacao: String(parsed.dt_solicitacao ?? ""),
        tipo_download: String(parsed.tipo_download ?? "DESCONHECIDO"),
      });
    } catch {
      // entradas simples sao expandidas a partir dos metadados compactos
    }
  }
  return [...byUrl.values()];
}

function expandirArquivosBaixados(arquivosInfo: ArquivoInfoCheckpoint[]): Set<string> {
  const result = new Set<string>();
  for (const info of arquivosInfo) {
    const normalizado = {
      url: String(info.url ?? ""),
      nome: String(info.nome ?? ""),
      dt_solicitacao: String(info.dt_solicitacao ?? ""),
      tipo_download: String(info.tipo_download ?? "DESCONHECIDO"),
    };
    if (normalizado.url) {
      result.add(normalizado.url);
    }
    if (normalizado.nome) {
      result.add(normalizado.nome);
    }
    if (normalizado.dt_solicitacao) {
      result.add(normalizado.dt_solicitacao);
    }
    result.add(JSON.stringify(normalizado, Object.keys(normalizado).sort()));
  }
  return result;
}

function timestampMaisRecente(candidate?: RawCheckpoint, baseline?: RawCheckpoint): boolean {
  const left = Date.parse(String(candidate?.timestamp ?? ""));
  const right = Date.parse(String(baseline?.timestamp ?? ""));
  return Number.isFinite(left) && Number.isFinite(right) && left > right;
}

function carregarJsonValidado(path: string, tipos: Set<string>): RawCheckpoint | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  try {
    const payload = readJsonFile<RawCheckpoint>(path);
    if (!payload || !tipos.has(String(payload.tipo))) {
      return undefined;
    }
    const timestamp = Date.parse(String(payload.timestamp ?? ""));
    if (Number.isFinite(timestamp)) {
      const idadeDias = (Date.now() - timestamp) / (24 * 60 * 60 * 1000);
      if (idadeDias > FileConfig.checkpointMaxAgeDays) {
        console.warn(`[AVISO] Checkpoint muito antigo: ${path}`);
        return undefined;
      }
    }
    const expected = payload.checksum;
    if (expected && expected !== checksum(payload)) {
      console.warn(`[AVISO] Checkpoint com checksum diferente, mantendo compatibilidade: ${path}`);
    }
    return payload;
  } catch (error) {
    console.warn(`[AVISO] Erro ao acessar checkpoint ${path}: ${String(error)}`);
    return undefined;
  }
}

function listarBackups(): string[] {
  const backups: string[] = [];
  if (existsSync(LEGACY_BACKUP_FILE)) {
    backups.push(LEGACY_BACKUP_FILE);
  }
  if (existsSync(PATHS.checkpointsBackupDir)) {
    backups.push(
      ...readdirSync(PATHS.checkpointsBackupDir)
        .filter((name) => /^download_checkpoint_.*\.json$/.test(name))
        .map((name) => join(PATHS.checkpointsBackupDir, name))
        .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs),
    );
  }
  return backups;
}

function listarTemporariosCheckpoint(): string[] {
  if (!existsSync(PATHS.checkpointsDir)) {
    return [];
  }
  return readdirSync(PATHS.checkpointsDir)
    .filter((name) => /^download_(?:cursor_)?checkpoint\.json\..*\.tmp$/.test(name))
    .map((name) => join(PATHS.checkpointsDir, name));
}

function carregarCheckpointPrincipal(): RawCheckpoint | undefined {
  const checkpoint = carregarJsonValidado(CHECKPOINT_FILE, new Set(["download"]));
  if (checkpoint) {
    return checkpoint;
  }
  for (const backup of listarBackups()) {
    const recovered = carregarJsonValidado(backup, new Set(["download"]));
    if (recovered) {
      console.log(`[CHECKPOINT] Recuperado a partir de backup: ${backup}`);
      writeJsonAtomic(CHECKPOINT_FILE, recovered);
      return recovered;
    }
  }
  return undefined;
}

export function salvarCheckpoint(
  paginaAtual: number,
  arquivosBaixados: Set<string>,
  totalBaixados: number,
  dataSolicitacao?: string,
): boolean {
  try {
    const arquivosInfo = compactarArquivosBaixados(arquivosBaixados);
    const tiposContagem: Record<string, number> = {};
    for (const info of arquivosInfo) {
      tiposContagem[info.tipo_download] = (tiposContagem[info.tipo_download] ?? 0) + 1;
    }
    const payload: RawCheckpoint = {
      timestamp: new Date().toISOString(),
      pagina_atual: paginaAtual,
      arquivos_info: arquivosInfo,
      tipos_contagem: tiposContagem,
      total_baixados: totalBaixados,
      data_solicitacao: dataSolicitacao,
      tipo: "download",
    };
    payload.checksum = checksum(payload);
    writeJsonAtomic(CHECKPOINT_FILE, payload);
    console.log(`[CHECKPOINT] Salvo estado completo: pagina ${paginaAtual}, ${totalBaixados} arquivo(s)`);
    return true;
  } catch (error) {
    console.warn(`[AVISO] Erro ao salvar checkpoint: ${String(error)}`);
    return false;
  }
}

export function salvarCursorCheckpoint(paginaAtual: number, totalBaixados: number, dataSolicitacao?: string): boolean {
  try {
    const payload: RawCheckpoint = {
      timestamp: new Date().toISOString(),
      pagina_atual: paginaAtual,
      total_baixados: totalBaixados,
      data_solicitacao: dataSolicitacao,
      tipo: "download_cursor",
    };
    payload.checksum = checksum(payload);
    writeJsonAtomic(CURSOR_CHECKPOINT_FILE, payload);
    console.log(`[CHECKPOINT] Cursor salvo: pagina ${paginaAtual}, ${totalBaixados} arquivo(s)`);
    return true;
  } catch (error) {
    console.warn(`[AVISO] Erro ao salvar cursor de checkpoint: ${String(error)}`);
    return false;
  }
}

export function carregarCheckpoint(): DownloadCheckpoint | undefined {
  const checkpoint = carregarCheckpointPrincipal();
  const cursor = carregarJsonValidado(CURSOR_CHECKPOINT_FILE, new Set(["download_cursor"]));
  if (checkpoint) {
    const arquivosInfo = (checkpoint.arquivos_info ?? []) as ArquivoInfoCheckpoint[];
    if (cursor && timestampMaisRecente(cursor, checkpoint)) {
      checkpoint.pagina_atual = Math.max(Number(checkpoint.pagina_atual ?? 1), Number(cursor.pagina_atual ?? 1));
      checkpoint.total_baixados = Math.max(Number(checkpoint.total_baixados ?? 0), Number(cursor.total_baixados ?? 0));
      checkpoint.data_solicitacao = cursor.data_solicitacao ?? checkpoint.data_solicitacao;
      checkpoint.timestamp = cursor.timestamp ?? checkpoint.timestamp;
    }
    return {
      timestamp: String(checkpoint.timestamp ?? ""),
      pagina_atual: Number(checkpoint.pagina_atual ?? 1),
      arquivos_baixados: expandirArquivosBaixados(arquivosInfo),
      arquivos_info: arquivosInfo,
      tipos_contagem: (checkpoint.tipos_contagem ?? {}) as Record<string, number>,
      total_baixados: Number(checkpoint.total_baixados ?? 0),
      data_solicitacao: checkpoint.data_solicitacao ? String(checkpoint.data_solicitacao) : undefined,
      tipo: "download",
    };
  }
  if (cursor) {
    return {
      timestamp: String(cursor.timestamp ?? ""),
      pagina_atual: Number(cursor.pagina_atual ?? 1),
      arquivos_baixados: new Set(),
      arquivos_info: [],
      tipos_contagem: {},
      total_baixados: Number(cursor.total_baixados ?? 0),
      data_solicitacao: cursor.data_solicitacao ? String(cursor.data_solicitacao) : undefined,
      tipo: "download",
    };
  }
  return undefined;
}

export function limparCheckpoint(): boolean {
  try {
    const arquivosParaRemover = [
      CHECKPOINT_FILE,
      CURSOR_CHECKPOINT_FILE,
      LEGACY_BACKUP_FILE,
      ...listarBackups(),
      ...listarTemporariosCheckpoint(),
    ];
    let removidos = 0;
    for (const path of new Set(arquivosParaRemover)) {
      if (existsSync(path)) {
        rmSync(path, { force: true });
        removidos += 1;
      }
    }
    console.log(`[OK] Checkpoint limpo com sucesso (${removidos} arquivo(s) removido(s))`);
    return true;
  } catch (error) {
    console.warn(`[AVISO] Erro ao limpar checkpoint: ${String(error)}`);
    return false;
  }
}

export function limparCheckpointSeForDeOutroDia(): boolean {
  const checkpoints = [
    carregarJsonValidado(CHECKPOINT_FILE, new Set(["download"])),
    carregarJsonValidado(CURSOR_CHECKPOINT_FILE, new Set(["download_cursor"])),
  ].filter(Boolean);
  const timestamps = checkpoints
    .map((checkpoint) => Date.parse(String(checkpoint?.timestamp ?? "")))
    .filter((timestamp) => Number.isFinite(timestamp));
  if (!timestamps.length) {
    return false;
  }
  const ultimaExecucao = new Date(Math.max(...timestamps));
  const hoje = new Date();
  if (ultimaExecucao.toDateString() === hoje.toDateString()) {
    return false;
  }
  console.log(`[CHECKPOINT] Ultima execucao foi em ${ultimaExecucao.toISOString().slice(0, 10)}; limpando checkpoint.`);
  return limparCheckpoint();
}

export function verificarCheckpoint(): DownloadCheckpoint | undefined {
  const checkpoint = carregarCheckpoint();
  if (checkpoint) {
    console.log("\n[CHECKPOINT ENCONTRADO]");
    console.log(`  Timestamp: ${checkpoint.timestamp ?? "desconhecido"}`);
    console.log(`  Pagina atual: ${checkpoint.pagina_atual}`);
    console.log(`  Total baixados: ${checkpoint.total_baixados}`);
    if (checkpoint.data_solicitacao) {
      console.log(`  Filtro de data: ${checkpoint.data_solicitacao}`);
    }
    for (const [tipo, qtd] of Object.entries(checkpoint.tipos_contagem)) {
      console.log(`  ${tipo}: ${qtd}`);
    }
  }
  return checkpoint;
}

export function registrarArquivoBaixado(info: {
  url: string;
  nmArquivo?: string;
  dtSolicitacao?: string;
  tipoDownload?: string;
}, arquivosBaixados: Set<string>): void {
  const payload = {
    url: info.url,
    nome: info.nmArquivo ?? "",
    dt_solicitacao: info.dtSolicitacao ?? "",
    tipo_download: info.tipoDownload ?? "DESCONHECIDO",
  };
  arquivosBaixados.add(info.url);
  if (info.nmArquivo) {
    arquivosBaixados.add(info.nmArquivo);
  }
  if (info.dtSolicitacao) {
    arquivosBaixados.add(info.dtSolicitacao);
  }
  arquivosBaixados.add(JSON.stringify(payload, Object.keys(payload).sort()));
}
