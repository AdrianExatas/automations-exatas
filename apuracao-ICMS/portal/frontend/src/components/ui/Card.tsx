import type { ReactNode } from 'react'

interface CardProps {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function Card({ title, actions, children, className = '' }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-ruled bg-paper-surface shadow-tape ${className}`}
    >
      {title || actions ? (
        <div className="flex items-center justify-between gap-4 border-b border-ruled-soft px-5 py-4">
          {title ? (
            <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
          ) : (
            <span />
          )}
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </div>
  )
}
