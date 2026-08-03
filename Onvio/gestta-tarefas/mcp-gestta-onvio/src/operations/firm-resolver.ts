import type { ApiClient } from "../http/api-client.js";

export class FirmResolver {
  private firmId?: string;

  constructor(private readonly client: ApiClient) {}

  async resolve(explicit?: unknown): Promise<string> {
    if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
    if (this.firmId) return this.firmId;
    const accounts = await this.client.request<unknown>({
      provider: "onvio",
      method: "GET",
      path: "/api/profiles/v1/accounts",
      query: { active: true, hideNonOnvio: true },
      readLike: true,
    });
    const items = Array.isArray(accounts) ? accounts : [];
    const first = items[0] as Record<string, unknown> | undefined;
    const firmId = first?.companyId;
    if (typeof firmId !== "string" || !firmId) throw new Error("Não foi possível identificar o escritório Onvio.");
    this.firmId = firmId;
    return firmId;
  }
}
