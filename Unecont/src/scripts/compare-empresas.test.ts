import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const compareEmpresasPlanilhas = vi.fn();
const loadDotenvFromProjectRoot = vi.fn();
const loadEnvConfig = vi.fn();
const providerInstance = { lookupUsers: vi.fn() };
const OnvioHttpClientUsersProvider = vi.fn(function () {
  return providerInstance;
});

vi.mock("../compare-empresas", () => ({
  compareEmpresasPlanilhas,
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

describe("compare empresas CLI", () => {
  let previousAuthArtifactPath: string | undefined;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    previousAuthArtifactPath = process.env.ONVIO_AUTH_ARTIFACT_PATH;
    process.env.ONVIO_AUTH_ARTIFACT_PATH = path.join(os.tmpdir(), "unecont-auth-missing.json");
    loadEnvConfig.mockReturnValue({
      onvioUdsToken: "token",
      onvioBaseUrl: "https://onvio.com.br",
      onvioFirmCompanyId: "firm-id",
      onvioCookie: "",
    });
    compareEmpresasPlanilhas.mockResolvedValue({
      outputDir: "C:/tmp/out",
      reportPath: "C:/tmp/out/relatorio-comparacao.xlsx",
      finalPlanilhaPath: "C:/tmp/out/planilha-operacional-atualizada.xlsx",
      summary: {
        atualizadas: 2,
        operacionais: 2,
        final: 2,
        novas: 1,
        removidas: 1,
        alteradas: 1,
        conflitosCodigo: 1,
        usuariosConsultados: 1,
        usuariosPreenchidos: 1,
        usuariosMultiplaEscolha: 0,
        usuariosNaoEncontrados: 0,
        usuariosComErro: 0,
      },
      novas: [],
      removidas: [],
      alteradas: [],
      conflitosCodigo: [],
      usuariosCliente: [],
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

  it("exige os caminhos das duas planilhas", async () => {
    const { main } = await import("./compare-empresas");
    const exitCode = await main([]);

    expect(exitCode).toBe(1);
    expect(compareEmpresasPlanilhas).not.toHaveBeenCalled();
  });

  it("exige token Onvio para buscar usuarios do cliente por HTTP", async () => {
    loadEnvConfig.mockReturnValue({
      onvioUdsToken: "",
      onvioBaseUrl: "https://onvio.com.br",
      onvioFirmCompanyId: "firm-id",
      onvioCookie: "",
    });

    const { main } = await import("./compare-empresas");
    const exitCode = await main([
      "--atualizada",
      "assets/planilha/atualizada.xlsx",
      "--operacional",
      "assets/planilha/operacional.xlsx",
    ]);

    expect(exitCode).toBe(1);
    expect(compareEmpresasPlanilhas).not.toHaveBeenCalled();
  });

  it("chama a API publica com caminhos explicitos", async () => {
    const { main } = await import("./compare-empresas");
    const exitCode = await main([
      "--atualizada",
      "assets/planilha/atualizada.xlsx",
      "--operacional=assets/planilha/operacional.xlsx",
      "--output-dir",
      "runtime/comparisons/teste",
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
    expect(compareEmpresasPlanilhas).toHaveBeenCalledWith(
      expect.objectContaining({
        atualizadaPath: path.resolve("assets/planilha/atualizada.xlsx"),
        operacionalPath: path.resolve("assets/planilha/operacional.xlsx"),
        outputDir: path.resolve("runtime/comparisons/teste"),
        clientUsersProvider: providerInstance,
        logger: console,
      }),
    );
  });

  it("usa token cacheado quando ONVIO_UDS_TOKEN nao esta no ambiente", async () => {
    loadEnvConfig.mockReturnValue({
      onvioUdsToken: "",
      onvioBaseUrl: "https://onvio.com.br",
      onvioFirmCompanyId: "firm-id",
      onvioCookie: "",
    });
    const artifactDir = fs.mkdtempSync(path.join(os.tmpdir(), "unecont-auth-"));
    const artifactPath = path.join(artifactDir, "latest-auth.json");
    fs.writeFileSync(
      artifactPath,
      JSON.stringify({ onvio: { udsLongToken: "cached-token" } }),
      "utf8",
    );
    process.env.ONVIO_AUTH_ARTIFACT_PATH = artifactPath;

    const { main } = await import("./compare-empresas");
    const exitCode = await main([
      "--atualizada",
      "assets/planilha/atualizada.xlsx",
      "--operacional",
      "assets/planilha/operacional.xlsx",
    ]);

    expect(exitCode).toBe(0);
    expect(OnvioHttpClientUsersProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "cached-token",
      }),
    );
  });
});
