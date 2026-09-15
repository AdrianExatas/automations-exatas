import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PageContainer } from '../components/layout/PageContainer'
import { Card } from '../components/ui/Card'
import { Table } from '../components/ui/Table'
import type { TableColumn } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { LoadingState } from '../components/ui/LoadingState'
import { ErrorState } from '../components/ui/ErrorState'
import { empresasApi } from '../api/client'
import type { Empresa, EmpresaCreatePayload, EmpresaUpdatePayload } from '../api/types'
import { formatCnpj } from '../lib/format'

interface EmpresaFormState {
  cnpj: string
  razao_social: string
  uf: string
  ie: string
  slug: string
}

const FORM_VAZIO: EmpresaFormState = {
  cnpj: '',
  razao_social: '',
  uf: '',
  ie: '',
  slug: '',
}

function extrairErro(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
  return detail ? String(detail) : fallback
}

function EmpresaForm({
  empresaEditando,
  onCancelar,
  onSalvar,
  salvando,
  erro,
}: {
  empresaEditando: Empresa | null
  onCancelar: () => void
  onSalvar: (dados: EmpresaFormState) => void
  salvando: boolean
  erro: string | null
}) {
  const [form, setForm] = useState<EmpresaFormState>(FORM_VAZIO)

  useEffect(() => {
    if (empresaEditando) {
      setForm({
        cnpj: empresaEditando.cnpj,
        razao_social: empresaEditando.razao_social ?? '',
        uf: empresaEditando.uf ?? '',
        ie: empresaEditando.ie ?? '',
        slug: empresaEditando.slug ?? '',
      })
    } else {
      setForm(FORM_VAZIO)
    }
  }, [empresaEditando])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    onSalvar(form)
  }

  return (
    <Card title={empresaEditando ? 'Editar empresa' : 'Nova empresa'}>
      <form className="grid grid-cols-1 gap-3 sm:grid-cols-2" onSubmit={handleSubmit}>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="empresa-cnpj">
            CNPJ
          </label>
          <input
            id="empresa-cnpj"
            required
            disabled={Boolean(empresaEditando)}
            placeholder="Somente números"
            value={form.cnpj}
            maxLength={14}
            onChange={(e) =>
              setForm((f) => ({ ...f, cnpj: e.target.value.replace(/\D/g, '') }))
            }
            className="input-field font-mono disabled:bg-ruled-soft disabled:text-ink-faint"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="empresa-razao">
            Razão social
          </label>
          <input
            id="empresa-razao"
            required
            placeholder="Razão social"
            value={form.razao_social}
            onChange={(e) => setForm((f) => ({ ...f, razao_social: e.target.value }))}
            className="input-field"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="empresa-uf">
            UF
          </label>
          <input
            id="empresa-uf"
            required
            placeholder="Ex.: SP"
            value={form.uf}
            maxLength={2}
            onChange={(e) => setForm((f) => ({ ...f, uf: e.target.value.toUpperCase() }))}
            className="input-field uppercase"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="empresa-ie">
            Inscrição estadual
          </label>
          <input
            id="empresa-ie"
            required
            placeholder="Inscrição estadual"
            value={form.ie}
            onChange={(e) => setForm((f) => ({ ...f, ie: e.target.value }))}
            className="input-field font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-ink-muted" htmlFor="empresa-slug">
            Slug (opcional)
          </label>
          <input
            id="empresa-slug"
            placeholder="Gerado automaticamente a partir da razão social, se vazio"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="input-field font-mono"
          />
          <p className="mt-1 text-xs text-ink-faint">
            Usado no caminho de pastas da empresa (<code>empresas/&lt;slug&gt;</code>). Deve ser
            único no cadastro.
          </p>
        </div>

        {erro ? (
          <p className="rounded-lg bg-stamp-soft px-3 py-2 text-sm text-stamp-ink sm:col-span-2" role="alert">
            {erro}
          </p>
        ) : null}

        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" disabled={salvando} className="btn-primary px-4">
            {salvando ? 'Salvando...' : empresaEditando ? 'Salvar alterações' : 'Criar empresa'}
          </button>
          <button type="button" onClick={onCancelar} className="btn-ghost border border-ruled px-4">
            Cancelar
          </button>
        </div>
      </form>
    </Card>
  )
}

export function EmpresasPage() {
  const queryClient = useQueryClient()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const empresasQuery = useQuery({
    queryKey: ['empresas', 'todas'],
    queryFn: () => empresasApi.listar(true),
  })

  const invalidar = () =>
    queryClient.invalidateQueries({ queryKey: ['empresas'] })

  const criarMutation = useMutation({
    mutationFn: (payload: EmpresaCreatePayload) => empresasApi.criar(payload),
    onSuccess: async () => {
      setMostrarForm(false)
      setErroForm(null)
      await invalidar()
    },
    onError: (err: unknown) => setErroForm(extrairErro(err, 'Falha ao criar empresa.')),
  })

  const atualizarMutation = useMutation({
    mutationFn: ({ cnpj, payload }: { cnpj: string; payload: EmpresaUpdatePayload }) =>
      empresasApi.atualizar(cnpj, payload),
    onSuccess: async () => {
      setMostrarForm(false)
      setEmpresaEditando(null)
      setErroForm(null)
      await invalidar()
    },
    onError: (err: unknown) => setErroForm(extrairErro(err, 'Falha ao atualizar empresa.')),
  })

  const desativarMutation = useMutation({
    mutationFn: (cnpj: string) => empresasApi.remover(cnpj),
    onSuccess: invalidar,
  })

  const reativarMutation = useMutation({
    mutationFn: (cnpj: string) => empresasApi.atualizar(cnpj, { ativo: true }),
    onSuccess: invalidar,
  })

  function abrirNovo() {
    setEmpresaEditando(null)
    setErroForm(null)
    setMostrarForm(true)
  }

  function abrirEdicao(empresa: Empresa) {
    setEmpresaEditando(empresa)
    setErroForm(null)
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setEmpresaEditando(null)
    setErroForm(null)
  }

  function salvar(dados: EmpresaFormState) {
    if (empresaEditando) {
      atualizarMutation.mutate({
        cnpj: empresaEditando.cnpj,
        payload: {
          razao_social: dados.razao_social,
          uf: dados.uf,
          ie: dados.ie,
          slug: dados.slug || undefined,
        },
      })
    } else {
      criarMutation.mutate({
        cnpj: dados.cnpj,
        razao_social: dados.razao_social,
        uf: dados.uf,
        ie: dados.ie,
        slug: dados.slug || undefined,
      })
    }
  }

  function alternarAtivo(empresa: Empresa) {
    if (empresa.ativo === false) {
      reativarMutation.mutate(empresa.cnpj)
    } else if (window.confirm(`Desativar a empresa "${empresa.razao_social}"?`)) {
      desativarMutation.mutate(empresa.cnpj)
    }
  }

  const columns: Array<TableColumn<Empresa>> = [
    { key: 'razao_social', header: 'Razão social', render: (row) => row.razao_social },
    {
      key: 'cnpj',
      header: 'CNPJ',
      render: (row) => <span className="font-mono text-xs">{formatCnpj(row.cnpj)}</span>,
    },
    { key: 'uf', header: 'UF', render: (row) => row.uf },
    {
      key: 'ie',
      header: 'IE',
      render: (row) => <span className="font-mono text-xs">{row.ie}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (row) => <code className="font-mono text-xs">{row.slug}</code>,
    },
    {
      key: 'ativo',
      header: 'Status',
      render: (row) =>
        row.ativo === false ? (
          <Badge tone="neutral">Inativa</Badge>
        ) : (
          <Badge tone="success">Ativa</Badge>
        ),
    },
    {
      key: 'acoes',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => abrirEdicao(row)}
            className="text-xs font-medium text-petrol-700 hover:text-petrol-800"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={desativarMutation.isPending || reativarMutation.isPending}
            onClick={() => alternarAtivo(row)}
            className={`text-xs font-medium disabled:opacity-50 ${
              row.ativo === false
                ? 'text-pass hover:text-pass-ink'
                : 'text-stamp hover:text-stamp-ink'
            }`}
          >
            {row.ativo === false ? 'Reativar' : 'Desativar'}
          </button>
        </div>
      ),
    },
  ]

  return (
    <PageContainer
      title="Empresas"
      description="Cadastro de empresas do portfólio: CNPJ, razão social, UF, inscrição estadual e slug de pastas."
      actions={
        <button
          type="button"
          onClick={mostrarForm ? fecharForm : abrirNovo}
          className="btn-primary px-3 py-1.5"
        >
          {mostrarForm ? 'Cancelar' : 'Nova empresa'}
        </button>
      }
    >
      <div className="space-y-4">
        {mostrarForm ? (
          <EmpresaForm
            empresaEditando={empresaEditando}
            onCancelar={fecharForm}
            onSalvar={salvar}
            salvando={criarMutation.isPending || atualizarMutation.isPending}
            erro={erroForm}
          />
        ) : null}

        {empresasQuery.isLoading ? (
          <LoadingState label="Carregando empresas..." />
        ) : empresasQuery.isError ? (
          <ErrorState onRetry={() => empresasQuery.refetch()} />
        ) : (
          <Table
            columns={columns}
            data={empresasQuery.data ?? []}
            getRowKey={(row) => row.cnpj}
            emptyMessage="Nenhuma empresa cadastrada."
          />
        )}
      </div>
    </PageContainer>
  )
}
