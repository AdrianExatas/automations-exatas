import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { SqliteStorage } from "../../Dominio/reinf-dctfweb-conferencia/src/storage/sqlite.ts";
import { ConferenciaOrchestrator } from "../../Dominio/reinf-dctfweb-conferencia/src/orchestrator.ts";
import { DominioMockAdapter } from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/mock_adapter.ts";
import type { ReconciliationResult } from "../../Dominio/reinf-dctfweb-conferencia/src/types.ts";
import { unlinkSync, existsSync } from "fs";

describe("Persistência e Cache de Consultas SERPRO (Economia e Rastreabilidade)", () => {
  let storage: SqliteStorage;

  beforeEach(() => {
    storage = new SqliteStorage(":memory:");
  });

  afterEach(() => {
    storage.close();
  });

  test("salva e recupera resultado de conciliação com data e marcação de cache", () => {
    const mockResult: ReconciliationResult = {
      empresa: {
        codiEmp: "10",
        cnpj: "12345678000199",
        razaoSocial: "EMPRESA TESTE PERSISTENCIA LTDA",
      },
      competencia: "2026-08",
      status: "CONFORME",
      totalDominioOrigem6: 1500,
      totalDctfwebOrigem6: 1500,
      diferencaOrigem6: 0,
      totalDominioOrigem7: 350,
      totalDctfwebOrigem7: 350,
      diferencaOrigem7: 0,
      totalGeralDominio: 1850,
      totalGeralDctfweb: 1850,
      diferencaGeral: 0,
      reciboDctfweb: "RECIBO-DCTF-999888",
      fechamentosUtilizados: [],
      pendencias: [],
      mensagens: [],
      detalhes: [],
      dataUltimaConsulta: "2026-09-14T16:30:00.000Z",
      origemConsulta: "SERPRO_LIVE",
    };

    storage.saveCompanyResult(mockResult);

    const retrieved = storage.getCompanyResult("10", "2026-08");
    expect(retrieved).not.toBeNull();
    expect(retrieved!.empresa.codiEmp).toBe("10");
    expect(retrieved!.competencia).toBe("2026-08");
    expect(retrieved!.status).toBe("CONFORME");
    expect(retrieved!.totalGeralDominio).toBe(1850);
    expect(retrieved!.totalGeralDctfweb).toBe(1850);
    expect(retrieved!.reciboDctfweb).toBe("RECIBO-DCTF-999888");
    expect(retrieved!.dataUltimaConsulta).toBe("2026-09-14T16:30:00.000Z");
    expect(retrieved!.origemConsulta).toBe("CACHE_PERSISTIDO");
  });

  test("recupera todas as empresas persistidas de uma competência via getPersistedResultsByCompetencia", () => {
    const r1: ReconciliationResult = {
      empresa: { codiEmp: "1", cnpj: "11111111000111", razaoSocial: "EMP 1" },
      competencia: "2026-08",
      status: "CONFORME",
      totalDominioOrigem6: 100,
      totalDctfwebOrigem6: 100,
      diferencaOrigem6: 0,
      totalDominioOrigem7: 0,
      totalDctfwebOrigem7: 0,
      diferencaOrigem7: 0,
      totalGeralDominio: 100,
      totalGeralDctfweb: 100,
      diferencaGeral: 0,
      fechamentosUtilizados: [],
      pendencias: [],
      mensagens: [],
      detalhes: [],
    };

    const r2: ReconciliationResult = {
      empresa: { codiEmp: "2", cnpj: "22222222000122", razaoSocial: "EMP 2" },
      competencia: "2026-08",
      status: "DIVERGENTE",
      totalDominioOrigem6: 200,
      totalDctfwebOrigem6: 180,
      diferencaOrigem6: 20,
      totalDominioOrigem7: 0,
      totalDctfwebOrigem7: 0,
      diferencaOrigem7: 0,
      totalGeralDominio: 200,
      totalGeralDctfweb: 180,
      diferencaGeral: 20,
      fechamentosUtilizados: [],
      pendencias: [],
      mensagens: [],
      detalhes: [],
    };

    storage.saveCompanyResult(r1);
    storage.saveCompanyResult(r2);

    const list = storage.getPersistedResultsByCompetencia("2026-08");
    expect(list.length).toBe(2);
    expect(list.map((x) => x.empresa.codiEmp).sort()).toEqual(["1", "2"]);
    expect(list[0].origemConsulta).toBe("CACHE_PERSISTIDO");
  });

  test("Orquestrador reaproveita cache evitando chamada ao SERPRO quando forceRefresh=false", async () => {
    let mockSerproCalls = 0;
    const mockProvider = async (_cnpj: string, _comp: string) => {
      mockSerproCalls++;
      return `
        <ProcDctf versao="1.0" xmlns="http://www.serpro.gov.br/dctfweb">
          <retConsSitDctf>
            <reciboEntrega>
              <numeroRecibo>REC-CACHE-TEST</numeroRecibo>
            </reciboEntrega>
          </retConsSitDctf>
        </ProcDctf>
      `;
    };

    const dominioMock = new DominioMockAdapter();
    const orchestrator = new ConferenciaOrchestrator({
      dominioClient: dominioMock,
      sqliteStorage: storage,
      mockDctfwebProvider: mockProvider,
    });

    // 1ª Execução: Cache vazio -> Chama provedor SERPRO e salva em cache
    const res1 = await orchestrator.reconcileCompany("2026-01", "101", false);
    expect(mockSerproCalls).toBe(1);
    expect(res1.origemConsulta).toBe("SERPRO_LIVE");
    expect(res1.dataUltimaConsulta).toBeDefined();

    // 2ª Execução: forceRefresh = false -> Retorna direto do SQLite (0 novas chamadas)
    const res2 = await orchestrator.reconcileCompany("2026-01", "101", false);
    expect(mockSerproCalls).toBe(1); // Continua 1, não incrementou!
    expect(res2.origemConsulta).toBe("CACHE_PERSISTIDO");
    expect(res2.dataUltimaConsulta).toBe(res1.dataUltimaConsulta);

    // 3ª Execução: forceRefresh = true -> Ignora cache e bate no SERPRO novamente
    const res3 = await orchestrator.reconcileCompany("2026-01", "101", true);
    expect(mockSerproCalls).toBe(2); // Incrementou!
    expect(res3.origemConsulta).toBe("SERPRO_LIVE");
  });

  test("estimativa de chamadas deduz empresas em cache e previne consumo desnecessário", async () => {
    const dominioMock = new DominioMockAdapter();
    const orchestrator = new ConferenciaOrchestrator({
      dominioClient: dominioMock,
      sqliteStorage: storage,
    });

    // Inicialmente cache vazio
    const est1 = await orchestrator.estimateSerproCalls("2026-01", false, false);
    expect(est1.totalEmCache).toBe(0);
    expect(est1.chamadasEstimadas).toBe(est1.totalEmpresas);

    // Persistir 1 empresa
    storage.saveCompanyResult({
      empresa: { codiEmp: "101", cnpj: "11222333000144", razaoSocial: "ALFA SERVICOS DE ENGENHARIA LTDA" },
      competencia: "2026-01",
      status: "CONFORME",
      totalDominioOrigem6: 0,
      totalDctfwebOrigem6: 0,
      diferencaOrigem6: 0,
      totalDominioOrigem7: 0,
      totalDctfwebOrigem7: 0,
      diferencaOrigem7: 0,
      totalGeralDominio: 0,
      totalGeralDctfweb: 0,
      diferencaGeral: 0,
      fechamentosUtilizados: [],
      pendencias: [],
      mensagens: [],
      detalhes: [],
    });

    // Estimativa com cache
    const est2 = await orchestrator.estimateSerproCalls("2026-01", false, false);
    expect(est2.totalEmCache).toBe(1);
    expect(est2.chamadasEstimadas).toBe(est2.totalEmpresas - 1);

    // Estimativa forçando atualização
    const estForce = await orchestrator.estimateSerproCalls("2026-01", false, true);
    expect(estForce.chamadasEstimadas).toBe(estForce.totalEmpresas);
  });
});
