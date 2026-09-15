// Mapeamento dos 19 status de workflow (`constants/status.ts`) em 7 etapas
// didáticas do processo de apuração, usadas pelo `ProcessStepper`.
// Fonte do agrupamento: plano "Wizard didático do processo".

export type GateNumero = 1 | 2 | 3

export interface EtapaProcesso {
  id: string
  numero: number
  titulo: string
  /** Explicação curta e didática: o que é feito aqui e por quê. */
  descricao: string
  statusInicio: number
  statusFim: number
  /** Módulos de dados do motor associados a esta etapa (chaves de `detalhe.modulos`). */
  modulos: string[]
  gate?: GateNumero
}

export const ETAPAS_PROCESSO: EtapaProcesso[] = [
  {
    id: 'documentos',
    numero: 1,
    titulo: 'Documentos e Integridade',
    descricao:
      'Confere se todos os arquivos fiscais da competência foram recebidos e se não há falhas de sequência ou de integridade, antes de iniciar a escrituração.',
    statusInicio: 1,
    statusFim: 4,
    modulos: ['documental'],
    gate: 1,
  },
  {
    id: 'escrituracao',
    numero: 2,
    titulo: 'Escrituração e Conferência',
    descricao:
      'Confere o livro de entradas e saídas lançado, cruzando com o controle de estoque e o LMC quando aplicável, para garantir que a escrituração reflete a movimentação real.',
    statusInicio: 5,
    statusFim: 7,
    modulos: ['icms', 'estoque', 'lmc'],
  },
  {
    id: 'apuracao',
    numero: 3,
    titulo: 'Apuração ICMS/IPI/PIS-COFINS',
    descricao:
      'Calcula os valores devidos de ICMS, IPI, PIS e COFINS do período com base nos débitos e créditos apurados na escrituração.',
    statusInicio: 8,
    statusFim: 10,
    modulos: ['icms', 'ipi', 'pis_cofins', 'margens'],
  },
  {
    id: 'conciliacao',
    numero: 4,
    titulo: 'Conciliação e Revisão',
    descricao:
      'Roda os cruzamentos automáticos entre as fontes de dados e revisa o mapa tributário, para aprovar a apuração antes de seguir para a EFD.',
    statusInicio: 11,
    statusFim: 13,
    modulos: ['icms'],
    gate: 2,
  },
  {
    id: 'efd',
    numero: 5,
    titulo: 'EFD e Obrigações',
    descricao:
      'Valida e transmite a Escrituração Fiscal Digital com os dados apurados, gerando os arquivos e relatórios exigidos pela obrigação.',
    statusInicio: 14,
    statusFim: 15,
    modulos: [],
  },
  {
    id: 'guias',
    numero: 6,
    titulo: 'Guias e Pagamento',
    descricao:
      'Gera as guias de recolhimento com base na EFD transmitida e acompanha a confirmação do pagamento junto ao caixa da empresa.',
    statusInicio: 16,
    statusFim: 18,
    modulos: ['icms'],
    gate: 3,
  },
  {
    id: 'fechamento',
    numero: 7,
    titulo: 'Fechamento',
    descricao:
      'Confirma que todos os gates foram liberados e as pendências resolvidas, encerrando formalmente a competência.',
    statusInicio: 19,
    statusFim: 19,
    modulos: [],
  },
]

export type SituacaoEtapa = 'concluida' | 'atual' | 'futura'

export function etapaPorStatus(codigo: number): EtapaProcesso {
  const encontrada = ETAPAS_PROCESSO.find(
    (etapa) => codigo >= etapa.statusInicio && codigo <= etapa.statusFim,
  )
  if (encontrada) return encontrada
  return codigo < ETAPAS_PROCESSO[0].statusInicio
    ? ETAPAS_PROCESSO[0]
    : ETAPAS_PROCESSO[ETAPAS_PROCESSO.length - 1]
}

export function situacaoEtapa(etapa: EtapaProcesso, statusAtual: number): SituacaoEtapa {
  if (statusAtual > etapa.statusFim) return 'concluida'
  if (statusAtual >= etapa.statusInicio && statusAtual <= etapa.statusFim) return 'atual'
  return 'futura'
}

/** Primeiro status_codigo da próxima etapa (null quando já é a última). */
export function proximoStatusCodigo(etapa: EtapaProcesso): number | null {
  const indice = ETAPAS_PROCESSO.findIndex((item) => item.id === etapa.id)
  const proxima = ETAPAS_PROCESSO[indice + 1]
  return proxima ? proxima.statusInicio : null
}

export function etapaSeguinte(etapa: EtapaProcesso): EtapaProcesso | null {
  const indice = ETAPAS_PROCESSO.findIndex((item) => item.id === etapa.id)
  return ETAPAS_PROCESSO[indice + 1] ?? null
}
