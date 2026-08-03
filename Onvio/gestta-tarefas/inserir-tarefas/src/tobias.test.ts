import { describe, expect, it } from "vitest";
import { normalizarLinhasTobias, TOTAL_EMPRESAS_TOBIAS_ESPERADO } from "./tobias";

function criarLinhasTobias(): unknown[][] {
  const rows: unknown[][] = [
    ["Exatas contabilidade - Notas Fiscais"],
    ["Competencia 06-2026"],
    ["CNPJ", "Cliente", "Empresa", "Valor NF-e", "Valor NFS-e"],
    ["60.710.499/0001-52", "PERCOP SERVIÇOS LTDA", "", "#REF!", "#REF!"],
  ];

  for (let index = 1; index < TOTAL_EMPRESAS_TOBIAS_ESPERADO; index += 1) {
    const raiz = String(index).padStart(8, "0");
    rows.push([`${raiz}/0001-99`, `Empresa ${index}`, "", 100, 50]);
  }

  return rows;
}

describe("planilha Tobias", () => {
  it("localiza o cabecalho deslocado e preserva os 63 CNPJs, inclusive PERCOP com #REF!", () => {
    const linhas = normalizarLinhasTobias(criarLinhasTobias());

    expect(linhas).toHaveLength(TOTAL_EMPRESAS_TOBIAS_ESPERADO);
    expect(linhas[0]).toEqual({
      linha: 4,
      cnpj: "60710499000152",
      cliente: "PERCOP SERVIÇOS LTDA",
    });
    expect(new Set(linhas.map((linha) => linha.cnpj)).size).toBe(TOTAL_EMPRESAS_TOBIAS_ESPERADO);
  });

  it("recusa CNPJ duplicado para evitar inclusoes ambiguas", () => {
    const rows = criarLinhasTobias();
    rows.push(["60.710.499/0001-52", "PERCOP duplicada"]);

    expect(() => normalizarLinhasTobias(rows)).toThrow(/CNPJ duplicado/);
  });
});
