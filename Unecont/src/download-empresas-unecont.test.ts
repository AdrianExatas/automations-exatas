import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { beforeEach, describe, expect, it, vi } from "vitest";

const launchBrowser = vi.fn();
const loginExecute = vi.fn();
const browserClose = vi.fn();
const requestPost = vi.fn();
const pageGoto = vi.fn();
const pageEvaluate = vi.fn();

vi.mock("./browser/launch", () => ({
  launchBrowser,
}));

vi.mock("./flows/login-flow", () => ({
  LoginFlow: class {
    execute = loginExecute;
  },
}));

function buildEmpresasWorkbookBuffer(): Buffer {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet([
    {
      "Cnpj Empresa": "11.111.111/0001-11",
      "Código": "001",
      "Razão Social": "Empresa A LTDA",
      "Ativo?": "Sim",
    },
  ]);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Empresas");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

function mockResponse(options: {
  ok?: boolean;
  status?: number;
  text?: string;
  body?: Buffer;
}) {
  return {
    ok: vi.fn().mockReturnValue(options.ok ?? true),
    status: vi.fn().mockReturnValue(options.status ?? 200),
    text: vi.fn().mockResolvedValue(options.text ?? ""),
    body: vi.fn().mockResolvedValue(options.body ?? Buffer.from("")),
  };
}

describe("downloadEmpresasUnecont", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pageGoto.mockResolvedValue(undefined);
    pageEvaluate.mockResolvedValue("request-token");
    loginExecute.mockResolvedValue(undefined);
    browserClose.mockResolvedValue(undefined);
    requestPost
      .mockResolvedValueOnce(mockResponse({ text: "{}" }))
      .mockResolvedValueOnce(mockResponse({ body: buildEmpresasWorkbookBuffer() }));
    launchBrowser.mockResolvedValue({
      browser: { close: browserClose },
      page: {
        goto: pageGoto,
        evaluate: pageEvaluate,
        context: () => ({
          request: {
            post: requestPost,
          },
        }),
      },
    });
  });

  it("baixa a base usando os endpoints autenticados do Unecont", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-empresas-"));
    const { downloadEmpresasUnecont } = await import("./download-empresas-unecont");

    const result = await downloadEmpresasUnecont({
      credentials: { email: "teste@example.com", senha: "123" },
      outputDir: tempDir,
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
      reportName: "UneCont - Empresas - EXATAS CONTABILIDADE - 2026-07-02.xlsx",
    });

    expect(pageGoto).toHaveBeenCalledWith(
      "https://app.unecont.com/Contador/Empresas/Default.aspx",
      expect.objectContaining({ waitUntil: "domcontentloaded" }),
    );
    expect(requestPost).toHaveBeenNthCalledWith(
      1,
      "https://app.unecont.com/Contador/Empresas/Default.aspx/BaixaRelatorioExcelListagemEmpresa",
      expect.objectContaining({
        headers: expect.objectContaining({
          requestverificationtoken: "request-token",
          "x-requested-with": "XMLHttpRequest",
        }),
        data: {
          parametroPesquisa: {
            TextoPesquisa: "",
            Pagina: 1,
            QuantidadeRegistros: 10,
          },
          filtroListagem: null,
          exibeExcluido: 0,
        },
      }),
    );
    expect(requestPost).toHaveBeenNthCalledWith(
      2,
      "https://app.unecont.com/_pages/_download/Download.ashx",
      expect.objectContaining({
        multipart: {
          Nome: "UneCont - Empresas - EXATAS CONTABILIDADE - 2026-07-02.xlsx",
          tipoDownload: "15",
          id: "null",
        },
      }),
    );
    expect(result.filePath).toBe(path.join(tempDir, "base-unecont.xlsx"));
    expect(fs.existsSync(result.filePath)).toBe(true);
    expect(browserClose).toHaveBeenCalled();
  });

  it("falha quando o download retorna HTML em vez de Excel", async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-empresas-html-"));
    requestPost.mockReset();
    requestPost
      .mockResolvedValueOnce(mockResponse({ text: "{}" }))
      .mockResolvedValueOnce(mockResponse({ body: Buffer.from("<html>login</html>") }));
    const { downloadEmpresasUnecont } = await import("./download-empresas-unecont");

    await expect(
      downloadEmpresasUnecont({
        credentials: { email: "teste@example.com", senha: "123" },
        outputDir: tempDir,
      }),
    ).rejects.toThrow("nao retornou um arquivo Excel valido");
    expect(browserClose).toHaveBeenCalled();
  });
});
