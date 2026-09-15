import { asObject, itemsFrom, OnvioHttpClient, readString, type OnvioHttpOptions } from "./http";
import { normalizeCodigo } from "./normalize";

export interface ClientUser {
  nome: string;
  email?: string;
  id?: string;
}

export interface ClientUserLookupResult {
  users: ClientUser[];
  warnings?: string[];
}

function readNestedString(object: Record<string, unknown>, field: string, nestedField: string): string {
  const nested = asObject(object[field]);
  if (!nested) return "";
  return readString(nested, [nestedField]);
}

function readPrimaryContactId(client: unknown): string {
  const object = asObject(client);
  if (!object) return "";
  const primaryContact = asObject(object.primaryContactExpanded) ?? asObject(object.primaryContact);
  return (
    readString(primaryContact ?? {}, ["id"]) ||
    readString(object, ["primaryContactId", "primaryContactID"])
  );
}

function mapContactObjectToClientUser(contact: unknown, isEnabled: unknown): ClientUser | null {
  const object = asObject(contact);
  if (!object) return null;
  if (isEnabled === false || object.isClientCenterEnabled === false) return null;

  const firstName = readString(object, ["firstName", "first"]);
  const lastName = readString(object, ["lastName", "last"]);
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const nome =
    readString(object, ["displayAs", "name", "fullName", "contactName", "nome"]) ||
    readNestedString(object, "contactExpanded", "displayAs") ||
    composedName;
  const email =
    readNestedString(object, "primaryEmail", "emailAddress") ||
    readString(object, ["emailAddress", "email"]);
  const id = readString(object, ["id", "contactId", "userId"]);
  if (!nome && !email && !id) return null;
  return { nome: nome || email || id, email: email || undefined, id: id || undefined };
}

function mapRelationshipToClientUser(item: unknown): ClientUser | null {
  const object = asObject(item);
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

function activeFilter(): string {
  return JSON.stringify({
    useOr: false,
    items: [{ by: "clientMainExpanded.status.id", op: "EQ", value: "ACTIVE" }],
  });
}

export class OnvioHttpClientUsersProvider {
  private readonly http: OnvioHttpClient;

  constructor(options: OnvioHttpOptions) {
    this.http = new OnvioHttpClient(options);
  }

  async lookupUsers(request: { codigo: string }): Promise<ClientUserLookupResult> {
    const clientCode = normalizeCodigo(request.codigo);
    if (!clientCode) {
      return { users: [], warnings: ["Codigo de cliente invalido para consulta de usuarios no Onvio."] };
    }

    const primaryContactId =
      (await this.lookupPrimaryContactId(clientCode)) ||
      (await this.lookupPrimaryContactId(clientCode, true)) ||
      (await this.lookupPrimaryContactIdViaCoreV3(clientCode));
    if (!primaryContactId) {
      return {
        users: [],
        warnings: [`Cliente codigo ${clientCode} nao encontrado ou sem primaryContactId.`],
      };
    }

    const body = await this.http.request(
      `${this.http.baseUrl}/api/core/v1/companies/${this.http.firmCompanyId}/contacts/${primaryContactId}/relationship-views/search`,
      {
        method: "POST",
        body: JSON.stringify({
          expand: "contact.displayAs,contact.id",
          excludeCount: false,
          filterSearchSort: {
            search: "true",
            searchBy: "contactIsClientCenterEnabled",
          },
          pagingDataRequest: { itemsPerPage: 1000 },
        }),
      },
      `usuarios do cliente ${clientCode}`,
    );

    return {
      users: dedupeUsers(
        itemsFrom(body)
          .map(mapRelationshipToClientUser)
          .filter((user): user is ClientUser => Boolean(user)),
      ),
    };
  }

  private async lookupPrimaryContactId(clientCode: string, skipActiveFilter = false): Promise<string> {
    const url = new URL(`${this.http.baseUrl}/api/service-requesting/v1/client-core`);
    url.searchParams.set("expand", "primaryContactExpanded,primaryContactExpanded.contactDataExpanded");
    url.searchParams.set("itemsPerPage", "25");
    url.searchParams.set("orderBy", "name asc");
    url.searchParams.set("search", clientCode);
    url.searchParams.set("searchBy", "code");
    if (!skipActiveFilter) url.searchParams.set("filter", activeFilter());
    url.searchParams.set("pageIndex", "0");

    const body = await this.http.request(url.toString(), { method: "GET" }, `cliente ${clientCode}`);
    const exactClient = itemsFrom(body).find((item) => normalizeCodigo(asObject(item)?.code) === clientCode);
    return readPrimaryContactId(exactClient);
  }

  private async lookupPrimaryContactIdViaCoreV3(clientCode: string): Promise<string> {
    const filter = JSON.stringify({ useOr: false, items: [{ by: "code", op: "EQ", value: clientCode }] });
    const body = await this.http.request(
      `${this.http.baseUrl}/api/core/v3/companies/${this.http.firmCompanyId}/clients/search`,
      {
        method: "POST",
        body: JSON.stringify({
          filterSearchSort: { orderBy: "name asc", search: null, searchBy: null, filter },
          pagingDataRequest: { pageIndex: 1, itemsPerPage: 10 },
          expand: "primaryContactExpanded",
          excludeCount: true,
        }),
      },
      `cliente ${clientCode} (core v3)`,
    );
    const items = itemsFrom(body);
    const exactClient = items.find((item) => normalizeCodigo(asObject(item)?.code) === clientCode) ?? items[0];
    return readPrimaryContactId(exactClient);
  }
}
