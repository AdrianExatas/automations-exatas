from __future__ import annotations

import sqlite3
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app import operacional_db
from app.models import Pendencia, PendenciaCreate, PendenciaUpdate
from app.operacional_db import get_conn
from app.util import somente_digitos

router = APIRouter(prefix="/api/pendencias", tags=["pendencias"])

STATUS_VALIDOS = operacional_db.STATUS_VALIDOS


@router.get("", response_model=list[Pendencia])
def get_pendencias(
    empresa_cnpj: Optional[str] = None,
    competencia: Optional[str] = None,
    status: Optional[str] = None,
    responsavel: Optional[str] = None,
    con: sqlite3.Connection = Depends(get_conn),
) -> list[dict]:
    if status is not None and status not in STATUS_VALIDOS:
        raise HTTPException(status_code=422, detail=f"status deve ser um de {sorted(STATUS_VALIDOS)}")
    cnpj_norm = somente_digitos(empresa_cnpj) if empresa_cnpj else None
    return operacional_db.listar_pendencias(
        con,
        empresa_cnpj=cnpj_norm or None,
        competencia=competencia,
        status=status,
        responsavel=responsavel,
    )


@router.post("", response_model=Pendencia, status_code=201)
def post_pendencia(body: PendenciaCreate, con: sqlite3.Connection = Depends(get_conn)) -> dict:
    dados = body.model_dump()
    dados["empresa_cnpj"] = somente_digitos(dados["empresa_cnpj"])
    return operacional_db.criar_pendencia(con, dados)


@router.patch("/{pendencia_id}", response_model=Pendencia)
def patch_pendencia(
    pendencia_id: int, body: PendenciaUpdate, con: sqlite3.Connection = Depends(get_conn)
) -> dict:
    if body.status is not None and body.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=422, detail=f"status deve ser um de {sorted(STATUS_VALIDOS)}")
    campos = body.model_dump(exclude_unset=True)
    if "empresa_cnpj" in campos and campos["empresa_cnpj"]:
        campos["empresa_cnpj"] = somente_digitos(campos["empresa_cnpj"])
    resultado = operacional_db.atualizar_pendencia(con, pendencia_id, campos)
    if resultado is None:
        raise HTTPException(status_code=404, detail="Pendencia nao encontrada")
    return resultado


@router.delete("/{pendencia_id}", status_code=204)
def delete_pendencia(pendencia_id: int, con: sqlite3.Connection = Depends(get_conn)) -> None:
    removida = operacional_db.excluir_pendencia(con, pendencia_id)
    if not removida:
        raise HTTPException(status_code=404, detail="Pendencia nao encontrada")
