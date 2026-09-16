import { describe, expect, it } from "bun:test";
import {
  digitsOnly,
  extractCnpjRaiz,
  formatCnpj,
  formatCnpjRaiz,
  isValidCnpj,
  normalizeText,
} from "../src/utils.js";
import { toCsv } from "../src/report.js";

describe("Utils", () => {
  it("deve validar CNPJ corretamente", () => {
    // CNPJ valido (Exatas)
    expect(isValidCnpj("27.939.154/0001-08")).toBe(true);
    expect(isValidCnpj("27939154000108")).toBe(true);
    // CNPJs invalidos
    expect(isValidCnpj("11111111111111")).toBe(false);
    expect(isValidCnpj("12345678000199")).toBe(false);
    expect(isValidCnpj("")).toBe(false);
  });

  it("deve extrair CNPJ Raiz com 8 digitos", () => {
    expect(extractCnpjRaiz("27.939.154/0001-08")).toBe("27939154");
    expect(extractCnpjRaiz("10766581000120")).toBe("10766581");
    expect(extractCnpjRaiz("10766581")).toBe("10766581");
  });

  it("deve formatar CNPJ e CNPJ Raiz", () => {
    expect(formatCnpj("27939154000108")).toBe("27.939.154/0001-08");
    expect(formatCnpjRaiz("27939154")).toBe("27.939.154");
  });

  it("deve normalizar texto removendo acentos", () => {
    expect(normalizeText("Vigência")).toBe("vigencia");
    expect(normalizeText("Cálculo do FAP")).toBe("calculo do fap");
  });

  it("deve formatar CSV com escape e ponto e virgula", () => {
    const rows = [
      { id: 1, nome: "Empresa A; LTDA", valor: 0.5 },
      { id: 2, nome: "Empresa B", valor: 1.25 },
    ];
    const headers: Array<[keyof (typeof rows)[0], string]> = [
      ["id", "ID"],
      ["nome", "NOME"],
      ["valor", "VALOR"],
    ];
    const csv = toCsv(rows, headers);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Empresa A; LTDA"');
    expect(csv).toContain("0.5");
  });
});
