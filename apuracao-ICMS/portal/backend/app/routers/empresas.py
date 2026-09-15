from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.empresas import (
    EmpresaConflito,
    atualizar_empresa,
    criar_empresa,
    desativar_empresa,
    listar_empresas,
)
from app.models import Empresa, EmpresaCreate, EmpresaUpdate
from app.util import somente_digitos

router = APIRouter(prefix="/api/empresas", tags=["empresas"])


@router.get("", response_model=list[Empresa])
def get_empresas(incluir_inativas: bool = Query(False)) -> list[dict]:
    return listar_empresas(incluir_inativas=incluir_inativas)


@router.post("", response_model=Empresa, status_code=201)
def post_empresa(body: EmpresaCreate) -> dict:
    try:
        return criar_empresa(body.model_dump())
    except EmpresaConflito as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.put("/{cnpj}", response_model=Empresa)
def put_empresa(cnpj: str, body: EmpresaUpdate) -> dict:
    campos = body.model_dump(exclude_unset=True)
    try:
        resultado = atualizar_empresa(cnpj, campos)
    except EmpresaConflito as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    if resultado is None:
        raise HTTPException(
            status_code=404, detail=f"Empresa nao encontrada: {somente_digitos(cnpj)}"
        )
    return resultado


@router.delete("/{cnpj}", response_model=Empresa)
def delete_empresa(cnpj: str) -> dict:
    resultado = desativar_empresa(cnpj)
    if resultado is None:
        raise HTTPException(
            status_code=404, detail=f"Empresa nao encontrada: {somente_digitos(cnpj)}"
        )
    return resultado
