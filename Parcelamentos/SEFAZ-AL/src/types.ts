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
}

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
  arquivoSalvo?: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  outputDir: string;
  headed: boolean;
}
