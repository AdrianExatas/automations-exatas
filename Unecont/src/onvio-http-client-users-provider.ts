import { normalizeCodigo } from "./domain/empresa-normalization";
import type {
  ClientUser,
  ClientUserLookupRequest,
  ClientUserLookupResult,
  ClientUsersProvider,
} from "./types";

const DEFAULT_PAGE_SIZE = 50;

export type ClientUsersLookupPurpose = "serviceRequest" | "settings";

export interface OnvioHttpClientUsersProviderOptions {
  token: string;
  firmCompanyId: string;
  baseUrl?: string;
  cookie?: string;
  itemsPerPage?: number;
  fetchImpl?: typeof fetch;
  onUnauthorized?: () => Promise<string>;
  /** Default: serviceRequest (tela Solicitacoes Gerais). */
  lookupPurpose?: ClientUsersLookupPurpose;
}

interface ContactSearchResponse {
  items?: unknown[];
  data?: unknown[];
  value?: unknown[];
  total?: number;
  totalItems?: number;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function readObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readStringField(object: Record<string, unknown>, fields: string[]): string {
  for (const field of fields) {
    const value = object[field];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readNestedString(object: Record<string, unknown>, field: string, nestedField: string): string {
  const nested = readObject(object[field]);
  if (!nested) return "";
  return readStringField(nested, [nestedField]);
}

function extractItems(response: unknown): unknown[] {
  if (Array.isArray(response)) return response;
  const object = readObject(response);
  if (!object) return [];

  const candidates = [object.items, object.data, object.value];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function buildActiveClientsFilter(): string {
  return JSON.stringify({
    useOr: false,
    items: [{ by: "clientMainExpanded.status.id", op: "EQ", value: "ACTIVE" }],
  });
}

export function buildRelationshipSearchPayload(
  pageIndex: number,
  itemsPerPage: number,
  purpose: ClientUsersLookupPurpose = "serviceRequest",
): object {
  if (purpose === "serviceRequest") {
    return {
      expand: "contact.displayAs,contact.id",
      excludeCount: false,
      filterSearchSort: {
        search: "true",
        searchBy: "contactIsClientCenterEnabled",
      },
      pagingDataRequest: { itemsPerPage: Math.max(itemsPerPage, 1000) },
    };
  }

  return {
    expand: "contact.displayAs,contact.primaryEmail.emailAddress,contact.id,contactIsClientCenterEnabled",
    excludeCount: false,
    filterSearchSort: {
      orderBy: "",
      search: "",
      searchBy: "",
      filter: "",
    },
    pagingDataRequest: {
      startIndex: (pageIndex - 1) * itemsPerPage + 1,
      pageIndex,
      itemsPerPage,
    },
  };
}

function readPrimaryContactId(client: unknown): string {
  const object = readObject(client);
  if (!object) return "";
  const primaryContact = readObject(object.primaryContactExpanded) ?? readObject(object.primaryContact);
  return (
    readStringField(primaryContact ?? {}, ["id"]) ||
    readStringField(object, ["primaryContactId", "primaryContactID"])
  );
}

function mapContactObjectToClientUser(contact: unknown, isEnabled: unknown): ClientUser | null {
  const object = readObject(contact);
  if (!object) return null;
  if (isEnabled === false || object.isClientCenterEnabled === false) return null;

  const firstName = readStringField(object, ["firstName", "first"]);
  const lastName = readStringField(object, ["lastName", "last"]);
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const nome =
    readStringField(object, ["displayAs", "name", "fullName", "contactName", "nome"]) ||
    readNestedString(object, "contactExpanded", "displayAs") ||
    readNestedString(object, "contactDataExpanded", "displayAs") ||
    composedName;
  const email =
    readNestedString(object, "primaryEmail", "emailAddress") ||
    readNestedString(object, "primaryEmailExpanded", "emailAddress") ||
    readStringField(object, ["emailAddress", "email", "userEmail"]);
  const id = readStringField(object, ["id", "contactId", "userId"]);

  if (!nome && !email && !id) return null;
  return { nome: nome || email || id, email: email || undefined, id: id || undefined };
}

function mapRelationshipToClientUser(item: unknown): ClientUser | null {
  const object = readObject(item);
  if (!object) return null;
  if (object.contact) {
    return mapContactObjectToClientUser(object.contact, object.contactIsClientCenterEnabled);
  }
  return mapContactObjectToClientUser(object, object.isClientCenterEnabled);
}

function dedupeUsers(users: ClientUser[]): ClientUser[] {
  const seen = new Set<string>();
  const unique: ClientUser[] = [];

  for (const user of users) {
    const key = [user.nome.trim().toUpperCase(), user.email?.trim().toLowerCase() ?? "", user.id ?? ""]
      .filter(Boolean)
      .join("|");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(user);
  }

  return unique;
}

export class OnvioHttpClientUsersProvider implements ClientUsersProvider {
  private token: string;
  private readonly firmCompanyId: string;
  private readonly baseUrl: string;
  private readonly cookie?: string;
  private readonly itemsPerPage: number;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorized?: () => Promise<string>;
  private readonly lookupPurpose: ClientUsersLookupPurpose;
  private refreshPromise?: Promise<string>;

  constructor(options: OnvioHttpClientUsersProviderOptions) {
    this.token = options.token.trim();
    this.firmCompanyId = options.firmCompanyId.trim();
    this.baseUrl = normalizeBaseUrl(options.baseUrl ?? "https://onvio.com.br");
    this.cookie = options.cookie?.trim() || undefined;
    this.itemsPerPage = options.itemsPerPage ?? DEFAULT_PAGE_SIZE;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.onUnauthorized = options.onUnauthorized;
    this.lookupPurpose = options.lookupPurpose ?? "serviceRequest";

    if (!this.token) throw new Error("Token UDSLongToken do Onvio nao informado.");
    if (!this.firmCompanyId) throw new Error("ONVIO_FIRM_COMPANY_ID nao informado.");
  }

  async lookupUsers(request: ClientUserLookupRequest): Promise<ClientUserLookupResult> {
    const clientCode = normalizeCodigo(request.codigo);
    if (!clientCode) {
      return {
        users: [],
        warnings: ["Codigo de cliente invalido para consulta de usuarios no Onvio."],
      };
    }

    const primaryContactId =
      (await this.lookupPrimaryContactId(clientCode)) ||
      (await this.lookupPrimaryContactId(clientCode, { skipActiveFilter: true })) ||
      (await this.lookupPrimaryContactIdViaCoreV3(clientCode));
    if (!primaryContactId) {
      return {
        users: [],
        warnings: [
          `Cliente codigo ${clientCode} nao encontrado no client-core ou sem primaryContactId.`,
        ],
      };
    }

    const users: ClientUser[] = [];
    let pageIndex = 1;

    while (true) {
      const payload = buildRelationshipSearchPayload(
        pageIndex,
        this.itemsPerPage,
        this.lookupPurpose,
      );
      const body = await this.requestJson(
        `${this.baseUrl}/api/core/v1/companies/${this.firmCompanyId}/contacts/${primaryContactId}/relationship-views/search`,
        {
          method: "POST",
          headers: this.buildHeaders("relationship"),
          body: JSON.stringify(payload),
        },
        `usuarios do cliente ${clientCode}`,
      );

      const items = extractItems(body);
      users.push(
        ...items.map(mapRelationshipToClientUser).filter((user): user is ClientUser => Boolean(user)),
      );

      if (this.lookupPurpose === "serviceRequest") break;
      if (items.length < this.itemsPerPage) break;
      const total = Number(
        (body as ContactSearchResponse | null)?.totalItems ??
          (body as ContactSearchResponse | null)?.total ??
          0,
      );
      if (total > 0 && pageIndex * this.itemsPerPage >= total) break;
      pageIndex += 1;
    }

    return { users: dedupeUsers(users) };
  }

  private async lookupPrimaryContactId(
    clientCode: string,
    options: { skipActiveFilter?: boolean } = {},
  ): Promise<string> {
    const url = new URL(`${this.baseUrl}/api/service-requesting/v1/client-core`);
    url.searchParams.set("expand", "primaryContactExpanded,primaryContactExpanded.contactDataExpanded");
    url.searchParams.set("itemsPerPage", "25");
    url.searchParams.set("orderBy", "name asc");
    url.searchParams.set("search", clientCode);
    url.searchParams.set("searchBy", "code");
    if (!options.skipActiveFilter) {
      url.searchParams.set("filter", buildActiveClientsFilter());
    }
    url.searchParams.set("pageIndex", "0");

    const body = await this.requestJson(
      url.toString(),
      {
        method: "GET",
        headers: this.buildHeaders("clientCore"),
      },
      `cliente ${clientCode}`,
    );
    const items = extractItems(body);
    const exactClient = items.find((item) => {
      const object = readObject(item);
      return normalizeCodigo(object?.code) === clientCode;
    });

    return readPrimaryContactId(exactClient);
  }

  private async lookupPrimaryContactIdViaCoreV3(clientCode: string): Promise<string> {
    const filter = JSON.stringify({
      useOr: false,
      items: [{ by: "code", op: "EQ", value: clientCode }],
    });
    const body = await this.requestJson(
      `${this.baseUrl}/api/core/v3/companies/${this.firmCompanyId}/clients/search`,
      {
        method: "POST",
        headers: this.buildHeaders("clientCore"),
        body: JSON.stringify({
          filterSearchSort: {
            orderBy: "name asc",
            search: null,
            searchBy: null,
            filter,
          },
          pagingDataRequest: { pageIndex: 1, itemsPerPage: 10 },
          expand: "primaryContactExpanded",
          excludeCount: true,
        }),
      },
      `cliente ${clientCode} (core v3)`,
    );
    const items = extractItems(body);
    const exactClient =
      items.find((item) => normalizeCodigo(readObject(item)?.code) === clientCode) ?? items[0];
    return readPrimaryContactId(exactClient);
  }

  private buildHeaders(scope: "clientCore" | "relationship" = "relationship"): Record<string, string> {
    const referer =
      this.lookupPurpose === "serviceRequest" || scope === "clientCore"
        ? `${this.baseUrl}/br-portal-do-cliente/service-requesting/general`
        : `${this.baseUrl}/br-portal-do-cliente/settings/clients-users`;

    const headers: Record<string, string> = {
      accept: "application/json, text/plain, */*",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
      authorization: `UDSLongToken ${this.token}`,
      "content-type": "application/json",
      origin: this.baseUrl,
      referer,
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
    };

    if (this.cookie) headers.cookie = this.cookie;
    return headers;
  }

  private async requestJson(url: string, init: RequestInit, label: string): Promise<unknown> {
    let response = await this.fetchImpl(url, init);
    let body = await this.readBody(response);

    if (response.status === 401 && (await this.refreshTokenAfterUnauthorized())) {
      response = await this.fetchImpl(url, {
        ...init,
        headers: {
          ...this.buildHeaders(url.includes("client-core") ? "clientCore" : "relationship"),
          ...(init.headers as Record<string, string> | undefined),
        },
      });
      body = await this.readBody(response);
    }

    if (!response.ok) {
      throw new Error(
        `Falha ao consultar ${label}: ${response.status} ${response.statusText} ${this.formatErrorBody(body)}`.trim(),
      );
    }

    return body;
  }

  private async refreshTokenAfterUnauthorized(): Promise<boolean> {
    if (!this.onUnauthorized) return false;
    if (!this.refreshPromise) {
      this.refreshPromise = this.onUnauthorized();
    }

    const refreshedToken = (await this.refreshPromise).trim();
    if (!refreshedToken || refreshedToken === this.token) return false;
    this.token = refreshedToken;
    return true;
  }

  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private formatErrorBody(body: unknown): string {
    if (!body) return "";
    if (typeof body === "string") return body;
    return JSON.stringify(body);
  }
}
