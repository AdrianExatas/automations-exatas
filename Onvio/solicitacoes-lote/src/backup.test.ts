import { describe, expect, it } from "vitest";
import { buildBackupFromBatchResult, parseBackupSolicitacoes } from "./backup";
import type { ServiceRequestBatchResult } from "@exatas/onvio-solicitacoes-servico";

describe("backup solicitacoes", () => {
  it("gera backup apenas com sucessos e ticketId", () => {
    const result = {
      summary: { total: 2, success: 1, failed: 1, skipped: 0 },
      items: [
        {
          status: "success",
          ticketId: "T-1",
          attachmentCount: 1,
          serviceRequest: {
            cnpj: "1",
            codigo: "358",
            nome: "INOVAR",
            solicitante: "Egon",
            departamento: "SETOR FISCAL",
            assunto: "Teste",
            descricao: "Desc",
            arquivos: [],
          },
        },
        {
          status: "failed",
          message: "erro",
          serviceRequest: {
            cnpj: "2",
            codigo: "999",
            nome: "OUTRA",
            solicitante: "X",
            departamento: "SETOR FISCAL",
            assunto: "Teste",
            descricao: "Desc",
            arquivos: [],
          },
        },
      ],
    } as ServiceRequestBatchResult;

    const backup = buildBackupFromBatchResult(result, { planilhaPath: "x.xlsx" });
    expect(backup.tipo).toBe("backup-solicitacoes-lote-v1");
    expect(backup.summary.reversible).toBe(1);
    expect(backup.items).toEqual([
      expect.objectContaining({ ticketId: "T-1", codigo: "358", attachmentCount: 1 }),
    ]);
    expect(parseBackupSolicitacoes(backup).items).toHaveLength(1);
  });
});
