import axios from 'axios'
import type {
  ArquivoDownload,
  CompetenciaCreatePayload,
  CompetenciaDetalhe,
  CompetenciaResumo,
  DossieListagem,
  Empresa,
  EmpresaCreatePayload,
  EmpresaUpdatePayload,
  GateDetalhe,
  GateUpdatePayload,
  GuiasFormPayload,
  InputTipo,
  InputsListagem,
  JobStatus,
  ModuloBruto,
  Pendencia,
  PendenciaCreate,
  PendenciaUpdate,
  PendenciasFiltro,
  PortfolioResumo,
  ProcessarPayload,
  StatusDetalhe,
  StatusUpdatePayload,
  TributoGuia,
} from './types'

// O Vite (vite.config.ts) faz proxy de "/api" -> "http://127.0.0.1:8001" em dev.
// Em produção, o backend deve ser servido sob o mesmo domínio/prefixo "/api".
export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const empresasApi = {
  listar: (incluirInativas = false) =>
    api
      .get<Empresa[]>('/empresas', { params: incluirInativas ? { incluir_inativas: true } : {} })
      .then((res) => res.data),

  competencias: (cnpj: string) =>
    api.get<CompetenciaResumo[]>(`/empresas/${cnpj}/competencias`).then((res) => res.data),

  detalheCompetencia: (cnpj: string, competencia: string) =>
    api
      .get<CompetenciaDetalhe>(`/empresas/${cnpj}/competencias/${competencia}`)
      .then((res) => res.data),

  modulo: (cnpj: string, competencia: string, modulo: string) =>
    api
      .get<ModuloBruto>(`/empresas/${cnpj}/competencias/${competencia}/modulos/${modulo}`)
      .then((res) => res.data),

  arquivos: (cnpj: string, competencia: string) =>
    api
      .get<ArquivoDownload[]>(`/empresas/${cnpj}/competencias/${competencia}/arquivos`)
      .then((res) => res.data),

  status: (cnpj: string, competencia: string) =>
    api
      .get<StatusDetalhe>(`/empresas/${cnpj}/competencias/${competencia}/status`)
      .then((res) => res.data),

  atualizarStatus: (cnpj: string, competencia: string, payload: StatusUpdatePayload) =>
    api
      .put<StatusDetalhe>(`/empresas/${cnpj}/competencias/${competencia}/status`, payload)
      .then((res) => res.data),

  gates: (cnpj: string, competencia: string) =>
    api
      .get<GateDetalhe[]>(`/empresas/${cnpj}/competencias/${competencia}/gates`)
      .then((res) => res.data),

  atualizarGate: (
    cnpj: string,
    competencia: string,
    gate: number,
    payload: GateUpdatePayload,
  ) =>
    api
      .patch<GateDetalhe>(
        `/empresas/${cnpj}/competencias/${competencia}/gates/${gate}`,
        payload,
      )
      .then((res) => res.data),

  criarCompetencia: (cnpj: string, payload: CompetenciaCreatePayload) =>
    api
      .post<CompetenciaResumo>(`/empresas/${cnpj}/competencias`, payload)
      .then((res) => res.data),

  criar: (payload: EmpresaCreatePayload) =>
    api.post<Empresa>('/empresas', payload).then((res) => res.data),

  atualizar: (cnpj: string, payload: EmpresaUpdatePayload) =>
    api.put<Empresa>(`/empresas/${cnpj}`, payload).then((res) => res.data),

  remover: (cnpj: string) => api.delete<Empresa>(`/empresas/${cnpj}`).then((res) => res.data),
}

export const pendenciasApi = {
  listar: (filtro: PendenciasFiltro = {}) =>
    api.get<Pendencia[]>('/pendencias', { params: filtro }).then((res) => res.data),

  criar: (payload: PendenciaCreate) =>
    api.post<Pendencia>('/pendencias', payload).then((res) => res.data),

  atualizar: (id: number, payload: PendenciaUpdate) =>
    api.patch<Pendencia>(`/pendencias/${id}`, payload).then((res) => res.data),

  remover: (id: number) => api.delete<void>(`/pendencias/${id}`).then((res) => res.data),
}

export const portfolioApi = {
  resumo: () => api.get<PortfolioResumo>('/portfolio').then((res) => res.data),
}

export const inputsApi = {
  listar: (cnpj: string, competencia: string) =>
    api
      .get<InputsListagem>(`/empresas/${cnpj}/competencias/${competencia}/inputs`)
      .then((res) => res.data),

  upload: async (cnpj: string, competencia: string, form: FormData) => {
    // fetch puro: axios com Content-Type JSON default quebra o boundary do multipart
    const res = await fetch(`/api/empresas/${cnpj}/competencias/${competencia}/inputs`, {
      method: 'POST',
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error('Falha no upload'), {
        response: { data, status: res.status },
      })
    }
    return data as InputsListagem
  },

  remover: (cnpj: string, competencia: string, tipo: InputTipo, nome: string) =>
    api
      .delete<void>(
        `/empresas/${cnpj}/competencias/${competencia}/inputs/${tipo}/${encodeURIComponent(nome)}`,
      )
      .then((res) => res.data),

  processar: (cnpj: string, competencia: string, payload: ProcessarPayload = {}) =>
    api
      .post<JobStatus>(`/empresas/${cnpj}/competencias/${competencia}/processar`, payload)
      .then((res) => res.data),

  job: (cnpj: string, competencia: string, jobId: number) =>
    api
      .get<JobStatus>(`/empresas/${cnpj}/competencias/${competencia}/jobs/${jobId}`)
      .then((res) => res.data),

  jobAtual: (cnpj: string, competencia: string) =>
    api
      .get<JobStatus | null>(`/empresas/${cnpj}/competencias/${competencia}/jobs/atual`)
      .then((res) => res.data),

  salvarGuias: (cnpj: string, competencia: string, payload: GuiasFormPayload) =>
    api
      .post<InputsListagem>(`/empresas/${cnpj}/competencias/${competencia}/guias`, payload)
      .then((res) => res.data),

  anexarGuia: async (cnpj: string, competencia: string, tributo: TributoGuia, file: File) => {
    // fetch puro: axios com Content-Type JSON default quebra o boundary do multipart
    const form = new FormData()
    form.append('arquivo', file)
    const res = await fetch(
      `/api/empresas/${cnpj}/competencias/${competencia}/guias/${tributo}/anexo`,
      { method: 'POST', body: form },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error('Falha ao anexar guia'), {
        response: { data, status: res.status },
      })
    }
    return data as InputsListagem
  },
}

export const dossieApi = {
  listar: (cnpj: string, competencia: string, pasta: string) =>
    api
      .get<DossieListagem>(
        `/empresas/${cnpj}/competencias/${competencia}/dossie/${encodeURIComponent(pasta)}`,
      )
      .then((res) => res.data),

  upload: async (cnpj: string, competencia: string, pasta: string, files: FileList | File[]) => {
    // fetch puro: axios com Content-Type JSON default quebra o boundary do multipart
    const form = new FormData()
    Array.from(files).forEach((arquivo) => form.append('arquivos', arquivo))
    const res = await fetch(
      `/api/empresas/${cnpj}/competencias/${competencia}/dossie/${encodeURIComponent(pasta)}`,
      { method: 'POST', body: form },
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error('Falha no upload'), {
        response: { data, status: res.status },
      })
    }
    return data as DossieListagem
  },
}
