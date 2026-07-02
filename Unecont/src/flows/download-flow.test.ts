import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { Page } from "playwright";
import { DownloadError } from "../exceptions";

const selectUltimoMes = vi.fn();
const clickDownloadExcel = vi.fn();
const ensureWorkbookReady = vi.fn();

vi.mock("../pages/empresa-selection-page", () => ({
  EmpresaSelectionPage: class {},
}));

vi.mock("../pages/servicos-tomados-page", () => ({
  ServicosTomadosPage: class {
    selectUltimoMes = selectUltimoMes;
    clickDownloadExcel = clickDownloadExcel;
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

  return {
    waitForEvent: vi.fn().mockResolvedValue(download),
    evaluate: vi.fn().mockResolvedValue(false),
    locator: vi.fn().mockReturnValue(alertLocator),
  } as unknown as Page;
}

describe("DownloadFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectUltimoMes.mockResolvedValue(undefined);
    clickDownloadExcel.mockResolvedValue(undefined);
    ensureWorkbookReady.mockResolvedValue({
      stable: true,
      sizeBytes: 30_014,
      attempts: 2,
    });
  });

  it("salva o download no destino final e espera a planilha estabilizar", async () => {
    const download = {
      suggestedFilename: vi.fn().mockReturnValue("UneCont - Tomados.xlsx"),
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

    const filePath = await flow.downloadReport("12345678000190", "C:/tmp/downloads", "001");

    expect(filePath).toBe(path.join("C:/tmp/downloads", "001 - UneCont - Tomados.xlsx"));
    expect(selectUltimoMes).toHaveBeenCalled();
    expect(clickDownloadExcel).toHaveBeenCalled();
    expect(download.saveAs).toHaveBeenCalledWith(
      path.join("C:/tmp/downloads", "001 - UneCont - Tomados.xlsx"),
    );
    expect(download.failure).toHaveBeenCalled();
    expect(ensureWorkbookReady).toHaveBeenCalledWith(
      path.join("C:/tmp/downloads", "001 - UneCont - Tomados.xlsx"),
      {
        timeoutMs: 5_000,
        pollIntervalMs: 250,
      },
    );
  });

  it("falha quando o Playwright reporta erro no download", async () => {
    const download = {
      suggestedFilename: vi.fn().mockReturnValue("UneCont - Tomados.xlsx"),
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
      flow.downloadReport("12345678000190", "C:/tmp/downloads", "001"),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DownloadError>>({
        name: "DownloadError",
        reason: "download_failure",
      }),
    );
    expect(ensureWorkbookReady).not.toHaveBeenCalled();
  });
});
