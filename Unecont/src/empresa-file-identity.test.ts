import { describe, expect, it } from "vitest";
import {
  extractUnecontTradeName,
  matchEmpresaFileIdentity,
  matchEmpresaUiIdentity,
  parseUnecontEmpresaHeader,
} from "./empresa-file-identity";

describe("empresa-file-identity", () => {
  describe("extractUnecontTradeName", () => {
    it("extrai o trecho comercial do nome Unecont", () => {
      expect(
        extractUnecontTradeName(
          "427 - UneCont - Tomados - ACHEI COMERCIO E SERVICOS - 01_08_2026_a_31_08_20262026-09-02.xlsx",
        ),
      ).toBe("ACHEI COMERCIO E SERVICOS");
    });
  });

  describe("matchEmpresaFileIdentity — incidente real", () => {
    const cases: Array<{ codigo: string; empresa: string; file: string }> = [
      {
        codigo: "33",
        empresa: "JOAO BOSCO DA ROCHA DIAS LTDA",
        file: "33 - UneCont - Tomados - J.R.V FRIGORIFICO ESTRELAS - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
      {
        codigo: "68",
        empresa: "CLINICA INTEGRADA DE PROCEDIMENTOS E ESPECIALIDADES MEDICAS OLIVEIRA RAMOS LTDA",
        file: "68 - UneCont - Tomados - BARBOSA REPRESENTACOES - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
      {
        codigo: "69",
        empresa: "CLINICA INTEGRADA DE PROCEDIMENTOS E ESPECIALIDADES MEDICAS OLIVEIRA RAMOS LTDA",
        file: "69 - UneCont - Tomados - BARBOSA REPRESENTACOES - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
      {
        codigo: "168",
        empresa: "SONHO REAL INDUSTRIA E COMERCIO DE CONFECCOES LTDA",
        file: "168 - UneCont - Tomados - MAXX INDUSTRIA E COMERCIO - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
      {
        codigo: "427",
        empresa: "MAX CONFECCOES TEXTIL LTDA",
        file: "427 - UneCont - Tomados - ACHEI COMERCIO E SERVICOS - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
      {
        codigo: "428",
        empresa: "CORUJA PRODUCOES DE EVENTOS LTDA",
        file: "428 - UneCont - Tomados - ACHEI COMERCIO E SERVICOS - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
      {
        codigo: "524",
        empresa: "VIA ROMA PIZZARIA, BAR E RESTAURANTE LTDA",
        file: "524 - UneCont - Tomados - SERGIPANA DISTRIBUIDORA - 01_08_2026_a_31_08_20262026-09-02.xlsx",
      },
    ];

    for (const item of cases) {
      it(`rejeita arquivo trocado do codigo ${item.codigo}`, () => {
        const result = matchEmpresaFileIdentity(item.file, item.empresa);
        expect(result.ok).toBe(false);
      });
    }

    it("aceita arquivo coerente apos correcao", () => {
      expect(
        matchEmpresaFileIdentity(
          "427 - UneCont - Tomados - MAX CONFECCOES TEXTIL - 01_08_2026_a_31_08_20262026-09-02.xlsx",
          "MAX CONFECCOES TEXTIL LTDA",
        ).ok,
      ).toBe(true);
      expect(
        matchEmpresaFileIdentity(
          "524 - UneCont - Tomados - VIA ROMA PIZZARIA BAR - 01_08_2026_a_31_08_20262026-09-02.xlsx",
          "VIA ROMA PIZZARIA, BAR E RESTAURANTE LTDA",
        ).ok,
      ).toBe(true);
      expect(
        matchEmpresaFileIdentity(
          "68 - UneCont - Tomados - CLINICA INTEGRADA - 01_08_2026_a_31_08_20262026-09-02.xlsx",
          "CLINICA INTEGRADA DE PROCEDIMENTOS E ESPECIALIDADES MEDICAS OLIVEIRA RAMOS LTDA",
        ).ok,
      ).toBe(true);
    });

    it("aceita razao truncada e nomes curtos do Unecont", () => {
      expect(
        matchEmpresaFileIdentity(
          "267 - UneCont - Tomados - COMERCIO E INDUSTRIA - 01_08_2026_a_31_08_2026.xlsx",
          "COMERCIO E INDUSTRIA GABRIEL MACEDO LTDA",
        ).ok,
      ).toBe(true);
      expect(
        matchEmpresaFileIdentity(
          "550 - UneCont - Tomados - LDA LTDA - 01_08_2026_a_31_08_2026.xlsx",
          "LDA LTDA",
        ).ok,
      ).toBe(true);
      expect(
        matchEmpresaFileIdentity(
          "586 - UneCont - Tomados - VS SERVICOS LTDA - 01_08_2026_a_31_08_2026.xlsx",
          "VS SERVICOS LTDA",
        ).ok,
      ).toBe(true);
      expect(
        matchEmpresaFileIdentity(
          "792 - UneCont - Tomados - N S NET LTDA - 01_08_2026_a_31_08_2026.xlsx",
          "N S NET LTDA",
        ).ok,
      ).toBe(true);
    });

    it("recusa empresa sem token distintivo", () => {
      expect(matchEmpresaFileIdentity("UneCont - Tomados - X.xlsx", "LTDA ME").ok).toBe(false);
    });
  });

  describe("UI header parsing", () => {
    it("parseia cabecalho Empresa: codigo - cnpj - nome", () => {
      const parsed = parseUnecontEmpresaHeader(
        "Empresa: 0040 - 13.431.786/0001-43 - LOTERICA A CONTEMPLADORA LTDA\nMunicípio: Tobias Barreto",
      );
      expect(parsed).toEqual({
        codigo: "40",
        cnpj: "13431786000143",
        nome: "LOTERICA A CONTEMPLADORA LTDA",
      });
    });

    it("valida CNPJ da UI contra o esperado", () => {
      const text =
        "Empresa: 0427 - 52.169.106/0001-17 - MAX CONFECCOES TEXTIL LTDA\nMunicípio: Aracaju";
      expect(
        matchEmpresaUiIdentity(text, { cnpj: "52169106000117", codigo: "427" }).ok,
      ).toBe(true);
      expect(
        matchEmpresaUiIdentity(text, { cnpj: "11111111000111", codigo: "427" }).ok,
      ).toBe(false);
    });
  });
});
