import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '../components/layout/PageContainer'
import { Card } from '../components/ui/Card'
import { Table } from '../components/ui/Table'
import type { TableColumn } from '../components/ui/Table'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { PendenciaStatusBadge } from '../components/ui/PendenciaStatusBadge'
import { useAuth } from '../auth/AuthContext'
import { empresasApi, pendenciasApi } from '../api/client'
import type {
  Pendencia,
  PendenciaCreate,
  PendenciaStatus,
  PendenciasFiltro,
} from '../api/types'
import { PENDENCIA_STATUS_OPCOES } from '../constants/status'
import { formatCompetencia, formatCnpj, formatDateTime } from '../lib/format'

type ViewMode = 'tabela' | 'kanban'

const KANBAN_COLUNAS: Array<{ status: PendenciaStatus; label: string }> = [
  { status: 'aberta', label: 'Aberta' },
  { status: 'em_andamento', label: 'Em andamento' },
  { status: 'resolvida', label: 'Resolvida' },
]

function FiltrosBar({
  filtro,
  onChange,
}: {
  filtro: PendenciasFiltro
  onChange: (filtro: PendenciasFiltro) => void
}) {
  const empresasQuery = useQuery({ queryKey: ['empresas'], queryFn: () => empresasApi.listar() })
  const empresas = empresasQuery.data ?? []

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-ruled bg-paper-surface p-4 shadow-tape">
      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filtro-empresa">
          Empresa
        </label>
        <select
          id="filtro-empresa"
          value={filtro.empresa_cnpj ?? ''}
          onChange={(event) => onChange({ ...filtro, empresa_cnpj: event.target.value || undefined })}
          className="input-field min-w-[12rem]"
        >
          <option value="">Todas</option>
          {empresas.map((empresa) => (
            <option key={empresa.cnpj} value={empresa.cnpj}>
              {empresa.razao_social}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filtro-competencia">
          Competência
        </label>
        <input
          id="filtro-competencia"
          type="month"
          value={filtro.competencia ?? ''}
          onChange={(event) => onChange({ ...filtro, competencia: event.target.value || undefined })}
          className="input-field"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filtro-status">
          Status
        </label>
        <select
          id="filtro-status"
          value={filtro.status ?? ''}
          onChange={(event) =>
            onChange({
              ...filtro,
              status: (event.target.value || undefined) as PendenciaStatus | undefined,
            })
          }
          className="input-field min-w-[10rem]"
        >
          <option value="">Todos</option>
          {PENDENCIA_STATUS_OPCOES.map((opcao) => (
            <option key={opcao.value} value={opcao.value}>
              {opcao.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="filtro-responsavel">
          Responsável
        </label>
        <input
          id="filtro-responsavel"
          type="text"
          placeholder="Nome do responsável"
          value={filtro.responsavel ?? ''}
          onChange={(event) =>
            onChange({ ...filtro, responsavel: event.target.value || undefined })
          }
          className="input-field"
        />
      </div>
    </div>
  )
}

function KanbanBoard({
  pendencias,
  onStatusChange,
  onDelete,
}: {
  pendencias: Pendencia[]
  onStatusChange: (id: number, status: PendenciaStatus) => void
  onDelete: (id: number) => void
}) {
  const agrupadas = useMemo(() => {
    const mapa = new Map<PendenciaStatus, Pendencia[]>()
    for (const coluna of KANBAN_COLUNAS) {
      mapa.set(coluna.status, [])
    }
    for (const pendencia of pendencias) {
      mapa.get(pendencia.status)?.push(pendencia)
    }
    return mapa
  }, [pendencias])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {KANBAN_COLUNAS.map((coluna) => {
        const itens = agrupadas.get(coluna.status) ?? []
        return (
          <div key={coluna.status} className="rounded-xl border border-ruled bg-paper p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-ink">{coluna.label}</h3>
              <span className="rounded-full bg-paper-surface px-2 py-0.5 text-xs font-medium text-ink-muted ring-1 ring-inset ring-ruled">
                {itens.length}
              </span>
            </div>
            <div className="space-y-2">
              {itens.length === 0 ? (
                <p className="rounded-lg border border-dashed border-ruled bg-paper-surface px-3 py-6 text-center text-xs text-ink-faint">
                  Nenhuma pendência
                </p>
              ) : (
                itens.map((pendencia) => (
                  <div
                    key={pendencia.id}
                    className="rounded-lg border border-ruled bg-paper-surface p-3 text-sm shadow-tape"
                  >
                    <p className="font-medium text-ink">{pendencia.fato}</p>
                    <p className="mt-1 text-xs text-ink-faint">{pendencia.etapa}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-ink-muted">
                      <span>{pendencia.responsavel}</span>
                      <span>{formatCompetencia(pendencia.competencia)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <select
                        value={pendencia.status}
                        onChange={(e) =>
                          onStatusChange(pendencia.id, e.target.value as PendenciaStatus)
                        }
                        className="rounded border border-ruled px-2 py-1 text-xs"
                      >
                        {PENDENCIA_STATUS_OPCOES.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onDelete(pendencia.id)}
                        className="text-xs font-medium text-stamp hover:text-stamp-ink"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function PendenciasPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [filtro, setFiltro] = useState<PendenciasFiltro>({})
  const [viewMode, setViewMode] = useState<ViewMode>('tabela')
  const [mostrarForm, setMostrarForm] = useState(false)

  const empresasQuery = useQuery({ queryKey: ['empresas'], queryFn: () => empresasApi.listar() })
  const empresas = empresasQuery.data ?? []
  const razaoPorCnpj = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const e of empresas) mapa.set(e.cnpj, e.razao_social)
    return mapa
  }, [empresas])

  const [form, setForm] = useState({
    empresa_cnpj: '',
    competencia: '',
    etapa: '',
    fato: '',
    impacto: '',
    responsavel: user?.nome ?? '',
    proximo_passo: '',
  })

  const pendenciasQuery = useQuery({
    queryKey: ['pendencias', filtro],
    queryFn: () => pendenciasApi.listar(filtro),
  })

  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pendencias'] })
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  }

  const criarMutation = useMutation({
    mutationFn: (payload: PendenciaCreate) => pendenciasApi.criar(payload),
    onSuccess: async () => {
      setMostrarForm(false)
      setForm({
        empresa_cnpj: '',
        competencia: '',
        etapa: '',
        fato: '',
        impacto: '',
        responsavel: user?.nome ?? '',
        proximo_passo: '',
      })
      await invalidar()
    },
  })

  const atualizarMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: PendenciaStatus }) =>
      pendenciasApi.atualizar(id, { status }),
    onSuccess: invalidar,
  })

  const removerMutation = useMutation({
    mutationFn: (id: number) => pendenciasApi.remover(id),
    onSuccess: invalidar,
  })

  function handleCriar(event: FormEvent) {
    event.preventDefault()
    criarMutation.mutate(form)
  }

  function handleDelete(id: number) {
    if (window.confirm('Excluir esta pendência?')) removerMutation.mutate(id)
  }

  const columns: Array<TableColumn<Pendencia>> = [
    {
      key: 'empresa_cnpj',
      header: 'Empresa',
      render: (row) => razaoPorCnpj.get(row.empresa_cnpj) ?? formatCnpj(row.empresa_cnpj),
    },
    {
      key: 'competencia',
      header: 'Competência',
      render: (row) => formatCompetencia(row.competencia),
    },
    { key: 'etapa', header: 'Etapa', render: (row) => row.etapa },
    { key: 'fato', header: 'Fato', render: (row) => row.fato },
    { key: 'impacto', header: 'Impacto', render: (row) => row.impacto },
    { key: 'responsavel', header: 'Responsável', render: (row) => row.responsavel },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <PendenciaStatusBadge status={row.status} />
          <select
            value={row.status}
            onChange={(e) =>
              atualizarMutation.mutate({ id: row.id, status: e.target.value as PendenciaStatus })
            }
            className="rounded border border-ruled px-2 py-1 text-xs"
            aria-label="Alterar status"
          >
            {PENDENCIA_STATUS_OPCOES.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>
      ),
    },
    { key: 'criado_em', header: 'Criada em', render: (row) => formatDateTime(row.criado_em) },
    {
      key: 'acoes',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleDelete(row.id)}
          className="text-xs font-medium text-stamp hover:text-stamp-ink"
        >
          Excluir
        </button>
      ),
    },
  ]

  return (
    <PageContainer
      title="Pendências"
      description="Acompanhe o que ainda falta resolver em todas as empresas e competências."
      actions={
        <>
          <div className="flex overflow-hidden rounded-lg border border-ruled">
            <button
              type="button"
              onClick={() => setViewMode('tabela')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'tabela'
                  ? 'bg-petrol text-white'
                  : 'bg-paper-surface text-ink-muted hover:bg-paper'
              }`}
            >
              Tabela
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 text-sm font-medium ${
                viewMode === 'kanban'
                  ? 'bg-petrol text-white'
                  : 'bg-paper-surface text-ink-muted hover:bg-paper'
              }`}
            >
              Quadro
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="btn-primary px-3 py-1.5"
          >
            {mostrarForm ? 'Cancelar' : 'Nova pendência'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <FiltrosBar filtro={filtro} onChange={setFiltro} />

        {mostrarForm ? (
          <Card title="Nova pendência">
            <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleCriar}>
              <select
                required
                value={form.empresa_cnpj}
                onChange={(e) => setForm((f) => ({ ...f, empresa_cnpj: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm"
              >
                <option value="">Selecione a empresa</option>
                {empresas.map((e) => (
                  <option key={e.cnpj} value={e.cnpj}>
                    {e.razao_social}
                  </option>
                ))}
              </select>
              <input
                required
                type="month"
                value={form.competencia}
                onChange={(e) => setForm((f) => ({ ...f, competencia: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm"
              />
              <input
                required
                placeholder="Etapa"
                value={form.etapa}
                onChange={(e) => setForm((f) => ({ ...f, etapa: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm"
              />
              <input
                placeholder="Responsável"
                value={form.responsavel}
                onChange={(e) => setForm((f) => ({ ...f, responsavel: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm"
              />
              <textarea
                required
                placeholder="Fato observado"
                value={form.fato}
                onChange={(e) => setForm((f) => ({ ...f, fato: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm sm:col-span-2"
                rows={2}
              />
              <input
                placeholder="Impacto"
                value={form.impacto}
                onChange={(e) => setForm((f) => ({ ...f, impacto: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm"
              />
              <input
                placeholder="Próximo passo"
                value={form.proximo_passo}
                onChange={(e) => setForm((f) => ({ ...f, proximo_passo: e.target.value }))}
                className="rounded-lg border border-ruled px-3 py-2 text-sm"
              />
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={criarMutation.isPending}
                  className="rounded-lg bg-petrol px-4 py-2 text-sm font-medium text-white hover:bg-petrol-600 disabled:opacity-60"
                >
                  {criarMutation.isPending ? 'Salvando...' : 'Criar pendência'}
                </button>
              </div>
            </form>
          </Card>
        ) : null}

        {pendenciasQuery.isLoading ? (
          <LoadingState label="Carregando pendências..." />
        ) : pendenciasQuery.isError ? (
          <ErrorState onRetry={() => pendenciasQuery.refetch()} />
        ) : viewMode === 'tabela' ? (
          <Table
            columns={columns}
            data={pendenciasQuery.data ?? []}
            getRowKey={(row) => row.id}
            emptyMessage="Nenhuma pendência encontrada para os filtros selecionados."
          />
        ) : (
          <KanbanBoard
            pendencias={pendenciasQuery.data ?? []}
            onStatusChange={(id, status) => atualizarMutation.mutate({ id, status })}
            onDelete={handleDelete}
          />
        )}
      </div>
    </PageContainer>
  )
}
