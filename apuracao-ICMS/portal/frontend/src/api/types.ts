// Tipos do contrato REST do backend (`apuracao-ICMS/portal/backend`, FastAPI, prefixo `/api`).
// Mantenha este arquivo em sincronia com o contrato documentado no plano do portal.

export interface Empresa {
  cnpj: string
  slug: string
  razao_social: string
  uf: string
  ie: string
  ativo?: boolean
}

export interface EmpresaCreatePayload {
  cnpj: string
  razao_social: string
  uf: string
  ie: string
  slug?: string
}

export type EmpresaUpdatePayload = Partial<{
  slug: string
  razao_social: string
  uf: string
  ie: string
  ativo: boolean
}>

export interface StatusWorkflow {
  codigo: number
  descricao: string
}

export interface Gate {
  liberado: boolean
}

export type GateNumero = '1' | '2' | '3'

export type GatesMap = Record<GateNumero, Gate>

export interface Kpis {
  vl_icms_recolher: number | null
  vl_sld_credor_transportar: number | null
  vl_fecoep_recolher: number | null
  vl_fecoep_difal_recolher: number | null
}

export interface ResumoAchados {
  ok: boolean
  erros: number
  avisos: number
}

export interface CompetenciaResumo {
  competencia: string
  status: StatusWorkflow
  gates: GatesMap
  resumo: ResumoAchados
  kpis: Kpis
}

export interface CompetenciaCreatePayload {
  competencia: string
  criado_por?: string
}

export interface ModuloResumo {
  ok: boolean
  resumo: {
    erros: number
    avisos: number
    total: number
  }
}

export interface ArquivoRef {
  nome: string
  tipo: string
}

export interface CompetenciaDetalhe {
  empresa: Empresa
  competencia: string
  status: StatusWorkflow
  gates: GatesMap
  kpis: Kpis
  modulos: Record<string, ModuloResumo>
  arquivos: ArquivoRef[]
}

export interface ArquivoDownload {
  nome: string
  url: string
}

export interface StatusDetalhe {
  status_codigo: number
  status_descricao: string
  atualizado_em: string | null
  atualizado_por: string | null
}

export interface StatusUpdatePayload {
  status_codigo: number
  atualizado_por: string
}

export interface GateDetalhe {
  gate: number
  liberado: boolean
  justificativa: string | null
  liberado_por: string | null
  liberado_em: string | null
}

export interface GateUpdatePayload {
  liberado: boolean
  justificativa: string | null
  liberado_por: string
}

export type PendenciaStatus = 'aberta' | 'em_andamento' | 'resolvida'

export interface Pendencia {
  id: number
  empresa_cnpj: string
  competencia: string
  etapa: string
  fato: string
  impacto: string
  responsavel: string
  proximo_passo: string
  status: PendenciaStatus
  criado_em: string
  resolvido_em: string | null
}

export type PendenciaCreate = {
  empresa_cnpj: string
  competencia: string
  etapa?: string
  fato?: string
  impacto?: string
  responsavel?: string
  proximo_passo?: string
}

export type PendenciaUpdate = Partial<Omit<Pendencia, 'id'>>

/** Achado tipado a partir do JSON de módulo. */
export interface Achado {
  codigo?: string
  severidade?: string
  mensagem?: string
}

export interface Cruzamento {
  id?: number
  nome?: string
  ok?: boolean
  fecha?: boolean
}

export interface MapaTributarioLinha {
  sentido?: string
  cfop?: string
  cst_icms?: string
  aliq_observada?: number
  aliq_esperada?: number
  vl_opr?: number
  vl_icms?: number
  status?: string
  ok?: boolean
}

export interface PendenciasFiltro {
  empresa_cnpj?: string
  competencia?: string
  status?: PendenciaStatus
  responsavel?: string
}

export interface PortfolioResumo {
  total_empresas: number
  total_competencias: number
  pendencias_abertas: number
  competencias_com_erro: number
  valores_totais: {
    vl_icms_recolher: number
    vl_sld_credor_transportar: number
  }
}

// JSON bruto de um módulo (documental, icms, ipi, pis_cofins, estoque, lmc, margens).
// Tipagem detalhada fica para a fase de implementação das páginas com dados reais.
export type ModuloBruto = Record<string, unknown>

export type InputTipo = 'xml' | 'efd' | 'efd_contrib' | 'guias' | 'outros'

export interface InputArquivo {
  tipo: InputTipo
  nome: string
  tamanho: number
  modificado_em: string | null
}

export interface InputsListagem {
  xml: InputArquivo[]
  efd: InputArquivo[]
  efd_contrib: InputArquivo[]
  guias: InputArquivo[]
  outros: InputArquivo[]
}

export type JobStatusCodigo = 'queued' | 'running' | 'ok' | 'erro'

export interface JobLogItem {
  em?: string
  msg?: string
}

export interface JobStatus {
  id: number
  empresa_cnpj: string
  competencia: string
  status: JobStatusCodigo
  etapa: string | null
  mensagem: string | null
  log: JobLogItem[]
  criado_em: string | null
  atualizado_em: string | null
  criado_por: string | null
}

export interface ProcessarPayload {
  modulos?: string
  criado_por?: string
}

export type TributoGuia = 'icms' | 'fecoep' | 'icms_difal' | 'fecoep_difal'

export interface GuiaLancamento {
  tributo: TributoGuia
  valor: number
  vencimento?: string | null
}

export interface GuiasFormPayload {
  lancamentos: GuiaLancamento[]
  criado_por?: string
}

export interface DossieArquivo {
  nome: string
  tamanho: number
  modificado_em: string | null
}

export interface DossieListagem {
  pasta: string
  arquivos: DossieArquivo[]
}
