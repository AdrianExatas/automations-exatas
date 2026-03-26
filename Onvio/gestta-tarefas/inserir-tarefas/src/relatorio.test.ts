import fs from "fs";
import os from "os";
import path from "path";
import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";
import { RelatorioExecucao, salvarRelatorioXlsx } from "./relatorio";

describe("relatorio", () => {
  it("salva XLSX com abas de eventos e falhas HTTP sem exceder o limite do Excel", () => {
    const originalCwd = process.cwd();
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "gestta-relatorio-"));

    try {
      process.chdir(tempDir);

      const textoLongo = "x".repeat(40000);
      const relatorio: RelatorioExecucao = {
        execucao: {
          inicio: "2026-03-18T15:00:00.000Z",
          fim: "2026-03-18T15:10:00.000Z",
          planilha: "C:\\temp\\planilha.xlsx",
          dryRun: false,
          totalTarefas: 1,
          sucesso: 0,
          falha: 1,
        },
        resultados: [
          {
            tarefaPlanilha: "PROVISÃƒO",
            tarefaGestta: "PROVISÃƒO",
            taskId: "task-1",
            dryRun: false,
            sucesso: false,
            totalEmpresasPlanilha: 1,
            vinculosAtuais: 1,
            vinculosFinais: 1,
            extras: 0,
            inclusoes: 0,
            patchLinks: 0,
            patchGrupos: 0,
            mensagem: textoLongo,
            etapaFalha: "aguardarResponsavel",
            detalhes: [textoLongo],
            responsaveisResolvidos: [
              {
                responsavel: "Maria Silva",
                userId: "user-1",
                origem: "gestta",
              },
            ],
            vinculosAtuaisDetalhes: [],
            extrasPlanejados: [],
            inclusoesSolicitadas: [],
            pendenciasConfiguracao: [],
            divergenciasResponsavel: [],
            extrasRemovidos: [],
            falhasHttp: [
              {
                customerId: "customer-1",
                customerName: "Empresa 1",
                cnpj: "11111111000111",
                etapa: "aguardar-propagacao",
                tentativas: 4,
                ultimoErro: textoLongo,
              },
            ],
            timeline: [
              {
                timestamp: "2026-03-18T15:00:00.000Z",
                nivel: "info",
                etapa: "iniciar",
                tarefa: "PROVISÃƒO",
                mensagem: textoLongo,
              },
              {
                timestamp: "2026-03-18T15:05:00.000Z",
                nivel: "error",
                etapa: "aguardar-propagacao",
                tarefa: "PROVISÃƒO",
                customerId: "customer-1",
                customerName: "Empresa 1",
                cnpj: "11111111000111",
                mensagem: textoLongo,
              },
            ],
            progressoEtapas: {
              inclusoesSolicitadas: 0,
              configuracoesConfirmadas: 1,
              responsaveisValidados: 0,
              empresasComErro: 1,
            },
          },
        ],
      };

      const caminhoXlsx = salvarRelatorioXlsx(
        relatorio,
        path.join(tempDir, "relatorios", "execucao_2026-03-18_15-10-00.json"),
      );

      expect(caminhoXlsx).not.toBeNull();
      expect(fs.existsSync(caminhoXlsx!)).toBe(true);

      const workbook = XLSX.readFile(caminhoXlsx!);
      expect(workbook.SheetNames).toContain("Resultados");
      expect(workbook.SheetNames).toContain("Eventos");
      expect(workbook.SheetNames).toContain("FalhasHTTP");

      const resultados = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Resultados);
      expect(resultados).toHaveLength(1);
      expect(resultados[0].mensagem.length).toBeLessThanOrEqual(32000);
      expect("timeline" in resultados[0]).toBe(false);

      const eventos = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.Eventos);
      expect(eventos).toHaveLength(2);
      expect(eventos[1].customerName).toBe("Empresa 1");
      expect(eventos[1].mensagem.length).toBeLessThanOrEqual(32000);

      const falhasHttp = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets.FalhasHTTP);
      expect(falhasHttp).toHaveLength(1);
      expect(falhasHttp[0].customerName).toBe("Empresa 1");
      expect(falhasHttp[0].ultimoErro.length).toBeLessThanOrEqual(32000);
    } finally {
      process.chdir(originalCwd);
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
