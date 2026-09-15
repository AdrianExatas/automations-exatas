import { useState, useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { PageContainer } from '../components/layout/PageContainer'
import { Card } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { GateBadge } from '../components/ui/GateBadge'
import { SeverityBadge } from '../components/ui/SeverityBadge'
import { Term } from '../components/ui/Term'
import { useAuth } from '../auth/AuthContext'
import { empresasApi, portfolioApi } from '../api/client'
import type { CompetenciaResumo, Empresa } from '../api/types'
import { formatBRL, formatCnpj, formatCompetencia } from '../lib/format'

interface LinhaPortfolio {
  empresa: Empresa
  competencia?: CompetenciaResumo
  todasCompetencias: CompetenciaResumo[]
}

function competenciaMaisRecente(itens: CompetenciaResumo[]): CompetenciaResumo | undefined {
  if (itens.length === 0) return undefined
  return [...itens].sort((a, b) => b.competencia.localeCompare(a.competencia))[0]
}

/** Sugere o mes seguinte a `ultima` (formato "AAAA-MM"); sem historico, sugere o mes atual. */
function sugerirProximaCompetencia(ultima?: string): string {
  const hoje = new Date()
  if (!ultima) {
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  }
  const [anoStr, mesStr] = ultima.split('-')
  // Date(ano, mesStr, 1): mesStr ja e o indice 0-based do mes seguinte a `ultima`.
  const proxima = new Date(Number(anoStr), Number(mesStr), 1)
  return `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, '0')}`
}

function NovaApuracaoForm({
  empresa,
  ultimaCompetencia,
  onClose,
}: {
  empresa: Empresa
  ultimaCompetencia?: string
  onClose: () => void
}) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [competencia, setCompetencia] = useState(() => sugerirProximaCompetencia(ultimaCompetencia))

  const criarMutation = useMutation({
    mutationFn: () =>
      empresasApi.criarCompetencia(empresa.cnpj, { competencia, criado_por: user?.nome }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['competencias', empresa.cnpj] })
      onClose()
      navigate(`/empresas/${empresa.cnpj}/${competencia}`)
    },
  })

  const mensagemErro = criarMutation.isError
    ? isAxiosError(criarMutation.error) && criarMutation.error.response?.status === 409
      ? 'Essa competência já existe para esta empresa.'
      : 'Não foi possível criar a competência. Tente novamente.'
    : null

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        criarMutation.mutate()
      }}
      className="space-y-2 rounded-lg border border-ruled bg-paper p-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="text-xs font-medium text-ink-muted"
          htmlFor={`nova-competencia-${empresa.cnpj}`}
        >
          Competência
        </label>
        <input
          id={`nova-competencia-${empresa.cnpj}`}
          type="month"
          required
          value={competencia}
          onChange={(event) => setCompetencia(event.target.value)}
          className="input-field w-auto"
        />
        <button
          type="submit"
          disabled={criarMutation.isPending}
          className="btn-primary px-3 py-1 text-xs"
        >
          {criarMutation.isPending ? 'Criando...' : 'Criar competência'}
        </button>
        <button type="button" onClick={onClose} className="btn-ghost px-2 py-1 text-xs">
          Cancelar
        </button>
      </div>
      {mensagemErro ? <p className="text-xs text-stamp">{mensagemErro}</p> : null}
    </form>
  )
}

function PortfolioKpis() {
  const portfolioQuery = useQuery({ queryKey: ['portfolio'], queryFn: portfolioApi.resumo })

  if (portfolioQuery.isLoading) {
    return <LoadingState label="Carregando KPIs do portfólio..." />
  }

  if (portfolioQuery.isError || !portfolioQuery.data) {
    return <ErrorState onRetry={() => portfolioQuery.refetch()} />
  }

  const { data } = portfolioQuery

  return (
    <div className="tape-perforation overflow-hidden rounded-xl border border-ruled bg-paper-surface pt-2 shadow-tape">
      <div className="grid grid-cols-2 divide-x divide-y divide-ruled sm:grid-cols-3 xl:grid-cols-6">
        <KpiCard variant="strip" label="Empresas ativas" value={data.total_empresas} hint="no portfólio" />
        <KpiCard variant="strip" label="Competências" value={data.total_competencias} />
        <KpiCard
          variant="strip"
          label="Pendências abertas"
          value={data.pendencias_abertas}
          hint="todas as empresas"
        />
        <KpiCard
          variant="strip"
          label={<Term termo="Achado">Com erro</Term>}
          value={data.competencias_com_erro}
        />
        <KpiCard
          variant="strip"
          label="ICMS a recolher"
          value={formatBRL(data.valores_totais.vl_icms_recolher)}
        />
        <KpiCard
          variant="strip"
          label={<Term termo="Saldo credor">Saldo credor</Term>}
          value={formatBRL(data.valores_totais.vl_sld_credor_transportar)}
        />
      </div>
    </div>
  )
}

function labelCurtoCompetencia(competencia: string): string {
  const [ano, mes] = competencia.split('-')
  if (!ano || !mes) return formatCompetencia(competencia)
  return `${mes}/${ano.slice(-2)}`
}

function IcmsChart({ linhas }: { linhas: LinhaPortfolio[] }) {
  const data = useMemo(() => {
    const pontos: Array<{ label: string; icms: number; empresa: string; competencia: string }> = []
    for (const linha of linhas) {
      for (const comp of linha.todasCompetencias) {
        const valor = comp.kpis.vl_icms_recolher
        if (valor === null || valor === undefined) continue
        const slug = linha.empresa.slug ?? linha.empresa.cnpj.slice(0, 6)
        pontos.push({
          label: `${slug} · ${labelCurtoCompetencia(comp.competencia)}`,
          icms: valor,
          empresa: linha.empresa.razao_social,
          competencia: comp.competencia,
        })
      }
    }
    return pontos.sort((a, b) => a.competencia.localeCompare(b.competencia)).slice(-12)
  }, [linhas])

  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-ink-faint">
        Sem valores de ICMS a recolher para plotar.
      </p>
    )
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 72 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#D5DEE8" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#5C6B7A' }}
            angle={-25}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#5C6B7A' }}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat('pt-BR', { notation: 'compact', compactDisplay: 'short' }).format(
                v,
              )
            }
          />
          <RechartsTooltip
            formatter={(value) => formatBRL(typeof value === 'number' ? value : Number(value))}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: 8,
              borderColor: '#D5DEE8',
              fontFamily: 'Source Sans 3, sans-serif',
            }}
          />
          <Bar dataKey="icms" name="ICMS a recolher" fill="#0A6B75" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function EmpresasCards() {
  const empresasQuery = useQuery({ queryKey: ['empresas'], queryFn: () => empresasApi.listar() })
  const empresas = empresasQuery.data ?? []

  const competenciasQueries = useQueries({
    queries: empresas.map((empresa) => ({
      queryKey: ['competencias', empresa.cnpj],
      queryFn: () => empresasApi.competencias(empresa.cnpj),
      enabled: empresas.length > 0,
    })),
  })

  if (empresasQuery.isLoading) {
    return <LoadingState label="Carregando empresas..." />
  }

  if (empresasQuery.isError) {
    return <ErrorState onRetry={() => empresasQuery.refetch()} />
  }

  const linhas: LinhaPortfolio[] = empresas.map((empresa, index) => {
    const todas = competenciasQueries[index]?.data ?? []
    return {
      empresa,
      competencia: competenciaMaisRecente(todas),
      todasCompetencias: todas,
    }
  })

  const algumaCompetenciaCarregando = competenciasQueries.some((query) => query.isLoading)

  if (algumaCompetenciaCarregando && linhas.every((l) => l.todasCompetencias.length === 0)) {
    return <LoadingState label="Carregando competências..." />
  }

  if (linhas.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-ruled bg-paper-surface p-10 text-center shadow-tape">
        <p className="font-display text-sm font-semibold text-ink">Nenhuma empresa no portfólio</p>
        <p className="mt-1 text-sm text-ink-muted">
          Cadastre uma empresa para iniciar a primeira competência.
        </p>
        <Link to="/empresas" className="btn-primary mt-4 inline-flex">
          Ir para Empresas
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="divide-y divide-ruled overflow-hidden rounded-xl border border-ruled bg-paper-surface shadow-tape">
        {linhas.map((linha) => (
          <EmpresaRow key={linha.empresa.cnpj} linha={linha} />
        ))}
      </div>

      <Card title="ICMS a recolher por competência">
        <IcmsChart linhas={linhas} />
      </Card>
    </div>
  )
}

function EmpresaRow({ linha }: { linha: LinhaPortfolio }) {
  const comp = linha.competencia
  const [novaApuracaoAberta, setNovaApuracaoAberta] = useState(false)

  return (
    <article className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-ink">{linha.empresa.razao_social}</h3>
          <p className="mt-0.5 font-mono text-xs text-ink-faint">
            {formatCnpj(linha.empresa.cnpj)} · {linha.empresa.uf}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setNovaApuracaoAberta((v) => !v)}
            className="text-sm font-medium text-petrol hover:text-petrol-700"
          >
            {novaApuracaoAberta ? 'Cancelar' : 'Nova apuração'}
          </button>
          {comp ? (
            <Link
              to={`/empresas/${linha.empresa.cnpj}/${comp.competencia}`}
              className="text-sm font-semibold text-petrol hover:text-petrol-700"
            >
              Abrir →
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {novaApuracaoAberta ? (
          <NovaApuracaoForm
            empresa={linha.empresa}
            ultimaCompetencia={comp?.competencia}
            onClose={() => setNovaApuracaoAberta(false)}
          />
        ) : null}

        {!comp ? (
          <p className="text-sm text-ink-faint">Sem competência processada.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-xs text-ink-faint">
              Competência {formatCompetencia(comp.competencia)}
            </span>
            <StatusBadge codigo={comp.status.codigo} descricao={comp.status.descricao} />
            <div className="flex flex-wrap gap-1.5">
              <GateBadge gate={1} liberado={comp.gates['1']?.liberado ?? false} compact />
              <GateBadge gate={2} liberado={comp.gates['2']?.liberado ?? false} compact />
              <GateBadge gate={3} liberado={comp.gates['3']?.liberado ?? false} compact />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <SeverityBadge severidade="erro" count={comp.resumo.erros} />
              <SeverityBadge severidade="aviso" count={comp.resumo.avisos} />
            </div>
            <dl className="ml-auto flex gap-6 text-sm">
              <div>
                <dt className="text-xs text-ink-faint">ICMS a recolher</dt>
                <dd className="font-mono font-medium text-ink">
                  {formatBRL(comp.kpis.vl_icms_recolher)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-faint">
                  <Term termo="Saldo credor">Saldo credor</Term>
                </dt>
                <dd className="font-mono font-medium text-ink">
                  {formatBRL(comp.kpis.vl_sld_credor_transportar)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </article>
  )
}

export function DashboardPage() {
  return (
    <PageContainer
      title="Portfólio"
      description="Empresas e competências em conferência — status do fechamento e valores de ICMS."
    >
      <div className="space-y-8">
        <section>
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Carteira
          </h2>
          <PortfolioKpis />
        </section>

        <section>
          <h2 className="mb-3 font-display text-xs font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Empresas
          </h2>
          <EmpresasCards />
        </section>
      </div>
    </PageContainer>
  )
}
