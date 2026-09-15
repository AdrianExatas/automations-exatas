import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Page } from "playwright";
import { DownloadError } from "../exceptions";

const selectUltimoMes = vi.fn();
const clickDownloadExcel = vi.fn();
const getPageIdentityText = vi.fn();
const ensureWorkbookReady = vi.fn();

vi.mock("../pages/empresa-selection-page", () => ({
  EmpresaSelectionPage: class {
    closeNovidadeModal = vi.fn().mockResolvedValue(undefined);
  },
}));

vi.mock("../pages/servicos-tomados-page", () => ({
  ServicosTomadosPage: class {
    selectUltimoMes = selectUltimoMes;
    clickDownloadExcel = clickDownloadExcel;
    getPageIdentityText = getPageIdentityText;
  },
}));

vi.mock("../workbook-ready", () => ({
  ensureWorkbookReady,
}));

function createPage(download: {
  suggestedFilename: () => string;
  saveAs: (filePath: string) => Promise<void>;
  failure: () => Promise<string | null>;
}): Page {
  const confirmClick = vi.fn().mockResolvedValue(undefined);
  const waitForAlert = vi.fn().mockRejectedValue(new Error("timeout"));
  const alertFirst = {
    waitFor: waitForAlert,
    locator: vi.fn().mockReturnValue({
      click: confirmClick,
    }),
  };
  const alertLocator = {
    filter: vi.fn().mockReturnValue({
      first: vi.fn().mockReturnValue(alertFirst),
    }),
  };

  const loadingLocator = {
    isVisible: vi.fn().mockResolvedValue(false),
    waitFor: vi.fn().mockResolvedValue(undefined),
  };

  return {
    waitForEvent: vi.fn().mockResolvedValue(download),
    evaluate: vi.fn().mockResolvedValue(false),
    locator: vi.fn().mockImplementation((selector: string) => {
      if (selector.includes("Loading_modalLoading") || selector.includes("sweet-overlay")) {
        return loadingLocator;
      }
      return alertLocator;
    }),
  } as unknown as Page;
}

const EMPRESA_NOME = "ACME WIDGETS INDUSTRIAL LTDA";
const HEADER =
  "Empresa: 001 - 12.345.678/0001-90 - ACME WIDGETS INDUSTRIAL LTDA\nMunicípio: Aracaju";
const SUGGESTED = "UneCont - Tomados - ACME WIDGETS INDUSTRIAL - 01_08_2026_a_31_08_20262026-09-02.xlsx";

describe("DownloadFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectUltimoMes.mockResolvedValue(undefined);
    clickDownloadExcel.mockResolvedValue(undefined);
    getPageIdentityText.mockResolvedValue(HEADER);
    ensureWorkbookReady.mockResolvedValue({
      stable: true,
      sizeBytes: 30_014,
      attempts: 2,
    });
  });

  it("salva o download no destino final e espera a planilha estabilizar", async () => {
    const download = {
      suggestedFilename: vi.fn().mockReturnValue(SUGGESTED),
      saveAs: vi.fn().mockResolvedValue(undefined),
      failure: vi.fn().mockResolvedValue(null),
    };
    const page = createPage(download);
    const { DownloadFlow } = await import("./download-flow");
    const flow = new DownloadFlow(page, {
      unecontEmail: "teste@example.com",
      unecontSenha: "123",
      headless: true,
      defaultTimeout: 10,
      shortTimeout: 3,
      longTimeout: 20,
      loginUrl: "https://app.unecont.com/_login/Login.aspx",
      servicosTomadosUrl: "https://app.unecont.com/Contador/ServicosTomados/Default.aspx",
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
    });

    const filePath = await flow.downloadReport(
      "12345678000190",
      "C:/tmp/downloads",
      "001",
      EMPRESA_NOME,
    );

    expect(filePath).toBe(path.join("C:/tmp/downloads", `001 - ${SUGGESTED}`));
    expect(selectUltimoMes).toHaveBeenCalled();
    expect(clickDownloadExcel).toHaveBeenCalled();
    expect(download.saveAs).toHaveBeenCalledWith(path.join("C:/tmp/downloads", `001 - ${SUGGESTED}`));
    expect(download.failure).toHaveBeenCalled();
    expect(ensureWorkbookReady).toHaveBeenCalled();
  });

  it("falha quando o Playwright reporta erro no download", async () => {
    const download = {
      suggestedFilename: vi.fn().mockReturnValue(SUGGESTED),
      saveAs: vi.fn().mockResolvedValue(undefined),
      failure: vi.fn().mockResolvedValue("network error"),
    };
    const page = createPage(download);
    const { DownloadFlow } = await import("./download-flow");
    const flow = new DownloadFlow(page, {
      unecontEmail: "teste@example.com",
      unecontSenha: "123",
      headless: true,
      defaultTimeout: 10,
      shortTimeout: 3,
      longTimeout: 20,
      loginUrl: "https://app.unecont.com/_login/Login.aspx",
      servicosTomadosUrl: "https://app.unecont.com/Contador/ServicosTomados/Default.aspx",
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
    });

    await expect(
      flow.downloadReport("12345678000190", "C:/tmp/downloads", "001", EMPRESA_NOME),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DownloadError>>({
        name: "DownloadError",
        reason: "download_failure",
      }),
    );
    expect(ensureWorkbookReady).not.toHaveBeenCalled();
  });

  it("recusa download cujo nome Unecont nao bate com a empresa", async () => {
    const download = {
      suggestedFilename: vi
        .fn()
        .mockReturnValue(
          "UneCont - Tomados - OUTRA EMPRESA QUALQUER - 01_08_2026_a_31_08_20262026-09-02.xlsx",
        ),
      saveAs: vi.fn().mockResolvedValue(undefined),
      failure: vi.fn().mockResolvedValue(null),
    };
    const page = createPage(download);
    const { DownloadFlow } = await import("./download-flow");
    const flow = new DownloadFlow(page, {
      unecontEmail: "teste@example.com",
      unecontSenha: "123",
      headless: true,
      defaultTimeout: 10,
      shortTimeout: 3,
      longTimeout: 20,
      loginUrl: "https://app.unecont.com/_login/Login.aspx",
      servicosTomadosUrl: "https://app.unecont.com/Contador/ServicosTomados/Default.aspx",
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
    });

    await expect(
      flow.downloadReport("12345678000190", "C:/tmp/downloads", "001", EMPRESA_NOME),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DownloadError>>({
        name: "DownloadError",
        reason: "identity_mismatch",
      }),
    );
    expect(download.saveAs).not.toHaveBeenCalled();
  });

  it("recusa quando a UI mostra outro CNPJ", async () => {
    getPageIdentityText.mockResolvedValue(
      "Empresa: 002 - 99.999.999/0001-99 - OUTRA EMPRESA\nMunicípio: Aracaju",
    );
    const download = {
      suggestedFilename: vi.fn().mockReturnValue(SUGGESTED),
      saveAs: vi.fn().mockResolvedValue(undefined),
      failure: vi.fn().mockResolvedValue(null),
    };
    const page = createPage(download);
    const { DownloadFlow } = await import("./download-flow");
    const flow = new DownloadFlow(page, {
      unecontEmail: "teste@example.com",
      unecontSenha: "123",
      headless: true,
      defaultTimeout: 10,
      shortTimeout: 3,
      longTimeout: 20,
      loginUrl: "https://app.unecont.com/_login/Login.aspx",
      servicosTomadosUrl: "https://app.unecont.com/Contador/ServicosTomados/Default.aspx",
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
    });

    await expect(
      flow.downloadReport("12345678000190", "C:/tmp/downloads", "001", EMPRESA_NOME),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DownloadError>>({
        name: "DownloadError",
        reason: "identity_mismatch",
      }),
    );
    expect(clickDownloadExcel).not.toHaveBeenCalled();
  });
});
