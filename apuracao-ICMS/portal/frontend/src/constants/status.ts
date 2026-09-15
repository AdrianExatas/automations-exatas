// Os 19 status do fluxo de fechamento mensal.
// Fonte: apuracao-ICMS/skills/apuracao-icms/references/mapa-macro-processo.md
// (seção "Status de workflow (19)"). Mantenha em sincronia com o backend.

export interface StatusWorkflowDef {
  codigo: number
  descricao: string
}

export const STATUS_WORKFLOW: StatusWorkflowDef[] = [
  { codigo: 1, descricao: 'Aguardando documentação' },
  { codigo: 2, descricao: 'Documentação recebida' },
  { codigo: 3, descricao: 'Conferência documental' },
  { codigo: 4, descricao: 'Pendência documental' },
  { codigo: 5, descricao: 'Escrituração' },
  { codigo: 6, descricao: 'Conferência de entradas' },
  { codigo: 7, descricao: 'Conferência de saídas' },
  { codigo: 8, descricao: 'Análise tributária' },
  { codigo: 9, descricao: 'Apurações especiais' },
  { codigo: 10, descricao: 'Apuração preliminar' },
  { codigo: 11, descricao: 'Pendência fiscal' },
  { codigo: 12, descricao: 'Revisão da apuração' },
  { codigo: 13, descricao: 'Apuração aprovada' },
  { codigo: 14, descricao: 'Validação EFD' },
  { codigo: 15, descricao: 'EFD transmitida' },
  { codigo: 16, descricao: 'Guias geradas' },
  { codigo: 17, descricao: 'Aguardando pagamento' },
  { codigo: 18, descricao: 'Pagamento confirmado' },
  { codigo: 19, descricao: 'Fechamento concluído' },
]

export function descricaoStatus(codigo: number): string {
  return STATUS_WORKFLOW.find((status) => status.codigo === codigo)?.descricao ?? `Status ${codigo}`
}

export const PENDENCIA_STATUS_LABEL: Record<string, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida',
}

export const PENDENCIA_STATUS_OPCOES: Array<{ value: string; label: string }> = [
  { value: 'aberta', label: 'Aberta' },
  { value: 'em_andamento', label: 'Em andamento' },
  { value: 'resolvida', label: 'Resolvida' },
]
