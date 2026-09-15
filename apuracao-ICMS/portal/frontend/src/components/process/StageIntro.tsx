import type { EtapaProcesso, SituacaoEtapa } from '../../constants/processo'
import { Badge } from '../ui/Badge'

interface StageIntroProps {
  etapa: EtapaProcesso
  situacao: SituacaoEtapa
}

const SITUACAO_BADGE: Record<SituacaoEtapa, { label: string; tone: 'success' | 'info' | 'neutral' }> = {
  concluida: { label: 'Concluída', tone: 'success' },
  atual: { label: 'Etapa atual', tone: 'info' },
  futura: { label: 'Ainda não iniciada', tone: 'neutral' },
}

/** Abertura de cada etapa: o que é feito e por quê. */
export function StageIntro({ etapa, situacao }: StageIntroProps) {
  const badge = SITUACAO_BADGE[situacao]

  return (
    <div className="rounded-xl border border-ruled bg-paper-surface p-5 shadow-tape">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol font-mono text-sm font-semibold text-white">
            {etapa.numero}
          </span>
          <div>
            <h2 className="font-display text-base font-semibold text-ink">{etapa.titulo}</h2>
            <p className="mt-1 max-w-2xl text-sm text-ink-muted">{etapa.descricao}</p>
          </div>
        </div>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      <p className="mt-3 font-mono text-xs text-ink-faint">
        Status {etapa.statusInicio} a {etapa.statusFim}
        {etapa.gate ? ` · exige Gate ${etapa.gate}` : ''}.
      </p>
    </div>
  )
}
