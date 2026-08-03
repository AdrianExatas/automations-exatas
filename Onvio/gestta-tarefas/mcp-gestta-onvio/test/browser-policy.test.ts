import { describe, expect, it } from "vitest";
import { isBlockedBusinessMutation } from "../src/browser/fallback.js";

describe("captura segura de contratos Playwright", () => {
  it("aborta mutações e permite POSTs comprovadamente read-like", () => {
    expect(isBlockedBusinessMutation("POST", "https://onvio.com.br/api/storage/v1/documents")).toBe(true);
    expect(isBlockedBusinessMutation("PUT", "https://onvio.com.br/api/storage/v1/folders/1")).toBe(true);
    expect(isBlockedBusinessMutation("DELETE", "https://api.gestta.com.br/admin/customer/1")).toBe(true);
    expect(isBlockedBusinessMutation("POST", "https://onvio.com.br/api/core/v3/clients/search")).toBe(false);
    expect(isBlockedBusinessMutation("GET", "https://onvio.com.br/api/storage/v1/documents")).toBe(false);
  });
});
