export type UfCode = "AL" | "PI" | "SE";
export type UfSelection = UfCode | "ALL";
export type InputMode = "sheet" | "paste";
export type ResultStatus = "sucesso" | "erro" | "ignorado";

export interface ProgressEvent {
  current: number;
  total: number;
  label: string;
  uf?: UfCode;
}

export interface NormalizedResult {
  uf: UfCode;
  rowNumber: number;
  identificador: string;
  empresa?: string;
  cnpj?: string;
  detalhe?: string;
  status: ResultStatus;
  mensagem: string;
  arquivo?: string;
}

export interface AdapterRunResult {
  uf: UfCode;
  reportPath: string;
  successCount: number;
  errorCount: number;
  ignoredCount: number;
  cancelled: boolean;
  results: NormalizedResult[];
}

export interface OrchestratorResult {
  ok: boolean;
  cancelled: boolean;
  successCount: number;
  errorCount: number;
  ignoredCount: number;
  reportPath: string;
  downloadDir: string;
  results: NormalizedResult[];
  perUf: AdapterRunResult[];
}

export interface RunRequest {
  ufs: UfCode[];
  inputMode: InputMode;
  sheetPath?: string;
  pastedText?: string;
  downloadDir: string;
  headed: boolean;
}

export interface SheetPreviewRow {
  rowNumber: number;
  summary: string;
}

export interface InspectResult {
  ok: boolean;
  error?: string;
  rowCount?: number;
  preview?: SheetPreviewRow[];
  uf?: UfCode;
}
