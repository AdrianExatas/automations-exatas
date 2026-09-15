import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'success' | 'danger' | 'warning' | 'info'

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-ruled-soft text-ink-muted ring-ruled',
  success: 'bg-pass-soft text-pass-ink ring-pass/30',
  danger: 'bg-stamp-soft text-stamp-ink ring-stamp/30',
  warning: 'bg-warn-soft text-warn-ink ring-warn/30',
  info: 'bg-petrol-50 text-petrol-700 ring-petrol-200',
}

interface BadgeProps {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
