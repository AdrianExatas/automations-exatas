import path from "node:path";
import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";
import { parseSheetName, parseTitulo } from "../src/model-loader";
import { competenciaAnterior, formatReferencia, nomeMesPt } from "../src/referencia";

describe("config", () => {
  test("normaliza credenciais e opcoes do CLI", () => {
    const config = loadConfig(
      [
        "--user",
        " usuario ",
        "--password",
        "senha",
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
    expect(config.password).toBe("senha");
    expect(config.headless).toBe(false);
    expect(config.timeoutMs).toBe(1000);
    expect(config.browserChannel).toBe("chrome");
    expect(config.modelDir).toBe(path.resolve(process.cwd(), "model"));
    expect(config.outDir).toBe(path.resolve(process.cwd(), "downloads"));
    expect(config.referencia).toBeUndefined();
  });

  test("aplica defaults para model-dir e out-dir quando ausentes", () => {
    const config = loadConfig(["--user", "u", "--password", "s"], {} as NodeJS.ProcessEnv);
    expect(config.modelDir).toBe(path.resolve(process.cwd(), "model"));
    expect(config.outDir).toBe(path.resolve(process.cwd(), "downloads"));
  });

  test("usa env MODEL_DIR e DAE_OUTPUT_DIR como defaults", () => {
    const config = loadConfig(["--user", "u", "--password", "s"], {
      MODEL_DIR: "custom-model",
      DAE_OUTPUT_DIR: "custom-out",
    } as unknown as NodeJS.ProcessEnv);
    expect(config.modelDir).toBe("custom-model");
    expect(config.outDir).toBe("custom-out");
  });

  test("aceita --ano e --mes em conjunto", () => {
    const config = loadConfig(
      ["--user", "u", "--password", "s", "--ano", "2026", "--mes", "3"],
      {} as NodeJS.ProcessEnv,
    );
    expect(config.referencia).toEqual({ ano: 2026, mes: 3 });
  });

  test("rejeita --ano sem --mes", () => {
    expect(() =>
      loadConfig(["--user", "u", "--password", "s", "--ano", "2026"], {} as NodeJS.ProcessEnv),
    ).toThrow("Informe ambos --ano e --mes");
  });

  test("rejeita --mes invalido", () => {
    expect(() =>
      loadConfig(
        ["--user", "u", "--password", "s", "--ano", "2026", "--mes", "13"],
        {} as NodeJS.ProcessEnv,
      ),
    ).toThrow("Mes invalido");
  });

  test("exige credenciais", () => {
    expect(() => loadConfig([], {})).toThrow("Informe o login da SEFAZ.");
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
