interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'Não foi possível carregar os dados. Verifique se o backend está disponível em http://localhost:8001.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-stamp/30 bg-stamp-soft p-6 text-center shadow-tape">
      <p className="text-sm font-medium text-stamp-ink">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-stamp/40 bg-paper-surface px-3 py-1.5 text-xs font-medium text-stamp-ink transition-colors hover:bg-stamp-soft"
        >
          Tentar novamente
        </button>
      ) : null}
    </div>
  )
}
