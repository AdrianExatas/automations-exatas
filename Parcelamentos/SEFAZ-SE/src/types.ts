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
  toast?: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  headed: boolean;
}

export interface GeneratedInputRow {
  codigo: string;
  empresa: string;
  cnpj: string;
  inscricaoEstadual: string;
  cpf: string;
  saveDir: string;
}

export interface ParsedCurlRequest {
  label: string;
  url: string;
  headers: string[];
  taskId: string | null;
}

export interface CurlExecutionResult {
  statusCode: number;
  body: string;
  stderr: string;
}
