import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { redact, safeError } from "../src/security/redact.js";
import { resolveAllowedInput, resolveAllowedOutput } from "../src/security/paths.js";
import { AuditLogger } from "../src/security/audit.js";
import { testConfig } from "./helpers.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("proteção de segredos e caminhos", () => {
  it("redige tokens, senhas e erros", () => {
    const result = redact({ password: "abc", nested: { Authorization: "JWT ey.secret" }, note: "UDSLongToken value" });
    expect(result).toEqual({ password: "<redacted>", nested: { Authorization: "<redacted>" }, note: "UDSLongToken <redacted>" });
    expect(safeError(new Error("Authorization: JWT abc.def"))).not.toContain("abc.def");
  });

  it("aceita somente arquivos dentro das raízes permitidas", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-paths-"));
    tempDirs.push(root);
    const file = path.join(root, "entrada.xlsx");
    fs.writeFileSync(file, "ok");
    expect(resolveAllowedInput(file, [root])).toBe(file);
    expect(() => resolveAllowedInput(path.join(root, "..", "fora.xlsx"), [root])).toThrow(/fora/i);
    expect(resolveAllowedOutput("relatorio.pdf", root)).toBe(path.join(root, "relatorio.pdf"));
    expect(() => resolveAllowedOutput("../escape.pdf", root)).toThrow(/fora/i);
  });

  it("não grava segredos na auditoria", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-audit-"));
    tempDirs.push(root);
    const config = testConfig(root);
    const audit = new AuditLogger(config);
    audit.write({ authorization: "JWT secret-value", nested: { password: "secret-password" }, message: "UDSLongToken secret-token" });
    const log = fs.readFileSync(path.join(root, `${new Date().toISOString().slice(0, 10)}.jsonl`), "utf8");
    expect(log).not.toContain("secret-value");
    expect(log).not.toContain("secret-password");
    expect(log).not.toContain("secret-token");
    expect(log).toContain("<redacted>");
  });
});
