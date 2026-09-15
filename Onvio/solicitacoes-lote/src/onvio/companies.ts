import { normalizeCodigo } from "./normalize";
import { asObject, itemsFrom, OnvioHttpClient, type OnvioHttpOptions } from "./http";

export interface OnvioCompanyLookupResult {
  codigo: string;
  clientId?: string;
  status: "ATIVO" | "INATIVO" | "LOCALIZADO_SEM_STATUS" | "NAO_LOCALIZADO";
}

function clientId(item: unknown): string {
  const id = asObject(item)?.id;
  return typeof id === "string" ? id.trim() : "";
}

function matchesCode(item: unknown, codigo: string): boolean {
  return normalizeCodigo(asObject(item)?.code) === codigo;
}

function activeFilter(): string {
  return JSON.stringify({
    useOr: false,
    items: [{ by: "clientMainExpanded.status.id", op: "EQ", value: "ACTIVE" }],
  });
}

export class OnvioHttpCompaniesProvider {
  private readonly http: OnvioHttpClient;
  private readonly cache = new Map<string, Promise<OnvioCompanyLookupResult>>();

  constructor(options: OnvioHttpOptions) {
    this.http = new OnvioHttpClient(options);
  }

  lookupCompany(codigo: string): Promise<OnvioCompanyLookupResult> {
    const normalized = normalizeCodigo(codigo);
    if (!normalized) {
      return Promise.resolve({ codigo: "", status: "NAO_LOCALIZADO" });
    }
    let lookup = this.cache.get(normalized);
    if (!lookup) {
      lookup = this.lookup(normalized);
      this.cache.set(normalized, lookup);
    }
    return lookup;
  }

  private async lookup(codigo: string): Promise<OnvioCompanyLookupResult> {
    const active = await this.searchClientCore(codigo, true);
    if (active) return { codigo, clientId: active, status: "ATIVO" };

    const inactive = await this.searchClientCore(codigo, false);
    if (inactive) return { codigo, clientId: inactive, status: "INATIVO" };

    const fallback = await this.searchCoreV3(codigo);
    if (fallback) return { codigo, clientId: fallback, status: "LOCALIZADO_SEM_STATUS" };

    return { codigo, status: "NAO_LOCALIZADO" };
  }

  private async searchClientCore(codigo: string, onlyActive: boolean): Promise<string> {
    const url = new URL(`${this.http.baseUrl}/api/service-requesting/v1/client-core`);
    url.searchParams.set("itemsPerPage", "25");
    url.searchParams.set("orderBy", "name asc");
    url.searchParams.set("search", codigo);
    url.searchParams.set("searchBy", "code");
    url.searchParams.set("pageIndex", "0");
    if (onlyActive) url.searchParams.set("filter", activeFilter());
    const body = await this.http.request(url.toString(), { method: "GET" }, `empresa ${codigo}`);
    return clientId(itemsFrom(body).find((item) => matchesCode(item, codigo)));
  }

  private async searchCoreV3(codigo: string): Promise<string> {
    const filter = JSON.stringify({ useOr: false, items: [{ by: "code", op: "EQ", value: codigo }] });
    const body = await this.http.request(
      `${this.http.baseUrl}/api/core/v3/companies/${this.http.firmCompanyId}/clients/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterSearchSort: { orderBy: "name asc", search: null, searchBy: null, filter },
          pagingDataRequest: { pageIndex: 1, itemsPerPage: 10 },
          excludeCount: true,
        }),
      },
      `empresa ${codigo} (core v3)`,
    );
    return clientId(itemsFrom(body).find((item) => matchesCode(item, codigo)));
  }
}
