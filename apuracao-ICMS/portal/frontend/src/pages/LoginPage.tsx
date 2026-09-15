import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const SPED_LINES = [
  '|0000|019|0|01042026|30042026|EMPRESA DEMO LTDA|11222333000181|SP|',
  '|C100|0|1|0|55|00|1|123456|35260411222333000181550010001234561123456780|',
  '|C190|000|5102|00|1500.00|0.00|1500.00|18.00|270.00|0.00|0.00|',
  '|E100|01042026|30042026|',
  '|E110|45230.18|0.00|0.00|45230.18|12840.55|0.00|32389.63|0.00|32389.63|',
  '|E116|000|32389.63|0|SP123456789012|15052026||SP||||||||',
  '|C170|1|PROD-001|UN|10.000|150.00|0.00|0|0.00|00|0|5102|0|18.00|270.00|',
  '|0150|FORN001|FORNECEDOR EXEMPLO SA|1058|99888777000166||SP|3550308|',
  '|C100|0|0|1|55|00|1|987654|35260499888777000166550010009876541987654321|',
  '|E110|45230.18|0.00|0.00|45230.18|12840.55|0.00|32389.63|0.00|32389.63|',
]

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const from =
    (location.state as { from?: string } | null)?.from &&
    (location.state as { from?: string }).from !== '/login'
      ? (location.state as { from: string }).from
      : '/'

  if (user) {
    return <Navigate to={from} replace />
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErro(null)
    const result = login(usuario, senha)
    if (!result.ok) {
      setErro(result.erro)
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="flex min-h-screen overflow-y-auto bg-paper">
      {/* Painel atmosférico — rolo SPED */}
      <aside
        className="relative hidden w-[48%] overflow-hidden border-r border-ruled bg-ink lg:block"
        aria-hidden
      >
        <div className="absolute inset-0 bg-paper-ruled opacity-[0.07]" />
        <div className="tape-perforation absolute inset-x-0 top-0 h-3 opacity-40" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-petrol-300">
              EFD ICMS/IPI · demo
            </p>
            <p className="mt-3 max-w-sm font-display text-2xl font-semibold leading-snug text-paper-surface">
              Conferência mensal com humano no loop.
            </p>
          </div>

          <div className="mt-10 space-y-1.5 overflow-hidden font-mono text-[11px] leading-relaxed text-petrol-200/70">
            {SPED_LINES.map((line, index) => (
              <p
                key={line + index}
                className="animate-fade-up truncate"
                style={{ animationDelay: `${80 + index * 45}ms` }}
              >
                {line}
              </p>
            ))}
          </div>

          <p className="font-mono text-[10px] text-paper-surface/50">
            Registros ilustrativos — sem dados de cliente.
          </p>
        </div>
      </aside>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center bg-paper-ruled px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-petrol font-display text-sm font-bold text-white">
              IC
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
              Apuração ICMS
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Entre para operar o fechamento da competência.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink" htmlFor="usuario">
                Usuário
              </label>
              <input
                id="usuario"
                type="text"
                required
                autoComplete="username"
                value={usuario}
                onChange={(event) => setUsuario(event.target.value)}
                placeholder="ana.fiscal"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink" htmlFor="senha">
                Senha
              </label>
              <input
                id="senha"
                type="password"
                required
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            {erro ? (
              <p className="rounded-lg bg-stamp-soft px-3 py-2 text-sm text-stamp-ink" role="alert">
                {erro}
              </p>
            ) : null}

            <button type="submit" className="btn-primary w-full py-2.5">
              Entrar
            </button>
          </form>

          <p className="mt-8 text-xs text-ink-faint">
            Autenticação simplificada — v1 sem SSO. Demo: ana.fiscal / fiscal123
          </p>
        </div>
      </div>
    </div>
  )
}
