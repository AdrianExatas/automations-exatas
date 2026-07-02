export interface HtmlForm {
  url: string;
  actionUrl: string;
  method: "GET" | "POST";
  fields: Record<string, string[]>;
  selectOptions: Record<string, Record<string, string>>;
  submitButtons: Record<string, string>;
  title?: string;
  rawHtml: string;
}

export interface DownloadInfo {
  url: string;
  nmArquivo: string;
  situacao: string;
  tipoDownload: string;
  dtSolicitacao?: string;
  filePath?: string;
  rowText: string;
}

export interface DownloadListingPage {
  url: string;
  currentPage?: number;
  downloads: DownloadInfo[];
  pageLinks: Record<number, string>;
  nextPageUrl?: string;
  newRequestUrl?: string;
}

export interface SolicitacaoResultado {
  sucesso: boolean;
  mensagem: string;
  aviso?: string;
  pageUrl?: string;
}

export interface UploadResult {
  total: number;
  enviados: number;
  existentes: number;
  erros: number;
  erro?: string;
}
