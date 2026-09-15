"""Registro modular de comandos de auditoria/apuracao.

Cada pacote de dominio (``pis_cofins``, ``icms``, ``auditoria``, ...) chama
``registrar`` no import. A CLI descobre os handlers sem acoplar o dispatcher
aos detalhes de cada marco — reduz conflito de merge em ``__main__.py``.
"""

from __future__ import annotations

import importlib
import sqlite3
from collections.abc import Callable, Iterable
from typing import Any

# handler(con, empresa, competencia, **kwargs) -> dict (relatorio JSON-serializavel)
Handler = Callable[..., dict[str, Any]]

_HANDLERS: dict[str, Handler] = {}

# Pacotes conhecidos que podem se auto-registrar (import opcional).
_PACOTES_CONHECIDOS = (
    "pis_cofins",
    "auditoria",
    "icms",
    "ipi",
    "estoque",
    "lmc",
    "margens",
)


def registrar(nome: str, handler: Handler) -> None:
    """Registra (ou substitui) o handler de auditoria do modulo ``nome``."""
    if not nome or not callable(handler):
        raise ValueError("nome e handler sao obrigatorios")
    _HANDLERS[nome] = handler


def handlers_registrados() -> dict[str, Handler]:
    return dict(_HANDLERS)


def descobrir() -> list[str]:
    """Importa pacotes conhecidos para acionar o auto-registro. Retorna nomes carregados."""
    carregados: list[str] = []
    for nome in _PACOTES_CONHECIDOS:
        try:
            importlib.import_module(f"motor_fiscal.{nome}")
        except ImportError:
            continue
        if nome in _HANDLERS:
            carregados.append(nome)
    return carregados


def resolver_modulos(pedido: str | Iterable[str] | None) -> list[str]:
    """Interpreta ``all`` / lista CSV / iterable e devolve nomes validos ordenados."""
    descobrir()
    disponiveis = sorted(_HANDLERS)
    if not disponiveis:
        return []
    if pedido is None or pedido == "" or pedido == "all":
        return disponiveis
    if isinstance(pedido, str):
        pedidos = [p.strip() for p in pedido.split(",") if p.strip()]
    else:
        pedidos = [str(p).strip() for p in pedido if str(p).strip()]
    if not pedidos or pedidos == ["all"]:
        return disponiveis
    desconhecidos = [p for p in pedidos if p not in _HANDLERS]
    if desconhecidos:
        raise ValueError(
            f"modulo(s) desconhecido(s): {', '.join(desconhecidos)}. "
            f"Disponiveis: {', '.join(disponiveis) or '(nenhum)'}"
        )
    return pedidos


def executar(
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    modulos: str | Iterable[str] | None = "all",
    **kwargs: Any,
) -> dict[str, Any]:
    """Executa os handlers pedidos e devolve ``{nome: relatorio}``."""
    nomes = resolver_modulos(modulos)
    saida: dict[str, Any] = {}
    for nome in nomes:
        saida[nome] = _HANDLERS[nome](con, empresa, competencia, **kwargs)
    return saida
