import { describe, expect, it } from "vitest";
import { normalizarLinhasPlanilha } from "./planilha";

describe("planilha", () => {
  it("deduplica a mesma combinacao de tarefa e CNPJ quando o responsavel e o mesmo", () => {
    const rows = [
      {
        "CÓD": 1,
        EMPRESA: "Empresa 1",
        CNPJ: "12.345.678/0001-99",
        TAREFA: "PROVISÃO",
        "RESPONSÁVEL": "Maria Silva",
      },
      {
        "CÓD": 2,
        EMPRESA: "Empresa 1 duplicada",
        CNPJ: "12345678000199",
        TAREFA: "PROVISÃO",
        "RESPONSÁVEL": "Maria Silva",
      },
    ];

    const linhas = normalizarLinhasPlanilha(rows);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].cnpj).toBe("12345678000199");
    expect(linhas[0].tarefa).toBe("PROVISÃO");
  });

  it("aceita o cabecalho RESPONSÁVEL com espaco no final", () => {
    const rows = [
      {
        EMPRESA: "Empresa 1",
        CNPJ: "12.345.678/0001-99",
        TAREFA: "PROVISÃO",
        "RESPONSÁVEL ": "Maria Silva",
      },
    ];

    const linhas = normalizarLinhasPlanilha(rows);

    expect(linhas).toHaveLength(1);
    expect(linhas[0].responsavel).toBe("Maria Silva");
  });

  it("falha quando a mesma tarefa e empresa aparecem com responsaveis diferentes", () => {
    const rows = [
      {
        EMPRESA: "Empresa 1",
        CNPJ: "12.345.678/0001-99",
        TAREFA: "PROVISÃO",
        "RESPONSÁVEL": "Maria Silva",
      },
      {
        EMPRESA: "Empresa 1",
        CNPJ: "12345678000199",
        TAREFA: "PROVISÃO",
        "RESPONSÁVEL": "Joao Souza",
      },
    ];

    expect(() => normalizarLinhasPlanilha(rows)).toThrow(/Conflito na planilha/);
  });
});
