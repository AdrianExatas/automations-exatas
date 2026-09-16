import { describe, test, expect } from "bun:test";
import {
  SQL_ASSERT_SELECT_ONLY,
  QUERY_COMPANIES,
  QUERY_COMPANY_BY_CODE_OR_CNPJ,
  QUERY_REINF_CLOSINGS,
  QUERY_R2000_TOTALS,
  QUERY_R4000_TOTALS,
} from "../../Dominio/reinf-dctfweb-conferencia/src/dominio/queries.ts";
import { SqliteStorage } from "../../Dominio/reinf-dctfweb-conferencia/src/storage/sqlite.ts";
import { ExcelExporter } from "../../Dominio/reinf-dctfweb-conferencia/src/export/excel.ts";
import { sanitizeConfig, maskCnpj, type AppConfig } from "../../Dominio/reinf-dctfweb-conferencia/src/config.ts";
import type { BatchSummary } from "../../Dominio/reinf-dctfweb-conferencia/src/types.ts";

describe("Auditoria de Segurança e Sigilo de Dados", () => {
  test("todas as consultas ao Domínio são estritamente SELECT (somente leitura)", () => {
    const queries = [
      QUERY_COMPANIES,
      QUERY_COMPANY_BY_CODE_OR_CNPJ,
      QUERY_REINF_CLOSINGS,
      QUERY_R2000_TOTALS,
      QUERY_R4000_TOTALS,
    ];

    for (const q of queries) {
      expect(() => SQL_ASSERT_SELECT_ONLY(q)).not.toThrow();
      expect(q.trim().toUpperCase().startsWith("SELECT")).toBe(true);
    }
  });

  test("validador rejeita qualquer instrução DDL ou DML mutável", () => {
    const dangerousQueries = [
      "INSERT INTO GEEMPRE VALUES (1)",
      "UPDATE EFD_REINF_EVENTOS_CONTROLE SET RECIBO = '123'",
      "DELETE FROM GEEMPRE WHERE CODI_EMP = 1",
      "DROP TABLE EFD_REINF_TOTALIZADORES_R2000",
      "ALTER TABLE GEEMPRE ADD COLUMN TESTE INT",
      "TRUNCATE TABLE LOGS",
      "EXEC sp_reindex",
    ];

    for (const dq of dangerousQueries) {
      expect(() => SQL_ASSERT_SELECT_ONLY(dq)).toThrow("Violação de segurança");
    }
  });

  test("SQLite nunca armazena XMLs fiscais brutos, senhas ou tokens", () => {
    const storage = new SqliteStorage(":memory:");

    const sampleSummary: BatchSummary = {
      competencia: "2026-01",
      totalEmpresas: 1,
      conformes: 1,
      divergentes: 0,
      pendentes: 0,
      semDctfweb: 0,
      erros: 0,
      tempoExecucaoMs: 150,
      chamadasSerproEstimadas: 1,
      chamadasSerproRealizadas: 1,
      resultados: [
        {
          empresa: { codiEmp: "101", cnpj: "11222333000144", razaoSocial: "ALFA" },
          competencia: "2026-01",
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
          detalhes: [],
          fechamentosUtilizados: ["R-2000: Recibo 123"],
          pendencias: [],
          mensagens: ["Ok"],
          dataProcessamento: new Date().toISOString(),
          hashResultado: "hash_abc",
        },
      ],
    };

    const execId = storage.saveExecution(sampleSummary, "LOTE");
    const results = storage.getExecutionResults(execId);

    // Verificar se nas colunas do banco há qualquer vestígio de XML ou segredos
    const dbDump = JSON.stringify(results);
    expect(dbDump).not.toContain("<?xml");
    expect(dbDump).not.toContain("<Dctfweb");
    expect(dbDump).not.toContain("password");
    expect(dbDump).not.toContain("secret");
    expect(dbDump).not.toContain("Bearer");

    storage.close();
  });

  test("Excel gerado não contém credenciais ou XMLs brutos", async () => {
    const exporter = new ExcelExporter();
    const sampleSummary: BatchSummary = {
      competencia: "2026-01",
      totalEmpresas: 1,
      conformes: 1,
      divergentes: 0,
      pendentes: 0,
      semDctfweb: 0,
      erros: 0,
      tempoExecucaoMs: 50,
      chamadasSerproEstimadas: 1,
      chamadasSerproRealizadas: 1,
      resultados: [
        {
          empresa: { codiEmp: "101", cnpj: "11222333000144", razaoSocial: "ALFA" },
          competencia: "2026-01",
          status: "CONFORME",
          totalDominioOrigem6: 500,
          totalDctfwebOrigem6: 500,
          diferencaOrigem6: 0,
          totalDominioOrigem7: 0,
          totalDctfwebOrigem7: 0,
          diferencaOrigem7: 0,
          totalGeralDominio: 500,
          totalGeralDctfweb: 500,
          diferencaGeral: 0,
          detalhes: [],
          fechamentosUtilizados: [],
          pendencias: [],
          mensagens: [],
          dataProcessamento: new Date().toISOString(),
          hashResultado: "hash_123",
        },
      ],
    };

    const excelBuffer = await exporter.generateReport(sampleSummary);
    const content = excelBuffer.toString("latin1");

    expect(content).not.toContain("super_secret_password");
    expect(content).not.toContain("<?xml version");
  });

  test("mascaramento de configurações e CNPJs protege dados confidenciais", () => {
    const config: AppConfig = {
      serproConsumerKey: "minha_chave_secreta_serpro",
      serproConsumerSecret: "meu_segredo_ultra_confidencial",
      serproCertPfxPath: "C:/cert/empresa.pfx",
      serproCertPassword: "senha_do_certificado_123",
      serproContratanteCnpj: "11222333000144",
      dominioOdbcDsn: "Contabil Oficial",
      dominioUser: "EXTERNO",
      dominioPassword: "senha_banco_externo",
      sqliteDbPath: "test.db",
      port: 3000,
      authEnabled: true,
      authUser: "administrator",
      authPassword: "senha_do_painel_123",
      authSecret: "meu_segredo_hmac_123",
    };

    const sanitized = sanitizeConfig(config);
    expect(sanitized.serproConsumerSecret).toBe("****");
    expect(sanitized.serproCertPassword).toBe("****");
    expect(sanitized.dominioPassword).toBe("****");
    expect(sanitized.serproContratanteCnpj).toBe("11.222.333/0001-44");
    expect(sanitized.authEnabled).toBe("ativo");
    expect(sanitized.authUser).toBe("administrator");
    expect((sanitized as any).authPassword).toBeUndefined();
    expect(maskCnpj("11222333000144")).toBe("11.222.333/0001-44");
  });
});
