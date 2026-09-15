"""Modelos Pydantic (request/response) do backend do portal."""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class Empresa(BaseModel):
    cnpj: str
    slug: Optional[str] = None
    razao_social: Optional[str] = None
    uf: Optional[str] = None
    ie: Optional[str] = None
    ativo: bool = True


class EmpresaCreate(BaseModel):
    cnpj: str
    razao_social: str
    uf: str
    ie: str
    slug: Optional[str] = None


class EmpresaUpdate(BaseModel):
    slug: Optional[str] = None
    razao_social: Optional[str] = None
    uf: Optional[str] = None
    ie: Optional[str] = None
    ativo: Optional[bool] = None


class StatusInfo(BaseModel):
    codigo: int
    descricao: str


class GateInfo(BaseModel):
    liberado: bool


class KPIs(BaseModel):
    model_config = ConfigDict(extra="allow")

    vl_icms_recolher: Optional[float] = None
    vl_sld_credor_transportar: Optional[float] = None
    vl_fecoep_recolher: Optional[float] = None
    vl_fecoep_difal_recolher: Optional[float] = None


class ResumoGeral(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: Optional[bool] = None
    erros: Optional[int] = None
    avisos: Optional[int] = None


class CompetenciaResumo(BaseModel):
    competencia: str
    status: StatusInfo
    gates: dict[str, GateInfo]
    resumo: ResumoGeral
    kpis: KPIs


class CompetenciaCreate(BaseModel):
    competencia: str
    criado_por: Optional[str] = None


class ModuloResumo(BaseModel):
    model_config = ConfigDict(extra="allow")

    ok: Optional[bool] = None
    resumo: dict[str, Any] = Field(default_factory=dict)


class ArquivoInfo(BaseModel):
    nome: str
    tipo: str = "xlsx"


class ArquivoLink(BaseModel):
    nome: str
    url: str


class CompetenciaDetalhe(BaseModel):
    empresa: Empresa
    competencia: str
    status: StatusInfo
    gates: dict[str, GateInfo]
    kpis: KPIs
    modulos: dict[str, ModuloResumo]
    arquivos: list[ArquivoInfo]


class StatusResponse(BaseModel):
    status_codigo: int
    status_descricao: str
    atualizado_em: Optional[str] = None
    atualizado_por: Optional[str] = None


class StatusUpdate(BaseModel):
    status_codigo: int = Field(ge=1, le=19)
    atualizado_por: Optional[str] = None


class GateDetalhe(BaseModel):
    gate: int
    liberado: bool
    justificativa: Optional[str] = None
    liberado_por: Optional[str] = None
    liberado_em: Optional[str] = None


class GateUpdate(BaseModel):
    liberado: bool
    justificativa: Optional[str] = None
    liberado_por: Optional[str] = None


class Pendencia(BaseModel):
    id: int
    empresa_cnpj: str
    competencia: str
    etapa: Optional[str] = None
    fato: Optional[str] = None
    impacto: Optional[str] = None
    responsavel: Optional[str] = None
    proximo_passo: Optional[str] = None
    status: str = "aberta"
    criado_em: Optional[str] = None
    resolvido_em: Optional[str] = None


class PendenciaCreate(BaseModel):
    empresa_cnpj: str
    competencia: str
    etapa: Optional[str] = None
    fato: Optional[str] = None
    impacto: Optional[str] = None
    responsavel: Optional[str] = None
    proximo_passo: Optional[str] = None


class PendenciaUpdate(BaseModel):
    empresa_cnpj: Optional[str] = None
    competencia: Optional[str] = None
    etapa: Optional[str] = None
    fato: Optional[str] = None
    impacto: Optional[str] = None
    responsavel: Optional[str] = None
    proximo_passo: Optional[str] = None
    status: Optional[str] = None


class PortfolioValores(BaseModel):
    vl_icms_recolher: float = 0.0
    vl_sld_credor_transportar: float = 0.0


class PortfolioResumo(BaseModel):
    total_empresas: int
    total_competencias: int
    pendencias_abertas: int
    competencias_com_erro: int
    valores_totais: PortfolioValores


class InputArquivo(BaseModel):
    tipo: str
    nome: str
    tamanho: int
    modificado_em: Optional[str] = None


class InputsListagem(BaseModel):
    xml: list[InputArquivo] = Field(default_factory=list)
    efd: list[InputArquivo] = Field(default_factory=list)
    efd_contrib: list[InputArquivo] = Field(default_factory=list)
    guias: list[InputArquivo] = Field(default_factory=list)
    outros: list[InputArquivo] = Field(default_factory=list)


class ProcessarRequest(BaseModel):
    modulos: str = "completo"
    criado_por: Optional[str] = None


class JobLogItem(BaseModel):
    em: Optional[str] = None
    msg: Optional[str] = None


class JobStatus(BaseModel):
    id: int
    empresa_cnpj: str
    competencia: str
    status: str
    etapa: Optional[str] = None
    mensagem: Optional[str] = None
    log: list[Any] = Field(default_factory=list)
    criado_em: Optional[str] = None
    atualizado_em: Optional[str] = None
    criado_por: Optional[str] = None


class GuiaLancamento(BaseModel):
    tributo: Literal["icms", "fecoep", "icms_difal", "fecoep_difal"]
    valor: float
    vencimento: Optional[str] = None


class GuiasFormPayload(BaseModel):
    lancamentos: list[GuiaLancamento]
    criado_por: Optional[str] = None


class DossieListagem(BaseModel):
    pasta: str
    arquivos: list[InputArquivo] = Field(default_factory=list)
