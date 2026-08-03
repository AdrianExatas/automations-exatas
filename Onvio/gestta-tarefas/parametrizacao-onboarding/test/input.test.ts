import { describe, expect, test } from "vitest";
import { validarInput } from "../src/input";

const baseInput = {
  cnpj: "11.222.333/0001-44",
  areas: ["dp"],
  regimeFiscal: "simples_nacional",
  incluirAnuais: true,
  planoPremium: false,
  supervisor: false,
  adicionarAnaliseParcelamentos: false,
};

describe("validacao de input", () => {
  test("aceita somente regimes fiscais canonicos", () => {
    expect(validarInput({ ...baseInput, regimeFiscal: "simples_nacional" }).regimeFiscal).toBe("simples_nacional");
    expect(validarInput({ ...baseInput, regimeFiscal: "fiscal_normal" }).regimeFiscal).toBe("fiscal_normal");

    expect(() => validarInput({ ...baseInput, regimeFiscal: "lucro_presumido" })).toThrow(
      "Regime fiscal invalido: lucro_presumido.",
    );
    expect(() => validarInput({ ...baseInput, regimeFiscal: "lucro_real" })).toThrow(
      "Regime fiscal invalido: lucro_real.",
    );
  });

  test("permite areas vazias quando analise de parcelamentos esta marcada", () => {
    expect(validarInput({
      ...baseInput,
      areas: [],
      adicionarAnaliseParcelamentos: true,
    }).areas).toEqual([]);

    expect(() => validarInput({ ...baseInput, areas: [] })).toThrow(
      "Informe ao menos uma area ou marque a analise de parcelamentos.",
    );
  });
});
