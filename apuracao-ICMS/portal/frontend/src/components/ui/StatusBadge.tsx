import { Badge } from './Badge'

interface StatusBadgeProps {
  codigo: number
  descricao: string
}

export function StatusBadge({ codigo, descricao }: StatusBadgeProps) {
  return (
    <Badge tone="info">
      {String(codigo).padStart(2, '0')} · {descricao}
    </Badge>
  )
}
