import type { ButtonHTMLAttributes } from 'react';

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

export default function LoadingButton({
  loading,
  loadingText = 'Enviando…',
  children,
  className = '',
  disabled,
  ...rest
}: LoadingButtonProps) {
  return (
    <button
      type="submit"
      className={`btn btn-primary ${loading ? 'loading' : ''} ${className}`.trim()}
      disabled={disabled ?? loading}
      data-testid="loading-button"
      {...rest}
    >
      <span className="btn-text" aria-hidden={loading}>
        {children}
      </span>
      <span className="btn-loading" aria-hidden={!loading}>
        {loadingText}
      </span>
    </button>
  );
}
