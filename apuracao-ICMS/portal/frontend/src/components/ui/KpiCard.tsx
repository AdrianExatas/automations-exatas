import type { ReactNode } from 'react'

interface KpiCardTrend {
  value: string
  positive?: boolean
}

interface KpiCardProps {
  label: ReactNode
  value: ReactNode
  hint?: string
  trend?: KpiCardTrend
  /** Faixa inline para dashboard — sem card isolado */
  variant?: 'card' | 'strip'
}

export function KpiCard({ label, value, hint, trend, variant = 'card' }: KpiCardProps) {
  if (variant === 'strip') {
    return (
      <div className="min-w-0 px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
        <p className="mt-1 break-words font-mono text-base font-semibold tracking-tight text-ink sm:text-lg">
          {value}
        </p>
        {hint || trend ? (
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
            {trend ? (
              <span
                className={`text-xs font-medium ${trend.positive ? 'text-pass' : 'text-stamp'}`}
              >
                {trend.value}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-ruled bg-paper-surface p-5 shadow-tape">
      <p className="text-sm font-medium text-ink-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint || trend ? (
        <div className="mt-1.5 flex items-center gap-2">
          {hint ? <span className="text-xs text-ink-faint">{hint}</span> : null}
          {trend ? (
            <span
              className={`text-xs font-medium ${trend.positive ? 'text-pass' : 'text-stamp'}`}
            >
              {trend.value}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
