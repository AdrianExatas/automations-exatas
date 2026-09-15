"""Orquestrador da auditoria documental (M1)."""

from __future__ import annotations

import sqlite3

from motor_fiscal.auditoria import (
    correlacao_cte,
    correlacao_produtos,
    divergencias,
    faltantes,
    sequencia,
)
from motor_fiscal.util import resumir_achados


def auditar_documental(
    con: sqlite3.Connection,
    empresa_cnpj: str,
    competencia: str,
) -> dict:
    """Executa todas as checagens documentais e devolve JSON estruturado."""
    falt = faltantes.auditar_faltantes(con, competencia)
    seq = sequencia.auditar_sequencia(con)
    cte = correlacao_cte.auditar_correlacao_cte_nfe(con)
    prod = correlacao_produtos.correlacionar_produtos(con, empresa_cnpj, persistir=True)
    div = divergencias.auditar_divergencias(con, empresa_cnpj)

    achados = (
        falt["achados"] + seq["achados"] + cte["achados"]
        + prod["achados"] + div["achados"]
    )
    resumo = resumir_achados(achados)
    return {
        "modulo": "documental",
        "empresa_cnpj": empresa_cnpj,
        "competencia": competencia,
        "faltantes": {k: v for k, v in falt.items() if k != "achados"},
        "sequencia": {k: v for k, v in seq.items() if k != "achados"},
        "correlacao_cte_nfe": {k: v for k, v in cte.items() if k != "achados"},
        "correlacao_produtos": {k: v for k, v in prod.items() if k != "achados"},
        "divergencias": {k: v for k, v in div.items() if k != "achados"},
        "achados": achados,
        "resumo": resumo,
        "ok": resumo["erros"] == 0,
    }
