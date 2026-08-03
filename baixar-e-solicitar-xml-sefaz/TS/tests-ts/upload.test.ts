import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  extrairChaveAcesso,
  identificarTipoXml,
  obterTipoCompletoNota,
  validarXml,
} from "../src-ts/upload/utils.js";

const xmlValido = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260112345678000123550010000000011000000019">
      <ide><mod>55</mod></ide>
    </infNFe>
  </NFe>
  <protNFe><infProt><chNFe>35260112345678000123550010000000011000000019</chNFe></infProt></protNFe>
</nfeProc>`;

let tempDir: string;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "sefaz-upload-"));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
  globalThis.fetch = originalFetch;
  delete process.env.SIEG_API_KEY;
});

describe("upload utils", () => {
  it("valida XML e identifica chave/tipo", () => {
    expect(validarXml(xmlValido)).toBe(true);
    expect(extrairChaveAcesso(xmlValido)).toBe("35260112345678000123550010000000011000000019");
    expect(identificarTipoXml(xmlValido)).toBe("NFe");
    expect(obterTipoCompletoNota(xmlValido)).toBe("NF-e");
  });
});

describe("uploader", () => {
  it("envia XML valido sem excluir quando --manter é usado", async () => {
    process.env.SIEG_API_KEY = "teste";
    const fetchMock = mock(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "nota.xml");
    writeFileSync(xmlPath, xmlValido, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: false, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 1, enviados: 1, erros: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(existsSync(xmlPath)).toBe(true);
  });

  it("exclui XML valido logo apos envio bem-sucedido", async () => {
    process.env.SIEG_API_KEY = "teste";
    const fetchMock = mock(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "nota.xml");
    writeFileSync(xmlPath, xmlValido, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: true, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 1, enviados: 1, erros: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(existsSync(xmlPath)).toBe(false);
  });

  it("nao exclui XML quando o envio falha", async () => {
    process.env.SIEG_API_KEY = "teste";
    const fetchMock = mock(async () => new Response(JSON.stringify({ erro: "xml rejeitado" }), { status: 400, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "nota.xml");
    writeFileSync(xmlPath, xmlValido, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: true, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 1, enviados: 0, erros: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(existsSync(xmlPath)).toBe(true);
  });
});
