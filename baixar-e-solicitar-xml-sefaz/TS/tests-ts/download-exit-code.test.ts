import { describe, expect, it } from "bun:test";
import { codigoSaidaDownload } from "../src-ts/download/exit-code.js";

describe("codigo de saida do download", () => {
  it("falha quando houve erro de download ou upload", () => {
    expect(codigoSaidaDownload({ downloadErros: 0 })).toBe(0);
    expect(codigoSaidaDownload({ downloadErros: 2 })).toBe(1);
    expect(codigoSaidaDownload({
      downloadErros: 0,
      upload: { total: 1, enviados: 0, existentes: 0, erros: 1 },
    })).toBe(1);
    expect(codigoSaidaDownload({
      downloadErros: 0,
      upload: { total: 0, enviados: 0, existentes: 0, erros: 0, erro: "API Key nao configurada" },
    })).toBe(1);
  });
});
