export interface InputRow {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  inscricaoEstadual: string;
  /** Preenchido no modo legado (planilha com parcela especifica). */
  numeroParcelamento?: string;
  parcela?: string;
  vencimento?: string;
  tipoReceita: string;
  saveDir: string;
}

export type SituacaoVencimento = "vencida" | "mes_atual" | "futura";

export interface ParcelCandidate {
  numeroParcelamento: string;
  parcela: string;
  vencimento: string;
  situacaoVencimento: SituacaoVencimento;
  rowName: string;
}

export interface RunResult {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  numeroParcelamento?: string;
  parcela?: string;
  vencimento: string;
  situacaoVencimento?: SituacaoVencimento;
  nomeOriginalPdf?: string;
  pdfPath?: string;
  status: "sucesso" | "erro" | "ignorado";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  headed: boolean;
}

export interface RunAutomationOptions {
  inputPath: string;
  cwd: string;
  headed: boolean;
  browserChannel?: string;
  log?: (message: string) => void;
  shouldCancel?: () => boolean;
  onProgress?: (progress: { current: number; total: number; label: string }) => void;
}

export interface RunAutomationResult {
  reportPath: string;
  successCount: number;
  errorCount: number;
  ignoredCount: number;
  cancelled: boolean;
  results: RunResult[];
}
