import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthManager } from "../src/auth/auth-manager.js";
import { CustomerResolver } from "../src/operations/customer-resolver.js";
import { testConfig } from "./helpers.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("autenticação e CustomerRef", () => {
  it("inicia sem credenciais para permitir status e refresh", () => {
    delete process.env.GESTTA_JWT_TOKEN;
    delete process.env.JWT_GESTTA;
    delete process.env.ONVIO_UDS_LONG_TOKEN;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-auth-"));
    const auth = new AuthManager(testConfig(dir));
    expect(auth.status()).toMatchObject({ authenticated: false, source: "none" });
    expect(() => auth.getGesttaJwt()).toThrow(/ausente/i);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("cruza external_id e rejeita resultado ambíguo", async () => {
    const request = vi.fn(async (args: { provider: string; path: string }) => {
      if (args.provider === "gestta") return { docs: [{ _id: "g1", external_id: "o1", cnpj: "12.345.678/0001-90", name: "Cliente" }] };
      return { items: [{ id: "o1", taxIdentification: "12345678000190", name: "Cliente" }] };
    });
    const firms = { resolve: async () => "firm" };
    const resolver = new CustomerResolver({ request } as never, firms as never);
    await expect(resolver.resolve({ cnpj: "12.345.678/0001-90" })).resolves.toMatchObject({ gesttaId: "g1", onvioId: "o1" });

    request.mockImplementationOnce(async () => ({ docs: [{ _id: "g1", cnpj: "1" }, { _id: "g2", cnpj: "1" }] }));
    await expect(resolver.resolve({ cnpj: "1" })).rejects.toThrow(/ambígua/i);
  });
});
