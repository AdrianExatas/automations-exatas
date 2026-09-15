import type { HistoricoConsulta } from "./historico.js";
import type { SolicitacaoResultado } from "../types.js";
import { formatDateIso } from "../utils/dates.js";

function atualizarHistoricoEmMemoria(
  historico: HistoricoConsulta,
  inscricao: string,
  dataProcessada: Date,
  tipoArquivo: string,
  pesquisarPor: string,
): void {
  const key = String(inscricao);
  historico.empresas[key] = {
    ...(historico.empresas[key] ?? {}),
    ultima_data_processada: formatDateIso(dataProcessada),
    ultima_atualizacao: new Date().toISOString(),
    tipo_arquivo: tipoArquivo,
    pesquisar_por: pesquisarPor,
  };
}

export function aplicarResultadoSolicitacao(options: {
  resultado: SolicitacaoResultado;
  historico: HistoricoConsulta;
  chaveHistorico: string;
  dataProcessada: Date;
  tipoArquivo: string;
  pesquisarPor: string;
}): boolean {
  if (!options.resultado.sucesso) {
    return false;
  }
  atualizarHistoricoEmMemoria(
    options.historico,
    options.chaveHistorico,
    options.dataProcessada,
    options.tipoArquivo,
    options.pesquisarPor,
  );
  return true;
}
