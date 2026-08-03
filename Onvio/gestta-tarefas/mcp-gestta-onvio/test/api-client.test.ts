import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient } from "../src/http/api-client.js";
import { testConfig } from "./helpers.js";

afterEach(() => vi.restoreAllMocks());

function auth() {
  return {
    getGesttaJwt: () => "gestta-secret",
    getOnvioToken: () => "onvio-secret",
    status: () => ({ refreshConfigured: true }),
    refresh: vi.fn(async () => ({})),
  };
}

describe("cliente HTTP", () => {
  it("renova uma vez em 401 e redige a resposta", async () => {
    const session = auth();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: "expired" }), { status: 401 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "never-return" }), { status: 200 }));
    const client = new ApiClient(testConfig(process.cwd()), session as never);
    await expect(client.request({ provider: "gestta", method: "GET", path: "/me" })).resolves.toEqual({ token: "<redacted>" });
    expect(session.refresh).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("respeita Retry-After em leitura e não repete escrita", async () => {
    const session = auth();
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("busy", { status: 429, headers: { "retry-after": "0" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new ApiClient(testConfig(process.cwd()), session as never);
    await expect(client.request({ provider: "onvio", method: "GET", path: "/read" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fetchMock.mockReset().mockResolvedValue(new Response("failure", { status: 500 }));
    await expect(client.request({ provider: "onvio", method: "POST", path: "/write", body: {} })).rejects.toMatchObject({ status: 500 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
