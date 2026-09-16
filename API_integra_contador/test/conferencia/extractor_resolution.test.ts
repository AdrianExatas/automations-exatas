import { describe, expect, it } from "bun:test";
import { DominioReinfExtractor } from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/extractor.ts";
import type { IDominioClient } from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/client.ts";

describe("Resolução de Fechamentos Reinf", () => {
  it("prioriza fechamento aceito com recibo mesmo se houver tentativa posterior rejeitada sem reabertura", async () => {
    const mockClient: IDominioClient = {
      async executeSelect<T>(sql: string, params?: unknown[]): Promise<T[]> {
        // Mock de QUERY_R4000_TOTALS
        if (sql.includes("EFD_REINF_RETORNO_ARQUIVOS_R4099_PERIODO")) {
          return [
            {
              CODI_EMP: "999",
              COMPETENCIA: "2026-08",
              EVENTO_ORIGEM: "R-4020",
              CODIGO_RECEITA: "1708-06",
              BASE_CALCULO: 0,
              VALOR_IRRF: 105.89,
              VALOR_RETENCAO: 105.89,
              VALOR_DEDUCAO: 0,
              VALOR_SUSPENSO: 0,
              VALOR_EXIGIVEL: 105.89,
            },
            {
              CODI_EMP: "999",
              COMPETENCIA: "2026-08",
              EVENTO_ORIGEM: "R-4020",
              CODIGO_RECEITA: "8045-06",
              BASE_CALCULO: 0,
              VALOR_IRRF: 5606.26,
              VALOR_RETENCAO: 5606.26,
              VALOR_DEDUCAO: 0,
              VALOR_SUSPENSO: 0,
              VALOR_EXIGIVEL: 5606.26,
            },
          ] as unknown as T[];
        }

        // Mock de QUERY_REINF_CLOSINGS
        if (sql.includes("bethadba.EFD_REINF_ENVIO_ARQUIVOS")) {
          return [
            // Tentativa mais recente: rejeitada sem recibo
            {
              CODI_EMP: "999",
              TIPO_SERIE: "R-4000",
              EVENTO: "R-4099",
              COMPETENCIA: "2026-08",
              RECIBO: null,
              DATA_HORA_ENVIO: "2026-09-15T10:17:59",
              SITUACAO_LOTE: "REJEITADO",
              EXCLUIDO: 0,
              SEM_MOVIMENTO: 0,
              MENSAGEM_ERRO: "Tentativa rejeitada",
            },
            // Fechamento aceito anterior: com recibo válido
            {
              CODI_EMP: "999",
              TIPO_SERIE: "R-4000",
              EVENTO: "R-4099",
              COMPETENCIA: "2026-08",
              RECIBO: "1234567-02-4099-2608-1234567",
              DATA_HORA_ENVIO: "2026-09-14T16:16:42",
              SITUACAO_LOTE: "ACEITO",
              EXCLUIDO: 0,
              SEM_MOVIMENTO: 0,
              MENSAGEM_ERRO: null,
            },
          ] as unknown as T[];
        }

        return [] as T[];
      },
    };

    const extractor = new DominioReinfExtractor(mockClient);
    const result = await extractor.extract(
      { codiEmp: "999", cnpj: "00000000000000", razaoSocial: "EMPRESA EXEMPLO" },
      "2026-08",
    );

    // O fechamento ativo deve ser o aceito com recibo
    expect(result.fechamentoR4000).toBeDefined();
    expect(result.fechamentoR4000?.aceito).toBe(true);
    expect(result.fechamentoR4000?.recibo).toBe("1234567-02-4099-2608-1234567");
    expect(result.fechamentoR4000?.reabertoPosteriormente).toBe(false);

    // Deve conter aviso informativo sobre a tentativa rejeitada, mas SEM bloquear com pendências contraditórias
    expect(result.fechamentoR4000?.errosTransmissao?.length).toBeGreaterThan(0);
    expect(result.pendencias).toEqual([]);

    // Totalizadores devem ser extraídos
    expect(result.itens.length).toBe(2);
    const totalExtraido = result.itens.reduce((acc, it) => acc + it.valorDevido, 0);
    expect(Math.round(totalExtraido * 100) / 100).toBe(5712.15);
  });
});
