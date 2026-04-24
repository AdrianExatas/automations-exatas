export interface InputRow {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  inscricaoEstadual: string;
  numeroParcelamento: string;
  parcela: string;
  vencimento: string;
  tipoReceita: string;
  saveDir: string;
}

export interface RunResult {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  numeroParcelamento?: string;
  parcela?: string;
  vencimento: string;
  nomeOriginalPdf?: string;
  pdfPath?: string;
  status: "sucesso" | "erro";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  headed: boolean;
}
