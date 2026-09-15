import path from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolveSefazAuthConfig } from "../../shared/sefaz-auth";
import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";
import { parseSheetName, parseTitulo } from "../src/model-loader";
import { competenciaAnterior, formatReferencia, nomeMesPt } from "../src/referencia";

function withTempCert(argv: string[], env: NodeJS.ProcessEnv = {}): ReturnType<typeof loadConfig> {
  const dir = mkdtempSync(path.join(tmpdir(), "sefaz-cert-"));
  const pfxPath = path.join(dir, "certificado.pfx");
  writeFileSync(pfxPath, "fake-pfx");
  try {
    return loadConfig(["--cert-path", pfxPath, "--user", "SE007829", ...argv], env);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("config", () => {
  test("normaliza credenciais e opcoes do CLI", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sefaz-cert-"));
    try {
      const pfxPath = path.join(dir, "certificado.pfx");
      writeFileSync(pfxPath, "fake-pfx");
      const config = loadConfig(
        [
          "--user",
          " usuario ",
          "--cert-path",
          pfxPath,
          "--headed",
          "--timeout-ms",
          "1000",
          "--channel",
          "chrome",
          "--model-dir",
          "model",
          "--out-dir",
          "downloads",
        ],
        {} as NodeJS.ProcessEnv,
      );

      expect(config.user).toBe("usuario");
      expect(config.authMode).toBe("certificate");
      expect(config.headless).toBe(false);
      expect(config.timeoutMs).toBe(1000);
      expect(config.browserChannel).toBe("chrome");
      expect(config.modelDir).toBe(path.resolve(process.cwd(), "model"));
      expect(config.outDir).toBe(path.resolve(process.cwd(), "downloads"));
      expect(config.referencia).toBeUndefined();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("aplica defaults para model-dir e out-dir quando ausentes", () => {
    const config = withTempCert([]);
    expect(config.modelDir).toBe(path.resolve(process.cwd(), "model"));
    expect(config.outDir).toBe(path.resolve(process.cwd(), "downloads"));
  });

  test("usa env MODEL_DIR e DAE_OUTPUT_DIR como defaults", () => {
    const config = withTempCert([], {
      MODEL_DIR: "custom-model",
      DAE_OUTPUT_DIR: "custom-out",
    } as unknown as NodeJS.ProcessEnv);
    expect(config.modelDir).toBe("custom-model");
    expect(config.outDir).toBe("custom-out");
  });

  test("aceita --ano e --mes em conjunto", () => {
    const config = withTempCert(["--ano", "2026", "--mes", "3"]);
    expect(config.referencia).toEqual({ ano: 2026, mes: 3 });
  });

  test("rejeita --ano sem --mes", () => {
    expect(() => withTempCert(["--ano", "2026"])).toThrow("Informe ambos --ano e --mes");
  });

  test("rejeita --mes invalido", () => {
    expect(() => withTempCert(["--ano", "2026", "--mes", "13"])).toThrow("Mes invalido");
  });

  test("exige usuario do vinculo e certificado", () => {
    expect(() =>
      loadConfig([], { SEFAZ_CERT_PATH: path.join(tmpdir(), "certificado-inexistente.pfx") } as NodeJS.ProcessEnv),
    ).toThrow(/Certificado digital A1 nao encontrado/);
    expect(() => loadConfig([], {} as NodeJS.ProcessEnv)).toThrow(/vinculo Contador|Certificado digital/);
  });
});

describe("auth certificado SEFAZ", () => {
  test("detecta pfx padrao e le senha do arquivo", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sefaz-cert-"));
    try {
      const pfxPath = path.join(dir, "certificado.pfx");
      const passwordFile = path.join(dir, "SENHA.txt");
      writeFileSync(pfxPath, "fake-pfx");
      writeFileSync(passwordFile, "segredo\n");

      const auth = resolveSefazAuthConfig({} as NodeJS.ProcessEnv, {
        defaultCertDir: dir,
        defaultPasswordFile: passwordFile,
      });

      expect(auth.authMode).toBe("certificate");
      expect(auth.certificate?.pfxPath).toBe(pfxPath);
      expect(auth.certificate?.passphrase).toBe("segredo");
      expect(auth.certificate?.origins).toContain("https://security.sefaz.se.gov.br");
      expect(auth.certificate?.origins).toContain("https://portais-fazendario.apps.sefaz.se.gov.br");
      expect(auth.certificate?.origins).toContain("https://portal-cert.apps.sefaz.se.gov.br");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("senha por env sobrescreve arquivo", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sefaz-cert-"));
    try {
      const pfxPath = path.join(dir, "certificado.pfx");
      const passwordFile = path.join(dir, "SENHA.txt");
      writeFileSync(pfxPath, "fake-pfx");
      writeFileSync(passwordFile, "senha-arquivo\n");

      const auth = resolveSefazAuthConfig({ SEFAZ_CERT_PASSWORD: "senha-env" } as NodeJS.ProcessEnv, {
        defaultCertDir: dir,
        defaultPasswordFile: passwordFile,
      });

      expect(auth.certificate?.passphrase).toBe("senha-env");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("modo certificate exige usuario do vinculo", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sefaz-cert-"));
    try {
      const pfxPath = path.join(dir, "certificado.pfx");
      const passwordFile = path.join(dir, "SENHA.txt");
      writeFileSync(pfxPath, "fake-pfx");
      writeFileSync(passwordFile, "segredo\n");

      expect(() =>
        loadConfig(["--auth-mode", "certificate", "--cert-path", pfxPath, "--cert-password-file", passwordFile], {} as NodeJS.ProcessEnv),
      ).toThrow(/vinculo Contador/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("modo password nao e mais suportado", () => {
    expect(() => loadConfig(["--auth-mode", "password"], {} as NodeJS.ProcessEnv)).toThrow(
      "Login por senha nao e mais suportado",
    );
  });

  test("modo certificate usa pfx e usuario do vinculo", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "sefaz-cert-"));
    try {
      const pfxPath = path.join(dir, "certificado.pfx");
      writeFileSync(pfxPath, "fake-pfx");

      const config = loadConfig(["--cert-path", pfxPath, "--user", "u"], {} as NodeJS.ProcessEnv);
      expect(config.authMode).toBe("certificate");
      expect(config.certificate?.pfxPath).toBe(pfxPath);
      expect(config.user).toBe("u");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("competenciaAnterior", () => {
  test("subtrai 1 mes quando nao e janeiro", () => {
    expect(competenciaAnterior(new Date(2026, 3, 15))).toEqual({ ano: 2026, mes: 3 });
    expect(competenciaAnterior(new Date(2026, 11, 1))).toEqual({ ano: 2026, mes: 11 });
  });

  test("rollover de janeiro para dezembro do ano anterior", () => {
    expect(competenciaAnterior(new Date(2026, 0, 5))).toEqual({ ano: 2025, mes: 12 });
  });

  test("formatReferencia produz MM/AAAA", () => {
    expect(formatReferencia({ ano: 2026, mes: 3 })).toBe("03/2026");
    expect(formatReferencia({ ano: 2025, mes: 12 })).toBe("12/2025");
  });

  test("nomeMesPt retorna nome capitalizado em pt-BR", () => {
    expect(nomeMesPt(1)).toBe("Janeiro");
    expect(nomeMesPt(3)).toBe("Marco");
    expect(nomeMesPt(12)).toBe("Dezembro");
    expect(() => nomeMesPt(0)).toThrow("Mes invalido");
    expect(() => nomeMesPt(13)).toThrow("Mes invalido");
  });
});

describe("model-loader", () => {
  test("parseSheetName extrai cdPessoaContribuinte e razao social", () => {
    expect(parseSheetName("271922052 CONSTRUAGRO BARBOSA L")).toEqual({
      cdPessoaContribuinte: "271922052",
      razaoSocial: "CONSTRUAGRO BARBOSA L",
    });
  });

  test("parseSheetName ignora nomes sem prefixo numerico", () => {
    expect(parseSheetName("Resumo")).toBeUndefined();
    expect(parseSheetName("12345 nome")).toBeUndefined();
  });

  test("parseTitulo extrai do titulo da celula A1", () => {
    const titulo =
      "ESPELHO DEMONSTRATIVO ICMS ANTECIPADO - Contribuinte: 271922052 CONSTRUAGRO BARBOSA LTDA  Ref:  N\u00b0DIA: 2026030318400";
    expect(parseTitulo(titulo)).toEqual({
      cdPessoaContribuinte: "271922052",
      razaoSocial: "CONSTRUAGRO BARBOSA LTDA",
    });
  });

  test("parseTitulo retorna undefined em formato desconhecido", () => {
    expect(parseTitulo("alguma coisa qualquer")).toBeUndefined();
  });
});
