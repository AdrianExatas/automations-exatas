import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inputsApi } from '../../api/client'
import type { InputArquivo, InputTipo, JobStatus } from '../../api/types'
import { useAuth } from '../../auth/AuthContext'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Term } from '../ui/Term'
import { formatDateTime } from '../../lib/format'

const PAGE_SIZE = 50
const COLLAPSE_THRESHOLD = 20
const XML_BATCH_SIZE = 40

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function extensaoArquivo(nome: string): string {
  const i = nome.lastIndexOf('.')
  if (i <= 0 || i === nome.length - 1) return '—'
  return `.${nome.slice(i + 1).toLowerCase()}`
}

function filtrarXmlZip(files: File[]): File[] {
  return files.filter((f) => {
    const n = f.name.toLowerCase()
    return n.endsWith('.xml') || n.endsWith('.zip')
  })
}

function particionarLotes<T>(itens: T[], tamanho: number): T[][] {
  const lotes: T[][] = []
  for (let i = 0; i < itens.length; i += tamanho) {
    lotes.push(itens.slice(i, i + tamanho))
  }
  return lotes
}

const ZONAS: Array<{
  tipo: 'xml' | 'efd' | 'efd_contrib' | 'guias'
  titulo: string
  accept: string
  multiple: boolean
  hint: string
  termo?: string
}> = [
  {
    tipo: 'xml',
    titulo: 'XML fiscais',
    accept: '.xml,.zip,application/zip,text/xml',
    multiple: true,
    hint: 'NF-e, NFC-e, CT-e, CF-e (.xml ou .zip). Pastas CTE/ENTRADAS/SAIDAS preservam subpastas; várias pastas podem ser enviadas em sequência.',
    termo: 'XML',
  },
  {
    tipo: 'efd',
    titulo: 'EFD ICMS/IPI',
    accept: '.txt,text/plain',
    multiple: false,
    hint: 'Arquivo .txt da remessa (Bloco E)',
    termo: 'EFD',
  },
  {
    tipo: 'efd_contrib',
    titulo: 'EFD-Contribuições',
    accept: '.txt,text/plain',
    multiple: false,
    hint: 'Arquivo .txt PIS/COFINS (opcional)',
  },
  {
    tipo: 'guias',
    titulo: 'guias.json',
    accept: '.json,application/json',
    multiple: false,
    hint: 'Valores das guias para cruzamento EFD × guia (Gate 3)',
  },
]

function ZonaUpload({
  titulo,
  hint,
  accept,
  multiple,
  termo,
  disabled,
  permitirPasta,
  onFiles,
}: {
  titulo: string
  hint: string
  accept: string
  multiple: boolean
  termo?: string
  disabled?: boolean
  permitirPasta?: boolean
  onFiles: (files: FileList | File[] | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const el = dirInputRef.current
    if (!el || !permitirPasta) return
    el.setAttribute('webkitdirectory', '')
    el.setAttribute('directory', '')
  }, [permitirPasta])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    onFiles(e.dataTransfer.files)
  }

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    onFiles(e.target.files)
    e.target.value = ''
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-lg border-2 border-dashed px-3 py-4 text-center transition-colors ${
        dragging
          ? 'border-petrol bg-petrol-50'
          : 'border-ruled bg-paper hover:border-ruled'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <p className="text-sm font-medium text-ink">
        {termo ? <Term termo={termo}>{titulo}</Term> : titulo}
      </p>
      <p className="mt-1 text-xs text-ink-muted">{hint}</p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-paper-surface px-3 py-1.5 text-xs font-medium text-petrol-700 shadow-tape ring-1 ring-ruled hover:bg-paper disabled:cursor-not-allowed"
        >
          Selecionar arquivo{multiple ? 's' : ''}
        </button>
        {permitirPasta ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => dirInputRef.current?.click()}
            className="rounded-lg bg-paper-surface px-3 py-1.5 text-xs font-medium text-petrol-700 shadow-tape ring-1 ring-ruled hover:bg-paper disabled:cursor-not-allowed"
          >
            Selecionar pasta
          </button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
        onChange={onInputChange}
      />
      {permitirPasta ? (
        <input
          ref={dirInputRef}
          type="file"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={onInputChange}
        />
      ) : null}
    </div>
  )
}

function SecaoArquivos({
  titulo,
  termo,
  arquivos,
  onRemover,
  removendo,
  comBusca = false,
}: {
  titulo: string
  termo?: string
  arquivos: InputArquivo[]
  onRemover: (a: InputArquivo) => void
  removendo: boolean
  comBusca?: boolean
}) {
  const count = arquivos.length
  const [aberto, setAberto] = useState(count <= COLLAPSE_THRESHOLD)
  const [limite, setLimite] = useState(PAGE_SIZE)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    setAberto(count <= COLLAPSE_THRESHOLD)
    setLimite(PAGE_SIZE)
    setBusca('')
  }, [count])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return arquivos
    return arquivos.filter((a) => a.nome.toLowerCase().includes(q))
  }, [arquivos, busca])

  const visiveis = filtrados.slice(0, limite)
  const temMais = limite < filtrados.length

  return (
    <div className="rounded-lg border border-ruled bg-paper-surface">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={aberto}
      >
        <span className="text-xs font-medium text-ink-muted">
          {termo ? <Term termo={termo}>{titulo}</Term> : titulo}{' '}
          <span className="text-ink-faint">({count})</span>
        </span>
        <span className="text-xs text-ink-faint">{aberto ? 'Recolher' : 'Expandir'}</span>
      </button>

      {aberto ? (
        <div className="border-t border-ruled-soft px-3 pb-3 pt-2">
          {count === 0 ? (
            <p className="text-xs text-ink-faint">Nenhum arquivo neste grupo.</p>
          ) : (
            <>
              {comBusca ? (
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value)
                    setLimite(PAGE_SIZE)
                  }}
                  placeholder="Buscar por nome…"
                  className="mb-2 w-full rounded-md border border-ruled px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:border-petrol focus:outline-none focus:ring-1 focus:ring-petrol"
                />
              ) : null}
              {filtrados.length === 0 ? (
                <p className="text-xs text-ink-faint">Nenhum arquivo corresponde à busca.</p>
              ) : (
                <>
                  <ul className="divide-y divide-ruled-soft rounded-md border border-ruled-soft">
                    {visiveis.map((a) => (
                      <li
                        key={`${a.tipo}-${a.nome}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <Badge tone="neutral" className="shrink-0 !rounded px-1.5 py-0 text-[10px] uppercase">
                              {extensaoArquivo(a.nome)}
                            </Badge>
                            <p className="truncate font-medium text-ink">{a.nome}</p>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-faint">
                            {formatBytes(a.tamanho)}
                            {a.modificado_em ? ` · ${formatDateTime(a.modificado_em)}` : ''}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={removendo}
                          onClick={() => onRemover(a)}
                          className="shrink-0 text-xs font-medium text-stamp hover:text-stamp-ink disabled:opacity-50"
                        >
                          Remover
                        </button>
                      </li>
                    ))}
                  </ul>
                  {temMais ? (
                    <button
                      type="button"
                      onClick={() => setLimite((n) => n + PAGE_SIZE)}
                      className="mt-2 text-xs font-medium text-petrol-700 hover:text-petrol-800"
                    >
                      Mostrar mais ({filtrados.length - limite} restantes)
                    </button>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function PainelJob({ job }: { job: JobStatus }) {
  const cores: Record<string, string> = {
    queued: 'bg-ruled-soft text-ink',
    running: 'bg-warn-soft text-warn-ink',
    ok: 'bg-pass-soft text-pass-ink',
    erro: 'bg-stamp-soft text-stamp-ink',
  }
  const label: Record<string, string> = {
    queued: 'Na fila',
    running: 'Em andamento',
    ok: 'Concluído',
    erro: 'Erro',
  }
  return (
    <div className={`rounded-lg px-4 py-3 text-sm ${cores[job.status] ?? cores.queued}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">
          Processamento #{job.id}: {label[job.status] ?? job.status}
          {job.etapa ? ` · ${job.etapa}` : ''}
        </p>
        {job.status === 'running' || job.status === 'queued' ? (
          <span className="inline-flex items-center gap-1 text-xs">
            <span className="h-2 w-2 animate-pulse rounded-full bg-warn" />
            Acompanhe o progresso
          </span>
        ) : null}
      </div>
      {job.mensagem ? <p className="mt-1 text-xs opacity-90">{job.mensagem}</p> : null}
      {job.log && job.log.length > 0 ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium">Ver log</summary>
          <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px] opacity-90">
            {job.log.slice(-30).map((item, i) => (
              <li key={i}>
                {item.em ? `[${item.em}] ` : ''}
                {item.msg}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  )
}

export function RecebimentoDocumentos({
  cnpj,
  competencia,
}: {
  cnpj: string
  competencia: string
}) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [jobId, setJobId] = useState<number | null>(null)
  const [erroUpload, setErroUpload] = useState<string | null>(null)
  const [progressoUpload, setProgressoUpload] = useState<string | null>(null)
  const [enviandoXml, setEnviandoXml] = useState(false)

  const inputsQuery = useQuery({
    queryKey: ['inputs', cnpj, competencia],
    queryFn: () => inputsApi.listar(cnpj, competencia),
  })

  const jobQuery = useQuery({
    queryKey: ['job', cnpj, competencia, jobId],
    queryFn: () => inputsApi.job(cnpj, competencia, jobId!),
    enabled: jobId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'ok' || status === 'erro') return false
      return 2000
    },
  })

  // Recupera job em andamento ao montar
  useEffect(() => {
    let cancelado = false
    inputsApi
      .jobAtual(cnpj, competencia)
      .then((job) => {
        if (!cancelado && job) setJobId(job.id)
      })
      .catch(() => undefined)
    return () => {
      cancelado = true
    }
  }, [cnpj, competencia])

  // Ao concluir, invalida dados da competência
  useEffect(() => {
    if (jobQuery.data?.status === 'ok') {
      void queryClient.invalidateQueries({ queryKey: ['competencia-detalhe', cnpj, competencia] })
      void queryClient.invalidateQueries({ queryKey: ['modulo', cnpj, competencia] })
      void queryClient.invalidateQueries({ queryKey: ['competencias', cnpj] })
      void queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      void queryClient.invalidateQueries({ queryKey: ['arquivos', cnpj, competencia] })
    }
  }, [jobQuery.data?.status, cnpj, competencia, queryClient])

  const uploadMutation = useMutation({
    mutationFn: (form: FormData) => inputsApi.upload(cnpj, competencia, form),
    onSuccess: async () => {
      setErroUpload(null)
      await queryClient.invalidateQueries({ queryKey: ['inputs', cnpj, competencia] })
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Falha no upload.'
      setErroUpload(String(msg))
    },
  })

  const removerMutation = useMutation({
    mutationFn: ({ tipo, nome }: { tipo: InputTipo; nome: string }) =>
      inputsApi.remover(cnpj, competencia, tipo, nome),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['inputs', cnpj, competencia] })
    },
  })

  const processarMutation = useMutation({
    mutationFn: () =>
      inputsApi.processar(cnpj, competencia, {
        modulos: 'completo',
        criado_por: user?.nome ?? 'portal',
      }),
    onSuccess: (job) => {
      setJobId(job.id)
      setErroUpload(null)
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Falha ao iniciar processamento.'
      setErroUpload(String(msg))
    },
  })

  const enviarXml = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return
      const lista = filtrarXmlZip(Array.from(files))
      if (lista.length === 0) {
        setErroUpload('Nenhum arquivo .xml ou .zip encontrado na seleção.')
        return
      }
      const lotes = particionarLotes(lista, XML_BATCH_SIZE)
      setErroUpload(null)
      setEnviandoXml(true)
      try {
        for (let i = 0; i < lotes.length; i++) {
          setProgressoUpload(
            lotes.length > 1 ? `Enviando lote ${i + 1}/${lotes.length}…` : 'Enviando arquivo…',
          )
          const form = new FormData()
          lotes[i].forEach((f) => {
            form.append('xml', f, f.webkitRelativePath || f.name)
          })
          await uploadMutation.mutateAsync(form)
        }
      } catch {
        // onError da mutation já define erroUpload
      } finally {
        setProgressoUpload(null)
        setEnviandoXml(false)
      }
    },
    [uploadMutation],
  )

  const enviarTipo = useCallback(
    (tipo: 'xml' | 'efd' | 'efd_contrib' | 'guias', files: FileList | File[] | null) => {
      if (!files) return
      const arr = Array.from(files)
      if (arr.length === 0) return
      if (tipo === 'xml') {
        void enviarXml(arr)
        return
      }
      const form = new FormData()
      form.append(tipo, arr[0])
      uploadMutation.mutate(form)
    },
    [enviarXml, uploadMutation],
  )

  const listagem = inputsQuery.data
  const todosArquivos = useMemo(() => {
    if (!listagem) return [] as InputArquivo[]
    return [
      ...listagem.xml,
      ...listagem.efd,
      ...listagem.efd_contrib,
      ...listagem.guias,
      ...listagem.outros,
    ]
  }, [listagem])

  const podeProcessar =
    Boolean(listagem && (listagem.xml.length > 0 || listagem.efd.length > 0)) &&
    !processarMutation.isPending &&
    jobQuery.data?.status !== 'running' &&
    jobQuery.data?.status !== 'queued'

  const ocupado = uploadMutation.isPending || processarMutation.isPending || enviandoXml

  return (
    <Card title="Recebimento de documentos">
      <p className="mb-4 text-sm text-ink-muted">
        Envie os arquivos da competência (XML, <Term termo="EFD">EFD</Term> e, se houver,{' '}
        <code className="rounded bg-ruled-soft px-1 text-xs">guias.json</code>). Depois clique em{' '}
        <strong>Processar competência</strong> para importar e auditar no motor — o resultado
        aparece abaixo e atualiza os achados desta etapa.
      </p>

      {erroUpload ? (
        <p className="mb-3 rounded-lg bg-stamp-soft px-3 py-2 text-sm text-stamp-ink" role="alert">
          {erroUpload}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ZONAS.map((z) => (
          <ZonaUpload
            key={z.tipo}
            titulo={z.titulo}
            hint={z.hint}
            accept={z.accept}
            multiple={z.multiple}
            termo={z.termo}
            disabled={ocupado}
            permitirPasta={z.tipo === 'xml'}
            onFiles={(files) => enviarTipo(z.tipo, files)}
          />
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Arquivos na pasta ({todosArquivos.length})
        </h4>
        {inputsQuery.isLoading ? (
          <p className="text-sm text-ink-faint">Carregando lista…</p>
        ) : inputsQuery.isError ? (
          <p className="text-sm text-stamp">Não foi possível listar os inputs.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SecaoArquivos
              titulo="XML fiscais"
              termo="XML"
              arquivos={listagem?.xml ?? []}
              comBusca
              removendo={removerMutation.isPending}
              onRemover={(a) => removerMutation.mutate({ tipo: a.tipo, nome: a.nome })}
            />
            <SecaoArquivos
              titulo="EFD ICMS/IPI"
              termo="EFD"
              arquivos={listagem?.efd ?? []}
              removendo={removerMutation.isPending}
              onRemover={(a) => removerMutation.mutate({ tipo: a.tipo, nome: a.nome })}
            />
            <SecaoArquivos
              titulo="EFD-Contribuições"
              arquivos={listagem?.efd_contrib ?? []}
              removendo={removerMutation.isPending}
              onRemover={(a) => removerMutation.mutate({ tipo: a.tipo, nome: a.nome })}
            />
            <SecaoArquivos
              titulo="Guias"
              arquivos={listagem?.guias ?? []}
              removendo={removerMutation.isPending}
              onRemover={(a) => removerMutation.mutate({ tipo: a.tipo, nome: a.nome })}
            />
            <SecaoArquivos
              titulo="Outros"
              arquivos={listagem?.outros ?? []}
              removendo={removerMutation.isPending}
              onRemover={(a) => removerMutation.mutate({ tipo: a.tipo, nome: a.nome })}
            />
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!podeProcessar}
          onClick={() => processarMutation.mutate()}
          className="rounded-lg bg-petrol px-4 py-2 text-sm font-medium text-white hover:bg-petrol-600 disabled:cursor-not-allowed disabled:bg-ruled disabled:text-ink-faint"
        >
          {processarMutation.isPending ? 'Iniciando…' : 'Processar competência'}
        </button>
        {!listagem?.xml.length && !listagem?.efd.length ? (
          <span className="text-xs text-ink-faint">
            Envie ao menos XML ou EFD ICMS/IPI para habilitar.
          </span>
        ) : null}
        {progressoUpload || uploadMutation.isPending || enviandoXml ? (
          <span className="text-xs text-ink-muted">{progressoUpload ?? 'Enviando arquivo…'}</span>
        ) : null}
      </div>

      {jobQuery.data ? (
        <div className="mt-4">
          <PainelJob job={jobQuery.data} />
        </div>
      ) : null}
    </Card>
  )
}
