import type { ButtonHTMLAttributes, ReactNode } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'warn'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger:
    'inline-flex items-center justify-center rounded-lg bg-stamp px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-stamp-ink disabled:cursor-not-allowed disabled:opacity-60',
  warn: 'inline-flex items-center justify-center rounded-lg bg-warn px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-warn-ink disabled:cursor-not-allowed disabled:opacity-60',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  children: ReactNode
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${VARIANT[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
