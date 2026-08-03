import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DocumentResources } from "../src/resources/documents.js";
import { JobStore } from "../src/operations/job-store.js";
import { testConfig } from "./helpers.js";

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

describe("documentos e jobs", () => {
  it("retorna documento pequeno como blob e grande somente em MCP_OUTPUT_DIR", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-docs-"));
    dirs.push(root);
    const config = { ...testConfig(root), maxDocumentBytes: 3 };
    const firm = { resolve: async () => "firm" };
    const catalog = { runtime: async () => ({ status: "verified", available: true }) };
    const smallClient = { request: async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "application/pdf", contentLength: 3, fileName: "a.pdf" }) };
    const small = await new DocumentResources(config, smallClient as never, firm as never, catalog as never).read(new URL("gestta-onvio://documents/onvio/f/d"), "onvio", "f", "d");
    expect(small).toMatchObject({ mimeType: "application/pdf", blob: "AQID" });

    const largeClient = { request: async () => ({ bytes: new Uint8Array([1, 2, 3, 4]), contentType: "application/pdf", contentLength: 4, fileName: "a.pdf" }) };
    const resources = new DocumentResources(config, largeClient as never, firm as never, catalog as never);
    const first = await resources.read(new URL("gestta-onvio://documents/onvio/f/d"), "onvio", "f", "d");
    const second = await resources.read(new URL("gestta-onvio://documents/onvio/f/d"), "onvio", "f", "d");
    const firstMeta = JSON.parse(first.text || "{}") as { path: string };
    const secondMeta = JSON.parse(second.text || "{}") as { path: string };
    expect(firstMeta.path).not.toBe(secondMeta.path);
    expect(fs.readFileSync(firstMeta.path)).toEqual(Buffer.from([1, 2, 3, 4]));
    expect(path.dirname(firstMeta.path)).toBe(root);
  });

  it("mantém progresso e resultado de jobs", () => {
    const jobs = new JobStore();
    const created = jobs.create("test.operation");
    expect(created).toMatchObject({ status: "pending", progress: 0 });
    const completed = jobs.update(created.jobId, { status: "completed", progress: 100, result: { ok: true } });
    expect(jobs.get(created.jobId)).toEqual(completed);
  });
});
