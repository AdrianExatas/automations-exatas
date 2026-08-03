import type { ApiClient } from "../http/api-client.js";
import type { CustomerRef, ResolvedCustomer } from "../types.js";
import { FirmResolver } from "./firm-resolver.js";

function digits(value: unknown): string {
  return String(value || "").replace(/\D/g, "");
}

function records(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["docs", "data", "items", "results"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return records(nested);
    if (nested && typeof nested === "object") {
      const nestedItems = (nested as Record<string, unknown>).items;
      if (Array.isArray(nestedItems)) return records(nestedItems);
    }
  }
  return [];
}

export class CustomerResolver {
  constructor(
    private readonly client: ApiClient,
    private readonly firms: FirmResolver,
  ) {}

  async resolve(ref: CustomerRef): Promise<ResolvedCustomer> {
    if (!ref.cnpj && !ref.code && !ref.gesttaId && !ref.onvioId) {
      throw new Error("Informe cnpj, code, gesttaId ou onvioId.");
    }
    const gestta = await this.findGestta(ref);
    const onvioId = ref.onvioId || (typeof gestta?.external_id === "string" ? gestta.external_id : undefined);
    const onvio = onvioId ? await this.findOnvio(onvioId) : await this.findOnvioByRef(ref);
    const matchedGestta = gestta || (onvio ? await this.findGestta({ onvioId: String(onvio.id || "") }) : undefined);

    if (!matchedGestta && !onvio) throw new Error("Cliente não encontrado no Gestta nem no Onvio.");
    if (matchedGestta && onvio) {
      const externalId = typeof matchedGestta.external_id === "string" ? matchedGestta.external_id : undefined;
      if (externalId && externalId !== String(onvio.id)) {
        throw new Error("Referências Gestta e Onvio apontam para clientes diferentes.");
      }
    }
    return {
      gesttaId: typeof matchedGestta?._id === "string" ? matchedGestta._id : undefined,
      onvioId: onvio ? String(onvio.id) : onvioId,
      cnpj: digits(matchedGestta?.cnpj || onvio?.taxIdentification),
      code: matchedGestta?.code === undefined ? undefined : String(matchedGestta.code),
      name: String(matchedGestta?.name || onvio?.name || "") || undefined,
    };
  }

  private async findGestta(ref: CustomerRef): Promise<Record<string, unknown> | undefined> {
    if (ref.gesttaId) {
      return this.client.request<Record<string, unknown>>({ provider: "gestta", method: "GET", path: `/admin/customer/${encodeURIComponent(ref.gesttaId)}`, readLike: true });
    }
    const response = await this.client.request<unknown>({
      provider: "gestta",
      method: "GET",
      path: "/admin/customer",
      query: { active: true, page: 1, limit: 500, search: ref.cnpj || ref.code || "" },
      readLike: true,
    });
    const candidates = records(response).filter((item) => {
      if (ref.onvioId && item.external_id === ref.onvioId) return true;
      if (ref.cnpj && digits(item.cnpj) === digits(ref.cnpj)) return true;
      if (ref.code && String(item.code || "") === ref.code) return true;
      return false;
    });
    if (candidates.length > 1) throw new Error("Referência ambígua: mais de um cliente Gestta encontrado.");
    return candidates[0];
  }

  private async findOnvio(id: string): Promise<Record<string, unknown> | undefined> {
    return (await this.listOnvio()).find((item) => String(item.id || "") === id);
  }

  private async findOnvioByRef(ref: CustomerRef): Promise<Record<string, unknown> | undefined> {
    const matches = (await this.listOnvio()).filter((item) => {
      if (ref.cnpj && digits(item.taxIdentification || item.cnpj) === digits(ref.cnpj)) return true;
      if (ref.code && String(item.code || "") === ref.code) return true;
      return false;
    });
    if (matches.length > 1) throw new Error("Referência ambígua: mais de um cliente Onvio encontrado.");
    return matches[0];
  }

  private async listOnvio(): Promise<Array<Record<string, unknown>>> {
    const firmId = await this.firms.resolve();
    const response = await this.client.request<unknown>({
      provider: "onvio",
      method: "POST",
      path: `/api/core/v3/companies/${encodeURIComponent(firmId)}/clients/search`,
      headers: { "x-company-id": firmId },
      body: {
        filterSearchSort: { orderBy: "name asc", search: null, searchBy: null, filter: null },
        pagingDataRequest: { startIndex: null, pageIndex: 1, itemsPerPage: 500 },
        expand: "primaryContactExpanded",
        frp: "Onvio.StaffStorage",
        excludeCount: true,
      },
      readLike: true,
    });
    return records(response);
  }
}
