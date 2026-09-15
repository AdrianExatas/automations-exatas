import type { ServiceRequestIdentifierLookupData } from "@exatas/onvio-solicitacoes-servico";

export interface OnvioDepartment {
  id: string;
  name: string;
  code?: string;
}

export interface OnvioHttpDepartmentsProviderOptions {
  token: string;
  firmCompanyId: string;
  baseUrl?: string;
  cookie?: string;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => Promise<string>;
  itemsPerPage?: number;
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

function readString(object: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = object[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function mapDepartment(item: unknown): OnvioDepartment | null {
  const object = asObject(item);
  if (!object) return null;
  const id = readString(object, ["id", "departmentId"]);
  const name = readString(object, ["name", "departmentName", "displayAs"]);
  if (!id || !name) return null;
  const code = readString(object, ["code", "departmentCode"]);
  return code ? { id, name, code } : { id, name };
}

export function normalizeDepartmentName(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Monta mapa nome→id. Registra o nome completo e, quando houver prefixo "SETOR ",
 * tambem o nome curto (ex.: SETOR FISCAL → FISCAL) se ainda nao ocupado.
 */
export function buildDepartmentIdByName(departments: OnvioDepartment[]): Map<string, string> {
  const byName = new Map<string, string>();

  for (const department of departments) {
    const fullKey = normalizeDepartmentName(department.name);
    if (fullKey) byName.set(fullKey, department.id);
  }

  // Aliases curtos a partir de "SETOR X" (preferidos sobre nomes curtos duplicados).
  for (const department of departments) {
    const fullKey = normalizeDepartmentName(department.name);
    const withoutSetor = fullKey.replace(/^SETOR\s+/, "").trim();
    if (withoutSetor && withoutSetor !== fullKey) {
      byName.set(withoutSetor, department.id);
    }
  }

  return byName;
}

export class OnvioHttpDepartmentsProvider {
  private token: string;
  private readonly firmCompanyId: string;
  private readonly baseUrl: string;
  private readonly cookie?: string;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => Promise<string>;
  private readonly itemsPerPage: number;
  private refreshPromise?: Promise<string>;

  constructor(options: OnvioHttpDepartmentsProviderOptions) {
    this.token = options.token.trim();
    this.firmCompanyId = options.firmCompanyId.trim();
    this.baseUrl = (options.baseUrl ?? "https://onvio.com.br").replace(/\/+$/, "");
    this.cookie = options.cookie?.trim() || undefined;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onUnauthorized = options.onUnauthorized;
    this.itemsPerPage = options.itemsPerPage ?? 200;

    if (!this.token) throw new Error("Token UDSLongToken do Onvio nao informado.");
    if (!this.firmCompanyId) throw new Error("ONVIO_FIRM_COMPANY_ID nao informado.");
  }

  async listDepartments(): Promise<OnvioDepartment[]> {
    const url = `${this.baseUrl}/api/core/v1/companies/${this.firmCompanyId}/departments/search`;
    const body = await this.request(url, {
      method: "POST",
      body: JSON.stringify({
        filterSearchSort: { orderBy: "name asc", search: "", searchBy: "", filter: "" },
        pagingDataRequest: { pageIndex: 1, itemsPerPage: this.itemsPerPage },
        excludeCount: false,
      }),
    });

    const departments: OnvioDepartment[] = [];
    for (const item of itemsFrom(body)) {
      const mapped = mapDepartment(item);
      if (mapped) departments.push(mapped);
    }
    return departments;
  }

  async loadDepartmentIdByName(): Promise<Map<string, string>> {
    return buildDepartmentIdByName(await this.listDepartments());
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
    try {
      body = raw ? JSON.parse(raw) : null;
    } catch {
      /* keep raw */
    }
    if (!response.ok) {
      throw new Error(
        `Falha ao consultar departamentos no Onvio: ${response.status} ${response.statusText} ${
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
    return true;
  }
}

export function createOnvioDepartmentsIdentifierProvider(
  departmentsProvider: OnvioHttpDepartmentsProvider,
): { loadLookupData(): Promise<ServiceRequestIdentifierLookupData> } {
  return {
    async loadLookupData(): Promise<ServiceRequestIdentifierLookupData> {
      const departmentIdByName = await departmentsProvider.loadDepartmentIdByName();
      return {
        clientIdByCode: new Map(),
        requesterIdByName: new Map(),
        departmentIdByName,
      };
    },
  };
}
