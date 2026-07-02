import AdmZip from "adm-zip";
import { existsSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { PATHS } from "../core/config.js";
import type { DownloadInfo } from "../types.js";
import { ensureDir } from "../utils/fs.js";

export function parseNomeEmpresaEAnoMes(nmArquivo: string, dtSolicitacao?: string): [string, string, string] {
  let ano: string;
  let mes: string;
  if (dtSolicitacao && /^\d{8,}/.test(dtSolicitacao)) {
    ano = dtSolicitacao.slice(4, 8);
    mes = dtSolicitacao.slice(2, 4);
  } else {
    const now = new Date();
    ano = String(now.getFullYear());
    mes = String(now.getMonth() + 1).padStart(2, "0");
  }

  try {
    const partes = nmArquivo.split("_");
    if (partes.length < 3) {
      return ["DESCONHECIDO", ano, mes];
    }

    const nomeParts: string[] = [];
    for (const part of partes.slice(1)) {
      if (/^\d{8,}$/.test(part)) {
        if (!dtSolicitacao) {
          ano = part.slice(-4);
          mes = part.slice(2, 4);
        }
        break;
      }
      nomeParts.push(part);
    }

    const nome = (nomeParts.join(" ").trim() || "DESCONHECIDO")
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^[_\s]+|[_\s]+$/g, "")
      .slice(0, 60);
    return [nome || "DESCONHECIDO", ano, mes];
  } catch {
    const now = new Date();
    return ["DESCONHECIDO", String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, "0")];
  }
}

export function verificarZipValido(path: string): boolean {
  try {
    const zip = new AdmZip(path);
    return zip.getEntries().length > 0;
  } catch {
    return false;
  }
}

function safeZipEntryPath(destination: string, entryName: string): string | undefined {
  const normalizedDestination = resolve(destination);
  const target = resolve(destination, entryName);
  const relativeTarget = relative(normalizedDestination, target);
  if (relativeTarget.startsWith("..") || relativeTarget === "" || resolve(relativeTarget) === relativeTarget) {
    return undefined;
  }
  return target;
}

export function extrairZip(
  arquivoZip: string,
  pastaDestino = join(dirname(arquivoZip), basename(arquivoZip, extname(arquivoZip))),
  sobrescrever = false,
  profundidade = 0,
): boolean {
  const maxProfundidade = 5;
  if (profundidade > maxProfundidade || !existsSync(arquivoZip) || !verificarZipValido(arquivoZip)) {
    return false;
  }

  ensureDir(pastaDestino);
  const zip = new AdmZip(arquivoZip);
  const entries = zip.getEntries().filter((entry) => !entry.isDirectory);

  if (!sobrescrever && entries.length) {
    const todosExistem = entries.every((entry) => {
      const target = safeZipEntryPath(pastaDestino, entry.entryName);
      return target ? existsSync(target) : false;
    });
    if (todosExistem && profundidade === 0) {
      return true;
    }
  }

  for (const entry of entries) {
    const target = safeZipEntryPath(pastaDestino, entry.entryName);
    if (!target) {
      continue;
    }
    ensureDir(dirname(target));
    if (!sobrescrever && existsSync(target)) {
      continue;
    }
    zip.extractEntryTo(entry, dirname(target), false, true);
  }

  const nestedZips = entries
    .map((entry) => safeZipEntryPath(pastaDestino, entry.entryName))
    .filter((target): target is string => typeof target === "string" && extname(target).toLowerCase() === ".zip" && existsSync(target));

  for (const nestedZip of nestedZips) {
    if (extrairZip(nestedZip, pastaDestino, sobrescrever, profundidade + 1)) {
      rmSync(nestedZip, { force: true });
    }
  }

  if (profundidade === 0) {
    console.log(`   [ZIP] Extraido: ${entries.length} arquivo(s) para ${basename(pastaDestino)}/`);
  }
  return true;
}

export function organizedZipPath(info: DownloadInfo): string {
  const [empresa, ano, mes] = parseNomeEmpresaEAnoMes(info.nmArquivo, info.dtSolicitacao);
  const nomeBase = info.nmArquivo || info.dtSolicitacao || "arquivo";
  const nomeComTipo =
    info.tipoDownload && info.tipoDownload !== "DESCONHECIDO" && !nomeBase.startsWith(`${info.tipoDownload}_`)
      ? `${info.tipoDownload}_${nomeBase}`
      : nomeBase;
  return join(PATHS.downloadsDir, ano, mes, empresa, "zips", `${nomeComTipo}.zip`);
}

export function caminhoZipOrganizadoExistente(info: DownloadInfo): string | undefined {
  const destinoComTipo = organizedZipPath(info);
  if (existsSync(destinoComTipo)) {
    return destinoComTipo;
  }
  const [empresa, ano, mes] = parseNomeEmpresaEAnoMes(info.nmArquivo, info.dtSolicitacao);
  const nomeBase = info.nmArquivo || info.dtSolicitacao || "arquivo";
  const destinoSemTipo = join(PATHS.downloadsDir, ano, mes, empresa, "zips", `${nomeBase}.zip`);
  return existsSync(destinoSemTipo) ? destinoSemTipo : undefined;
}

export function arquivoJaOrganizado(info: DownloadInfo): boolean {
  return caminhoZipOrganizadoExistente(info) !== undefined;
}

export function extrairZipOrganizadoExistente(info: DownloadInfo): boolean {
  const zipPath = caminhoZipOrganizadoExistente(info);
  if (!zipPath) {
    return false;
  }
  const pastaXmls = join(dirname(dirname(zipPath)), "xmls");
  return extrairZip(zipPath, pastaXmls, false);
}

export function organizeDownloadedZip(sourceZip: string, info: DownloadInfo, extrair = true): string {
  const [empresa, ano, mes] = parseNomeEmpresaEAnoMes(info.nmArquivo, info.dtSolicitacao);
  const destinoDir = join(PATHS.downloadsDir, ano, mes, empresa);
  const pastaZips = join(destinoDir, "zips");
  const pastaXmls = join(destinoDir, "xmls");
  ensureDir(pastaZips);
  ensureDir(pastaXmls);

  const destinoFinal = organizedZipPath(info);
  if (!existsSync(destinoFinal)) {
    renameSync(sourceZip, destinoFinal);
  } else if (existsSync(sourceZip)) {
    rmSync(sourceZip, { force: true });
  }

  if (extrair) {
    extrairZip(destinoFinal, pastaXmls, false);
  }
  return destinoFinal;
}

export function limparDownloadsTemporarios(): void {
  if (!existsSync(PATHS.downloadsDir)) {
    return;
  }
  for (const item of readdirSync(PATHS.downloadsDir)) {
    const path = join(PATHS.downloadsDir, item);
    if ((item.endsWith(".zip") || item.endsWith(".crdownload")) && statSync(path).isFile()) {
      rmSync(path, { force: true });
    }
  }
}
