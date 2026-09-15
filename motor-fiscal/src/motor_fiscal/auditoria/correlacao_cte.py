"""Correlacao CT-e x NF-e (chaves referenciadas)."""

from __future__ import annotations

import json
import sqlite3

from motor_fiscal.util import achado


def auditar_correlacao_cte_nfe(con: sqlite3.Connection) -> dict:
    """Verifica se as chaves NF-e referenciadas em CT-e existem em C100/D100/XML."""
    ctes = con.execute(
        """SELECT id, origem, chave, chaves_referenciadas, numero, serie
           FROM documentos
           WHERE tipo = 'cte' AND chaves_referenciadas IS NOT NULL
             AND chaves_referenciadas != '' AND chaves_referenciadas != '[]'"""
    ).fetchall()

    # Chaves conhecidas em documentos (NF-e/NFC-e) e tambem CHV_CTE_REF do D100 via registros
    chaves_docs = {
        r["chave"]
        for r in con.execute(
            "SELECT DISTINCT chave FROM documentos WHERE chave IS NOT NULL AND chave != ''"
        )
    }

    correlacoes: list[dict] = []
    achados: list[dict] = []
    ok = 0
    faltando = 0

    for cte in ctes:
        try:
            refs = json.loads(cte["chaves_referenciadas"])
        except (TypeError, json.JSONDecodeError):
            refs = []
        if not isinstance(refs, list):
            refs = []

        for chave_nfe in refs:
            if not chave_nfe:
                continue
            encontrada = chave_nfe in chaves_docs
            item = {
                "cte_id": cte["id"],
                "cte_chave": cte["chave"],
                "cte_origem": cte["origem"],
                "chave_nfe": chave_nfe,
                "encontrada": encontrada,
            }
            correlacoes.append(item)
            if encontrada:
                ok += 1
            else:
                faltando += 1
                achados.append(achado(
                    "CTE_NFE_NAO_ENCONTRADA", "erro",
                    f"CT-e {cte['chave']} referencia NF-e {chave_nfe} nao encontrada nos documentos",
                    **item,
                ))

    return {
        "correlacoes": correlacoes,
        "achados": achados,
        "contagens": {
            "referencias": len(correlacoes),
            "encontradas": ok,
            "nao_encontradas": faltando,
        },
    }
