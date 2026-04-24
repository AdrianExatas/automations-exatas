import type { EmpresaBatchItem, UploadOnvioOptions } from "../../types";
import {
  AttachmentResolutionError,
  buildAvailableAttachmentFiles,
  filenameHasExactCodeToken,
  normalizeCode,
  normalizeForMatch,
  resolveAttachmentsForServiceRequest,
  type ResolvedAttachmentFile,
} from "../../attachments/resolver";
import {
  buildLegacyUnecontDescription,
  buildLegacyUnecontSubject,
  legacyUnecontDefaultContent,
} from "./service-request-helpers";

export interface UploadAttachmentFile extends ResolvedAttachmentFile {}

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

function mapAttachmentError(error: unknown): never {
  if (error instanceof AttachmentResolutionError) {
    throw new UploadResolutionError(error.message);
  }

  throw error;
}

export function buildAvailableUploadFiles(
  dir: string,
  excludedFilePaths: string[] = [],
): UploadAttachmentFile[] {
  return buildAvailableAttachmentFiles(dir, excludedFilePaths);
}

export function resolveAttachmentsForEmpresa(
  empresa: EmpresaBatchItem,
  files: UploadAttachmentFile[],
): UploadAttachmentFile[] {
  try {
    return resolveAttachmentsForServiceRequest(empresa, files, "code-fallback");
  } catch (error) {
    mapAttachmentError(error);
  }
}

export function buildUploadSubject(empresa: EmpresaBatchItem): string {
  return buildLegacyUnecontSubject(empresa);
}

export function buildUploadDescription(
  empresa: EmpresaBatchItem,
  attachmentCount: number,
): string {
  return buildLegacyUnecontDescription(empresa, attachmentCount);
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
      `ClientId nao resolvido para o codigo ${empresa.codigo || "<sem codigo>"}.`,
    );
  }
  if (!directClientId && !mappedClientId && fallbackClientId) {
    warnings.push("ClientId do Onvio resolvido pelo fallback global.");
  }

  const directRequesterId = empresa.onvioRequesterId?.trim();
  const mappedRequesterId = lookups.requesterIdByName.get(normalizeForMatch(empresa.solicitante));
  const fallbackRequesterId = defaults?.requesterId?.trim();
  const requesterId = directRequesterId || mappedRequesterId || fallbackRequesterId || undefined;
  if (!directRequesterId && empresa.solicitante.trim() && !mappedRequesterId && fallbackRequesterId) {
    warnings.push(`Solicitante "${empresa.solicitante}" nao encontrado na API do BD; usando fallback.`);
  }
  if (empresa.solicitante.trim() && !requesterId) {
    warnings.push(
      `Solicitante "${empresa.solicitante}" sem ID do Onvio resolvido; o portal exibira o campo vazio. Defina ONVIO_REQUESTER_ID, coluna ONVIO_REQUESTER_ID na planilha ou nome alinhado ao cadastro em /employees (BD_API_BASE_URL).`,
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
      "Departamento nao resolvido para a empresa. Informe DEPARTAMENTO na planilha ou configure um fallback.",
    );
  }
  if (
    !directDepartmentId &&
    empresa.departamento.trim() &&
    !mappedDepartmentId &&
    (fallbackDepartmentId || fallbackDepartmentByName)
  ) {
    warnings.push(`Departamento "${empresa.departamento}" nao encontrado; usando fallback.`);
  }

  return {
    clientId,
    requesterId,
    departmentId,
    warnings,
  };
}

export {
  filenameHasExactCodeToken,
  legacyUnecontDefaultContent,
  normalizeCode,
  normalizeForMatch,
};
