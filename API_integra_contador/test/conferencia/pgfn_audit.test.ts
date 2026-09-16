import { describe, expect, it } from "bun:test";
import { SqliteStorage } from "../../Dominio/reinf-dctfweb-conferencia/src/storage/sqlite.ts";

describe("Auditoria PGFN e Validações de Acordos", () => {
  it("valida match de pagamento por receitaPrincipalCodigo e valor", () => {
    const record = {
      codigo_receita: "1734",
      valor_parcela: 450.0,
    };
    const codigosPgfn = [record.codigo_receita || "1734", "1734", "4270", "5029", "5035"];

    const pagamentos = [
      {
        receitaPrincipalCodigo: "1734",
        valorTotal: 450.0,
        dataArrecadacao: "2026-08-25",
      },
    ];

    const match = pagamentos.find((p: any) => {
      const recCode = String(p.receitaPrincipalCodigo || p.codigoReceita || p.receita || "");
      const matchReceita = recCode ? codigosPgfn.some((c) => recCode.includes(c) || c.includes(recCode)) : false;
      const matchValor = p.valorTotal && Math.abs(Number(p.valorTotal) - Number(record.valor_parcela || 0)) < 1.0;
      return matchReceita || matchValor;
    });

    expect(match).toBeDefined();
    expect(match?.dataArrecadacao).toBe("2026-08-25");
  });

  it("persiste acordo PGFN no banco e atualiza resultado de auditoria", () => {
    const storage = new SqliteStorage(":memory:");
    const id = storage.saveParcelamentoPgfn({
      cnpj: "00000000000000",
      numero_negociacao: "80.999.888-1",
      modalidade: "Transação por Edital PGDAU",
      valor_parcela: 600.0,
      dia_vencimento: 28,
      codigo_receita: "1734",
      observacoes: "Acordo de teste",
    });

    expect(id).toBeGreaterThan(0);
    const acordo = storage.getParcelamentoPgfn(id);
    expect(acordo).toBeDefined();
    expect(acordo?.status).toBe("EM_DIA");

    storage.updateParcelamentoPgfnAuditoria(id, "RISCO_RESCISAO", "Pendências PGFN detectadas");
    const atualizado = storage.getParcelamentoPgfn(id);
    expect(atualizado?.status).toBe("RISCO_RESCISAO");
    expect(atualizado?.detalhes_auditoria).toContain("Pendências PGFN");
  });
});
