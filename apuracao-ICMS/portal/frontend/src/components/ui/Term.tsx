import type { ReactNode } from 'react'
import { GLOSSARIO } from '../../constants/glossario'
import { Tooltip } from './Tooltip'

interface TermProps {
  /** Chave do termo no glossário (ex.: "CFOP", "Gate", "Saldo credor"). */
  termo: string
  /** Rótulo exibido; usa o próprio termo quando omitido. */
  children?: ReactNode
  placement?: 'top' | 'bottom'
  className?: string
}

/** Envolve um termo técnico com um tooltip mostrando a definição do glossário. */
export function Term({ termo, children, placement, className = '' }: TermProps) {
  const definicao = GLOSSARIO[termo]
  const rotulo = children ?? termo

  if (!definicao) {
    return <>{rotulo}</>
  }

  return (
    <Tooltip content={definicao} placement={placement}>
      <span
        tabIndex={0}
        className={`cursor-help border-b border-dotted border-ink-faint outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-petrol ${className}`}
      >
        {rotulo}
      </span>
    </Tooltip>
  )
}
