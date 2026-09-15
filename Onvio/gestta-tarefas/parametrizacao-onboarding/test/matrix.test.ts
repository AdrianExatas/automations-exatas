import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { afterAll, describe, expect, test } from "vitest";
import { calcularPreviewMatriz, DEFAULT_MATRIX_FILE } from "../src/matrix";
import { ParametrizacaoInput } from "../src/types";

const matrixPath = path.resolve(__dirname, "..", DEFAULT_MATRIX_FILE);
const fiscalSheetCollisionMatrixPath = path.join(__dirname, "tmp-fiscal-sheet-collision-matrix.xlsx");

afterAll(() => {
  if (fs.existsSync(fiscalSheetCollisionMatrixPath)) fs.unlinkSync(fiscalSheetCollisionMatrixPath);
});

function criarMatrizComColisaoFiscalNormal(filePath: string): string {
  if (fs.existsSync(filePath)) return filePath;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Departamento", "", "Colaborador"],
      ["FISCAL NORMAL", "", "Emilly Adrielle"],
      ["FISCAL SN", "", "Emilly Adrielle"],
    ]),
    "CONTROLE",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Tarefas", "Fiscal normal", "Anual?"],
      ["TAREFA ABA SEM HIFEN", "-", "-"],
    ]),
    "FISCAL NORMAL",
  );
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ["TAREFAS DE PARAMETRIZACAO GESTTA"],
      ["Tarefas", "Fiscal normal", "Anual?"],
      ["TAREFA ABA COM HIFEN", "Sim", "-"],
    ]),
    "FISCAL - NORMAL",
  );

  XLSX.writeFile(workbook, filePath);
  return filePath;
}

function input(overrides: Partial<ParametrizacaoInput> = {}): ParametrizacaoInput {
  return {
    cnpj: "11222333000144",
    areas: ["dp"],
    regimeFiscal: "simples_nacional",
    dp: { perfil: "normal", adicionais: [], grupoFolha: "grupo_1" },
    incluirAnuais: true,
    planoPremium: false,
    supervisor: false,
    adicionarAnaliseParcelamentos: false,
    ...overrides,
  };
}

describe("matriz de parametrizacao", () => {
  test("inclui tarefas DP do perfil Normal", () => {
    const preview = calcularPreviewMatriz(matrixPath, input({ areas: ["dp"], incluirAnuais: true }));

    expect(preview.tarefas).toHaveLength(11);
    expect(preview.tarefas.every((item) => item.aba === "DP")).toBe(true);
    expect(preview.tarefas.some((item) => item.tarefa === "ALTERACAO SALARIAL")).toBe(false);
  });

  test("inclui somente sem movimento quando esse e o perfil DP", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ dp: { perfil: "sem_movimento", adicionais: [] } }),
    );

    expect(preview.tarefas.map((item) => item.tarefa)).toEqual(["ANÁLISE DE EMPRESA SEM MOVIMENTO - DP"]);
  });

  test("inclui somente a tarefa de folha do grupo selecionado", () => {
    const grupo1 = calcularPreviewMatriz(matrixPath, input({ dp: { perfil: "normal", adicionais: [], grupoFolha: "grupo_1" } }));
    const grupo2 = calcularPreviewMatriz(matrixPath, input({ dp: { perfil: "normal", adicionais: [], grupoFolha: "grupo_2" } }));

    const folhasGrupo1 = grupo1.tarefas.filter((item) => item.tarefa.includes("FOLHA DE PAGAMENTO GERAL"));
    const folhasGrupo2 = grupo2.tarefas.filter((item) => item.tarefa.includes("FOLHA DE PAGAMENTO GERAL"));
    expect(folhasGrupo1.map((item) => item.tarefa)).toEqual(["FOLHA DE PAGAMENTO GERAL GRUPO 1"]);
    expect(folhasGrupo2.map((item) => item.tarefa)).toEqual(["FOLHA DE PAGAMENTO GERAL GRUPO 2"]);
    expect(grupo1.tarefas.filter((item) => !item.tarefa.includes("FOLHA DE PAGAMENTO GERAL"))).toHaveLength(
      grupo2.tarefas.filter((item) => !item.tarefa.includes("FOLHA DE PAGAMENTO GERAL")).length,
    );
  });

  test("inclui adicionais DP sem misturar categorias nao selecionadas", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ dp: { perfil: "normal", adicionais: ["particularidade", "normal_domestica", "normal_mei", "exatas"], grupoFolha: "grupo_1" } }),
    );

    expect(preview.tarefas).toHaveLength(57);
    expect(preview.tarefas.some((item) => item.categoriaDp === "particularidade")).toBe(true);
    expect(preview.tarefas.some((item) => item.categoriaDp === "sem_movimento")).toBe(false);
    expect(preview.avisos.some((aviso) => aviso.includes("status DP nao classificado"))).toBe(true);
  });

  test("inclui tarefas anuais mesmo quando incluirAnuais esta desligado na entrada", () => {
    const withAnnual = calcularPreviewMatriz(matrixPath, input({ incluirAnuais: true }));
    const withoutAnnual = calcularPreviewMatriz(matrixPath, input({ incluirAnuais: false }));

    expect(withoutAnnual.tarefas).toEqual(withAnnual.tarefas);
    expect(withoutAnnual.tarefas.some((item) => item.anual)).toBe(true);
  });

  test("usa Simples Nacional para fiscal simples e avisa area sem tarefas", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ areas: ["fiscal"], regimeFiscal: "simples_nacional", incluirAnuais: true }),
    );

    expect(preview.tarefas).toHaveLength(0);
    expect(preview.avisos).toContain(
      "Area SIMPLES NACIONAL foi selecionada, mas nao gerou tarefas com a regra atual.",
    );
  });

  test("permite area selecionada gerar zero tarefas", () => {
    const preview = calcularPreviewMatriz(
      matrixPath,
      input({ areas: ["fiscal"], regimeFiscal: "fiscal_normal", incluirAnuais: true }),
    );

    expect(preview.tarefas).toHaveLength(0);
    expect(preview.avisos).toContain("Area FISCAL - NORMAL foi selecionada, mas nao gerou tarefas com a regra atual.");
  });

  test("usa aba FISCAL - NORMAL quando ela coexiste com FISCAL NORMAL", () => {
    const collisionMatrixPath = criarMatrizComColisaoFiscalNormal(fiscalSheetCollisionMatrixPath);
    const preview = calcularPreviewMatriz(
      collisionMatrixPath,
      input({ areas: ["fiscal"], regimeFiscal: "fiscal_normal", incluirAnuais: true }),
    );

    expect(preview.tarefas).toEqual([
      expect.objectContaining({
        area: "fiscal",
        aba: "FISCAL - NORMAL",
        tarefa: "TAREFA ABA COM HIFEN",
        responsavel: "Emilly Adrielle",
      }),
    ]);
    expect(preview.tarefas.some((item) => item.tarefa === "TAREFA ABA SEM HIFEN")).toBe(false);
    expect(preview.avisos).not.toContain(
      "Area FISCAL - NORMAL foi selecionada, mas nao gerou tarefas com a regra atual.",
    );
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
