"""Composicao dos dados de relatorio (leitura) com o estado operacional (SQLite).

Usado pelos routers de competencias e de portfolio para nao duplicar a logica
de montar status/gates/kpis/resumo de uma competencia.
"""

from __future__ import annotations

import sqlite3
from typing import Any

from app import operacional_db, relatorios
from app.status import descricao_status
from app.util import somente_digitos


def montar_status_info(con: sqlite3.Connection, cnpj: str, competencia: str) -> dict[str, Any]:
    registro = operacional_db.obter_status(con, cnpj, competencia)
    codigo = registro["status_codigo"] if registro else 1
    return {"codigo": codigo, "descricao": descricao_status(codigo)}


def montar_gates_dict(con: sqlite3.Connection, cnpj: str, competencia: str) -> dict[str, dict[str, bool]]:
    registros = operacional_db.obter_gates(con, cnpj, competencia)
    return {
        str(gate): {"liberado": bool(registros.get(gate, {}).get("liberado", 0))}
        for gate in operacional_db.GATES_VALIDOS
    }


def montar_resumo_competencia(con: sqlite3.Connection, cnpj: str, competencia: str) -> dict[str, Any]:
    """Monta o objeto usado em GET /api/empresas/{cnpj}/competencias (lista)."""
    cnpj = somente_digitos(cnpj)
    _fonte, consolidado = relatorios.carregar_consolidado(cnpj, competencia)
    resumo_geral = relatorios.extrair_resumo_geral(consolidado)
    kpis = relatorios.extrair_kpis(consolidado)

    return {
        "competencia": competencia,
        "status": montar_status_info(con, cnpj, competencia),
        "gates": montar_gates_dict(con, cnpj, competencia),
        "resumo": {
            "ok": resumo_geral.get("ok"),
            "erros": resumo_geral.get("erros"),
            "avisos": resumo_geral.get("avisos"),
        },
        "kpis": kpis,
    }


def montar_modulos_resumo(consolidado: dict[str, Any] | None) -> dict[str, Any]:
    """Monta {<modulo>: {ok, resumo: {erros, avisos, total}}} para o detalhe da competencia."""
    modulos = (consolidado or {}).get("modulos") or {}
    saida: dict[str, Any] = {}
    for nome, dados in modulos.items():
        resumo_modulo = (dados or {}).get("resumo") or {}
        saida[nome] = {
            "ok": (dados or {}).get("ok"),
            "resumo": {
                "erros": resumo_modulo.get("erros"),
                "avisos": resumo_modulo.get("avisos"),
                "total": resumo_modulo.get("total"),
            },
        }
    return saida
