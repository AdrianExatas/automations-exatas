import { describe, expect, it, vi } from "vitest";
import { ChangeEngine } from "../src/operations/change-engine.js";
import type { RuntimeCapability } from "../src/types.js";
import { testConfig } from "./helpers.js";

const capability: RuntimeCapability = {
  operationId: "test.write",
  title: "Alterar teste",
  description: "teste",
  product: "gestta",
  domain: "test",
  kind: "write",
  status: "verified",
  risk: "destructive",
  idempotent: false,
  transport: "api",
  inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
  evidence: { source: "test", verifiedAt: "2026-08-03" },
  available: true,
};

describe("prepare/commit", () => {
  it("usa token temporário uma única vez e controla idempotência", async () => {
    const write = vi.fn(async () => ({ operationId: "test.write", success: true, summary: "ok" }));
    const catalog = { runtime: async () => capability, definition: () => capability };
    const audit = { write: vi.fn() };
    const engine = new ChangeEngine(testConfig(process.cwd()), catalog as never, { write, query: vi.fn() } as never, audit as never);
    const plan = await engine.prepare("test.write", { id: "1" }, "idempotency-1");
    const duplicatePlan = await engine.prepare("test.write", { id: "1" }, "idempotency-1");
    expect(plan.warnings.join(" ")).toMatch(/excluir|desvincular/i);
    await expect(engine.commit(plan.planId, "token-errado-com-tamanho-suficiente")).rejects.toThrow(/inválido/i);
    await expect(engine.commit(plan.planId, plan.confirmationToken)).resolves.toMatchObject({ success: true });
    await expect(engine.commit(duplicatePlan.planId, duplicatePlan.confirmationToken)).resolves.toMatchObject({ success: true });
    await expect(engine.commit(plan.planId, plan.confirmationToken)).rejects.toThrow(/utilizado/i);
    await expect(engine.prepare("test.write", { id: "1" }, "idempotency-1")).rejects.toThrow(/idempotência/i);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("expira o plano", async () => {
    vi.useFakeTimers();
    try {
      const catalog = { runtime: async () => capability, definition: () => capability };
      const engine = new ChangeEngine(testConfig(process.cwd()), catalog as never, { write: vi.fn(), query: vi.fn() } as never, { write: vi.fn() } as never);
      const plan = await engine.prepare("test.write", { id: "1" });
      vi.advanceTimersByTime(901_000);
      await expect(engine.commit(plan.planId, plan.confirmationToken)).rejects.toThrow(/expirado/i);
    } finally {
      vi.useRealTimers();
    }
  });
});
