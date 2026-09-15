interface LoadingStateProps {
  label?: string
}

export function LoadingState({ label = 'Carregando dados...' }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-ruled bg-paper-surface p-10 text-ink-muted shadow-tape">
      <span
        aria-hidden
        className="h-4 w-4 animate-spin rounded-full border-2 border-ruled border-t-petrol"
      />
      <span className="text-sm">{label}</span>
    </div>
  )
}
