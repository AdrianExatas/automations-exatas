import { describe, expect, test } from "vitest";
import { validarInput } from "../src/input";

const baseInput = {
  cnpj: "11.222.333/0001-44",
  areas: ["dp"],
  regimeFiscal: "simples_nacional",
  dp: { perfil: "normal", adicionais: [], grupoFolha: "grupo_1" },
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

  test("mantem tarefas anuais ativas mesmo quando a entrada informa falso", () => {
    expect(validarInput({ ...baseInput, incluirAnuais: false }).incluirAnuais).toBe(true);
  });

  test("exige perfil DP quando a area DP esta selecionada", () => {
    expect(() => validarInput({ ...baseInput, dp: undefined })).toThrow("Selecione o perfil do DP.");
  });

  test("exige grupo da folha para o perfil DP Normal", () => {
    expect(() => validarInput({ ...baseInput, dp: { perfil: "normal", adicionais: [] } })).toThrow(
      "Selecione o grupo da folha: Grupo 1 ou Grupo 2.",
    );
    expect(validarInput({ ...baseInput, dp: { perfil: "normal", adicionais: [], grupoFolha: "grupo_2" } }).dp)
      .toMatchObject({ grupoFolha: "grupo_2" });
  });

  test("aceita Sem movimento sem grupo e rejeita grupo invalido", () => {
    expect(validarInput({ ...baseInput, dp: { perfil: "sem_movimento", adicionais: [] } }).dp)
      .toMatchObject({ perfil: "sem_movimento", grupoFolha: undefined });
    expect(() => validarInput({ ...baseInput, dp: { perfil: "normal", adicionais: [], grupoFolha: "grupo_3" } })).toThrow(
      "Grupo da folha invalido: grupo_3.",
    );
  });

  test("nao exige configuracao DP quando a area nao esta selecionada", () => {
    const result = validarInput({ ...baseInput, areas: ["fiscal"], dp: undefined });
    expect(result.dp).toBeUndefined();
  });
});
