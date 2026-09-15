"""Leitura e escrita do registro de empresas (apuracao-ICMS/config/empresas.json)."""

from __future__ import annotations

import json
import re

from app.config import EMPRESAS_JSON
from app.util import sem_acentos, somente_digitos

_SLUG_INVALIDO_RE = re.compile(r"[^a-z0-9]+")


class EmpresaNaoEncontrada(Exception):
    pass


class EmpresaConflito(Exception):
    """CNPJ ou slug ja cadastrado para outra empresa."""


def _carregar_raw() -> list[dict]:
    if not EMPRESAS_JSON.is_file():
        return []
    with open(EMPRESAS_JSON, encoding="utf-8") as f:
        dados = json.load(f)
    return dados if isinstance(dados, list) else []


def _gravar_raw(registros: list[dict]) -> None:
    EMPRESAS_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(EMPRESAS_JSON, "w", encoding="utf-8") as f:
        json.dump(registros, f, ensure_ascii=False, indent=2)
        f.write("\n")


def _normalizar(item: dict) -> dict:
    return {
        "cnpj": somente_digitos(item.get("cnpj")),
        "slug": item.get("slug"),
        "razao_social": item.get("razao_social"),
        "uf": item.get("uf"),
        "ie": item.get("ie"),
        # compatibilidade com registros antigos sem o campo "ativo".
        "ativo": item.get("ativo", True) if item.get("ativo") is not None else True,
    }


def _slugify(texto: str) -> str:
    base = sem_acentos(texto or "").lower()
    base = _SLUG_INVALIDO_RE.sub("-", base).strip("-")
    return base or "empresa"


def _slug_disponivel(slug: str, registros: list[dict], *, ignorar_cnpj: str | None = None) -> bool:
    for item in registros:
        if ignorar_cnpj is not None and somente_digitos(item.get("cnpj")) == ignorar_cnpj:
            continue
        if item.get("slug") == slug:
            return False
    return True


def _gerar_slug_unico(base_texto: str, registros: list[dict], *, ignorar_cnpj: str | None = None) -> str:
    base = _slugify(base_texto)
    slug = base
    contador = 2
    while not _slug_disponivel(slug, registros, ignorar_cnpj=ignorar_cnpj):
        slug = f"{base}-{contador}"
        contador += 1
    return slug


def listar_empresas(*, incluir_inativas: bool = False) -> list[dict]:
    """Retorna as empresas cadastradas, com cnpj normalizado (so digitos).

    Por padrao, retorna apenas as empresas ativas; use ``incluir_inativas=True``
    para tambem trazer as desativadas (soft-delete, ``ativo=False``).
    """
    empresas = [_normalizar(item) for item in _carregar_raw()]
    if incluir_inativas:
        return empresas
    return [empresa for empresa in empresas if empresa.get("ativo", True)]


def buscar_empresa(cnpj: str) -> dict | None:
    """Busca uma empresa pelo CNPJ, ativa ou nao.

    Usado por rotinas internas (ex.: resolucao de pastas/competencias) que
    precisam localizar a empresa mesmo apos ela ter sido desativada.
    """
    cnpj_norm = somente_digitos(cnpj)
    for empresa in listar_empresas(incluir_inativas=True):
        if empresa["cnpj"] == cnpj_norm:
            return empresa
    return None


def buscar_empresa_ou_404(cnpj: str) -> dict:
    empresa = buscar_empresa(cnpj)
    if empresa is None:
        raise EmpresaNaoEncontrada(cnpj)
    return empresa


def criar_empresa(dados: dict) -> dict:
    """Cria uma nova empresa em config/empresas.json.

    ``dados`` espera as chaves de ``EmpresaCreate`` (cnpj, razao_social, uf,
    ie e, opcionalmente, slug). Se o slug nao for informado, e gerado a
    partir da razao social.

    Levanta ``ValueError`` se o CNPJ nao tiver 14 digitos e ``EmpresaConflito``
    se o CNPJ ou o slug ja estiverem em uso por outra empresa.
    """
    cnpj = somente_digitos(dados.get("cnpj"))
    if len(cnpj) != 14:
        raise ValueError("CNPJ deve conter 14 digitos")

    registros = _carregar_raw()
    if any(somente_digitos(item.get("cnpj")) == cnpj for item in registros):
        raise EmpresaConflito(f"CNPJ ja cadastrado: {cnpj}")

    slug_informado = dados.get("slug")
    if slug_informado:
        slug = _slugify(slug_informado)
        if not _slug_disponivel(slug, registros):
            raise EmpresaConflito(f"Slug ja cadastrado: {slug}")
    else:
        slug = _gerar_slug_unico(dados.get("razao_social") or cnpj, registros)

    uf = dados.get("uf")
    registro = {
        "slug": slug,
        "cnpj": cnpj,
        "razao_social": dados.get("razao_social"),
        "uf": uf.upper() if isinstance(uf, str) else uf,
        "ie": dados.get("ie"),
        "ativo": True,
    }
    registros.append(registro)
    _gravar_raw(registros)
    return _normalizar(registro)


def atualizar_empresa(cnpj: str, campos: dict) -> dict | None:
    """Atualiza os campos informados da empresa com o CNPJ dado.

    ``campos`` deve conter apenas as chaves a alterar (ex.: resultado de
    ``EmpresaUpdate.model_dump(exclude_unset=True)``). O CNPJ (identificador)
    nao e alterado por esta funcao.

    Retorna ``None`` se a empresa nao existir. Levanta ``EmpresaConflito`` se
    o novo slug (quando informado) ja pertencer a outra empresa.
    """
    cnpj_norm = somente_digitos(cnpj)
    registros = _carregar_raw()
    indice = next(
        (i for i, item in enumerate(registros) if somente_digitos(item.get("cnpj")) == cnpj_norm),
        None,
    )
    if indice is None:
        return None

    registro = dict(registros[indice])

    if campos.get("slug"):
        novo_slug = _slugify(campos["slug"])
        if not _slug_disponivel(novo_slug, registros, ignorar_cnpj=cnpj_norm):
            raise EmpresaConflito(f"Slug ja cadastrado: {novo_slug}")
        registro["slug"] = novo_slug
    if campos.get("razao_social") is not None:
        registro["razao_social"] = campos["razao_social"]
    if campos.get("uf") is not None:
        registro["uf"] = str(campos["uf"]).upper()
    if campos.get("ie") is not None:
        registro["ie"] = campos["ie"]
    if "ativo" in campos and campos["ativo"] is not None:
        registro["ativo"] = bool(campos["ativo"])

    registros[indice] = registro
    _gravar_raw(registros)
    return _normalizar(registro)


def desativar_empresa(cnpj: str) -> dict | None:
    """Soft-delete: marca ``ativo=False`` sem remover o registro nem o historico."""
    return atualizar_empresa(cnpj, {"ativo": False})
