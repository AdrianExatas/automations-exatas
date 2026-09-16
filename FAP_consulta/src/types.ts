export type BrowserMode = "cdp" | "playwright";

export interface AppConfig {
  certificatePath: string;
  certificatePassword: string;
  procuratorCnpj: string;
  outputDir: string;
  captchaTimeoutMs: number;
  requestDelayMs: number;
  browserMode: BrowserMode;
  fapAnoVigencia?: number;
  dominioDsn?: string;
  dominioUser?: string;
  dominioPassword?: string;
  filterDominioActive?: boolean;
}

export interface DominioCompany {
  codiEmp: number;
  cnpj: string;
  corporateName: string;
  status: string;
}

export interface FapEmpresaVinculada {
  cnpj: string;
  razaoSocial: string;
  dataCriacao?: string;
}

export interface FapProcuracaoDireta {
  cnpj: string;
  nome: string;
  tipoProcuracao?: {
    codigo: string;
    descricao: string;
  };
}

export interface TargetCompany {
  cnpj: string;
  cnpjRaiz: string;
  corporateName: string;
  source: "govbr_vinculadas" | "fap_procuracoes" | "spe" | "dominio" | "manual";
}

export interface FapEstabelecimentoInfo {
  anoVigencia: number;
  cnpj: number | string;
  cnpjRaiz: number | string;
  razaoSocial: string;
  dataInicioAtividade?: string;
  dataSituacaoRFB?: string;
  bloqueado?: boolean;
  reprocessadoPorEstabelecimento?: boolean;
  efeitoSuspensivo?: boolean;
  logradouro?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

export interface FapCalculoItem {
  id?: number;
  anoVigencia: number;
  cnpj: number | string;
  cnpjRaiz: number | string;
  cnae?: {
    subClasse: number | string;
    descricao: string;
  };
  dataProcessamento?: string;
  tipoProcessamento?: string;
  indiceComposto?: string | number;
  fapOriginal?: string | number;
  fap: string | number;
  quantidadeCat?: number;
  quantidadeB91?: number;
  quantidadeB92?: number;
  quantidadeB93?: number;
  quantidadeB94?: number;
  valorTotalMassaSalarial?: string | number;
  mediaVinculos?: string | number;
  valorTotalBeneficiosPagos?: string | number;
  quantidadeEmpresasValidasCnae?: number;
  quantidadeEmpresasTotalCnae?: number;
  taxaMediaRotatividade?: string | number;
  indiceFrequencia?: string | number;
  indiceGravidade?: string | number;
  indiceCusto?: string | number;
  ordemFrequencia?: string | number;
  ordemGravidade?: string | number;
  ordemCusto?: string | number;
  percentilFrequencia?: string | number;
  percentilGravidade?: string | number;
  percentilCusto?: string | number;
  indiceCompostoDetalhamento?: string | number;
  fapOriginalDetalhamento?: string | number;
}

export interface FapVigenciaDetalhe {
  anoVigencia: number;
  consultaCompetencia: string;
  inicioPeriodoBase?: string;
  fimPeriodoBase?: string;
  dataInicioContestacao?: string;
  dataFimContestacao?: string;
  portariaFap?: string;
  situacao?: string;
}

export interface FapEstabelecimentoResult {
  dominioCode: number | null;
  cnpjRaiz: string;
  cnpj: string;
  razaoSocial: string;
  anoVigencia: number;
  consultaCompetencia: string;
  fap: number | string;
  fapOriginal: number | string;
  cnaeSubclasse: string;
  cnaeDescricao: string;
  dataProcessamento: string;
  tipoProcessamento: string;
  taxaRotatividade: number | string;
  massaSalarial: number | string;
  mediaVinculos: number | string;
  beneficiosPagos: number | string;
  quantidadeCat: number;
  quantidadeB91: number;
  quantidadeB92: number;
  quantidadeB93: number;
  quantidadeB94: number;
  indiceFrequencia: number | string;
  indiceGravidade: number | string;
  indiceCusto: number | string;
  percentilFrequencia: number | string;
  percentilGravidade: number | string;
  percentilCusto: number | string;
  bloqueado: boolean;
  reprocessado: boolean;
  mensagens: string;
  status: "processado" | "sem_calculo" | "falha";
}

export interface FapEmpresaSummary {
  dominioCode: number | null;
  cnpjRaiz: string;
  corporateName: string;
  source: string;
  estabelecimentosEncontrados: number;
  estabelecimentosProcessados: number;
  status: "processada" | "sem_procuracao" | "sem_estabelecimentos" | "falha";
  error: string;
}

export type FailureStage = "auth" | "procuracoes" | "estabelecimentos" | "calculos" | "detalhes";

export interface FailureRecord {
  cnpj: string;
  corporateName: string;
  stage: FailureStage;
  category: "authentication" | "authorization" | "rate_limit" | "server" | "network" | "invalid_response" | "unknown";
  httpStatus: number | null;
  message: string;
  retryable: boolean;
}

export interface RunReport {
  schemaVersion: string;
  collectorVersion: string;
  startedAt: string;
  finishedAt: string;
  timezone: string;
  anoVigencia: number;
  consultaCompetencia?: string;
  vigenciaDetalhe?: FapVigenciaDetalhe;
  summary: {
    empresasAlvo: number;
    empresasProcessadas: number;
    empresasSemProcuracao: number;
    empresasComFalha: number;
    totalEstabelecimentos: number;
    totalCalculosFap: number;
    dominioEmpresasAtivas?: number;
  };
  empresas: FapEmpresaSummary[];
  estabelecimentos: FapEstabelecimentoResult[];
  falhas: FailureRecord[];
}
