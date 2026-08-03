import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import { createServer } from "../src/app.js";

describe("MCP end-to-end em transporte de memória", () => {
  it("expõe ferramentas, recursos, structuredContent e ciclo prepare/commit/cancel", async () => {
    const plan = {
      planId: "11111111-1111-4111-8111-111111111111",
      confirmationToken: "confirmation-token-long-enough",
      operationId: "test.write",
      input: { id: "1" },
      inputDigest: "digest",
      createdAt: "2026-08-03T00:00:00.000Z",
      expiresAt: "2026-08-03T00:15:00.000Z",
      summary: "prévia",
      warnings: [],
      used: false,
    };
    const services = {
      auth: { status: () => ({ authenticated: false, source: "none", refreshConfigured: false }), refresh: vi.fn() },
      catalog: {
        list: async () => ({ items: [], total: 0 }),
        definition: () => ({ operationId: "test.read", inputSchema: { type: "object" }, outputSchema: {} }),
        invalidateEntitlements: vi.fn(),
      },
      executor: { query: async (operationId: string, input: unknown) => ({ operationId, success: true, summary: "ok", data: input }) },
      changes: {
        prepare: vi.fn(async () => plan),
        commit: vi.fn(async () => ({ operationId: "test.write", success: true, summary: "feito" })),
        cancel: vi.fn(() => ({ cancelled: true })),
      },
      jobs: { get: () => ({ jobId: "22222222-2222-4222-8222-222222222222", status: "completed" }) },
      documents: { read: vi.fn() },
      versionGuard: { invalidate: vi.fn() },
    };
    const server = createServer(services as never);
    const client = new Client({ name: "mcp-test", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const listed = await client.listTools();
      expect(listed.tools.map((item) => item.name)).toEqual(expect.arrayContaining([
        "gestta_onvio_auth_status",
        "gestta_onvio_capabilities",
        "gestta_onvio_query",
        "gestta_onvio_prepare",
        "gestta_onvio_commit",
        "gestta_onvio_cancel",
        "gestta_onvio_job_status",
      ]));

      const status = await client.callTool({ name: "gestta_onvio_auth_status", arguments: {} });
      expect(status.isError).not.toBe(true);
      expect(status.structuredContent).toMatchObject({ authenticated: false });

      const query = await client.callTool({ name: "gestta_onvio_query", arguments: { operationId: "test.read", input: { id: "1" } } });
      expect(query.structuredContent).toMatchObject({ success: true, data: { id: "1" } });

      const prepared = await client.callTool({ name: "gestta_onvio_prepare", arguments: { operationId: "test.write", input: { id: "1" } } });
      expect(prepared.structuredContent).toMatchObject({ planId: plan.planId });
      const committed = await client.callTool({ name: "gestta_onvio_commit", arguments: { planId: plan.planId, confirmationToken: plan.confirmationToken } });
      expect(committed.structuredContent).toMatchObject({ success: true });
      const cancelled = await client.callTool({ name: "gestta_onvio_cancel", arguments: { planId: plan.planId } });
      expect(cancelled.structuredContent).toMatchObject({ cancelled: true });

      const resource = await client.readResource({ uri: "gestta-onvio://schemas/test.read" });
      expect(resource.contents[0]).toMatchObject({ mimeType: "application/json" });
      expect(JSON.parse((resource.contents[0] as { text: string }).text)).toMatchObject({ operationId: "test.read" });
    } finally {
      await client.close();
      await server.close();
    }
  });
});
