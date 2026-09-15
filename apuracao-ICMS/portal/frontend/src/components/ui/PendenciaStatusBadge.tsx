import { Badge } from './Badge'
import type { PendenciaStatus } from '../../api/types'

const CONFIG: Record<PendenciaStatus, { label: string; tone: 'danger' | 'warning' | 'success' }> = {
  aberta: { label: 'Aberta', tone: 'danger' },
  em_andamento: { label: 'Em andamento', tone: 'warning' },
  resolvida: { label: 'Resolvida', tone: 'success' },
}

export function PendenciaStatusBadge({ status }: { status: PendenciaStatus }) {
  const { label, tone } = CONFIG[status]
  return <Badge tone={tone}>{label}</Badge>
}
