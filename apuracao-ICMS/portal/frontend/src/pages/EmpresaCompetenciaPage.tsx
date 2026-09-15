import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '../components/layout/PageContainer'
import { Card } from '../components/ui/Card'
import { KpiCard } from '../components/ui/KpiCard'
import { Table } from '../components/ui/Table'
import type { TableColumn } from '../components/ui/Table'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { GateBadge } from '../components/ui/GateBadge'
import { StatusStepper } from '../components/ui/StatusStepper'
import { Term } from '../components/ui/Term'
import { ProcessStepper } from '../components/process/ProcessStepper'
import { StageIntro } from '../components/process/StageIntro'
import { AchadosResumo } from '../components/process/AchadosResumo'
import { RecebimentoDocumentos } from '../components/process/RecebimentoDocumentos'
import { useAuth } from '../auth/AuthContext'
import { dossieApi, empresasApi, inputsApi, pendenciasApi } from '../api/client'
import type {
  Achado,
  ArquivoDownload,
  CompetenciaDetalhe,
  Cruzamento,
  GateDetalhe,
  GuiaLancamento,
  MapaTributarioLinha,
  ModuloBruto,
  Pendencia,
  PendenciaCreate,
  PendenciaStatus,
  TributoGuia,
} from '../api/types'
import { STATUS_WORKFLOW, PENDENCIA_STATUS_OPCOES, descricaoStatus } from '../constants/status'
import {
  ETAPAS_PROCESSO,
  etapaPorStatus,
  etapaSeguinte,
  proximoStatusCodigo,
  situacaoEtapa,
} from '../constants/processo'
import type { EtapaProcesso } from '../constants/processo'
import { formatBRL, formatCompetencia, formatDateTime } from '../lib/format'

interface StageProps {
  cnpj: string
  competencia: string
  detalhe: CompetenciaDetalhe
}

// ---------------------------------------------------------------------------
// Helpers de extração de dados brutos dos módulos (JSON não tipado em detalhe)
// ---------------------------------------------------------------------------

function extractAchados(dados: ModuloBruto | undefined): Achado[] {
  const raw = dados?.achados
  return Array.isArray(raw) ? (raw as Achado[]) : []
}

interface LivroLinha {
  cst_icms?: string
  cfop?: string
  aliq_icms?: number
  sentido?: string
  vl_opr?: number
  vl_bc_icms?: number
  vl_icms?: number
  vl_icms_st?: number
  qtd_linhas?: number
}

interface LivroTotais {
  vl_opr?: number
  vl_bc_icms?: number
  vl_icms?: number
  vl_icms_st?: number
  linhas?: number
}

function extractLivro(dados: ModuloBruto | undefined): {
  entradas: LivroLinha[]
  saidas: LivroLinha[]
  totalEntradas: LivroTotais | null
  totalSaidas: LivroTotais | null
} {
  const livro = dados?.livro
  if (!livro || typeof livro !== 'object') {
    return { entradas: [], saidas: [], totalEntradas: null, totalSaidas: null }
  }
  const l = livro as Record<string, unknown>
  return {
    entradas: Array.isArray(l.entradas) ? (l.entradas as LivroLinha[]) : [],
    saidas: Array.isArray(l.saidas) ? (l.saidas as LivroLinha[]) : [],
    totalEntradas: (l.totais_entradas as LivroTotais | undefined) ?? null,
    totalSaidas: (l.totais_saidas as LivroTotais | undefined) ?? null,
  }
}

function extractRecomputado(dados: ModuloBruto | undefined, chave: 'e110'): Record<string, number> | null {
  const bloco = dados?.[chave]
  if (!bloco || typeof bloco !== 'object') return null
  const recomputado = (bloco as Record<string, unknown>).recomputado
  if (!recomputado || typeof recomputado !== 'object') return null
  return recomputado as Record<string, number>
}

interface GuiaPagamento {
  tributo?: string
  valor?: number
  vencimento?: string
  arquivo?: string
}

interface Cruzamento13Detalhe {
  ok: boolean
  fecha: boolean
  somaEfd: number | null
  somaGuia: number | null
  guias: GuiaPagamento[]
}

function extractCruzamento13(dados: ModuloBruto | undefined): Cruzamento13Detalhe | null {
  const lista = dados?.cruzamentos
  if (!Array.isArray(lista)) return null
  const item = lista.find(
    (c): c is Record<string, unknown> => typeof c === 'object' && c !== null && (c as Record<string, unknown>).id === 13,
  )
  if (!item) return null
  const guiasRaw = Array.isArray(item.guias) ? item.guias : []
  const guias: GuiaPagamento[] = guiasRaw
    .filter((g): g is Record<string, unknown> => typeof g === 'object' && g !== null)
    .map((g) => ({
      tributo: typeof g.tributo === 'string' ? g.tributo : undefined,
      valor: typeof g.valor === 'number' ? g.valor : undefined,
      vencimento: typeof g.vencimento === 'string' ? g.vencimento : undefined,
      arquivo: typeof g.arquivo === 'string' ? g.arquivo : undefined,
    }))
  return {
    ok: Boolean(item.ok),
    fecha: Boolean(item.fecha),
    somaEfd: typeof item.soma_efd === 'number' ? item.soma_efd : null,
    somaGuia: typeof item.soma_guia === 'number' ? item.soma_guia : null,
    guias,
  }
}

function useModulo(cnpj: string, competencia: string, nome: string, disponivel: boolean) {
  return useQuery({
    queryKey: ['modulo', cnpj, competencia, nome],
    queryFn: () => empresasApi.modulo(cnpj, competencia, nome),
    enabled: Boolean(cnpj && competencia && nome) && disponivel,
  })
}

function ModuloIndisponivel({ nome }: { nome: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ruled bg-paper-surface p-6 text-center text-sm text-ink-faint">
      Módulo <span className="font-medium capitalize">{nome.replace(/_/g, ' ')}</span> ainda não
      processado para esta competência.
    </div>
  )
}

// ---------------------------------------------------------------------------
// Gates (reutilizado nas etapas 1/4/6 e no painel de detalhes técnicos)
// ---------------------------------------------------------------------------

function GatesPanel({
  cnpj,
  competencia,
  apenasGate,
}: {
  cnpj: string
  competencia: string
  apenasGate?: number
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [justificativas, setJustificativas] = useState<Record<number, string>>({})
  const [erro, setErro] = useState<string | null>(null)

  const gatesQuery = useQuery({
    queryKey: ['gates', cnpj, competencia],
    queryFn: () => empresasApi.gates(cnpj, competencia),
  })

  const mutation = useMutation({
    mutationFn: (payload: { gate: number; liberado: boolean; justificativa: string }) =>
      empresasApi.atualizarGate(cnpj, competencia, payload.gate, {
        liberado: payload.liberado,
        justificativa: payload.justificativa || null,
        liberado_por: user?.nome ?? 'desconhecido',
      }),
    onSuccess: async () => {
      setErro(null)
      await queryClient.invalidateQueries({ queryKey: ['gates', cnpj, competencia] })
      await queryClient.invalidateQueries({ queryKey: ['competencia-detalhe', cnpj, competencia] })
      await queryClient.invalidateQueries({ queryKey: ['competencias', cnpj] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: () => setErro('Falha ao atualizar gate.'),
  })

  if (gatesQuery.isLoading) {
    return <LoadingState label="Carregando gates..." />
  }

  if (gatesQuery.isError) {
    return <ErrorState onRetry={() => gatesQuery.refetch()} />
  }

  const todosGates: GateDetalhe[] =
    gatesQuery.data && gatesQuery.data.length > 0
      ? gatesQuery.data
      : [1, 2, 3].map((gate) => ({
          gate,
          liberado: false,
          justificativa: null,
          liberado_por: null,
          liberado_em: null,
        }))

  const gates = apenasGate ? todosGates.filter((g) => g.gate === apenasGate) : todosGates

  return (
    <div className="space-y-4">
      {erro ? (
        <p className="rounded-lg bg-stamp-soft px-3 py-2 text-sm text-stamp-ink" role="alert">
          {erro}
        </p>
      ) : null}
      <div className={`grid grid-cols-1 gap-4 ${gates.length > 1 ? 'lg:grid-cols-3' : ''}`}>
        {gates.map((gate) => {
          const justificativa = justificativas[gate.gate] ?? gate.justificativa ?? ''
          return (
            <Card
              key={gate.gate}
              title={
                <span>
                  <Term termo="Gate">Gate</Term> {gate.gate}
                </span>
              }
              actions={<GateBadge gate={gate.gate} liberado={gate.liberado} compact />}
            >
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Liberado por</dt>
                  <dd className="text-ink">{gate.liberado_por ?? '—'}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-ink-faint">Liberado em</dt>
                  <dd className="text-ink">{formatDateTime(gate.liberado_em)}</dd>
                </div>
              </dl>

              <label className="mt-4 mb-1 block text-xs font-medium text-ink-muted">
                Justificativa
              </label>
              <textarea
                value={justificativa}
                onChange={(e) =>
                  setJustificativas((prev) => ({ ...prev, [gate.gate]: e.target.value }))
                }
                rows={3}
                className="w-full rounded-lg border border-ruled px-3 py-2 text-sm focus:border-petrol focus:outline-none focus:ring-1 focus:ring-petrol"
                placeholder="Motivo da liberação ou bloqueio"
              />

              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({
                    gate: gate.gate,
                    liberado: !gate.liberado,
                    justificativa,
                  })
                }
                className={`mt-4 w-full rounded-lg px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                  gate.liberado
                    ? 'bg-warn hover:bg-warn-ink'
                    : 'bg-petrol hover:bg-petrol-600'
                }`}
              >
                {gate.liberado ? 'Bloquear' : 'Liberar'} gate
              </button>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Painel de detalhes técnicos: os 19 status "finos" + seleção manual + gates
// ---------------------------------------------------------------------------

function DetalhesTecnicosPanel({ detalhe, cnpj, competencia }: StageProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [statusCodigo, setStatusCodigo] = useState(detalhe.status.codigo)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useEffect(() => {
    setStatusCodigo(detalhe.status.codigo)
  }, [detalhe.status.codigo])

  const mutation = useMutation({
    mutationFn: () =>
      empresasApi.atualizarStatus(cnpj, competencia, {
        status_codigo: statusCodigo,
        atualizado_por: user?.nome ?? 'desconhecido',
      }),
    onSuccess: async () => {
      setMensagem('Status atualizado.')
      await queryClient.invalidateQueries({ queryKey: ['competencia-detalhe', cnpj, competencia] })
      await queryClient.invalidateQueries({ queryKey: ['competencias', cnpj] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: () => setMensagem('Falha ao atualizar status.'),
  })

  return (
    <div className="space-y-4">
      <Card title="Status detalhado (19 status do fluxo)">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <StatusBadge codigo={detalhe.status.codigo} descricao={detalhe.status.descricao} />
          <span className="text-sm text-ink-faint">Status {detalhe.status.codigo} de 19</span>
        </div>
        <StatusStepper atual={detalhe.status.codigo} />

        <div className="mt-6 flex flex-wrap items-end gap-3 border-t border-ruled-soft pt-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="status-select">
              Alterar status manualmente
            </label>
            <select
              id="status-select"
              value={statusCodigo}
              onChange={(e) => setStatusCodigo(Number(e.target.value))}
              className="min-w-[16rem] rounded-lg border border-ruled px-3 py-2 text-sm focus:border-petrol focus:outline-none focus:ring-1 focus:ring-petrol"
            >
              {STATUS_WORKFLOW.map((s) => (
                <option key={s.codigo} value={s.codigo}>
                  {String(s.codigo).padStart(2, '0')} — {s.descricao}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={mutation.isPending || statusCodigo === detalhe.status.codigo}
            onClick={() => mutation.mutate()}
            className="rounded-lg bg-petrol px-4 py-2 text-sm font-medium text-white hover:bg-petrol-600 disabled:cursor-not-allowed disabled:bg-ruled disabled:text-ink-faint"
          >
            {mutation.isPending ? 'Salvando...' : 'Salvar status'}
          </button>
          {mensagem ? <p className="text-sm text-ink-muted">{mensagem}</p> : null}
        </div>
      </Card>

      <GatesPanel cnpj={cnpj} competencia={competencia} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Botão "Avançar etapa"
// ---------------------------------------------------------------------------

function AvancarEtapaAction({ cnpj, competencia, etapaAtual, detalhe }: StageProps & { etapaAtual: EtapaProcesso }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [mensagem, setMensagem] = useState<string | null>(null)

  const proxima = etapaSeguinte(etapaAtual)
  const proximoCodigo = proximoStatusCodigo(etapaAtual)

  const mutation = useMutation({
    mutationFn: () =>
      empresasApi.atualizarStatus(cnpj, competencia, {
        status_codigo: proximoCodigo as number,
        atualizado_por: user?.nome ?? 'desconhecido',
      }),
    onSuccess: async () => {
      setMensagem(proxima ? `Avançado para "${proxima.titulo}".` : 'Status atualizado.')
      await queryClient.invalidateQueries({ queryKey: ['competencia-detalhe', cnpj, competencia] })
      await queryClient.invalidateQueries({ queryKey: ['competencias', cnpj] })
      await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
    onError: () => setMensagem('Falha ao avançar etapa.'),
  })

  if (!proxima || proximoCodigo === null) {
    return (
      <p className="text-sm text-pass-ink">
        Esta é a última etapa do processo — não há próxima etapa para avançar.
      </p>
    )
  }

  const gateNumero = etapaAtual.gate
  const gateLiberado = gateNumero
    ? detalhe.gates[String(gateNumero) as '1' | '2' | '3']?.liberado ?? false
    : true

  return (
    <div className="space-y-3">
      {gateNumero && !gateLiberado ? (
        <p
          role="alert"
          className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn-ink ring-1 ring-inset ring-warn/30"
        >
          ⚠ O <Term termo="Gate">Gate</Term> {gateNumero} desta etapa ainda não foi liberado. Você
          pode avançar mesmo assim, mas revise antes de seguir.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          className="rounded-lg bg-petrol px-4 py-2 text-sm font-medium text-white hover:bg-petrol-600 disabled:cursor-not-allowed disabled:bg-ruled disabled:text-ink-faint"
        >
          {mutation.isPending ? 'Avançando...' : `Avançar para "${proxima.titulo}"`}
        </button>
        {mensagem ? <p className="text-sm text-ink-muted">{mensagem}</p> : null}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pendências vinculadas à etapa atual (mantém o CRUD completo já existente)
// ---------------------------------------------------------------------------

function PendenciasEtapaPanel({ cnpj, competencia, etapa }: { cnpj: string; competencia: string; etapa: EtapaProcesso }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [form, setForm] = useState({
    etapa: etapa.titulo,
    fato: '',
    impacto: '',
    responsavel: user?.nome ?? '',
    proximo_passo: '',
  })

  useEffect(() => {
    setForm((f) => ({ ...f, etapa: etapa.titulo }))
    setMostrarTodas(false)
  }, [etapa.titulo])

  const pendenciasQuery = useQuery({
    queryKey: ['pendencias', { empresa_cnpj: cnpj, competencia }],
    queryFn: () => pendenciasApi.listar({ empresa_cnpj: cnpj, competencia }),
  })

  const invalidar = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pendencias'] })
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  }

  const criarMutation = useMutation({
    mutationFn: (payload: PendenciaCreate) => pendenciasApi.criar(payload),
    onSuccess: async () => {
      setMostrarForm(false)
      setForm((f) => ({ ...f, fato: '', impacto: '', proximo_passo: '' }))
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

  if (pendenciasQuery.isError) {
    return <ErrorState onRetry={() => pendenciasQuery.refetch()} />
  }

  function handleCriar(event: FormEvent) {
    event.preventDefault()
    criarMutation.mutate({
      empresa_cnpj: cnpj,
      competencia,
      ...form,
    })
  }

  const todas = pendenciasQuery.data ?? []
  const daEtapa = todas.filter((p) => p.etapa === etapa.titulo)
  const listaExibida = mostrarTodas ? todas : daEtapa

  const columns: Array<TableColumn<Pendencia>> = [
    { key: 'etapa', header: 'Etapa', render: (row) => row.etapa },
    { key: 'fato', header: 'Fato', render: (row) => row.fato },
    { key: 'responsavel', header: 'Responsável', render: (row) => row.responsavel },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <select
          value={row.status}
          onChange={(e) =>
            atualizarMutation.mutate({ id: row.id, status: e.target.value as PendenciaStatus })
          }
          className="rounded border border-ruled px-2 py-1 text-xs"
        >
          {PENDENCIA_STATUS_OPCOES.map((op) => (
            <option key={op.value} value={op.value}>
              {op.label}
            </option>
          ))}
        </select>
      ),
    },
    { key: 'criado_em', header: 'Criada em', render: (row) => formatDateTime(row.criado_em) },
    {
      key: 'acoes',
      header: '',
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            if (window.confirm('Excluir esta pendência?')) removerMutation.mutate(row.id)
          }}
          className="text-xs font-medium text-stamp hover:text-stamp-ink"
        >
          Excluir
        </button>
      ),
    },
  ]

  return (
    <Card
      title={`Pendências desta etapa (${daEtapa.length})`}
      actions={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMostrarTodas((v) => !v)}
            className="text-xs font-medium text-ink-muted hover:text-ink"
          >
            {mostrarTodas ? 'Ver só desta etapa' : `Ver todas da competência (${todas.length})`}
          </button>
          <button
            type="button"
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-lg bg-petrol px-3 py-1.5 text-sm font-medium text-white hover:bg-petrol-600"
          >
            {mostrarForm ? 'Cancelar' : '+ Nova pendência'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {mostrarForm ? (
          <form className="grid grid-cols-1 gap-3 rounded-lg border border-ruled-soft p-3 sm:grid-cols-2" onSubmit={handleCriar}>
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
        ) : null}

        <Table
          columns={columns}
          data={listaExibida}
          isLoading={pendenciasQuery.isLoading}
          getRowKey={(row) => row.id}
          emptyMessage={
            mostrarTodas
              ? 'Nenhuma pendência registrada para esta competência.'
              : 'Nenhuma pendência registrada para esta etapa.'
          }
        />
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Documentos (reaproveitado nas etapas 5 e 7)
// ---------------------------------------------------------------------------

function DocumentosLista({ detalhe, cnpj, competencia }: StageProps) {
  const arquivosQuery = useQuery({
    queryKey: ['arquivos', cnpj, competencia],
    queryFn: () => empresasApi.arquivos(cnpj, competencia),
  })

  const urlPorNome = new Map<string, string>(
    (arquivosQuery.data ?? []).map((arquivo: ArquivoDownload) => [arquivo.nome, arquivo.url]),
  )

  const rows =
    detalhe.arquivos.length > 0
      ? detalhe.arquivos
      : (arquivosQuery.data ?? []).map((a) => ({ nome: a.nome, tipo: 'xlsx' }))

  const columns: Array<TableColumn<{ nome: string; tipo: string }>> = [
    { key: 'nome', header: 'Arquivo', render: (row) => row.nome },
    { key: 'tipo', header: 'Tipo', render: (row) => row.tipo },
    {
      key: 'acoes',
      header: '',
      render: (row) => {
        const url =
          urlPorNome.get(row.nome) ??
          `/api/empresas/${cnpj}/competencias/${competencia}/arquivos/${encodeURIComponent(row.nome)}`
        return (
          <a href={url} className="font-medium text-petrol hover:text-petrol-700" download>
            Download
          </a>
        )
      },
    },
  ]

  return (
    <Card title="Documentos gerados">
      <Table
        columns={columns}
        data={rows}
        isLoading={arquivosQuery.isLoading}
        getRowKey={(row) => row.nome}
        emptyMessage="Nenhum documento disponível para esta competência."
      />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Zona simplificada de upload de evidências do dossiê (subpastas fixas)
// ---------------------------------------------------------------------------

function DossieUploadZona({
  cnpj,
  competencia,
  pasta,
  titulo,
  hint,
}: {
  cnpj: string
  competencia: string
  pasta: string
  titulo: string
  hint: string
}) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [erro, setErro] = useState<string | null>(null)

  const listaQuery = useQuery({
    queryKey: ['dossie', cnpj, competencia, pasta],
    queryFn: () => dossieApi.listar(cnpj, competencia, pasta),
  })

  const uploadMutation = useMutation({
    mutationFn: (files: FileList) => dossieApi.upload(cnpj, competencia, pasta, files),
    onSuccess: async () => {
      setErro(null)
      await queryClient.invalidateQueries({ queryKey: ['dossie', cnpj, competencia, pasta] })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Falha no upload.'
      setErro(String(msg))
    },
  })

  const arquivos = listaQuery.data?.arquivos ?? []

  return (
    <div className="rounded-lg border border-ruled bg-paper p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">{titulo}</p>
          <p className="text-xs text-ink-muted">{hint}</p>
        </div>
        <button
          type="button"
          disabled={uploadMutation.isPending}
          onClick={() => inputRef.current?.click()}
          className="shrink-0 rounded-lg bg-paper-surface px-3 py-1.5 text-xs font-medium text-petrol-700 shadow-tape ring-1 ring-ruled hover:bg-paper disabled:cursor-not-allowed"
        >
          {uploadMutation.isPending ? 'Enviando…' : 'Selecionar arquivo(s)'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
              uploadMutation.mutate(e.target.files)
            }
            e.target.value = ''
          }}
        />
      </div>
      {erro ? <p className="mt-2 text-xs text-stamp">{erro}</p> : null}
      <ul className="mt-3 space-y-1">
        {listaQuery.isLoading ? (
          <li className="text-xs text-ink-faint">Carregando…</li>
        ) : arquivos.length === 0 ? (
          <li className="text-xs text-ink-faint">Nenhum arquivo anexado ainda.</li>
        ) : (
          arquivos.map((a) => (
            <li
              key={a.nome}
              className="flex items-center justify-between gap-2 rounded bg-paper-surface px-2 py-1 text-xs text-ink-muted ring-1 ring-ruled-soft"
            >
              <span className="truncate">{a.nome}</span>
              <span className="shrink-0 text-ink-faint">{formatDateTime(a.modificado_em)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 1 · Documentos e Integridade
// ---------------------------------------------------------------------------

function Stage1Documentos({ cnpj, competencia, detalhe }: StageProps) {
  const resumoModulo = detalhe.modulos.documental
  const moduloQuery = useModulo(cnpj, competencia, 'documental', Boolean(resumoModulo))
  const achados = useMemo(() => extractAchados(moduloQuery.data), [moduloQuery.data])

  return (
    <div className="space-y-4">
      <RecebimentoDocumentos cnpj={cnpj} competencia={competencia} />

      {resumoModulo ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard label="Erros de documentos" value={resumoModulo.resumo.erros} />
            <KpiCard label="Avisos" value={resumoModulo.resumo.avisos} />
            <KpiCard label="Registros conferidos" value={resumoModulo.resumo.total} />
          </div>

          <AchadosResumo
            titulo="Achados de documentos e integridade"
            achados={achados}
            isLoading={moduloQuery.isLoading}
            resumoOverride={resumoModulo.resumo}
          />
        </>
      ) : (
        <ModuloIndisponivel nome="documental" />
      )}

      <GatesPanel cnpj={cnpj} competencia={competencia} apenasGate={1} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 2 · Escrituração e Conferência
// ---------------------------------------------------------------------------

const LIVRO_LIMITE = 200

function Stage2Escrituracao({ cnpj, competencia, detalhe }: StageProps) {
  const icmsResumo = detalhe.modulos.icms
  const estoqueResumo = detalhe.modulos.estoque
  const lmcResumo = detalhe.modulos.lmc

  const icmsQuery = useModulo(cnpj, competencia, 'icms', Boolean(icmsResumo))
  const estoqueQuery = useModulo(cnpj, competencia, 'estoque', Boolean(estoqueResumo))
  const lmcQuery = useModulo(cnpj, competencia, 'lmc', Boolean(lmcResumo))

  const livro = useMemo(() => extractLivro(icmsQuery.data), [icmsQuery.data])

  const livroColumns: Array<TableColumn<LivroLinha>> = [
    { key: 'sentido', header: 'Sentido', render: (r) => r.sentido ?? '—' },
    { key: 'cfop', header: <Term termo="CFOP">CFOP</Term>, render: (r) => r.cfop ?? '—' },
    { key: 'cst', header: <Term termo="CST">CST</Term>, render: (r) => r.cst_icms ?? '—' },
    {
      key: 'aliq',
      header: 'Alíq.',
      render: (r) => (r.aliq_icms != null ? `${r.aliq_icms}%` : '—'),
    },
    { key: 'vl_opr', header: 'Vl. operação', render: (r) => formatBRL(r.vl_opr) },
    { key: 'vl_icms', header: 'Vl. ICMS', render: (r) => formatBRL(r.vl_icms) },
    { key: 'qtd', header: 'Linhas', render: (r) => r.qtd_linhas ?? '—' },
  ]

  const linhasLivro = [...livro.entradas, ...livro.saidas].slice(0, LIVRO_LIMITE)

  return (
    <div className="space-y-4">
      {icmsResumo ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total entradas" value={formatBRL(livro.totalEntradas?.vl_opr)} />
            <KpiCard label="Total saídas" value={formatBRL(livro.totalSaidas?.vl_opr)} />
            <KpiCard label="ICMS entradas" value={formatBRL(livro.totalEntradas?.vl_icms)} />
            <KpiCard label="ICMS saídas" value={formatBRL(livro.totalSaidas?.vl_icms)} />
          </div>

          <Card
            title={
              livro.entradas.length + livro.saidas.length > LIVRO_LIMITE
                ? `Livro de entradas e saídas (mostrando ${LIVRO_LIMITE} de ${livro.entradas.length + livro.saidas.length})`
                : 'Livro de entradas e saídas (resumo)'
            }
          >
            <Table
              columns={livroColumns}
              data={linhasLivro}
              isLoading={icmsQuery.isLoading}
              getRowKey={(_row, index) => index}
              emptyMessage="Nenhum lançamento no livro de entradas/saídas."
            />
          </Card>
        </>
      ) : (
        <ModuloIndisponivel nome="icms" />
      )}

      {estoqueResumo ? (
        <AchadosResumo
          titulo="Achados de estoque"
          achados={extractAchados(estoqueQuery.data)}
          isLoading={estoqueQuery.isLoading}
          resumoOverride={estoqueResumo.resumo}
        />
      ) : null}

      {lmcResumo ? (
        <AchadosResumo
          titulo={'Achados de LMC'}
          achados={extractAchados(lmcQuery.data)}
          isLoading={lmcQuery.isLoading}
          resumoOverride={lmcResumo.resumo}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 3 · Apuração ICMS/IPI/PIS-COFINS
// ---------------------------------------------------------------------------

function Stage3Apuracao({ cnpj, competencia, detalhe }: StageProps) {
  const icmsResumo = detalhe.modulos.icms
  const ipiResumo = detalhe.modulos.ipi
  const pisResumo = detalhe.modulos.pis_cofins
  const margensResumo = detalhe.modulos.margens

  const icmsQuery = useModulo(cnpj, competencia, 'icms', Boolean(icmsResumo))
  const ipiQuery = useModulo(cnpj, competencia, 'ipi', Boolean(ipiResumo))
  const pisQuery = useModulo(cnpj, competencia, 'pis_cofins', Boolean(pisResumo))
  const margensQuery = useModulo(cnpj, competencia, 'margens', Boolean(margensResumo))

  const e110 = useMemo(() => extractRecomputado(icmsQuery.data, 'e110'), [icmsQuery.data])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="ICMS a recolher" value={formatBRL(detalhe.kpis.vl_icms_recolher)} />
        <KpiCard
          label={<Term termo="Saldo credor">Saldo credor a transportar</Term>}
          value={formatBRL(detalhe.kpis.vl_sld_credor_transportar)}
        />
        <KpiCard label={<Term termo="FECOEP">FECOEP a recolher</Term>} value={formatBRL(detalhe.kpis.vl_fecoep_recolher)} />
        <KpiCard
          label={
            <>
              <Term termo="FECOEP">FECOEP</Term> <Term termo="DIFAL">DIFAL</Term> a recolher
            </>
          }
          value={formatBRL(detalhe.kpis.vl_fecoep_difal_recolher)}
        />
      </div>

      {icmsResumo ? (
        <Card title={<Term termo="Bloco E">Apuração do ICMS (Bloco E / E110)</Term>}>
          {e110 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-faint">Total débitos</p>
                <p className="text-sm font-medium text-ink">{formatBRL(e110.VL_TOT_DEBITOS)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Total créditos</p>
                <p className="text-sm font-medium text-ink">{formatBRL(e110.VL_TOT_CREDITOS)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Saldo apurado</p>
                <p className="text-sm font-medium text-ink">{formatBRL(e110.VL_SLD_APURADO)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">ICMS a recolher</p>
                <p className="text-sm font-medium text-ink">{formatBRL(e110.VL_ICMS_RECOLHER)}</p>
              </div>
              <div>
                <p className="text-xs text-ink-faint">Saldo credor a transportar</p>
                <p className="text-sm font-medium text-ink">
                  {formatBRL(e110.VL_SLD_CREDOR_TRANSPORTAR)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-faint">Sem dados de E110 para esta competência.</p>
          )}
          <div className="mt-4 border-t border-ruled-soft pt-3">
            <AchadosResumo
              titulo="Divergências de apuração (ICMS)"
              achados={extractAchados(icmsQuery.data)}
              isLoading={icmsQuery.isLoading}
              resumoOverride={icmsResumo.resumo}
            />
          </div>
        </Card>
      ) : (
        <ModuloIndisponivel nome="icms" />
      )}

      {ipiResumo ? (
        <AchadosResumo
          titulo="Apuração de IPI"
          achados={extractAchados(ipiQuery.data)}
          isLoading={ipiQuery.isLoading}
          resumoOverride={ipiResumo.resumo}
        />
      ) : null}

      {pisResumo ? (
        <AchadosResumo
          titulo="Apuração de PIS/COFINS"
          achados={extractAchados(pisQuery.data)}
          isLoading={pisQuery.isLoading}
          resumoOverride={pisResumo.resumo}
        />
      ) : null}

      {margensResumo ? (
        <AchadosResumo
          titulo="Margens e oportunidades tributárias"
          achados={extractAchados(margensQuery.data)}
          isLoading={margensQuery.isLoading}
          resumoOverride={margensResumo.resumo}
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 4 · Conciliação e Revisão
// ---------------------------------------------------------------------------

function Stage4Conciliacao({ cnpj, competencia, detalhe }: StageProps) {
  const icmsResumo = detalhe.modulos.icms
  const icmsQuery = useModulo(cnpj, competencia, 'icms', Boolean(icmsResumo))

  const cruzamentos = useMemo(() => {
    const raw = icmsQuery.data?.cruzamentos
    return Array.isArray(raw) ? (raw as Cruzamento[]) : []
  }, [icmsQuery.data])

  const mapaLinhas = useMemo(() => {
    const mapa = icmsQuery.data?.mapa_tributario as { linhas?: MapaTributarioLinha[] } | undefined
    return Array.isArray(mapa?.linhas) ? mapa.linhas.slice(0, 50) : []
  }, [icmsQuery.data])

  const cruzColumns: Array<TableColumn<Cruzamento>> = [
    { key: 'id', header: 'ID', render: (row) => row.id ?? '—' },
    {
      key: 'nome',
      header: <Term termo="Cruzamento">Cruzamento</Term>,
      render: (row) => row.nome ?? '—',
    },
    {
      key: 'ok',
      header: 'OK',
      render: (row) => (
        <span className={row.ok ? 'text-pass' : 'text-stamp'}>{row.ok ? 'Sim' : 'Não'}</span>
      ),
    },
    {
      key: 'fecha',
      header: 'Fecha',
      render: (row) => (
        <span className={row.fecha ? 'text-pass' : 'text-warn'}>
          {row.fecha ? 'Sim' : 'Não'}
        </span>
      ),
    },
  ]

  const mapaColumns: Array<TableColumn<MapaTributarioLinha>> = [
    { key: 'sentido', header: 'Sentido', render: (r) => r.sentido ?? '—' },
    { key: 'cfop', header: 'CFOP', render: (r) => r.cfop ?? '—' },
    { key: 'cst', header: 'CST', render: (r) => r.cst_icms ?? '—' },
    {
      key: 'aliq',
      header: 'Alíq. observada',
      render: (r) => (r.aliq_observada != null ? `${r.aliq_observada}%` : '—'),
    },
    { key: 'vl_opr', header: 'Vl. operação', render: (r) => formatBRL(r.vl_opr) },
    { key: 'vl_icms', header: 'Vl. ICMS', render: (r) => formatBRL(r.vl_icms) },
    { key: 'status', header: 'Status', render: (r) => r.status ?? (r.ok ? 'ok' : '—') },
  ]

  return (
    <div className="space-y-4">
      {icmsResumo ? (
        <>
          <Card title={<Term termo="Cruzamento">13 cruzamentos do ICMS</Term>}>
            <Table
              columns={cruzColumns}
              data={cruzamentos}
              isLoading={icmsQuery.isLoading}
              getRowKey={(row, index) => row.id ?? index}
              emptyMessage="Nenhum cruzamento disponível."
            />
          </Card>

          <Card title="Mapa tributário (amostra)">
            <Table
              columns={mapaColumns}
              data={mapaLinhas}
              isLoading={icmsQuery.isLoading}
              getRowKey={(_row, index) => index}
              emptyMessage="Sem linhas no mapa tributário."
            />
          </Card>
        </>
      ) : (
        <ModuloIndisponivel nome="icms" />
      )}

      <GatesPanel cnpj={cnpj} competencia={competencia} apenasGate={2} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 5 · EFD e Obrigações
// ---------------------------------------------------------------------------

function Stage5Efd({ cnpj, competencia, detalhe }: StageProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-muted">
        Os arquivos abaixo compõem a <Term termo="EFD">EFD</Term> transmitida e os relatórios de
        apoio gerados para esta competência.
      </p>
      <DossieUploadZona
        cnpj={cnpj}
        competencia={competencia}
        pasta="11 - Recibo"
        titulo="Anexar recibo da EFD"
        hint='Recibo de transmissão da EFD ICMS/IPI (PVA/SEFAZ) — evidência salva na pasta "11 - Recibo" do dossiê.'
      />
      <DocumentosLista detalhe={detalhe} cnpj={cnpj} competencia={competencia} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 6 · Guias e Pagamento
// ---------------------------------------------------------------------------

const TRIBUTOS_GUIA: Array<{ tributo: TributoGuia; label: string }> = [
  { tributo: 'icms', label: 'ICMS Normal' },
  { tributo: 'fecoep', label: 'FECOEP Normal' },
  { tributo: 'icms_difal', label: 'ICMS DIFAL' },
  { tributo: 'fecoep_difal', label: 'FECOEP DIFAL' },
]

interface LinhaGuiaForm {
  valor: string
  vencimento: string
}

function linhasGuiaVazias(): Record<TributoGuia, LinhaGuiaForm> {
  return {
    icms: { valor: '', vencimento: '' },
    fecoep: { valor: '', vencimento: '' },
    icms_difal: { valor: '', vencimento: '' },
    fecoep_difal: { valor: '', vencimento: '' },
  }
}

function LancamentoManualGuias({
  cnpj,
  competencia,
  onIrParaDocumentos,
}: {
  cnpj: string
  competencia: string
  onIrParaDocumentos: () => void
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [linhas, setLinhas] = useState<Record<TributoGuia, LinhaGuiaForm>>(linhasGuiaVazias())
  const [arquivos, setArquivos] = useState<Partial<Record<TributoGuia, File>>>({})
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const salvarMutation = useMutation({
    mutationFn: async () => {
      const lancamentos: GuiaLancamento[] = TRIBUTOS_GUIA.filter(
        (t) => linhas[t.tributo].valor.trim() !== '',
      ).map((t) => ({
        tributo: t.tributo,
        valor: Number(linhas[t.tributo].valor.replace(',', '.')),
        vencimento: linhas[t.tributo].vencimento || null,
      }))
      if (lancamentos.length === 0) {
        throw new Error('Informe ao menos um valor de guia.')
      }
      await inputsApi.salvarGuias(cnpj, competencia, {
        lancamentos,
        criado_por: user?.nome ?? 'portal',
      })
      for (const t of TRIBUTOS_GUIA) {
        const arquivo = arquivos[t.tributo]
        if (arquivo) {
          await inputsApi.anexarGuia(cnpj, competencia, t.tributo, arquivo)
        }
      }
    },
    onSuccess: async () => {
      setErro(null)
      setMensagem(
        'Guias salvas. Volte para a Etapa 1 e clique em "Processar competência" para o Gate 3 recalcular.',
      )
      setArquivos({})
      await queryClient.invalidateQueries({ queryKey: ['competencia-detalhe', cnpj, competencia] })
      await queryClient.invalidateQueries({ queryKey: ['inputs', cnpj, competencia] })
      await queryClient.invalidateQueries({ queryKey: ['modulo', cnpj, competencia] })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } }; message?: string })?.response?.data
          ?.detail ||
        (err as Error)?.message ||
        'Falha ao salvar guias.'
      setErro(String(msg))
      setMensagem(null)
    },
  })

  return (
    <Card title="Lançamento manual das guias">
      <p className="mb-4 text-sm text-ink-muted">
        Digite os valores das guias (DAR/GNRE) recebidas fora da tela para o cruzamento{' '}
        <Term termo="Cruzamento">"EFD × guia"</Term> (Gate 3). Alternativa: enviar um arquivo{' '}
        <code className="rounded bg-ruled-soft px-1 text-xs">guias.json</code> já pronto na Etapa 1
        (zona "guias.json" em Recebimento de documentos) — os dois caminhos gravam no mesmo lugar
        e o mais recente sobrescreve o anterior.
      </p>

      {erro ? (
        <p className="mb-3 rounded-lg bg-stamp-soft px-3 py-2 text-sm text-stamp-ink" role="alert">
          {erro}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ruled text-left text-xs font-medium text-ink-muted">
              <th className="py-2 pr-3">Tributo</th>
              <th className="py-2 pr-3">Valor</th>
              <th className="py-2 pr-3">Vencimento</th>
              <th className="py-2 pr-3">Anexar PDF (opcional)</th>
            </tr>
          </thead>
          <tbody>
            {TRIBUTOS_GUIA.map((t) => (
              <tr key={t.tributo} className="border-b border-ruled-soft">
                <td className="py-2 pr-3 font-medium text-ink">{t.label}</td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={linhas[t.tributo].valor}
                    onChange={(e) =>
                      setLinhas((prev) => ({
                        ...prev,
                        [t.tributo]: { ...prev[t.tributo], valor: e.target.value },
                      }))
                    }
                    className="w-28 rounded-lg border border-ruled px-2 py-1.5 text-sm focus:border-petrol focus:outline-none focus:ring-1 focus:ring-petrol"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="date"
                    value={linhas[t.tributo].vencimento}
                    onChange={(e) =>
                      setLinhas((prev) => ({
                        ...prev,
                        [t.tributo]: { ...prev[t.tributo], vencimento: e.target.value },
                      }))
                    }
                    className="rounded-lg border border-ruled px-2 py-1.5 text-sm focus:border-petrol focus:outline-none focus:ring-1 focus:ring-petrol"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) =>
                      setArquivos((prev) => ({
                        ...prev,
                        [t.tributo]: e.target.files?.[0] ?? undefined,
                      }))
                    }
                    className="w-44 text-xs text-ink-muted"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={salvarMutation.isPending}
          onClick={() => salvarMutation.mutate()}
          className="rounded-lg bg-petrol px-4 py-2 text-sm font-medium text-white hover:bg-petrol-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {salvarMutation.isPending ? 'Salvando...' : 'Salvar guias'}
        </button>
      </div>

      {mensagem ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-petrol-50 px-3 py-2 text-sm text-petrol-800 ring-1 ring-inset ring-petrol-200">
          <span>{mensagem}</span>
          <button
            type="button"
            onClick={onIrParaDocumentos}
            className="font-medium underline hover:text-petrol-900"
          >
            Ir para a Etapa 1
          </button>
        </div>
      ) : null}
    </Card>
  )
}

function Stage6Guias({
  cnpj,
  competencia,
  detalhe,
  onIrParaDocumentos,
}: StageProps & { onIrParaDocumentos: () => void }) {
  const icmsResumo = detalhe.modulos.icms
  const icmsQuery = useModulo(cnpj, competencia, 'icms', Boolean(icmsResumo))
  const cruzamento13 = useMemo(() => extractCruzamento13(icmsQuery.data), [icmsQuery.data])

  const guiaColumns: Array<TableColumn<GuiaPagamento>> = [
    { key: 'tributo', header: 'Tributo', render: (r) => r.tributo ?? '—' },
    { key: 'valor', header: 'Valor', render: (r) => formatBRL(r.valor) },
    { key: 'vencimento', header: 'Vencimento', render: (r) => r.vencimento ?? '—' },
    { key: 'arquivo', header: 'Guia (arquivo)', render: (r) => r.arquivo ?? '—' },
  ]

  return (
    <div className="space-y-4">
      {icmsResumo ? (
        <Card
          title="Cruzamento 13 · EFD × guia"
          actions={
            cruzamento13 ? (
              <span className={cruzamento13.ok ? 'text-sm text-pass' : 'text-sm text-stamp'}>
                {cruzamento13.ok ? 'Confere' : 'Não confere'}
              </span>
            ) : null
          }
        >
          {cruzamento13 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-ink-faint">
                    Soma declarada na <Term termo="EFD">EFD</Term>
                  </p>
                  <p className="text-sm font-medium text-ink">{formatBRL(cruzamento13.somaEfd)}</p>
                </div>
                <div>
                  <p className="text-xs text-ink-faint">Soma das guias geradas</p>
                  <p className="text-sm font-medium text-ink">{formatBRL(cruzamento13.somaGuia)}</p>
                </div>
              </div>
              <div className="mt-4">
                <Table
                  columns={guiaColumns}
                  data={cruzamento13.guias}
                  isLoading={icmsQuery.isLoading}
                  getRowKey={(row, index) => `${row.tributo ?? 'guia'}-${index}`}
                  emptyMessage="Nenhuma guia disponível para esta competência."
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-faint">
              Cruzamento "EFD x guia" ainda não disponível para esta competência.
            </p>
          )}
        </Card>
      ) : (
        <ModuloIndisponivel nome="icms" />
      )}

      <LancamentoManualGuias
        cnpj={cnpj}
        competencia={competencia}
        onIrParaDocumentos={onIrParaDocumentos}
      />

      <GatesPanel cnpj={cnpj} competencia={competencia} apenasGate={3} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Etapa 7 · Fechamento
// ---------------------------------------------------------------------------

// Penúltimo status do fluxo (`STATUS_WORKFLOW`) — código de "reabertura" ao
// desfazer o fechamento formal (hoje: 18 · "Pagamento confirmado").
const STATUS_REABERTURA = STATUS_WORKFLOW[STATUS_WORKFLOW.length - 2]?.codigo ?? 18
const STATUS_FECHAMENTO = STATUS_WORKFLOW[STATUS_WORKFLOW.length - 1]?.codigo ?? 19

function Stage7Fechamento({ cnpj, competencia, detalhe }: StageProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [mensagemFechamento, setMensagemFechamento] = useState<string | null>(null)

  const pendenciasAbertasQuery = useQuery({
    queryKey: ['pendencias', { empresa_cnpj: cnpj, competencia, status: 'aberta' as PendenciaStatus }],
    queryFn: () =>
      pendenciasApi.listar({ empresa_cnpj: cnpj, competencia, status: 'aberta' as PendenciaStatus }),
  })
  const pendenciasAbertas = pendenciasAbertasQuery.data?.length ?? 0

  const checklist: Array<{ label: string; ok: boolean; detalhe?: string }> = [
    { label: 'Gate 1 liberado (Documentos)', ok: detalhe.gates['1']?.liberado ?? false },
    { label: 'Gate 2 liberado (Conciliação)', ok: detalhe.gates['2']?.liberado ?? false },
    { label: 'Gate 3 liberado (Guias)', ok: detalhe.gates['3']?.liberado ?? false },
    {
      label: 'Nenhuma pendência aberta',
      ok: !pendenciasAbertasQuery.isLoading && pendenciasAbertas === 0,
      detalhe: pendenciasAbertas > 0 ? `${pendenciasAbertas} pendência(s) aberta(s)` : undefined,
    },
  ]

  const tudoOk = checklist.every((item) => item.ok)
  const jaFechado = detalhe.status.codigo === STATUS_FECHAMENTO

  const invalidarAposStatus = async () => {
    await queryClient.invalidateQueries({ queryKey: ['competencia-detalhe', cnpj, competencia] })
    await queryClient.invalidateQueries({ queryKey: ['competencias', cnpj] })
    await queryClient.invalidateQueries({ queryKey: ['portfolio'] })
  }

  const fecharMutation = useMutation({
    mutationFn: () =>
      empresasApi.atualizarStatus(cnpj, competencia, {
        status_codigo: STATUS_FECHAMENTO,
        atualizado_por: user?.nome ?? 'desconhecido',
      }),
    onSuccess: async () => {
      setMensagemFechamento('Competência fechada com sucesso.')
      await invalidarAposStatus()
    },
    onError: () => setMensagemFechamento('Falha ao fechar a competência.'),
  })

  const reabrirMutation = useMutation({
    mutationFn: () =>
      empresasApi.atualizarStatus(cnpj, competencia, {
        status_codigo: STATUS_REABERTURA,
        atualizado_por: user?.nome ?? 'desconhecido',
      }),
    onSuccess: async () => {
      setMensagemFechamento('Competência reaberta.')
      await invalidarAposStatus()
    },
    onError: () => setMensagemFechamento('Falha ao reabrir a competência.'),
  })

  return (
    <div className="space-y-4">
      <Card
        title="Checklist de fechamento"
        actions={
          <span className={tudoOk ? 'text-sm font-medium text-pass' : 'text-sm font-medium text-warn'}>
            {tudoOk ? 'Pronto para fechar' : 'Ainda há pendências'}
          </span>
        }
      >
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  item.ok ? 'bg-pass-soft text-pass-ink' : 'bg-warn-soft text-warn'
                }`}
              >
                {item.ok ? '✓' : '!'}
              </span>
              <span className={item.ok ? 'text-ink' : 'text-warn-ink'}>{item.label}</span>
              {item.detalhe ? <span className="text-xs text-ink-faint">({item.detalhe})</span> : null}
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-ruled-soft pt-4">
          {jaFechado ? (
            <button
              type="button"
              disabled={reabrirMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    `Reabrir esta competência? O status voltará para "${descricaoStatus(STATUS_REABERTURA)}".`,
                  )
                ) {
                  reabrirMutation.mutate()
                }
              }}
              className="rounded-lg bg-warn px-4 py-2 text-sm font-medium text-white hover:bg-warn-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              {reabrirMutation.isPending ? 'Reabrindo...' : 'Reabrir'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!tudoOk || fecharMutation.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'Fechar formalmente esta competência? Esta ação marca o processo como concluído.',
                  )
                ) {
                  fecharMutation.mutate()
                }
              }}
              className="rounded-lg bg-pass px-4 py-2 text-sm font-medium text-white hover:bg-pass-ink disabled:cursor-not-allowed disabled:bg-ruled disabled:text-ink-faint"
            >
              {fecharMutation.isPending ? 'Fechando...' : 'Fechar competência'}
            </button>
          )}
          {!tudoOk && !jaFechado ? (
            <span className="text-xs text-ink-faint">
              Resolva os itens do checklist acima para habilitar o fechamento.
            </span>
          ) : null}
          {mensagemFechamento ? (
            <p className="text-sm text-ink-muted">{mensagemFechamento}</p>
          ) : null}
        </div>
      </Card>

      <DossieUploadZona
        cnpj={cnpj}
        competencia={competencia}
        pasta="14 - Comprovantes"
        titulo="Anexar comprovante de pagamento"
        hint='Comprovantes de recolhimento das guias (DAR/GNRE) — evidência salva na pasta "14 - Comprovantes" do dossiê.'
      />

      <DocumentosLista detalhe={detalhe} cnpj={cnpj} competencia={competencia} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

function EtapaConteudo({
  etapa,
  onIrParaDocumentos,
  ...props
}: StageProps & { etapa: EtapaProcesso; onIrParaDocumentos: () => void }) {
  switch (etapa.id) {
    case 'documentos':
      return <Stage1Documentos {...props} />
    case 'escrituracao':
      return <Stage2Escrituracao {...props} />
    case 'apuracao':
      return <Stage3Apuracao {...props} />
    case 'conciliacao':
      return <Stage4Conciliacao {...props} />
    case 'efd':
      return <Stage5Efd {...props} />
    case 'guias':
      return <Stage6Guias {...props} onIrParaDocumentos={onIrParaDocumentos} />
    case 'fechamento':
      return <Stage7Fechamento {...props} />
    default:
      return null
  }
}

export function EmpresaCompetenciaPage() {
  const { cnpj = '', competencia = '' } = useParams<{ cnpj: string; competencia: string }>()
  const [etapaSelecionadaId, setEtapaSelecionadaId] = useState<string | null>(null)
  const [mostrarDetalhesTecnicos, setMostrarDetalhesTecnicos] = useState(false)

  const detalheQuery = useQuery({
    queryKey: ['competencia-detalhe', cnpj, competencia],
    queryFn: () => empresasApi.detalheCompetencia(cnpj, competencia),
    enabled: Boolean(cnpj && competencia),
  })

  const detalhe = detalheQuery.data
  const etapaAtualId = detalhe ? etapaPorStatus(detalhe.status.codigo).id : ETAPAS_PROCESSO[0].id
  const etapaAtivaId = etapaSelecionadaId ?? etapaAtualId
  const etapa = ETAPAS_PROCESSO.find((item) => item.id === etapaAtivaId) ?? ETAPAS_PROCESSO[0]

  return (
    <PageContainer
      title={detalhe?.empresa.razao_social ?? cnpj}
      description={`Competência ${formatCompetencia(competencia)}`}
    >
      {detalheQuery.isLoading ? (
        <LoadingState label="Carregando dados da competência..." />
      ) : detalheQuery.isError || !detalhe ? (
        <ErrorState onRetry={() => detalheQuery.refetch()} />
      ) : (
        <div className="space-y-6">
          <ProcessStepper
            statusAtual={detalhe.status.codigo}
            etapaAtivaId={etapaAtivaId}
            onSelecionar={setEtapaSelecionadaId}
          />

          <div>
            <button
              type="button"
              onClick={() => setMostrarDetalhesTecnicos((v) => !v)}
              className="text-sm font-medium text-petrol hover:text-petrol-700"
            >
              {mostrarDetalhesTecnicos
                ? '▾ Ocultar detalhes técnicos'
                : '▸ Ver detalhes técnicos (19 status e gates)'}
            </button>
            {mostrarDetalhesTecnicos ? (
              <div className="mt-3">
                <DetalhesTecnicosPanel detalhe={detalhe} cnpj={cnpj} competencia={competencia} />
              </div>
            ) : null}
          </div>

          <StageIntro etapa={etapa} situacao={situacaoEtapa(etapa, detalhe.status.codigo)} />

          <EtapaConteudo
            etapa={etapa}
            detalhe={detalhe}
            cnpj={cnpj}
            competencia={competencia}
            onIrParaDocumentos={() => setEtapaSelecionadaId('documentos')}
          />

          {situacaoEtapa(etapa, detalhe.status.codigo) === 'atual' ? (
            <Card title="Avançar no processo">
              <AvancarEtapaAction
                cnpj={cnpj}
                competencia={competencia}
                etapaAtual={etapa}
                detalhe={detalhe}
              />
            </Card>
          ) : null}

          <PendenciasEtapaPanel cnpj={cnpj} competencia={competencia} etapa={etapa} />
        </div>
      )}
    </PageContainer>
  )
}
