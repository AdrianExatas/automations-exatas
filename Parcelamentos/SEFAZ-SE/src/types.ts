export interface InputRow {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  inscricaoEstadual: string;
  cpf: string;
  saveDir: string;
}

export interface ParcelMetadata {
  protocolo: string;
  vencimento: string;
  valorParcela: string;
  qtdeParcelas: number;
  parcelasPagas: number;
  parcelasAtrasadas: number;
  parcelLabel: string;
}

export interface RunResult {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  protocolo?: string;
  vencimento: string;
  valorParcela?: string;
  parcelLabel?: string;
  nomeOriginalPdf?: string;
  pdfPath?: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  headed: boolean;
}
