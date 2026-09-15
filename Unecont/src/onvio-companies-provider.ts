import { normalizeCodigo } from "./domain/empresa-normalization";
import type {
  OnvioCompaniesProvider,
  OnvioCompanyLookupRequest,
  OnvioCompanyLookupResult,
} from "./types";

export interface OnvioHttpCompaniesProviderOptions {
  token: string;
  firmCompanyId: string;
  baseUrl?: string;
  cookie?: string;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => Promise<string>;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function itemsFrom(value: unknown): unknown[] {
  const object = asObject(value);
  if (!object) return [];
  for (const candidate of [object.items, object.data, object.value]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function clientId(item: unknown): string {
  const object = asObject(item);
  const id = object?.id;
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

export class OnvioHttpCompaniesProvider implements OnvioCompaniesProvider {
  private token: string;
  private readonly baseUrl: string;
  private readonly firmCompanyId: string;
  private readonly cookie?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => Promise<string>;
  private refreshPromise?: Promise<string>;
  private readonly cache = new Map<string, Promise<OnvioCompanyLookupResult>>();

  constructor(options: OnvioHttpCompaniesProviderOptions) {
    this.token = options.token.trim();
    this.baseUrl = (options.baseUrl ?? "https://onvio.com.br").replace(/\/+$/, "");
    this.firmCompanyId = options.firmCompanyId.trim();
    this.cookie = options.cookie?.trim() || undefined;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onUnauthorized = options.onUnauthorized;
    if (!this.token) throw new Error("Token UDSLongToken do Onvio nao informado.");
    if (!this.firmCompanyId) throw new Error("ONVIO_FIRM_COMPANY_ID nao informado.");
  }

  lookupCompany(request: OnvioCompanyLookupRequest): Promise<OnvioCompanyLookupResult> {
    const codigo = normalizeCodigo(request.codigo);
    if (!codigo) {
      return Promise.resolve({ codigo: "", status: "NAO_LOCALIZADO", mensagem: "Codigo invalido." });
    }
    let lookup = this.cache.get(codigo);
    if (!lookup) {
      lookup = this.lookup(codigo);
      this.cache.set(codigo, lookup);
    }
    return lookup;
  }

  private async lookup(codigo: string): Promise<OnvioCompanyLookupResult> {
    const active = await this.searchClientCore(codigo, true);
    if (active) return { codigo, clientId: active, status: "ATIVO", fonte: "client-core-ativo" };

    const inactive = await this.searchClientCore(codigo, false);
    if (inactive) return { codigo, clientId: inactive, status: "INATIVO", fonte: "client-core" };

    const fallback = await this.searchCoreV3(codigo);
    if (fallback) {
      return { codigo, clientId: fallback, status: "LOCALIZADO_SEM_STATUS", fonte: "core-v3" };
    }
    return { codigo, status: "NAO_LOCALIZADO", mensagem: "Empresa nao localizada no Onvio pelo codigo." };
  }

  private async searchClientCore(codigo: string, onlyActive: boolean): Promise<string> {
    const url = new URL(`${this.baseUrl}/api/service-requesting/v1/client-core`);
    url.searchParams.set("itemsPerPage", "25");
    url.searchParams.set("orderBy", "name asc");
    url.searchParams.set("search", codigo);
    url.searchParams.set("searchBy", "code");
    url.searchParams.set("pageIndex", "0");
    if (onlyActive) url.searchParams.set("filter", activeFilter());
    const body = await this.request(url.toString(), { method: "GET" });
    return clientId(itemsFrom(body).find((item) => matchesCode(item, codigo)));
  }

  private async searchCoreV3(codigo: string): Promise<string> {
    const filter = JSON.stringify({ useOr: false, items: [{ by: "code", op: "EQ", value: codigo }] });
    const body = await this.request(`${this.baseUrl}/api/core/v3/companies/${this.firmCompanyId}/clients/search`, {
      method: "POST",
      body: JSON.stringify({
        filterSearchSort: { orderBy: "name asc", search: null, searchBy: null, filter },
        pagingDataRequest: { pageIndex: 1, itemsPerPage: 10 },
        excludeCount: true,
      }),
    });
    return clientId(itemsFrom(body).find((item) => matchesCode(item, codigo)));
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      accept: "application/json, text/plain, */*",
      "content-type": "application/json",
      authorization: `UDSLongToken ${this.token}`,
      origin: this.baseUrl,
      referer: `${this.baseUrl}/br-portal-do-cliente/service-requesting/general`,
    };
    if (this.cookie) headers.cookie = this.cookie;
    return headers;
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    let response = await this.fetchImpl(url, { ...init, headers: this.headers() });
    if (response.status === 401 && (await this.refresh())) {
      response = await this.fetchImpl(url, { ...init, headers: this.headers() });
    }
    const raw = await response.text();
    let body: unknown = raw;
    try { body = raw ? JSON.parse(raw) : null; } catch { /* report raw body below */ }
    if (!response.ok) {
      throw new Error(`Falha ao consultar empresas no Onvio: ${response.status} ${response.statusText} ${typeof body === "string" ? body.slice(0, 300) : ""}`.trim());
    }
    return body;
  }

  private async refresh(): Promise<boolean> {
    if (!this.onUnauthorized) return false;
    if (!this.refreshPromise) this.refreshPromise = this.onUnauthorized();
    const refreshed = (await this.refreshPromise).trim();
    if (!refreshed || refreshed === this.token) return false;
    this.token = refreshed;
    return true;
  }
}
