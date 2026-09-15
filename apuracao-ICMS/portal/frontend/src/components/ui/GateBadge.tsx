import { Badge } from './Badge'

interface GateBadgeProps {
  gate: number
  liberado: boolean
  compact?: boolean
}

export function GateBadge({ gate, liberado, compact = false }: GateBadgeProps) {
  return (
    <Badge tone={liberado ? 'success' : 'neutral'}>
      <span className={`h-1.5 w-1.5 rounded-full ${liberado ? 'bg-pass' : 'bg-ink-faint'}`} />
      {compact ? `G${gate}` : `Gate ${gate}`} {liberado ? 'liberado' : 'bloqueado'}
    </Badge>
  )
}
