export interface EmpresaBatchItem {
  cnpj: string;
  codigo: string;
  nome: string;
  solicitante: string;
  departamento: string;
  assunto: string;
  descricao: string;
  qtdArquivos?: number;
  arquivos: string[];
  onvioClientId?: string;
  onvioClientSource?: string;
  onvioRequesterId?: string;
  onvioDepartmentId?: string;
}

export type BatchInput = { empresas: EmpresaBatchItem[] } | { excelPath: string };

export type DownloadLogger = Pick<Console, "info" | "warn" | "error">;

export interface DownloadUnecontOptions {
  credentials: {
    email: string;
    senha: string;
  };
  input: BatchInput;
  browser?: {
    headless?: boolean;
    downloadDir?: string;
  };
  checkpointPath?: string;
  logger?: DownloadLogger;
  timeouts?: {
    defaultTimeoutSeconds?: number;
    shortTimeoutSeconds?: number;
    longTimeoutSeconds?: number;
  };
  loginUrl?: string;
  servicosTomadosUrl?: string;
}

export interface DownloadBatchItemResult {
  empresa: EmpresaBatchItem;
  status: "success" | "no_notas" | "not_found" | "failed" | "skipped";
  message?: string;
  filePath?: string;
}

export interface DownloadBatchResult {
  runId: string;
  downloadsDir: string;
  summary: {
    total: number;
    success: number;
    noNotas: number;
    notFound: number;
    failed: number;
    skipped: number;
  };
  items: DownloadBatchItemResult[];
}

export type ClassificacaoReinf =
  | "sem_fato_reinf"
  | "bloqueada_interacao"
  | "candidato_r2010"
  | "candidato_r4020"
  | "revisar_manual";

export interface ServicoTomadoDetalhe {
  situacao: string;
  dataCancelamento: string;
  codigoDescricaoServico: string;
  valorNfe: string;
  baseCalculo: string;
  situacaoCalculoRetencao: string;
  regimeTributarioPrestador: string;
  municipioPrestacao: string;
  validacoesTexto: string;
  perguntasPendentes: string[];
  retencoes: {
    iss: string;
    irrf: string;
    csrf: string;
    inss: string;
  };
  eventosTexto: string;
  totaisTexto: string;
  servicoTexto: string;
}

export interface NotaFiscalRow {
  numeroNfe: string;
  dataCompetencia: string;
  dataEmissaoNfe: string;
  dataCadastro: string;
  cnpjPrestador: string;
  prestador: string;
  valorNfe: string;
  valorLiquido: string;
  statusConferencia: "conferido" | "nao_conferido";
  situacaoRetencoes: string;
  unecontId?: string;
  cancelada?: boolean;
  origem?: string;
  situacaoNfts?: string;
  detalhe?: ServicoTomadoDetalhe;
  classificacao?: ClassificacaoReinf;
}

export interface CompetenciaTotais {
  competenciaLabel: string;
  quantidadeServicos: string;
  valorTotalNfe: string;
  valorTotalLiquido: string;
}

export interface ConferenciaNotasOptions {
  credentials: {
    email: string;
    senha: string;
  };
  input: BatchInput;
  browser?: {
    headless?: boolean;
  };
  checkpointPath?: string;
  outputDir?: string;
  /** Quantas vezes clicar em "mes anterior" antes de listar (padrao: 0 = mes atual da tela). */
  mesesAnteriores?: number;
  /** Ainda lista tudo; detalhe so das Nao Conferidas (padrao true). */
  somenteNaoConferidos?: boolean;
  /** Abre detalhe de ate 1 cancelada como amostra. */
  amostraCanceladas?: boolean;
  logger?: DownloadLogger;
  timeouts?: {
    defaultTimeoutSeconds?: number;
    shortTimeoutSeconds?: number;
    longTimeoutSeconds?: number;
  };
  loginUrl?: string;
  servicosTomadosUrl?: string;
}

export interface ConferenciaEmpresaStats {
  totalNotas: number;
  conferidos: number;
  naoConferidos: number;
  canceladas: number;
  ativasAbertas: number;
  bloqueadasInteracao: number;
  candidatosR2010: number;
  candidatosR4020: number;
  semFatoReinf: number;
  revisarManual: number;
}

export interface ConferenciaNotasItemResult {
  empresa: EmpresaBatchItem;
  status: "success" | "no_notas" | "not_found" | "failed" | "skipped";
  message?: string;
  notas: NotaFiscalRow[];
  totais?: CompetenciaTotais;
  stats?: ConferenciaEmpresaStats;
}

export interface ConferenciaNotasResult {
  runId: string;
  outputDir: string;
  csvPath: string;
  naoConferidosCsvPath: string;
  summaryPath: string;
  checklistPath: string;
  /** Rascunhos R-2010/R-4020 (JSON) — prepare-and-stop, sem transmissao. */
  eventosJsonPath: string;
  /** Rascunhos R-2010/R-4020 (CSV plano para Excel). */
  eventosCsvPath: string;
  summary: {
    total: number;
    success: number;
    noNotas: number;
    notFound: number;
    failed: number;
    skipped: number;
    totalNotas: number;
    naoConferidos: number;
    canceladas: number;
    bloqueadasInteracao: number;
    candidatosR2010: number;
    candidatosR4020: number;
  };
  items: ConferenciaNotasItemResult[];
}
