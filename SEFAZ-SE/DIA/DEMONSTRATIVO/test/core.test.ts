import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { parseCompetencia, previousMonthCompetencia } from "../src/dates";
import { buildCompanyLabel, sanitizePathPart } from "../src/downloads";
import { buildRunConfig, buildXmlDownloadConfig } from "../src/electron/request-builders";
import { isNonRetriablePortalError } from "../src/errors";
import { buildDetailRows, buildSummaryRows } from "../src/excel-report";
import { HttpClient } from "../src/http-client";
import {
  extractDemonstrativoLink,
  extractExcelDownloaderPath,
  extractPdfPath,
  parseCompanies,
} from "../src/parser";
import { isPlaywrightFallbackEnabled, shouldSaveCheckpoint } from "../src/runner";
import { isPdf, isXls } from "../src/signatures";
import { inferXmlType, parseSiegXmlResponse, SiegXmlClient } from "../src/sieg-client";
import { extractAccessKeysFromWorkbook, findDiaXlsReports, saveXmlReports, shouldSaveXmlCheckpoint } from "../src/xml-downloads";
import { getSefazLoginFailureMessage, isSefazLoginConfirmed } from "../../shared/sefaz-playwright-login";

describe("competencia", () => {
  test("calcula mes anterior comum", () => {
    expect(previousMonthCompetencia(new Date("2026-04-22T12:00:00Z")).value).toBe("2026-03");
  });

  test("calcula janeiro como dezembro do ano anterior", () => {
    expect(previousMonthCompetencia(new Date("2026-01-10T12:00:00Z")).value).toBe("2025-12");
  });

  test("parse YYYY-MM", () => {
    expect(parseCompetencia("2026-03")).toEqual({
      year: 2026,
      month: 3,
      value: "2026-03",
      monthSelectValue: "03",
    });
  });
});

describe("parsers", () => {
  test("extrai link do demonstrativo", () => {
    const html = `<a class="menuitens" href="process.jsp?AppName=SIT&amp;TransId=T34693&amp;token=abc">Demonstrativo ICMS Antecipado</a>`;
    expect(extractDemonstrativoLink(html)).toBe("process.jsp?AppName=SIT&TransId=T34693&token=abc");
  });

  test("extrai empresas do select", () => {
    const html = `
      <select id="cdPessoaLookup">
        <option value=""></option>
        <option value="271803444">271803444 - A CASA DO LAR LTDA</option>
        <option value="272333875">272333875 - EXATAS CONTABILIDADE LTDA</option>
      </select>`;

    expect(parseCompanies(html)).toEqual([
      { inscricao: "271803444", nome: "A CASA DO LAR LTDA" },
      { inscricao: "272333875", nome: "EXATAS CONTABILIDADE LTDA" },
    ]);
  });

  test("extrai URL do downloader Excel", () => {
    const html = `<script>function navigate(){window.location='/iBusinessPortal/jsp/templates/FileTransfer/Downloader.jsp?Arquivo=//server/Extrato.xls';}</script>`;
    expect(extractExcelDownloaderPath(html)).toBe("/iBusinessPortal/jsp/templates/FileTransfer/Downloader.jsp?Arquivo=//server/Extrato.xls");
  });

  test("extrai URL do Jasper PDF", () => {
    const html = `<script>window.open('/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?AppName=SIT&TransId=T34693', 'popup');</script>`;
    expect(extractPdfPath(html)).toBe("/iBusinessPortal/jsp/templates/Pdf/JasperPDF.jsp?AppName=SIT&TransId=T34693");
  });
});

describe("assinaturas", () => {
  test("valida PDF", () => {
    expect(isPdf(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
  });

  test("valida XLS OLE", () => {
    expect(isXls(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))).toBe(true);
  });
});

describe("http client", () => {
  test("segue redirect e preserva cookies", async () => {
    const server = Bun.serve({
      port: 0,
      fetch(request) {
        const url = new URL(request.url);
        if (url.pathname === "/set") {
          return new Response("set", { headers: { "set-cookie": "sid=abc; Path=/" } });
        }
        if (url.pathname === "/redirect") {
          return new Response("", { status: 302, headers: { location: "/echo" } });
        }
        if (url.pathname === "/echo") {
          return new Response(request.headers.get("cookie") ?? "");
        }
        return new Response("not found", { status: 404 });
      },
    });

    try {
      const client = new HttpClient(String(server.url), 500);
      await client.get("/set");
      const result = await client.get("/redirect");
      expect(decodeBytes(result.bytes)).toBe("sid=abc");
      expect(result.status).toBe(200);
    } finally {
      await server.stop(true);
    }
  });

  test("falha explicitamente em HTTP nao 2xx", async () => {
    const server = Bun.serve({
      port: 0,
      fetch: () => new Response("falha do portal", { status: 500 }),
    });

    try {
      const client = new HttpClient(String(server.url), 500);
      await expect(client.get("/erro")).rejects.toThrow("HTTP 500");
      await expect(client.get("/erro")).rejects.toThrow("falha do portal");
    } finally {
      await server.stop(true);
    }
  });

  test("respeita timeout e abort externo", async () => {
    const server = Bun.serve({
      port: 0,
      async fetch() {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return new Response("lento");
      },
    });

    try {
      const client = new HttpClient(String(server.url), 5);
      await expect(client.get("/lento")).rejects.toThrow("Timeout");

      const controller = new AbortController();
      controller.abort();
      await expect(client.get("/lento", undefined, controller.signal)).rejects.toThrow("Execucao cancelada");
    } finally {
      await server.stop(true);
    }
  });
});

describe("downloads", () => {
  test("monta rotulo com inscricao e nome da empresa", () => {
    expect(buildCompanyLabel({ inscricao: "271803444", nome: "A CASA DO LAR LTDA" })).toBe("271803444 - A CASA DO LAR LTDA");
  });

  test("sanitiza caracteres invalidos em caminhos Windows", () => {
    expect(sanitizePathPart('A/B:C*D?E"F<G>H| LTDA.')).toBe("A - B - C - D - E - F - G - H - LTDA");
  });
});

describe("erros", () => {
  test("classifica ausencia de dados como erro sem fallback", () => {
    expect(
      isNonRetriablePortalError(
        new Error("Sem dados para gerar o relatório, possivelmente as notas do contribuinte tiveram sua referência adiada!"),
      ),
    ).toBe(true);
  });

  test("nao classifica falha tecnica como erro sem fallback", () => {
    expect(isNonRetriablePortalError(new Error("Resposta do Jasper nao contem um PDF valido."))).toBe(false);
  });
});

describe("relatorio excel", () => {
  test("monta resumo por formato", () => {
    const config = {
      competencia: { value: "2026-03", year: 2026, month: 3, monthSelectValue: "03" },
      formats: ["pdf", "xls"],
    } as const;
    const rows = buildSummaryRows(config as never, [
      { competencia: "2026-03", inscricao: "1", empresa: "A", formato: "pdf", status: "sucesso", via: "http", path: "a.pdf" },
      { competencia: "2026-03", inscricao: "1", empresa: "A", formato: "xls", status: "erro", via: "http", mensagem: "sem dados" },
    ]);

    expect(rows).toEqual([
      { Competencia: "2026-03", Formato: "PDF", Sucessos: 1, Erros: 0, Total: 1 },
      { Competencia: "2026-03", Formato: "XLS", Sucessos: 0, Erros: 1, Total: 1 },
    ]);
  });

  test("monta linhas detalhadas", () => {
    expect(
      buildDetailRows([
        { competencia: "2026-03", inscricao: "271803444", empresa: "A CASA DO LAR LTDA", formato: "pdf", status: "sucesso", via: "http", path: "file.pdf" },
      ]),
    ).toEqual([
      {
        Ordem: 1,
        Competencia: "2026-03",
        Inscricao: "271803444",
        Empresa: "A CASA DO LAR LTDA",
        Formato: "PDF",
        Status: "sucesso",
        Via: "http",
        Arquivo: "file.pdf",
        Mensagem: "",
      },
    ]);
  });
});

describe("electron request builders", () => {
  test("valida e normaliza request de DIA", () => {
    const config = buildRunConfig({
      user: " usuario ",
      password: "senha",
      rememberCredentials: false,
      competencia: "2026-03",
      formats: ["pdf", "xls", "zip" as never],
      outDir: " saida ",
    });

    expect(config.user).toBe("usuario");
    expect(config.formats).toEqual(["pdf", "xls"]);
    expect(config.outDir).toBe("saida");
    expect(config.competencia.value).toBe("2026-03");
  });

  test("valida request de XML e aceita chave SIEG explicita", () => {
    const config = buildXmlDownloadConfig({
      competencia: "2026-03",
      outDir: " saida ",
      siegApiKey: " token ",
    });

    expect(config.outDir).toBe("saida");
    expect(config.threads).toBe(8);
    expect(config.apiKey).toBe("token");
    expect(config.timeoutMs).toBe(90_000);
    expect(config.retryCount).toBe(2);
    expect(config.retryDelayMs).toBe(1_000);
  });

  test("request de XML permite sobrescrever threads", () => {
    const config = buildXmlDownloadConfig({
      competencia: "2026-03",
      outDir: " saida ",
      threads: 2,
    });

    expect(config.threads).toBe(2);
  });
});

describe("politicas de execucao", () => {
  test("fallback Playwright fica explicito por configuracao headless", () => {
    const baseConfig = {
      user: "u",
      password: "p",
      competencia: parseCompetencia("2026-03"),
      formats: ["pdf"],
      outDir: "out",
      timeoutMs: 1000,
    } as const;

    expect(isPlaywrightFallbackEnabled(baseConfig as never)).toBe(false);
    expect(isPlaywrightFallbackEnabled({ ...baseConfig, headless: true } as never)).toBe(true);
  });

  test("checkpoints mantem inicio, intervalos e final", () => {
    expect(shouldSaveCheckpoint(1, 12)).toBe(true);
    expect(shouldSaveCheckpoint(2, 12)).toBe(false);
    expect(shouldSaveCheckpoint(5, 12)).toBe(true);
    expect(shouldSaveCheckpoint(12, 12)).toBe(true);
    expect(shouldSaveXmlCheckpoint(10, 25)).toBe(true);
  });
});

describe("login SEFAZ Playwright compartilhado", () => {
  test("detecta erro retornado pelo portal", () => {
    expect(getSefazLoginFailureMessage("https://security.sefaz.se.gov.br/internet/erroLogin.jsp", "")).toBe(
      "Login nao confirmado no portal SEFAZ-SE.",
    );
    expect(getSefazLoginFailureMessage("https://security.sefaz.se.gov.br/internet/login/login.jsp", "Usuario invalido")).toContain(
      "invalido",
    );
  });

  test("confirma login por URL do portal ou menu DIA", () => {
    expect(isSefazLoginConfirmed("https://security.sefaz.se.gov.br/internet/portal.jsp", "")).toBe(true);
    expect(isSefazLoginConfirmed("https://security.sefaz.se.gov.br/internet/home.jsp", "Menu DIA")).toBe(true);
    expect(isSefazLoginConfirmed("https://security.sefaz.se.gov.br/internet/login/login.jsp", "Login")).toBe(false);
  });
});

describe("sieg xml", () => {
  const chaveNfe = "23260307199805000155550010006489721116133757";
  const chaveCte = "35250112345678000123570010000000011000000010";
  const chaveNfce = "35250112345678000123650010000000011000000010";

  test("infere xmlType pelo modelo da chave", () => {
    expect(inferXmlType(chaveNfe)).toBe(1);
    expect(inferXmlType(chaveCte)).toBe(2);
    expect(inferXmlType(chaveNfce)).toBe(4);
    expect(() => inferXmlType("35250112345678000123670010000000011000000010")).toThrow("Documento modelo 67 nao suportado");
  });

  test("interpreta respostas aceitas pela API SIEG", () => {
    expect(parseSiegXmlResponse("<nfeProc />")).toBe("<nfeProc />");
    expect(parseSiegXmlResponse(JSON.stringify("<nfeProc />"))).toBe("<nfeProc />");
    expect(parseSiegXmlResponse(JSON.stringify({ Codigo: "<nfeProc />" }))).toBe("<nfeProc />");
    expect(parseSiegXmlResponse(JSON.stringify({ Mensagens: ["<nfeProc />"] }))).toBe("<nfeProc />");
    expect(parseSiegXmlResponse(JSON.stringify({ Codigo: "sem xml" }))).toBeUndefined();
  });

  test("faz retry em falha recuperavel", async () => {
    const chamadas: string[] = [];
    const fetchImpl = ((url: RequestInfo | URL) => {
      chamadas.push(String(url));
      if (chamadas.length === 1) {
        return Promise.resolve(new Response("temporario", { status: 503 }));
      }
      return Promise.resolve(new Response("<nfeProc />", { status: 200 }));
    }) as typeof fetch;

    const client = new SiegXmlClient({ apiKey: "token", fetchImpl, retryDelayMs: 0 });
    await expect(client.downloadXml(chaveNfe)).resolves.toBe("<nfeProc />");
    expect(chamadas).toHaveLength(2);
    expect(chamadas[0]).toContain("xmlType=1");
    expect(chamadas[0]).toContain("api_key=token");
  });

  test("permite configurar tentativas e informa tentativa sem expor chave da API", async () => {
    const chamadas: string[] = [];
    const tentativas: Array<{ attempt: number; total: number; timeoutMs: number; xmlType: number; chave: string }> = [];
    const fetchImpl = ((url: RequestInfo | URL) => {
      chamadas.push(String(url));
      return Promise.resolve(new Response("temporario", { status: 503 }));
    }) as typeof fetch;

    const client = new SiegXmlClient({ apiKey: "token-secreto", fetchImpl, retryCount: 2, retryDelayMs: 0, timeoutMs: 90_000 });

    await expect(
      client.downloadXml(chaveNfe, undefined, {
        onAttempt: (attempt) => tentativas.push(attempt),
      }),
    ).rejects.toThrow("HTTP 503");

    expect(chamadas).toHaveLength(2);
    expect(tentativas).toEqual([
      { chave: chaveNfe, xmlType: 1, attempt: 1, total: 2, timeoutMs: 90_000 },
      { chave: chaveNfe, xmlType: 1, attempt: 2, total: 2, timeoutMs: 90_000 },
    ]);
    expect(JSON.stringify(tentativas)).not.toContain("token-secreto");
  });

  test("extrai chaves do XLS e localiza relatorios por empresa", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "dia-xml-"));
    try {
      const competencia = parseCompetencia("2026-03");
      const companyDir = path.join(temp, competencia.value, "270599290 - PANIFICAO 3 IRMOS KATUTA LTDA");
      const xlsPath = path.join(companyDir, "270599290 - PANIFICAO 3 IRMOS KATUTA LTDA_2026-03_dia.xls");
      await writeWorkbook(xlsPath, [["Chave de Acesso"], [chaveNfe], [chaveNfe]]);

      expect(extractAccessKeysFromWorkbook(xlsPath)).toEqual([chaveNfe]);
      const reports = await findDiaXlsReports({ competencia, outDir: temp });
      expect(reports).toHaveLength(1);
      expect(reports[0]?.company).toEqual({ inscricao: "270599290", nome: "PANIFICAO 3 IRMOS KATUTA LTDA" });
      expect(reports[0]?.chaves).toEqual([chaveNfe]);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });

  test("gera relatorio XML", async () => {
    const temp = await mkdtemp(path.join(tmpdir(), "dia-xml-report-"));
    try {
      const competencia = parseCompetencia("2026-03");
      const paths = await saveXmlReports(
        { competencia, outDir: temp, apiKey: "token" },
        [
          {
            competencia: competencia.value,
            inscricao: "270599290",
            empresa: "PANIFICACAO",
            xlsPath: "relatorio.xls",
            chave: chaveNfe,
            status: "sucesso",
            path: "XML/chave.xml",
          },
        ],
      );
      expect(paths.jsonPath.endsWith(path.join("2026-03", "relatorio-xml.json"))).toBe(true);
      expect(paths.excelPath.endsWith(path.join("2026-03", "relatorio-xml.xlsx"))).toBe(true);
      const workbook = XLSX.readFile(paths.excelPath);
      expect(workbook.SheetNames).toEqual(["Resumo", "XMLs"]);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});

async function writeWorkbook(filePath: string, rows: unknown[][]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "DIA");
  XLSX.writeFile(workbook, filePath);
}

function decodeBytes(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
