import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'
import { formatCompetencia } from '../../lib/format'

interface Breadcrumb {
  label: string
  to?: string
  mono?: boolean
}

function useBreadcrumbs(): Breadcrumb[] {
  const location = useLocation()
  const params = useParams<{ cnpj?: string; competencia?: string }>()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return [{ label: 'Portfólio' }]
  }
  if (segments[0] === 'pendencias') {
    return [{ label: 'Portfólio', to: '/' }, { label: 'Pendências' }]
  }
  if (segments[0] === 'empresas' && params.cnpj) {
    const competenciaLabel = params.competencia ? formatCompetencia(params.competencia) : ''
    return [
      { label: 'Portfólio', to: '/' },
      { label: params.cnpj, mono: true },
      ...(competenciaLabel ? [{ label: competenciaLabel }] : []),
    ]
  }
  if (segments[0] === 'empresas') {
    return [{ label: 'Portfólio', to: '/' }, { label: 'Empresas' }]
  }
  return [{ label: 'Portfólio', to: '/' }]
}

export function Topbar() {
  const breadcrumbs = useBreadcrumbs()
  const { user } = useAuth()
  const nome = user?.nome ?? '—'
  const cargo = user?.cargo ?? ''

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-ruled bg-paper-surface/90 px-6 backdrop-blur-sm">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-muted">
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1
          const labelClass = item.mono ? 'font-mono text-xs tracking-tight' : ''
          return (
            <span key={`${item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-ruled">/</span> : null}
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className={`transition-colors hover:text-petrol ${labelClass}`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={`${isLast ? 'font-medium text-ink' : ''} ${labelClass}`}
                >
                  {item.label}
                </span>
              )}
            </span>
          )
        })}
      </nav>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-ink">{nome}</p>
          {cargo ? <p className="text-xs text-ink-faint">{cargo}</p> : null}
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-petrol-50 font-display text-sm font-semibold text-petrol-700 ring-1 ring-petrol-200">
          {nome.charAt(0)}
        </div>
      </div>
    </header>
  )
}
