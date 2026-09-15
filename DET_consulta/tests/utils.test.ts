import { describe, expect, test } from "bun:test";

import { digitsOnly, isValidCnpj, requireValidCnpj } from "../src/utils.js";

describe("CNPJ", () => {
  test("normaliza e valida um CNPJ", () => {
    expect(digitsOnly("11.222.333/0001-81")).toBe("11222333000181");
    expect(isValidCnpj("11.222.333/0001-81")).toBe(true);
  });

  test("rejeita digito verificador incorreto e sequencia repetida", () => {
    expect(isValidCnpj("11.222.333/0001-82")).toBe(false);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(() => requireValidCnpj("11222333000182")).toThrow("invalido");
  });
});
