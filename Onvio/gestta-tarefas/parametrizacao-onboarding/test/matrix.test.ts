import path from "path";
import { describe, expect, test } from "vitest";
import { calcularPreviewMatriz, DEFAULT_MATRIX_FILE } from "../src/matrix";
import { ParametrizacaoInput } from "../src/types";

const matrixPath = path.resolve(__dirname, "..", DEFAULT_MATRIX_FILE);

function input(overrides: Partial<ParametrizacaoInput> = {}): ParametrizacaoInput {
  return {
    cnpj: "11222333000144",
    areas: ["dp"],
    regimeFiscal: "simples_nacional",
    incluirAnuais: true,
    planoPremium: false,
    supervisor: false,
    adicionarAnaliseParcelamentos: false,
    ...overrides,
  };
}

describe("matriz de parametrizacao", () => {
  test("inclui apenas linhas marcadas com Sim na coluna B", () => {
    const preview = calcularPreviewMatriz(matrixPath, input({ areas: ["dp"], incluirAnuais: true }));

    expect(preview.tarefas).toHaveLength(11);
    expect(preview.tarefas.every((item) => item.aba === "DP")).toBe(true);
    expect(preview.tarefas.some((item) => item.tarefa === "ALTERACAO SALARIAL")).toBe(false);
  });

  test("filtra tarefas anuais quando incluirAnuais esta desligado", () => {
    const withAnnual = calcularPreviewMatriz(matrixPath, input({ incluirAnuais: true }));
    const withoutAnnual = calcularPreviewMatriz(matrixPath, input({ incluirAnuais: false }));

    expect(withAnnual.tarefas.length).toBeGreaterThan(withoutAnnual.tarefas.length);
    expect(withoutAnnual.tarefas.every((item) => !item.anual)).toBe(true);
  });

  test("usa Simples Nacional para fiscal simples e avisa area sem tarefas", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ areas: ["fiscal"], regimeFiscal: "simples_nacional", incluirAnuais: true }),
    );

    expect(preview.tarefas.every((item) => item.aba === "SIMPLES NACIONAL")).toBe(true);
    expect(preview.tarefas.length).toBeGreaterThan(0);
  });

  test("permite area selecionada gerar zero tarefas", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ areas: ["fiscal"], regimeFiscal: "fiscal_normal", incluirAnuais: true }),
    );

    expect(preview.tarefas).toHaveLength(0);
    expect(preview.avisos).toContain("Area FISCAL - NORMAL foi selecionada, mas nao gerou tarefas com a regra atual.");
  });

  test("inclui analise de parcelamentos quando opcao esta ligada", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ areas: [], regimeFiscal: "fiscal_normal", adicionarAnaliseParcelamentos: true }),
    );

    expect(preview.tarefas).toEqual([
      expect.objectContaining({
        area: "fiscal",
        aba: "OPCOES",
        tarefa: "ANÁLISE DE PARCELAMENTOS (EMPRESA ENTRANTE) - FISCAL",
        responsavel: "Emilly Adrielle",
      }),
    ]);
  });

  test("exclui tarefas premium de emissao de nota quando planoPremium esta desligado", () => {
    const preview = calcularPreviewMatriz(matrixPath, input({ areas: ["financeiro"], planoPremium: false }));

    expect(preview.tarefas.some((item) => item.tarefa === "EMISSÃO NOTA FISCAL - PRODUTO - 2")).toBe(false);
    expect(preview.tarefas.some((item) => item.tarefa === "EMISSÃO NOTA FISCAL - SERVIÇO - 2")).toBe(false);
  });

  test("inclui tarefas premium de emissao de nota quando planoPremium esta ligado", () => {
    const preview = calcularPreviewMatriz(matrixPath, input({ areas: ["financeiro"], planoPremium: true }));

    expect(preview.tarefas.some((item) => item.tarefa === "EMISSÃO NOTA FISCAL - PRODUTO - 2")).toBe(true);
    expect(preview.tarefas.some((item) => item.tarefa === "EMISSÃO NOTA FISCAL - SERVIÇO - 2")).toBe(true);
    expect(preview.tarefas.filter((item) => item.premium)).toHaveLength(2);
  });
});
