export interface OnvioHttpOptions {
  token: string;
  firmCompanyId: string;
  baseUrl?: string;
  cookie?: string;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => Promise<string>;
}

export function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function itemsFrom(value: unknown): unknown[] {
  const object = asObject(value);
  if (!object) return [];
  for (const candidate of [object.items, object.data, object.value]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

export function readString(object: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = object[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

export class OnvioHttpClient {
  private token: string;
  readonly baseUrl: string;
  readonly firmCompanyId: string;
  private cookie?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => Promise<string>;
  private refreshPromise?: Promise<string>;

  constructor(options: OnvioHttpOptions) {
    this.token = options.token.trim();
    this.baseUrl = (options.baseUrl ?? "https://onvio.com.br").replace(/\/+$/, "");
    this.firmCompanyId = options.firmCompanyId.trim();
    this.cookie = options.cookie?.trim() || undefined;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onUnauthorized = options.onUnauthorized;
    if (!this.token) throw new Error("Token UDSLongToken do Onvio nao informado.");
    if (!this.firmCompanyId) throw new Error("ONVIO_FIRM_COMPANY_ID nao informado.");
  }

  headers(): Record<string, string> {
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

  async request(url: string, init: RequestInit, label: string): Promise<unknown> {
    let response = await this.fetchImpl(url, { ...init, headers: { ...this.headers(), ...asHeaderRecord(init.headers) } });
    if (response.status === 401 && (await this.refresh())) {
      response = await this.fetchImpl(url, { ...init, headers: { ...this.headers(), ...asHeaderRecord(init.headers) } });
    }
    const raw = await response.text();
    let body: unknown = raw;
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      /* keep raw */
    }
    if (!response.ok) {
      throw new Error(
        `Falha ao consultar ${label}: ${response.status} ${response.statusText} ${
          typeof body === "string" ? body.slice(0, 300) : ""
        }`.trim(),
      );
    }
    return body;
  }

  private async refresh(): Promise<boolean> {
    if (!this.onUnauthorized) return false;
    if (!this.refreshPromise) this.refreshPromise = this.onUnauthorized();
    const refreshed = (await this.refreshPromise).trim();
    if (!refreshed || refreshed === this.token) return false;
    this.token = refreshed;
    this.cookie = `UDSLongToken=${refreshed}`;
    return true;
  }
}

function asHeaderRecord(headers: RequestInit["headers"]): Record<string, string> {
  if (!headers || headers instanceof Headers || Array.isArray(headers)) return {};
  return headers as Record<string, string>;
}
