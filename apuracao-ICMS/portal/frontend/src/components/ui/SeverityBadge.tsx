import { Badge } from './Badge'

export type Severidade = 'erro' | 'aviso' | 'info'

const CONFIG: Record<Severidade, { label: string; tone: 'danger' | 'warning' | 'info' }> = {
  erro: { label: 'Erro', tone: 'danger' },
  aviso: { label: 'Aviso', tone: 'warning' },
  info: { label: 'Info', tone: 'info' },
}

interface SeverityBadgeProps {
  severidade: Severidade
  count?: number
}

export function SeverityBadge({ severidade, count }: SeverityBadgeProps) {
  const { label, tone } = CONFIG[severidade]
  return (
    <Badge tone={tone}>
      {label}
      {typeof count === 'number' ? ` · ${count}` : ''}
    </Badge>
  )
}
