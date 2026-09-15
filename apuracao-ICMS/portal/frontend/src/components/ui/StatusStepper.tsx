import { STATUS_WORKFLOW } from '../../constants/status'

interface StatusStepperProps {
  atual: number
}

export function StatusStepper({ atual }: StatusStepperProps) {
  return (
    <ol className="flex gap-1.5 overflow-x-auto pb-1">
      {STATUS_WORKFLOW.map((status) => {
        const isDone = status.codigo < atual
        const isCurrent = status.codigo === atual
        return (
          <li key={status.codigo} title={`${status.codigo} · ${status.descricao}`}>
            <span
              className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 font-mono text-[11px] font-semibold ${
                isCurrent
                  ? 'bg-petrol text-white'
                  : isDone
                    ? 'bg-petrol-50 text-petrol-700'
                    : 'bg-ruled-soft text-ink-faint'
              }`}
            >
              {status.codigo}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
