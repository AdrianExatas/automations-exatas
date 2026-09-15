import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  classificarXmlSieg,
  extrairChaveAcesso,
  extrairTipoEvento,
  identificarTipoXml,
  obterTipoCompletoNota,
  obterXmlTypeSieg,
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

const xmlValido2 = xmlValido.replaceAll(
  "35260112345678000123550010000000011000000019",
  "35260112345678000123550010000000021000000020",
);

const xmlNfceValido = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35260112345678000123650010000000011000000010">
      <ide><mod>65</mod></ide>
    </infNFe>
  </NFe>
  <protNFe><infProt><chNFe>35260112345678000123650010000000011000000010</chNFe></infProt></protNFe>
</nfeProc>`;

const chaveEventoNfce = "28260551030248000136650010001048471291644425";
const xmlEventoNfce = `<?xml version="1.0" encoding="UTF-8"?>
<procEventoNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <evento versao="1.00">
    <infEvento Id="ID1101112826055103024800013665001000104847129164442501">
      <chNFe>${chaveEventoNfce}</chNFe>
      <tpEvento>110111</tpEvento>
    </infEvento>
  </evento>
  <retEvento versao="1.00">
    <infEvento>
      <chNFe>${chaveEventoNfce}</chNFe>
      <tpEvento>110111</tpEvento>
    </infEvento>
  </retEvento>
</procEventoNFe>`;

const xmlInutilizacaoNfce = `<?xml version="1.0" encoding="UTF-8"?>
<procInutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
  <inutNFe versao="4.00">
    <infInut Id="ID28260727333900010065001000072219000072219">
      <cUF>28</cUF>
      <ano>26</ano>
      <CNPJ>07273339000100</CNPJ>
      <mod>65</mod>
      <serie>1</serie>
      <nNFIni>72219</nNFIni>
      <nNFFin>72219</nNFFin>
    </infInut>
  </inutNFe>
  <retInutNFe versao="4.00">
    <infInut>
      <cStat>102</cStat>
      <xMotivo>Inutilizacao de numero homologado</xMotivo>
    </infInut>
  </retInutNFe>
</procInutNFe>`;

const chaveCte = "28260641862972000172570010000001701100001709";
const xmlCteValido = `<?xml version="1.0" encoding="UTF-8"?>
<cteProc xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00">
  <CTe>
    <infCte Id="CTe${chaveCte}" versao="4.00">
      <ide><mod>57</mod></ide>
    </infCte>
  </CTe>
  <protCTe versao="4.00">
    <infProt><chCTe>${chaveCte}</chCTe></infProt>
  </protCTe>
</cteProc>`;

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
    expect(obterXmlTypeSieg(xmlValido)).toBe(1);
    expect(identificarTipoXml(xmlNfceValido)).toBe("NFCe");
    expect(obterTipoCompletoNota(xmlNfceValido)).toBe("NFC-e");
    expect(obterXmlTypeSieg(xmlNfceValido)).toBe(4);
  });

  it("classifica evento, inutilizacao e CT-e com metadados corretos", () => {
    expect(classificarXmlSieg(xmlEventoNfce)).toBe("evento");
    expect(extrairChaveAcesso(xmlEventoNfce)).toBe(chaveEventoNfce);
    expect(extrairTipoEvento(xmlEventoNfce)).toBe(110111);
    expect(identificarTipoXml(xmlEventoNfce)).toBe("NFCe");
    expect(obterTipoCompletoNota(xmlEventoNfce)).toBe("Evento NFC-e");
    expect(obterXmlTypeSieg(xmlEventoNfce)).toBe(4);

    expect(classificarXmlSieg(xmlInutilizacaoNfce)).toBe("inutilizacao");
    expect(extrairChaveAcesso(xmlInutilizacaoNfce)).toBeUndefined();
    expect(identificarTipoXml(xmlInutilizacaoNfce)).toBe("NFCe");
    expect(obterTipoCompletoNota(xmlInutilizacaoNfce)).toBe("Inutilizacao NFC-e");
    expect(obterXmlTypeSieg(xmlInutilizacaoNfce)).toBe(4);

    expect(classificarXmlSieg(xmlCteValido)).toBe("documento");
    expect(extrairChaveAcesso(xmlCteValido)).toBe(chaveCte);
    expect(identificarTipoXml(xmlCteValido)).toBe("CTe");
    expect(obterTipoCompletoNota(xmlCteValido)).toBe("CTe");
    expect(obterXmlTypeSieg(xmlCteValido)).toBe(2);
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

    expect(resultado).toMatchObject({ total: 1, enviados: 1, erros: 0, confirmadosSieg: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(existsSync(xmlPath)).toBe(true);
  });

  it("exclui XML valido apos confirmacao final no SIEG", async () => {
    process.env.SIEG_API_KEY = "teste";
    const fetchMock = mock(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "nota.xml");
    writeFileSync(xmlPath, xmlValido, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: true, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 1, enviados: 1, erros: 0, confirmadosSieg: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(existsSync(xmlPath)).toBe(false);
  });

  it("valida no SIEG somente depois de enviar todos os XMLs", async () => {
    process.env.SIEG_API_KEY = "teste";
    const chamadas: string[] = [];
    const fetchMock = mock(async (url) => {
      const urlText = String(url);
      chamadas.push(urlText.includes("EnviarXml") ? "upload" : "verificacao");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    writeFileSync(join(tempDir, "xmls", "nota1.xml"), xmlValido, "utf8");
    writeFileSync(join(tempDir, "xmls", "nota2.xml"), xmlValido2, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: false, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 2, enviados: 2, erros: 0, confirmadosSieg: 2 });
    expect(chamadas).toEqual(["upload", "upload", "verificacao", "verificacao"]);
  });

  it("valida no SIEG com xmlType correto e chave em JSON", async () => {
    process.env.SIEG_API_KEY = "teste";
    const chamadas: Array<{ url: string; body?: string; contentType: string | null }> = [];
    const fetchMock = mock(async (url, init) => {
      chamadas.push({
        url: String(url),
        body: typeof init?.body === "string" ? init.body : undefined,
        contentType: new Headers(init?.headers).get("Content-Type"),
      });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    writeFileSync(join(tempDir, "xmls", "nfe.xml"), xmlValido, "utf8");
    writeFileSync(join(tempDir, "xmls", "nfce.xml"), xmlNfceValido, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: false, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 2, enviados: 2, erros: 0, confirmadosSieg: 2 });
    const verificacoes = chamadas.filter((chamada) => chamada.url.includes("BaixarXml"));
    expect(verificacoes).toHaveLength(2);
    expect(verificacoes.map((chamada) => new URL(chamada.url).searchParams.get("xmlType")).sort()).toEqual(["1", "4"]);
    expect(verificacoes.map((chamada) => chamada.contentType)).toEqual(["application/json", "application/json"]);
    expect(verificacoes.map((chamada) => chamada.body).sort()).toEqual([
      JSON.stringify("35260112345678000123550010000000011000000019"),
      JSON.stringify("35260112345678000123650010000000011000000010"),
    ].sort());
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

  it("confirma evento NFC-e no SIEG por BaixarEventos e exclui", async () => {
    process.env.SIEG_API_KEY = "teste";
    const chamadas: Array<{ url: string; body?: string; contentType: string | null }> = [];
    const fetchMock = mock(async (url, init) => {
      const urlText = String(url);
      chamadas.push({
        url: urlText,
        body: typeof init?.body === "string" ? init.body : undefined,
        contentType: new Headers(init?.headers).get("Content-Type"),
      });
      if (urlText.includes("BaixarEventos")) {
        return new Response(JSON.stringify(["PD94bWw="]), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "evento.xml");
    writeFileSync(xmlPath, xmlEventoNfce, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: true, numThreads: 1 });

    expect(resultado).toMatchObject({
      total: 1,
      enviados: 1,
      erros: 0,
      confirmadosSieg: 0,
      eventosConfirmadosSieg: 1,
      naoConfirmadosSieg: 0,
    });
    const verificacaoEvento = chamadas.find((chamada) => chamada.url.includes("BaixarEventos"));
    expect(verificacaoEvento).toBeDefined();
    expect(verificacaoEvento?.contentType).toBe("application/json");
    expect(JSON.parse(verificacaoEvento?.body ?? "{}")).toEqual({
      ChaveXml: chaveEventoNfce,
      TipoXml: 4,
      TipoEvento: 110111,
      Skip: 0,
      Take: 1,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(existsSync(xmlPath)).toBe(false);
  });

  it("confirma CT-e com chCTe e xmlType 2", async () => {
    process.env.SIEG_API_KEY = "teste";
    const chamadas: Array<{ url: string; body?: string }> = [];
    const fetchMock = mock(async (url, init) => {
      chamadas.push({ url: String(url), body: typeof init?.body === "string" ? init.body : undefined });
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "cte.xml");
    writeFileSync(xmlPath, xmlCteValido, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: true, numThreads: 1 });

    expect(resultado).toMatchObject({ total: 1, enviados: 1, erros: 0, confirmadosSieg: 1 });
    const verificacao = chamadas.find((chamada) => chamada.url.includes("BaixarXml"));
    expect(verificacao).toBeDefined();
    expect(new URL(verificacao?.url ?? "").searchParams.get("xmlType")).toBe("2");
    expect(verificacao?.body).toBe(JSON.stringify(chaveCte));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(existsSync(xmlPath)).toBe(false);
  });

  it("exclui inutilizacao aceita no upload sem chamada de validacao final", async () => {
    process.env.SIEG_API_KEY = "teste";
    const fetchMock = mock(async () => new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    mkdirSync(join(tempDir, "xmls"), { recursive: true });
    const xmlPath = join(tempDir, "xmls", "inut.xml");
    writeFileSync(xmlPath, xmlInutilizacaoNfce, "utf8");

    const { enviarAutomatico } = await import("../src-ts/upload/uploader.js");
    const resultado = await enviarAutomatico({ pasta: tempDir, excluirEnviados: true, numThreads: 1 });

    expect(resultado).toMatchObject({
      total: 1,
      enviados: 1,
      erros: 0,
      confirmadosSieg: 0,
      semValidacaoFinalSieg: 1,
      naoConfirmadosSieg: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(existsSync(xmlPath)).toBe(false);
  });
});
