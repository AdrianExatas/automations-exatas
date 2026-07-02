export interface InputRow {
  rowNumber: number;
  empresa: string;
  usuario: string;
  senha: string;
}

export interface ParcelamentoItem {
  rowIndex: number;
  numeroDebito: string;
  consolidacao: string;
  descricao: string;
  totalConsolidacao: string;
  situacao: string;
}

export interface ParcelamentoDetalhe {
  consolidacao: string;
  parcelamento: string;
  parcelasTotais: string;
  parcelasJaPagas: number;
  numeroParcelaEmitida: number;
  totalParcelas: number;
  vencimento?: string;
}

export type ResultadoCalculo =
  | "rows_immediate"
  | "rows_after_retry_1"
  | "rows_after_retry_2"
  | "alert"
  | "timeout"
  | "modal_closed";

export type CategoriaErro =
  | "credencial"
  | "sem_consolidacao"
  | "listagem_timeout"
  | "calculo_timeout"
  | "download_timeout"
  | "overlay_modal"
  | "portal_alerta"
  | "erro_inesperado";

export type FaseErro = "login" | "listagem" | "modal" | "calculo" | "download" | "fechamento" | "geral";

export interface RunResult {
  rowNumber: number;
  empresa: string;
  usuario: string;
  consolidacao?: string;
  parcelamento?: string;
  parcelasTotais?: string;
  parcelasJaPagas?: number;
  numeroParcelaEmitida?: number;
  totalParcelas?: number;
  vencimento?: string;
  arquivoSalvo?: string;
  tempoCalculoMs?: number;
  tentativasCalculo?: number;
  resultadoCalculo?: ResultadoCalculo;
  tempoTentativa1Ms?: number;
  tempoTentativa2Ms?: number;
  categoriaErro?: CategoriaErro;
  faseErro?: FaseErro;
  tentativasProcessamento?: number;
  mensagemDiagnostico?: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  outputDir: string;
  headed: boolean;
}
