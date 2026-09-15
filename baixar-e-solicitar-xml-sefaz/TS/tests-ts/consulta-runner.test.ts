import { describe, expect, it } from "bun:test";
import { aplicarResultadoSolicitacao } from "../src-ts/consulta/resultado.js";

function historicoVazio() {
  return {
    empresas: {} as Record<string, { ultima_data_processada?: string }>,
    ultima_execucao: null as string | null,
    versao: "1.0",
  };
}

describe("consulta runner historico", () => {
  it("nao avanca o historico quando a solicitacao retorna sucesso false", () => {
    const historico = historicoVazio();
    const atualizou = aplicarResultadoSolicitacao({
      resultado: { sucesso: false, mensagem: "Periodo rejeitado" },
      historico,
      chaveHistorico: "123_NFE_Emitida",
      dataProcessada: new Date(2026, 0, 10),
      tipoArquivo: "NFE",
      pesquisarPor: "Emitida",
    });

    expect(atualizou).toBe(false);
    expect(historico.empresas).toEqual({});
  });

  it("avanca o historico quando a solicitacao conclui com sucesso", () => {
    const historico = historicoVazio();
    const atualizou = aplicarResultadoSolicitacao({
      resultado: { sucesso: true, mensagem: "Solicitacao concluida com sucesso" },
      historico,
      chaveHistorico: "123_NFE_Emitida",
      dataProcessada: new Date(2026, 0, 10),
      tipoArquivo: "NFE",
      pesquisarPor: "Emitida",
    });

    expect(atualizou).toBe(true);
    expect(historico.empresas["123_NFE_Emitida"]?.ultima_data_processada).toBe("2026-01-10");
  });
});
