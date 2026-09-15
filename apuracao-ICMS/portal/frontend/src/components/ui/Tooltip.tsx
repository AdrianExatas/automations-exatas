import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  placement?: 'top' | 'bottom'
  className?: string
}

/**
 * Tooltip acessível: abre com hover OU foco de teclado, fecha ao sair do mouse,
 * perder o foco (blur), pressionar Esc ou rolar a página. Renderiza em portal
 * com posição fixed para não ser cortado por overflow dos ancestrais.
 */
export function Tooltip({ content, children, placement = 'top', className = '' }: TooltipProps) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const tooltipId = useId()
  const open = hovered || focused

  function dismiss() {
    setHovered(false)
    setFocused(false)
  }

  function updatePosition() {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const gap = 8
    setCoords({
      top: placement === 'top' ? rect.top - gap : rect.bottom + gap,
      left: rect.left + rect.width / 2,
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null)
      return
    }
    updatePosition()
  }, [open, placement])

  useEffect(() => {
    if (!open) return

    function onScroll() {
      dismiss()
    }

    window.addEventListener('scroll', onScroll, true)
    const main = document.querySelector('main')
    main?.addEventListener('scroll', onScroll)

    return () => {
      window.removeEventListener('scroll', onScroll, true)
      main?.removeEventListener('scroll', onScroll)
    }
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLSpanElement>) {
    if (event.key === 'Escape') {
      dismiss()
    }
  }

  const tooltipStyle: CSSProperties | undefined = coords
    ? {
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        transform: placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 50,
      }
    : undefined

  const arrowClasses =
    placement === 'top'
      ? 'top-full left-1/2 -translate-x-1/2 border-t-ink'
      : 'bottom-full left-1/2 -translate-x-1/2 border-b-ink'

  return (
    <span
      ref={triggerRef}
      className={`inline-flex ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onKeyDown={handleKeyDown}
    >
      <span aria-describedby={open ? tooltipId : undefined}>{children}</span>
      {open && coords
        ? createPortal(
            <span
              id={tooltipId}
              role="tooltip"
              style={tooltipStyle}
              className="pointer-events-none w-max max-w-xs rounded-lg bg-ink px-3 py-2 text-xs leading-snug text-paper-surface shadow-lg"
            >
              {content}
              <span
                aria-hidden
                className={`absolute h-0 w-0 border-4 border-transparent ${arrowClasses}`}
              />
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
