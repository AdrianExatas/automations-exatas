import fs from "node:fs";
import path from "node:path";
import { matchEmpresaFileIdentity } from "../empresa-file-identity";
import type { EmpresaBatchItem, UploadOnvioOptions } from "../types";

export interface UploadAttachmentFile {
  filePath: string;
  fileName: string;
  extension: string;
}

export interface UploadResolutionResult {
  clientId: string;
  requesterId?: string;
  departmentId: string;
  warnings: string[];
}

export interface UploadLookupMaps {
  clientIdByCode: Map<string, string>;
  requesterIdByName: Map<string, string>;
  departmentIdByName: Map<string, string>;
}

export class UploadResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadResolutionError";
  }
}

const ALLOWED_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".xlsx"]);

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

export function buildAvailableUploadFiles(
  dir: string,
  excludedFilePaths: string[] = [],
): UploadAttachmentFile[] {
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
  // Arquivos Unecont: "CODIGO - UneCont - Tomados - ...". Usar so o prefixo evita
  // colidir com digitos de CNPJ no nome (ex.: 38.635.853 ≠ codigo 635).
  const leading = baseName.match(/^(\d+)\s*-/);
  if (leading) {
    return normalizeCode(leading[1]) === normalizedCode;
  }

  const tokens = normalizeForMatch(baseName)
    .split(/[^A-Z0-9]+/)
    .filter(Boolean);

  return tokens.includes(normalizeForMatch(normalizedCode));
}

function buildFileNameMap(files: UploadAttachmentFile[]): Map<string, UploadAttachmentFile> {
  return new Map(files.map((file) => [normalizeForMatch(file.fileName), file]));
}

function assertAttachmentMatchesEmpresa(
  file: UploadAttachmentFile,
  empresa: EmpresaBatchItem,
): void {
  // Apenas planilhas Unecont (.xlsx) passam pela trava de razao social.
  if (file.extension.toLowerCase() !== ".xlsx") return;

  const nome = empresa.nome?.trim();
  if (!nome) {
    throw new UploadResolutionError(
      `Anexo recusado: empresa ${empresa.codigo || "<sem código>"} sem nome para validar identidade do arquivo ${file.fileName}.`,
    );
  }

  const identity = matchEmpresaFileIdentity(file.fileName, nome);
  if (!identity.ok) {
    throw new UploadResolutionError(
      `Anexo incompatível com a empresa ${empresa.codigo || "<sem código>"} (${nome}): ${file.fileName}`,
    );
  }
}

export function resolveAttachmentsForEmpresa(
  empresa: EmpresaBatchItem,
  files: UploadAttachmentFile[],
): UploadAttachmentFile[] {
  if (empresa.arquivos.length > 0) {
    const filesByName = buildFileNameMap(files);
    const resolved = empresa.arquivos.map((arquivo) => {
      const extension = path.extname(arquivo).toLowerCase();
      if (extension && !ALLOWED_ATTACHMENT_EXTENSIONS.has(extension)) {
        throw new UploadResolutionError(`Extensão não suportada para upload: ${arquivo}`);
      }

      const match = filesByName.get(normalizeForMatch(path.basename(arquivo)));
      if (!match) {
        throw new UploadResolutionError(`Arquivo listado na planilha não encontrado: ${arquivo}`);
      }
      assertAttachmentMatchesEmpresa(match, empresa);
      return match;
    });

    return Array.from(new Map(resolved.map((file) => [file.filePath, file])).values());
  }

  const matches = files.filter((file) => filenameHasExactCodeToken(file.fileName, empresa.codigo));
  if (matches.length === 0) {
    throw new UploadResolutionError(
      `Nenhum anexo encontrado para o código ${empresa.codigo || "<sem código>"}.`,
    );
  }

  for (const match of matches) {
    assertAttachmentMatchesEmpresa(match, empresa);
  }
  return matches;
}

export function buildUploadSubject(empresa: EmpresaBatchItem): string {
  const label = empresa.nome || empresa.codigo || empresa.cnpj;
  return `Relatório Serviços Tomados - ${label}`;
}

export function buildUploadDescription(
  empresa: EmpresaBatchItem,
  attachmentCount: number,
): string {
  const label = empresa.nome || empresa.codigo || empresa.cnpj;
  return `Upload automático do relatório Unecont para ${label} com ${attachmentCount} arquivo(s).`;
}

export function resolveUploadIdentifiers(
  empresa: EmpresaBatchItem,
  lookups: UploadLookupMaps,
  defaults: UploadOnvioOptions["defaults"] = {},
): UploadResolutionResult {
  const warnings: string[] = [];

  const directClientId = empresa.onvioClientId?.trim();
  const mappedClientId = lookups.clientIdByCode.get(normalizeCode(empresa.codigo));
  const fallbackClientId = defaults?.clientId?.trim();
  const clientId = directClientId || mappedClientId || fallbackClientId || "";
  if (!clientId) {
    throw new UploadResolutionError(
      `ClientId não resolvido para o código ${empresa.codigo || "<sem código>"}.`,
    );
  }
  if (!directClientId && !mappedClientId && fallbackClientId) {
    warnings.push("ClientId do Onvio resolvido pelo fallback global.");
  }

  const directRequesterId = empresa.onvioRequesterId?.trim();
  const mappedRequesterId = lookups.requesterIdByName.get(normalizeForMatch(empresa.solicitante));
  const fallbackRequesterId = defaults?.requesterId?.trim();
  const requesterId =
    directRequesterId || mappedRequesterId || fallbackRequesterId || undefined;
  if (!directRequesterId && empresa.solicitante.trim() && !mappedRequesterId && fallbackRequesterId) {
    warnings.push(`Solicitante "${empresa.solicitante}" não encontrado na API do BD; usando fallback.`);
  }
  if (empresa.solicitante.trim() && !requesterId) {
    warnings.push(
      `Solicitante "${empresa.solicitante}" sem ID do Onvio resolvido; o portal exibirá o campo vazio. Defina ONVIO_REQUESTER_ID, coluna ONVIO_REQUESTER_ID na planilha, usuário do cliente no Onvio ou nome alinhado ao cadastro em /employees (BD_API_BASE_URL).`,
    );
  }

  const directDepartmentId = empresa.onvioDepartmentId?.trim();
  const mappedDepartmentId = lookups.departmentIdByName.get(
    normalizeForMatch(empresa.departamento),
  );
  const fallbackDepartmentId = defaults?.departmentId?.trim();
  const fallbackDepartmentByName = lookups.departmentIdByName.get(
    normalizeForMatch(defaults?.departmentName ?? ""),
  );
  const departmentId =
    directDepartmentId ||
    mappedDepartmentId ||
    fallbackDepartmentId ||
    fallbackDepartmentByName ||
    "";

  if (!departmentId) {
    throw new UploadResolutionError(
      "Departamento não resolvido para a empresa. Informe DEPARTAMENTO na planilha ou configure um fallback.",
    );
  }
  if (
    !directDepartmentId &&
    empresa.departamento.trim() &&
    !mappedDepartmentId &&
    (fallbackDepartmentId || fallbackDepartmentByName)
  ) {
    warnings.push(`Departamento "${empresa.departamento}" não encontrado; usando fallback.`);
  }

  return {
    clientId,
    requesterId,
    departmentId,
    warnings,
  };
}
