import { describe, expect, it } from "vitest";
import { extractCompetence, extractCompetences, extractFgtsCompositionCompetences, extractFgtsTagCompetences, extractLabeledDueDates, isIsoDate, normalizeBrazilianDate } from "../src/date";

describe("datas de documentos", () => {
  it("extrai um vencimento rotulado e normaliza para ISO", () => {
    expect(extractLabeledDueDates("DARF\nData de Vencimento: 21/08/2026\nValor: 100,00")).toEqual(["2026-08-21"]);
  });

  it("deduplica a mesma data e preserva datas realmente ambiguas", () => {
    expect(extractLabeledDueDates("Vencimento 21/08/2026\nVENCIMENTO: 21-08-2026")).toEqual(["2026-08-21"]);
    expect(extractLabeledDueDates("Vencimento 21/08/2026\nVencimento 22/08/2026")).toEqual(["2026-08-21", "2026-08-22"]);
  });

  it("rejeita datas impossiveis", () => {
    expect(normalizeBrazilianDate("31", "02", "2026")).toBeUndefined();
    expect(isIsoDate("2026-02-31")).toBe(false);
  });

  it("extrai competencia", () => {
    expect(extractCompetence("Competencia: 07/2026")).toBe("2026-07");
    expect(extractCompetence("PA:08/2026")).toBe("2026-08");
    expect(extractCompetence("Periodo de Apuracao: agosto/2026")).toBe("2026-08");
    expect(extractCompetence("Competencia: 07/2026\nPA:08/2026")).toBeUndefined();
    expect(extractCompetences("Competencia: 08/2026\nPA:08/2026").map((item) => item.source)).toEqual(["Competência", "PA"]);
    expect(extractCompetence("PA:2º Trimestre/2026")).toBe("2026-06");
    expect(extractCompetence("PA: 1o Trimestre/2026")).toBe("2026-03");
    expect(extractCompetence("Periodo de ApuracaoData de VencimentoNumero do Documento\njunho/202631/08/2026")).toBe("2026-06");
    expect(extractCompetence("Periodo de Apuracao\njunho/2026\nPA:2º Trimestre/2026")).toBe("2026-06");
  });

  it("extrai vencimento rotulado como pagar ate", () => {
    expect(extractLabeledDueDates("Pagar ate: 18/09/2026")).toEqual(["2026-09-18"]);
    expect(extractLabeledDueDates("Pagar este documento até\n20/08/2026")).toEqual(["2026-08-20"]);
  });

  it("extrai competencia da Tag do FGTS Digital", () => {
    expect(extractFgtsTagCompetences("Tag\n46583870 07/2026 MENSAL")).toEqual([
      { value: "2026-07", source: "Tag FGTS Digital" },
    ]);
  });

  it("extrai competencia da composicao do FGTS mesmo concatenada aos valores", () => {
    expect(extractFgtsCompositionCompetences("Competencia\nQuantidade\n311,070,00311,070,000,0007/20262")).toEqual([
      { value: "2026-07", source: "Composicao FGTS Digital" },
    ]);
    expect(extractFgtsCompositionCompetences("CompetenciaConsignadoTotalEncargos Consignado\n486,22486,2207/20260,00")).toEqual([
      { value: "2026-07", source: "Composicao FGTS Digital" },
    ]);
  });
});
