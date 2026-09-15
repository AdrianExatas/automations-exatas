import fs from "node:fs";
import path from "node:path";
import type {
  ServiceRequestAttachmentStrategy,
  ServiceRequestRow,
} from "../types";
import { matchEmpresaFileIdentity } from "./empresa-file-identity";

export interface ResolvedAttachmentFile {
  filePath: string;
  fileName: string;
  extension: string;
}

export class AttachmentResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AttachmentResolutionError";
  }
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".xlsx", ".xls", ".mp4", ".webm", ".mov"]);

export interface ResolveAttachmentsOptions {
  validateIdentity?: boolean;
  allowMissing?: boolean;
}

export function normalizeForMatch(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeCode(code: string): string {
  const trimmed = String(code ?? "").trim();
  if (!trimmed) return "";
  return /^\d+$/.test(trimmed) ? String(parseInt(trimmed, 10)) : trimmed;
}

export function buildAvailableAttachmentFiles(
  dir: string,
  excludedFilePaths: string[] = [],
): ResolvedAttachmentFile[] {
  if (!dir || !fs.existsSync(dir)) return [];

  const excluded = new Set(
    excludedFilePaths.filter(Boolean).map((filePath) => path.resolve(filePath).toLowerCase()),
  );

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      return {
        filePath,
        fileName: entry.name,
        extension: path.extname(entry.name).toLowerCase(),
      };
    })
    .filter((file) => ALLOWED_ATTACHMENT_EXTENSIONS.has(file.extension))
    .filter((file) => !excluded.has(path.resolve(file.filePath).toLowerCase()));
}

export function filenameHasExactCodeToken(filename: string, code: string): boolean {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return false;

  const baseName = path.basename(filename, path.extname(filename));
  // Prefixo "CODIGO -" (Unecont): nao confundir com digitos de CNPJ no restante do nome.
  const leading = baseName.match(/^(\d+)\s*-/);
  if (leading) {
    return normalizeCode(leading[1]) === normalizedCode;
  }

  const tokens = normalizeForMatch(baseName)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  return tokens.includes(normalizeForMatch(normalizedCode));
}

function buildFileNameMap(files: ResolvedAttachmentFile[]): Map<string, ResolvedAttachmentFile> {
  return new Map(files.map((file) => [normalizeForMatch(file.fileName), file]));
}

function assertAttachmentMatchesEmpresa(
  file: ResolvedAttachmentFile,
  row: ServiceRequestRow,
): void {
  if (file.extension.toLowerCase() !== ".xlsx") return;

  const nome = row.nome?.trim();
  if (!nome) {
    throw new AttachmentResolutionError(
      `Anexo recusado: empresa ${row.codigo || "<sem codigo>"} sem nome para validar identidade do arquivo ${file.fileName}.`,
    );
  }

  const identity = matchEmpresaFileIdentity(file.fileName, nome);
  if (!identity.ok) {
    throw new AttachmentResolutionError(
      `Anexo incompativel com a empresa ${row.codigo || "<sem codigo>"} (${nome}): ${file.fileName}`,
    );
  }
}

function fileFromAbsolutePath(filePath: string): ResolvedAttachmentFile | null {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) return null;
  const st = fs.statSync(resolved);
  if (!st.isFile()) return null;
  const fileName = path.basename(resolved);
  return {
    filePath: resolved,
    fileName,
    extension: path.extname(fileName).toLowerCase(),
  };
}

function resolveExplicitAttachments(
  row: ServiceRequestRow,
  files: ResolvedAttachmentFile[],
  options: ResolveAttachmentsOptions = {},
): ResolvedAttachmentFile[] {
  const filesByName = buildFileNameMap(files);
  const validateIdentity = options.validateIdentity !== false;
  const resolved = row.arquivos.map((arquivo) => {
    const extension = path.extname(arquivo).toLowerCase();
    if (extension && !ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
      throw new AttachmentResolutionError(`Extensao nao suportada para upload: ${arquivo}`);
    }

    const fromDisk = fileFromAbsolutePath(arquivo);
    const match = fromDisk ?? filesByName.get(normalizeForMatch(path.basename(arquivo)));
    if (!match) {
      throw new AttachmentResolutionError(`Arquivo listado na planilha nao encontrado: ${arquivo}`);
    }
    if (validateIdentity) {
      assertAttachmentMatchesEmpresa(match, row);
    }
    return match;
  });

  return Array.from(new Map(resolved.map((file) => [file.filePath, file])).values());
}

function resolveAttachmentsByCode(
  row: ServiceRequestRow,
  files: ResolvedAttachmentFile[],
  options: ResolveAttachmentsOptions = {},
): ResolvedAttachmentFile[] {
  const matches = files.filter((file) => filenameHasExactCodeToken(file.fileName, row.codigo));
  if (matches.length === 0) {
    throw new AttachmentResolutionError(
      `Nenhum anexo encontrado para o codigo ${row.codigo || "<sem codigo>"}.`,
    );
  }
  if (options.validateIdentity !== false) {
    for (const match of matches) {
      assertAttachmentMatchesEmpresa(match, row);
    }
  }
  return matches;
}

export function resolveAttachmentsForServiceRequest(
  row: ServiceRequestRow,
  files: ResolvedAttachmentFile[],
  strategy: ServiceRequestAttachmentStrategy,
  options: ResolveAttachmentsOptions = {},
): ResolvedAttachmentFile[] {
  if (row.arquivos.length > 0) {
    return resolveExplicitAttachments(row, files, options);
  }

  if (strategy === "explicit") {
    if (options.allowMissing) return [];
    throw new AttachmentResolutionError(
      `Nenhum anexo listado na planilha para o codigo ${row.codigo || "<sem codigo>"}.`,
    );
  }

  try {
    return resolveAttachmentsByCode(row, files, options);
  } catch (error) {
    if (options.allowMissing && error instanceof AttachmentResolutionError) {
      return [];
    }
    throw error;
  }
}
