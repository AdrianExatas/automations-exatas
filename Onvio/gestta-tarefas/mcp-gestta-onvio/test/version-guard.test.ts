import { afterEach, describe, expect, it, vi } from "vitest";
import { FrontendVersionGuard } from "../src/catalog/version-guard.js";
import type { RuntimeCapability } from "../src/types.js";

afterEach(() => vi.restoreAllMocks());

const write: RuntimeCapability = {
  operationId: "gestta.write",
  title: "write",
  description: "write",
  product: "gestta",
  domain: "test",
  kind: "write",
  status: "verified",
  risk: "write",
  idempotent: false,
  transport: "api",
  inputSchema: {},
  evidence: { source: "test", verifiedAt: "2026-08-03" },
  available: true,
};

describe("drift de front-end", () => {
  it("desabilita escrita quando a versão muda", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (raw) => {
      const url = String(raw);
      if (url.endsWith("/admin/")) return new Response('<script src="scripts/environment-admin.js"></script>');
      if (url.endsWith("gestta.com.br/")) return new Response('<script src="scripts/environment-core.js"></script>');
      if (url.endsWith("environment-admin.js")) return new Response('window.gesttaEnv={VERSION:"9.9.9"}');
      return new Response('window.gesttaEnv={VERSION:"1.0.1209"}');
    });
    const result = await new FrontendVersionGuard(0).apply(write);
    expect(result).toMatchObject({ status: "drifted", available: false });
    expect(result.availabilityReason).toMatch(/9\.9\.9/);
  });

  it("mantém leituras disponíveis sem consultar o front-end", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await new FrontendVersionGuard().apply({ ...write, kind: "read", risk: "read" });
    expect(result.available).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
