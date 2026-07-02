export type LogCallback = (message: string) => void;

export interface DownloadPeriodInput {
  login: string;
  password: string;
  startDate: string;
  endDate: string;
  outputDir: string;
  onLog?: LogCallback;
}

export interface DownloadResult {
  totalNotas: number;
  baixados: number;
  pulados: number;
  erros: number;
  destino: string;
}

export interface FilterFields {
  pesquisa: string;
  startDate: string;
  startCurrentMonth: string;
  endDate: string;
  endCurrentMonth: string;
  exercise: string;
  status: string;
  formMarker: string;
  autoScroll: string;
  viewState: string;
  submitName: string;
}

export interface NotaFiscal {
  codigo: string;
  numero: string;
  exercicio: string;
  contribuinte: string;
  destinatario: string;
  emissao: string;
  total: string;
  xmlActionName: string;
}

export interface NotaPage {
  tableId: string;
  currentPage: number;
  pageLinks: Set<number>;
  hasNext: boolean;
  notas: NotaFiscal[];
  viewState: string;
}
