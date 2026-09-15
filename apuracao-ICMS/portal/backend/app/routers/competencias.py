from __future__ import annotations

import sqlite3
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app import operacional_db, paths_inputs, relatorios, servicos
from app.empresas import buscar_empresa
from app.models import (
    ArquivoLink,
    CompetenciaCreate,
    CompetenciaDetalhe,
    CompetenciaResumo,
    GateDetalhe,
    GateUpdate,
    StatusResponse,
    StatusUpdate,
)
from app.operacional_db import get_conn
from app.status import descricao_status, status_codigo_valido
from app.util import competencia_valida, somente_digitos

router = APIRouter(prefix="/api/empresas/{cnpj}", tags=["competencias"])


def _cnpj_norm(cnpj: str) -> str:
    normalizado = somente_digitos(cnpj)
    if not normalizado:
        raise HTTPException(status_code=422, detail="CNPJ invalido")
    return normalizado


def _validar_competencia(competencia: str) -> str:
    if not competencia_valida(competencia):
        raise HTTPException(status_code=422, detail="Competencia invalida, esperado AAAA-MM")
    return competencia


def _empresa_ou_stub(cnpj: str) -> dict[str, Any]:
    """Empresa registrada em config/empresas.json, ou um stub minimo pelo CNPJ."""
    empresa = buscar_empresa(cnpj)
    return empresa or {"cnpj": cnpj, "slug": None, "razao_social": None, "uf": None, "ie": None}


def _competencia_ja_existe(cnpj: str, competencia: str) -> bool:
    """True se ja houver conteudo relevante no dossie desta competencia.

    Pastas de dossie recem-criadas (so com as 15 subpastas vazias) nao contam
    como "ja existe" - permite reexecutar a criacao sem bloquear o fiscal.
    """
    pasta = paths_inputs.pasta_dossie(cnpj, competencia, criar=False)
    if not pasta.is_dir():
        return False
    return any(item.is_file() for item in pasta.rglob("*"))


@router.get("/competencias", response_model=list[CompetenciaResumo])
def get_competencias(cnpj: str, con: sqlite3.Connection = Depends(get_conn)) -> list[dict]:
    cnpj = _cnpj_norm(cnpj)
    competencias = relatorios.listar_competencias_disponiveis(cnpj)
    return [servicos.montar_resumo_competencia(con, cnpj, competencia) for competencia in competencias]


@router.post("/competencias", response_model=CompetenciaResumo, status_code=201)
def post_competencia(
    cnpj: str,
    body: CompetenciaCreate,
    con: sqlite3.Connection = Depends(get_conn),
) -> dict:
    """Inicia uma nova competencia (mes) para a empresa: cria as pastas de
    input e de dossie e grava o status inicial, sem exigir upload previo."""
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(body.competencia)

    if buscar_empresa(cnpj) is None:
        raise HTTPException(status_code=404, detail=f"Empresa {cnpj} nao encontrada em config/empresas.json")

    if _competencia_ja_existe(cnpj, competencia):
        raise HTTPException(
            status_code=409,
            detail=f"Competencia {competencia} ja existe para esta empresa",
        )

    try:
        paths_inputs.pasta_competencia_empresa(cnpj, competencia, criar=True)
    except paths_inputs.PastaEmpresaErro as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    paths_inputs.pasta_dossie(cnpj, competencia, criar=True)

    operacional_db.upsert_status(
        con,
        empresa_cnpj=cnpj,
        competencia=competencia,
        status_codigo=1,
        atualizado_por=body.criado_por,
    )

    return servicos.montar_resumo_competencia(con, cnpj, competencia)


@router.get("/competencias/{competencia}", response_model=CompetenciaDetalhe)
def get_competencia_detalhe(
    cnpj: str, competencia: str, con: sqlite3.Connection = Depends(get_conn)
) -> dict:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)

    _fonte, consolidado = relatorios.carregar_consolidado(cnpj, competencia)
    kpis = relatorios.extrair_kpis(consolidado)
    modulos = servicos.montar_modulos_resumo(consolidado)
    arquivos = [{"nome": nome, "tipo": "xlsx"} for nome in relatorios.listar_arquivos_xlsx(cnpj, competencia)]

    return {
        "empresa": _empresa_ou_stub(cnpj),
        "competencia": competencia,
        "status": servicos.montar_status_info(con, cnpj, competencia),
        "gates": servicos.montar_gates_dict(con, cnpj, competencia),
        "kpis": kpis,
        "modulos": modulos,
        "arquivos": arquivos,
    }


@router.get("/competencias/{competencia}/modulos/{modulo}")
def get_modulo(cnpj: str, competencia: str, modulo: str) -> dict[str, Any]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    dados = relatorios.carregar_modulo(cnpj, competencia, modulo)
    if dados is None:
        raise HTTPException(status_code=404, detail=f"Modulo '{modulo}' nao encontrado para {cnpj}/{competencia}")
    return dados


@router.get("/competencias/{competencia}/arquivos", response_model=list[ArquivoLink])
def get_arquivos(cnpj: str, competencia: str) -> list[dict]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    return [
        {
            "nome": nome,
            "url": f"/api/empresas/{cnpj}/competencias/{competencia}/arquivos/{nome}",
        }
        for nome in relatorios.listar_arquivos_xlsx(cnpj, competencia)
    ]


@router.get("/competencias/{competencia}/arquivos/{nome}")
def download_arquivo(cnpj: str, competencia: str, nome: str) -> FileResponse:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    caminho = relatorios.resolver_arquivo_xlsx(cnpj, competencia, nome)
    if caminho is None:
        raise HTTPException(status_code=404, detail="Arquivo nao encontrado")
    return FileResponse(
        caminho,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=caminho.name,
    )


@router.get("/competencias/{competencia}/status", response_model=StatusResponse)
def get_status(cnpj: str, competencia: str, con: sqlite3.Connection = Depends(get_conn)) -> dict:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    registro = operacional_db.obter_status(con, cnpj, competencia)
    if registro is None:
        return {
            "status_codigo": 1,
            "status_descricao": descricao_status(1),
            "atualizado_em": None,
            "atualizado_por": None,
        }
    return {
        "status_codigo": registro["status_codigo"],
        "status_descricao": descricao_status(registro["status_codigo"]),
        "atualizado_em": registro["atualizado_em"],
        "atualizado_por": registro["atualizado_por"],
    }


@router.put("/competencias/{competencia}/status", response_model=StatusResponse)
def put_status(
    cnpj: str,
    competencia: str,
    body: StatusUpdate,
    con: sqlite3.Connection = Depends(get_conn),
) -> dict:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    if not status_codigo_valido(body.status_codigo):
        raise HTTPException(status_code=422, detail="status_codigo deve estar entre 1 e 19")
    resultado = operacional_db.upsert_status(
        con,
        empresa_cnpj=cnpj,
        competencia=competencia,
        status_codigo=body.status_codigo,
        atualizado_por=body.atualizado_por,
    )
    return {
        "status_codigo": resultado["status_codigo"],
        "status_descricao": descricao_status(resultado["status_codigo"]),
        "atualizado_em": resultado["atualizado_em"],
        "atualizado_por": resultado["atualizado_por"],
    }


@router.get("/competencias/{competencia}/gates", response_model=list[GateDetalhe])
def get_gates(cnpj: str, competencia: str, con: sqlite3.Connection = Depends(get_conn)) -> list[dict]:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    registros = operacional_db.obter_gates(con, cnpj, competencia)
    saida = []
    for gate in operacional_db.GATES_VALIDOS:
        registro = registros.get(gate)
        if registro:
            saida.append(
                {
                    "gate": gate,
                    "liberado": bool(registro["liberado"]),
                    "justificativa": registro["justificativa"],
                    "liberado_por": registro["liberado_por"],
                    "liberado_em": registro["liberado_em"],
                }
            )
        else:
            saida.append(
                {"gate": gate, "liberado": False, "justificativa": None, "liberado_por": None, "liberado_em": None}
            )
    return saida


@router.patch("/competencias/{competencia}/gates/{gate}", response_model=GateDetalhe)
def patch_gate(
    cnpj: str,
    competencia: str,
    gate: int,
    body: GateUpdate,
    con: sqlite3.Connection = Depends(get_conn),
) -> dict:
    cnpj = _cnpj_norm(cnpj)
    competencia = _validar_competencia(competencia)
    if gate not in operacional_db.GATES_VALIDOS:
        raise HTTPException(status_code=422, detail="gate deve ser 1, 2 ou 3")
    return operacional_db.upsert_gate(
        con,
        empresa_cnpj=cnpj,
        competencia=competencia,
        gate=gate,
        liberado=body.liberado,
        justificativa=body.justificativa,
        liberado_por=body.liberado_por,
    )
