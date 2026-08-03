import type { RuntimeCapability } from "../types.js";
import { safeError } from "../security/redact.js";

const EXPECTED_GESTTA = {
  core: "1.0.1209",
  admin: "1.0.2099",
} as const;

const EXPECTED_ONVIO_IMPORTS: Record<string, string> = {
  "legacy-code": "./legacy-files.js",
  "@onviobr/staff-setup": "/staff-setup/remote-entry.js",
  "@onvio/projects": "/projects/remote-entry.js",
  "@onviobr/dms-app": "/dms-app/remote-entry.js",
  "@onviobr/company-staff": "/br-company-staff/remote-entry.js",
  "@onviobr/permissions-group": "/br-permissions-group/remote-entry.js",
};

const EXPECTED_PORTAL_IMPORTS: Record<string, string> = {
  "@onvio/notification": "/notification/remote-entry.js",
  "@onvio/notification/open-notification": "/notification/remote-entry.js",
};

type VersionFamily = "gestta" | "onvio_staff" | "onvio_portal";

interface VersionState {
  checkedAt: number;
  compatible: boolean;
  reason?: string;
}

async function text(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

async function gesttaVersion(basePath: "" | "admin/"): Promise<string> {
  const pageUrl = `https://app.gestta.com.br/${basePath}`;
  const html = await text(pageUrl);
  const asset = html.match(/(?:src|href)=["']([^"']*scripts\/environment-[^"']+\.js)["']/i)?.[1];
  if (!asset) throw new Error(`Arquivo environment não encontrado em ${pageUrl}`);
  const script = await text(new URL(asset, pageUrl).href);
  const version = script.match(/VERSION\s*:\s*["']([^"']+)["']/)?.[1];
  if (!version) throw new Error(`VERSION ausente em ${asset}`);
  return version;
}

export class FrontendVersionGuard {
  private readonly cache = new Map<VersionFamily, VersionState>();

  constructor(private readonly cacheMs = 10 * 60_000) {}

  async apply(capability: RuntimeCapability): Promise<RuntimeCapability> {
    if (capability.kind !== "write" || !capability.available) return capability;
    const family: VersionFamily | undefined = capability.product === "gestta"
      ? "gestta"
      : capability.product === "onvio_gestao"
        ? "onvio_staff"
        : capability.product === "onvio_portal"
          ? "onvio_portal"
        : undefined;
    if (!family) return capability;
    const state = await this.check(family);
    if (state.compatible) return capability;
    return {
      ...capability,
      status: "drifted",
      available: false,
      availabilityReason: state.reason || "Versão do front-end divergiu do catálogo.",
    };
  }

  invalidate(): void {
    this.cache.clear();
  }

  private async check(family: VersionFamily): Promise<VersionState> {
    const cached = this.cache.get(family);
    if (cached && Date.now() - cached.checkedAt < this.cacheMs) return cached;
    let state: VersionState;
    try {
      state = family === "gestta"
        ? await this.checkGestta()
        : family === "onvio_staff"
          ? await this.checkImportMap("https://onvio.com.br/staff/assets/import-map.json", EXPECTED_ONVIO_IMPORTS, "Onvio Gestão")
          : await this.checkImportMap("https://onvio.com.br/br-portal-do-cliente/assets/import-map.json", EXPECTED_PORTAL_IMPORTS, "Portal do Cliente");
    } catch (error) {
      state = {
        checkedAt: Date.now(),
        compatible: false,
        reason: `Não foi possível confirmar a versão do front-end; escrita bloqueada: ${safeError(error)}`,
      };
    }
    this.cache.set(family, state);
    return state;
  }

  private async checkGestta(): Promise<VersionState> {
    const [core, admin] = await Promise.all([gesttaVersion(""), gesttaVersion("admin/")]);
    const compatible = core === EXPECTED_GESTTA.core && admin === EXPECTED_GESTTA.admin;
    return {
      checkedAt: Date.now(),
      compatible,
      reason: compatible
        ? undefined
        : `Gestta mudou de versão (core ${core}, admin ${admin}); esperado core ${EXPECTED_GESTTA.core}, admin ${EXPECTED_GESTTA.admin}.`,
    };
  }

  private async checkImportMap(url: string, expected: Record<string, string>, label: string): Promise<VersionState> {
    const raw = JSON.parse(await text(url)) as { imports?: Record<string, unknown> };
    const imports = raw.imports || {};
    const drift = Object.entries(expected).filter(([name, target]) => imports[name] !== target);
    return {
      checkedAt: Date.now(),
      compatible: drift.length === 0,
      reason: drift.length ? `Import map ${label} divergiu em: ${drift.map(([name]) => name).join(", ")}.` : undefined,
    };
  }
}
