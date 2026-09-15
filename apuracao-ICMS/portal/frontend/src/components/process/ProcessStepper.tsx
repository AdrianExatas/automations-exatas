import { ETAPAS_PROCESSO, situacaoEtapa } from '../../constants/processo'

interface ProcessStepperProps {
  statusAtual: number
  etapaAtivaId: string
  onSelecionar: (etapaId: string) => void
}

/**
 * Fita de competência — assinatura visual do portal.
 * Navegação pelas 7 etapas; livremente clicável.
 */
export function ProcessStepper({ statusAtual, etapaAtivaId, onSelecionar }: ProcessStepperProps) {
  return (
    <div className="tape-perforation rounded-xl border border-ruled bg-paper-surface pt-2 shadow-tape">
      <ol
        aria-label="Etapas do processo de apuração"
        className="flex gap-0 overflow-x-auto px-1 pb-1 pt-1 sm:px-2"
      >
        {ETAPAS_PROCESSO.map((etapa, index) => {
          const situacao = situacaoEtapa(etapa, statusAtual)
          const ativo = etapa.id === etapaAtivaId

          const circleClasses =
            situacao === 'concluida'
              ? 'bg-pass text-white'
              : situacao === 'atual'
                ? 'bg-petrol text-white'
                : 'bg-ruled-soft text-ink-faint'

          return (
            <li
              key={etapa.id}
              className={`relative min-w-[8.5rem] flex-1 sm:min-w-[9.5rem] ${
                index < ETAPAS_PROCESSO.length - 1
                  ? 'after:absolute after:right-0 after:top-5 after:hidden after:h-px after:w-3 after:bg-ruled sm:after:block'
                  : ''
              }`}
            >
              <button
                type="button"
                onClick={() => onSelecionar(etapa.id)}
                aria-current={ativo ? 'step' : undefined}
                title={etapa.descricao}
                className={`flex h-full w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  ativo
                    ? 'bg-petrol-50 shadow-[inset_0_-2px_0_0_#0A6B75]'
                    : 'hover:bg-paper'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold transition-colors ${circleClasses}`}
                  aria-hidden
                >
                  {situacao === 'concluida' ? '✓' : etapa.numero}
                </span>
                <span className="min-w-0">
                  <span className="block line-clamp-2 font-display text-xs font-semibold text-ink">
                    {etapa.titulo}
                  </span>
                  <span className="mt-0.5 block font-mono text-[10px] text-ink-faint">
                    {etapa.statusInicio}
                    {etapa.statusFim !== etapa.statusInicio ? `–${etapa.statusFim}` : ''}
                    {etapa.gate ? ` · G${etapa.gate}` : ''}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
