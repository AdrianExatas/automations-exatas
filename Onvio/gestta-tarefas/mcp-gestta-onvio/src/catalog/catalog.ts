import { CAPABILITIES } from "./definitions.js";
import type { ApiClient } from "../http/api-client.js";
import type {
  CapabilityDefinition,
  CapabilityKind,
  CapabilityStatus,
  Entitlements,
  Product,
  RuntimeCapability,
} from "../types.js";
import { safeError } from "../security/redact.js";
import type { FrontendVersionGuard } from "./version-guard.js";

export interface CapabilityFilter {
  product?: Product;
  domain?: string;
  kind?: CapabilityKind;
  status?: CapabilityStatus;
  cursor?: string;
  limit?: number;
}

function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset }), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as { offset?: number };
    if (!Number.isInteger(parsed.offset) || (parsed.offset ?? -1) < 0) throw new Error("invalid");
    return parsed.offset!;
  } catch {
    throw new Error("Cursor de capacidades inválido.");
  }
}

function arrayFromUnknown(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["docs", "data", "items", "results", "featureResources"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

export class CapabilityCatalog {
  private entitlements?: Entitlements;
  private entitlementPromise?: Promise<Entitlements>;
  private readonly byId = new Map(CAPABILITIES.map((item) => [item.operationId, item]));

  constructor(
    private readonly client: ApiClient,
    private readonly versionGuard?: FrontendVersionGuard,
  ) {}

  definition(operationId: string): CapabilityDefinition {
    const capability = this.byId.get(operationId);
    if (!capability) throw new Error(`Operação não cadastrada: ${operationId}`);
    return capability;
  }

  async runtime(operationId: string): Promise<RuntimeCapability> {
    const capability = this.applyAvailability(this.definition(operationId), await this.loadEntitlements());
    return this.versionGuard ? this.versionGuard.apply(capability) : capability;
  }

  async list(filter: CapabilityFilter = {}): Promise<{
    items: RuntimeCapability[];
    nextCursor?: string;
    total: number;
  }> {
    const entitlements = await this.loadEntitlements();
    const runtime = CAPABILITIES.map((item) => this.applyAvailability(item, entitlements));
    const allWithVersions = this.versionGuard
      ? await Promise.all(runtime.map((item) => this.versionGuard!.apply(item)))
      : runtime;
    const all = allWithVersions.filter(
      (item) =>
        (!filter.product || item.product === filter.product) &&
        (!filter.domain || item.domain === filter.domain) &&
        (!filter.kind || item.kind === filter.kind) &&
        (!filter.status || item.status === filter.status),
    );
    const offset = decodeCursor(filter.cursor);
    const limit = Math.min(Math.max(filter.limit || 50, 1), 500);
    const items = all.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    return {
      items,
      total: all.length,
      nextCursor: nextOffset < all.length ? encodeCursor(nextOffset) : undefined,
    };
  }

  invalidateEntitlements(): void {
    this.entitlements = undefined;
  }

  private async loadEntitlements(): Promise<Entitlements> {
    if (this.entitlements) return this.entitlements;
    if (!this.entitlementPromise) {
      this.entitlementPromise = this.fetchEntitlements().finally(() => {
        this.entitlementPromise = undefined;
      });
    }
    this.entitlements = await this.entitlementPromise;
    return this.entitlements;
  }

  private async fetchEntitlements(): Promise<Entitlements> {
    try {
      const [gesttaMe, onvioLicenses] = await Promise.all([
      this.client.request<Record<string, unknown>>({
        provider: "gestta",
        method: "GET",
        path: "/admin/company/user/me",
        readLike: true,
      }),
      this.client.request<Record<string, unknown>>({
        provider: "onvio",
        method: "GET",
        path: "/api/provisioning/v1/licenses",
        readLike: true,
      }),
      ]);
    const gesttaPermissions = new Set(
      (Array.isArray(gesttaMe.permissions) ? gesttaMe.permissions : []).filter(
        (item): item is string => typeof item === "string",
      ),
    );
    const onvioLicenseSet = new Set<string>();
    for (const raw of arrayFromUnknown(onvioLicenses)) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      if (typeof item.feature === "string" && typeof item.resource === "string") {
        onvioLicenseSet.add(`${item.feature}::${item.resource}`);
      }
    }
      return {
        gesttaPermissions,
        onvioLicenses: onvioLicenseSet,
        messengerActive: [...onvioLicenseSet].some((item) => item.startsWith("BRMessenger::")),
        authenticated: true,
      };
    } catch (error) {
      return {
        gesttaPermissions: new Set(),
        onvioLicenses: new Set(),
        messengerActive: false,
        authenticated: false,
        loadError: safeError(error),
      };
    }
  }

  private applyAvailability(item: CapabilityDefinition, entitlements: Entitlements): RuntimeCapability {
    if (item.status !== "verified") {
      return { ...item, available: false, availabilityReason: item.unavailableReason };
    }
    if (!entitlements.authenticated) {
      return {
        ...item,
        available: false,
        availabilityReason: `Não foi possível validar a sessão e as permissões: ${entitlements.loadError || "autenticação ausente"}`,
      };
    }
    const missingPermissions = (item.requiredPermissions || []).filter(
      (permission) => !entitlements.gesttaPermissions.has(permission),
    );
    const missingLicenses = (item.requiredLicenses || []).filter(
      (license) => !entitlements.onvioLicenses.has(license),
    );
    if (item.product === "onvio_messenger" && !entitlements.messengerActive) {
      return { ...item, available: false, availabilityReason: "Messenger não contratado." };
    }
    if (missingPermissions.length || missingLicenses.length) {
      return {
        ...item,
        available: false,
        availabilityReason: [
          missingPermissions.length ? `Permissões ausentes: ${missingPermissions.join(", ")}` : "",
          missingLicenses.length ? `Licenças ausentes: ${missingLicenses.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("; "),
      };
    }
    return { ...item, available: true };
  }
}
