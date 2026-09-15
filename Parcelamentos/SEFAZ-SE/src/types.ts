export interface InputRow {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  inscricaoEstadual: string;
  cpf: string;
  saveDir: string;
}

export type SituacaoVencimento = "vencida" | "mes_atual" | "futura";

export type CriterioRotulo = "tela" | "fallback";

export type AutomationTransport = "browser" | "http" | "auto";

export type ResultTransport = "browser" | "http" | "http_fallback_browser";

export interface ParcelMetadata {
  portalRowId?: string;
  protocolo: string;
  vencimento: string;
  valorParcela: string;
  qtdeParcelas: number;
  parcelasPagas: number;
  parcelasAtrasadas: number;
  situacaoVencimento: SituacaoVencimento;
  parcelLabel: string;
  criterioRotulo: CriterioRotulo;
}

export interface RunResult {
  rowNumber: number;
  codigo: string;
  empresa?: string;
  cnpj?: string;
  protocolo?: string;
  vencimento: string;
  valorParcela?: string;
  qtdeParcelas?: number;
  parcelasPagas?: number;
  parcelasAtrasadas?: number;
  situacaoVencimento?: SituacaoVencimento;
  parcelLabel?: string;
  criterioRotulo?: CriterioRotulo;
  nomeOriginalPdf?: string;
  pdfPath?: string;
  toast?: string;
  transport?: ResultTransport;
  status: "sucesso" | "erro" | "ignorado";
  mensagem: string;
}

export interface CliOptions {
  inputPath: string;
  headed: boolean;
  browserChannel?: string;
  transport: AutomationTransport;
  mode: "run" | "http-map";
  rowNumber?: number;
  mapDir?: string;
}

export interface RunAutomationOptions {
  inputPath: string;
  cwd: string;
  headed: boolean;
  browserChannel?: string;
  transport?: AutomationTransport;
  mapDir?: string;
  log?: (message: string) => void;
  shouldCancel?: () => boolean;
  onProgress?: (progress: { current: number; total: number; label: string }) => void;
}

export interface RunAutomationResult {
  reportPath: string;
  successCount: number;
  errorCount: number;
  ignoredCount: number;
  cancelled?: boolean;
  results?: RunResult[];
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
