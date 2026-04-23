import { describe, expect, test } from "bun:test";
import { parseCompetencia, previousMonthCompetencia } from "../src/dates";
import { buildCompanyLabel, sanitizePathPart } from "../src/downloads";
import { isNonRetriablePortalError } from "../src/errors";
import { buildDetailRows, buildSummaryRows } from "../src/excel-report";
import {
  extractDemonstrativoLink,
  extractExcelDownloaderPath,
  extractPdfPath,
  parseCompanies,
} from "../src/parser";
import { isPdf, isXls } from "../src/signatures";

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
