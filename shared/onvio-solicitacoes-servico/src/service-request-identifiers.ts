import { normalizeCode, normalizeForMatch } from "./attachments/resolver";
import type {
  SendServiceRequestsOptions,
  ServiceRequestIdentifierLookupData,
  ServiceRequestRow,
} from "./types";

export interface ResolvedServiceRequestIdentifiers {
  clientId: string;
  requesterId?: string;
  departmentId: string;
  warnings: string[];
}

export class ServiceRequestIdentifierResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceRequestIdentifierResolutionError";
  }
}

export function resolveServiceRequestIdentifiers(
  row: ServiceRequestRow,
  lookups: ServiceRequestIdentifierLookupData,
  defaults: SendServiceRequestsOptions["defaults"] = {},
): ResolvedServiceRequestIdentifiers {
  const warnings: string[] = [];

  const directClientId = row.onvioClientId?.trim();
  const mappedClientId = lookups.clientIdByCode.get(normalizeCode(row.codigo));
  const fallbackClientId = defaults?.clientId?.trim();
  const clientId = directClientId || mappedClientId || fallbackClientId || "";
  if (!clientId) {
    throw new ServiceRequestIdentifierResolutionError(
      `ClientId nao resolvido para o codigo ${row.codigo || "<sem codigo>"}.`,
    );
  }
  if (!directClientId && !mappedClientId && fallbackClientId) {
    warnings.push("ClientId do Onvio resolvido pelo fallback global.");
  }

  const directRequesterId = row.onvioRequesterId?.trim();
  const mappedRequesterId = lookups.requesterIdByName.get(normalizeForMatch(row.solicitante));
  const fallbackRequesterId = defaults?.requesterId?.trim();
  const requesterId = directRequesterId || mappedRequesterId || fallbackRequesterId || undefined;
  if (!directRequesterId && row.solicitante.trim() && !mappedRequesterId && fallbackRequesterId) {
    warnings.push(`Solicitante "${row.solicitante}" nao encontrado no provider; usando fallback.`);
  }
  if (row.solicitante.trim() && !requesterId) {
    warnings.push(
      `Solicitante "${row.solicitante}" sem ID do Onvio resolvido; o portal exibira o campo vazio. Defina ONVIO_REQUESTER_ID, coluna ONVIO_REQUESTER_ID na planilha ou nome alinhado ao cadastro em /employees (BD_API_BASE_URL).`,
    );
  }

  const directDepartmentId = row.onvioDepartmentId?.trim();
  const mappedDepartmentId = lookups.departmentIdByName.get(normalizeForMatch(row.departamento));
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
    throw new ServiceRequestIdentifierResolutionError(
      "Departamento nao resolvido para a empresa. Informe DEPARTAMENTO na planilha ou configure um fallback.",
    );
  }
  if (
    !directDepartmentId &&
    row.departamento.trim() &&
    !mappedDepartmentId &&
    (fallbackDepartmentId || fallbackDepartmentByName)
  ) {
    warnings.push(`Departamento "${row.departamento}" nao encontrado; usando fallback.`);
  }

  return {
    clientId,
    requesterId,
    departmentId,
    warnings,
  };
}
