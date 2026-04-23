export type ReportFormat = "pdf" | "xls";

export type Company = {
  inscricao: string;
  nome: string;
};

export type Competencia = {
  year: number;
  month: number;
  value: string;
  monthSelectValue: string;
};

export type RunConfig = {
  user: string;
  password: string;
  competencia: Competencia;
  formats: ReportFormat[];
  outDir: string;
  limit?: number;
  headless?: boolean;
  timeoutMs: number;
};

export type ReportEntry = {
  inscricao: string;
  empresa: string;
  competencia: string;
  formato: ReportFormat;
  status: "sucesso" | "erro";
  path?: string;
  mensagem?: string;
  via: "http" | "playwright";
};

export type DownloadResult = {
  bytes: Uint8Array;
  suggestedFilename?: string;
  contentType?: string;
};
