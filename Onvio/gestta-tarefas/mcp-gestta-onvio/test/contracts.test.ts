import { describe, expect, it, vi } from "vitest";
import { CAPABILITIES } from "../src/catalog/definitions.js";
import { OperationExecutor } from "../src/operations/executor.js";
import type { JsonSchema, RuntimeCapability } from "../src/types.js";
import { testConfig } from "./helpers.js";

const SPECIAL = new Set([
  "unified.customer.resolve",
  "onvio.service_requests.create",
  "onvio.storage.document.upload",
  "onvio.storage.document.move",
  "onvio.storage.document.download",
]);

function sample(schema: JsonSchema, key: string): unknown {
  if (schema.enum?.length) return schema.enum[0];
  if (schema.type === "boolean") return false;
  if (schema.type === "integer" || schema.type === "number") return Math.max(1, schema.minimum || 1);
  if (schema.type === "array") return [sample(schema.items || { type: "string" }, key)];
  if (schema.type === "object") return Object.fromEntries((schema.required || []).map((child) => [child, sample(schema.properties?.[child] || {}, child)]));
  if (/start|end|date/i.test(key)) return "2026-08-03";
  return `${key}-value`;
}

function inputFor(schema: JsonSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const key of schema.required || []) result[key] = sample(schema.properties?.[key] || {}, key);
  if (schema.properties?.firmId) result.firmId = "firm-id";
  return result;
}

describe("contratos mockados do catálogo", () => {
  const capabilities = CAPABILITIES.filter((item) => item.status === "verified" && item.request && !SPECIAL.has(item.operationId));

  it.each(capabilities.map((item) => [item.operationId, item] as const))("%s preserva método, rota e normaliza a resposta", async (_id, definition) => {
    const request = vi.fn(async () => ({ items: [] }));
    const runtime = { ...definition, available: true } as RuntimeCapability;
    const catalog = { runtime: async () => runtime };
    const auth = { getOnvioToken: () => "<internal>" };
    const executor = new OperationExecutor(testConfig(process.cwd()), auth as never, { request } as never, catalog as never);
    executor.firms.resolve = async () => "firm-id";
    const input = inputFor(definition.inputSchema);
    const result = definition.kind === "read"
      ? await executor.query(definition.operationId, input)
      : await executor.write(definition.operationId, input);
    expect(result.success).toBe(true);
    expect(request).toHaveBeenCalled();
    const actual = request.mock.calls[0]?.[0] as { method: string; path: string; body?: unknown; query?: unknown };
    expect(actual.method).toBe(definition.request!.method);
    expect(actual.path).not.toMatch(/[{}]/);
    if (definition.request!.bodyMode === "input" || definition.request!.bodyMode === "search") expect(actual.body).toBeDefined();
    if (definition.request!.method === "GET") expect(actual.query).toBeDefined();
  });
});
