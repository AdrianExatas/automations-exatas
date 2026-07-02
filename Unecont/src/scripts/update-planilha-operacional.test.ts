import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const updatePlanilhaOperacional = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const loadEnvConfig = vi.fn();
const providerInstance = { lookupUsers: vi.fn() };
const OnvioHttpClientUsersProvider = vi.fn(function () {
  return providerInstance;
});

vi.mock("../update-planilha-operacional", () => ({
  updatePlanilhaOperacional,
}));

vi.mock("../config", () => ({
  loadEnvConfig,
}));

vi.mock("../onvio-http-client-users-provider", () => ({
  OnvioHttpClientUsersProvider,
}));

vi.mock("./cli-helpers", () => ({
  loadDotenvFromProjectRoot,
}));

describe("update planilha operacional CLI", () => {
  let previousAuthArtifactPath: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    previousAuthArtifactPath = process.env.ONVIO_AUTH_ARTIFACT_PATH;
    process.env.ONVIO_AUTH_ARTIFACT_PATH = path.join(os.tmpdir(), "unecont-auth-missing.json");
    loadEnvConfig.mockReturnValue({
      unecontEmail: "unecont@example.com",
      unecontSenha: "senha",
      headless: true,
      defaultTimeout: 10,
      shortTimeout: 3,
      longTimeout: 20,
      loginUrl: "https://app.unecont.com/_login/Login.aspx",
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
      unecontEmpresasReportName: "",
      onvioUdsToken: "token",
      onvioBaseUrl: "https://onvio.com.br",
      onvioFirmCompanyId: "firm-id",
      onvioCookie: "",
      onvioAutoRefreshToken: false,
      onvioEmail: "",
      onvioPassword: "",
    });
    updatePlanilhaOperacional.mockResolvedValue({
      outputDir: "C:/tmp/out",
      baseUnecontPath: "C:/tmp/out/base-unecont.xlsx",
      operacionalPath: "C:/tmp/operacional.xlsx",
      reportPath: "C:/tmp/out/relatorio-comparacao.xlsx",
      runtimePlanilhaPath: "C:/tmp/out/planilha-operacional-atualizada.xlsx",
      publishedPlanilhaPath: "C:/tmp/assets/planilha-operacional-junho-atualizada.xlsx",
      referenceMonth: "06/2026",
      summary: {
        atualizadas: 2,
        operacionais: 2,
        final: 2,
        novas: 1,
        removidas: 0,
        alteradas: 0,
        conflitosCodigo: 0,
        usuariosConsultados: 1,
        usuariosPreenchidos: 1,
        usuariosMultiplaEscolha: 0,
        usuariosNaoEncontrados: 0,
        usuariosComErro: 0,
      },
    });
  });

  afterEach(() => {
    if (previousAuthArtifactPath === undefined) {
      delete process.env.ONVIO_AUTH_ARTIFACT_PATH;
    } else {
      process.env.ONVIO_AUTH_ARTIFACT_PATH = previousAuthArtifactPath;
    }
    vi.restoreAllMocks();
  });

  it("repassa argumentos e configuracoes para a API publica", async () => {
    const { main } = await import("./update-planilha-operacional");
    const exitCode = await main([
      "--operacional",
      "assets/planilha/planilha-operacional-maio-atualizada.xlsx",
      "--referencia=06/2026",
      "--output-dir",
      "runtime/planilhas-operacionais/2026-06",
      "--headless=false",
      "--force",
    ]);

    expect(exitCode).toBe(0);
    expect(loadDotenvFromProjectRoot).toHaveBeenCalled();
    expect(OnvioHttpClientUsersProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "token",
        baseUrl: "https://onvio.com.br",
        firmCompanyId: "firm-id",
      }),
    );
    expect(updatePlanilhaOperacional).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: {
          email: "unecont@example.com",
          senha: "senha",
        },
        browser: {
          headless: false,
        },
        operacionalPath: "assets/planilha/planilha-operacional-maio-atualizada.xlsx",
        outputDir: path.resolve("runtime/planilhas-operacionais/2026-06"),
        referenceMonth: "06/2026",
        force: true,
        empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
        clientUsersProvider: providerInstance,
      }),
    );
  });

  it("falha sem token Onvio para enriquecer usuarios", async () => {
    loadEnvConfig.mockReturnValue({
      unecontEmail: "unecont@example.com",
      unecontSenha: "senha",
      headless: true,
      defaultTimeout: 10,
      shortTimeout: 3,
      longTimeout: 20,
      loginUrl: "https://app.unecont.com/_login/Login.aspx",
      empresasUrl: "https://app.unecont.com/Contador/Empresas/Default.aspx",
      unecontEmpresasReportName: "",
      onvioUdsToken: "",
      onvioBaseUrl: "https://onvio.com.br",
      onvioFirmCompanyId: "firm-id",
      onvioCookie: "",
      onvioAutoRefreshToken: false,
      onvioEmail: "",
      onvioPassword: "",
    });

    const { main } = await import("./update-planilha-operacional");
    const exitCode = await main([]);

    expect(exitCode).toBe(1);
    expect(updatePlanilhaOperacional).not.toHaveBeenCalled();
  });
});
