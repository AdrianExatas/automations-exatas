import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadConfig } from "../src/config.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("configuracao", () => {
  test("carrega obrigatorias e aplica padroes", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "dte-config-"));
    tempDirs.push(dir);
    const pfx = path.join(dir, "cert.pfx");
    await writeFile(pfx, "fixture");

    const config = await loadConfig({
      CERT_PFX_PATH: pfx,
      CERT_PASSWORD: "segredo-local",
      PROCURADOR_CNPJ: "11.222.333/0001-81",
    });

    expect(config.procuratorCnpj).toBe("11222333000181");
    expect(config.captchaTimeoutMs).toBe(300_000);
    expect(config.requestDelayMs).toBe(250);
    expect(config.browserMode).toBe("cdp");
  });

  test("rejeita variavel ausente", async () => {
    await expect(loadConfig({})).rejects.toThrow("CERT_PFX_PATH");
  });

  test("rejeita modo de navegador desconhecido", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "dte-config-"));
    tempDirs.push(dir);
    const pfx = path.join(dir, "cert.pfx");
    await writeFile(pfx, "fixture");
    await expect(
      loadConfig({
        CERT_PFX_PATH: pfx,
        CERT_PASSWORD: "segredo-local",
        PROCURADOR_CNPJ: "11222333000181",
        BROWSER_MODE: "desconhecido",
      }),
    ).rejects.toThrow("BROWSER_MODE");
  });
});
