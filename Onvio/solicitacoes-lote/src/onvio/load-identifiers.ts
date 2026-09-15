import type {
  ServiceRequestIdentifierProvider,
  ServiceRequestRow,
} from "@exatas/onvio-solicitacoes-servico";
import { OnvioHttpCompaniesProvider } from "./companies";
import { OnvioHttpClientUsersProvider } from "./client-users";
import { OnvioHttpDepartmentsProvider } from "./departments";
import type { OnvioHttpOptions } from "./http";
import { normalizeCodigo } from "./normalize";
import { createClientUsersRequesterResolver } from "./requester-resolver";

export async function buildIdentifierSupport(
  options: OnvioHttpOptions,
  rows: ServiceRequestRow[],
): Promise<{
  identifierProvider: ServiceRequestIdentifierProvider;
  resolveRequesterId: ReturnType<typeof createClientUsersRequesterResolver>;
}> {
  const companies = new OnvioHttpCompaniesProvider(options);
  const departments = new OnvioHttpDepartmentsProvider(options);
  const clientUsers = new OnvioHttpClientUsersProvider(options);

  const clientIdByCode = new Map<string, string>();
  const codesNeedingLookup = [
    ...new Set(
      rows
        .filter((row) => !row.onvioClientId?.trim())
        .map((row) => normalizeCodigo(row.codigo))
        .filter(Boolean),
    ),
  ];
  for (const codigo of codesNeedingLookup) {
    const result = await companies.lookupCompany(codigo);
    if (result.clientId) clientIdByCode.set(codigo, result.clientId);
  }
  for (const row of rows) {
    const codigo = normalizeCodigo(row.codigo);
    const clientId = row.onvioClientId?.trim();
    if (codigo && clientId && !clientIdByCode.has(codigo)) {
      clientIdByCode.set(codigo, clientId);
    }
  }

  const departmentIdByName = await departments.loadDepartmentIdByName();

  return {
    identifierProvider: {
      async loadLookupData() {
        return {
          clientIdByCode,
          requesterIdByName: new Map(),
          departmentIdByName,
        };
      },
    },
    resolveRequesterId: createClientUsersRequesterResolver(clientUsers),
  };
}
