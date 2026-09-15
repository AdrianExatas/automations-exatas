"""Mapa tributario PIS/COFINS observado nos documentos da competencia."""

from __future__ import annotations

import sqlite3
from typing import Any

from motor_fiscal.pis_cofins._util import arred2, base_e_aliq_item, cst_norm, itens_contribuicao, n


def montar(con: sqlite3.Connection) -> dict[str, Any]:
    """Agrupa CFOP × CST PIS × CST COFINS × aliquotas com bases e valores."""
    grupos: dict[tuple, dict[str, Any]] = {}

    for item in itens_contribuicao(con):
        cst_pis = cst_norm(item["cst_pis"]) or ""
        cst_cof = cst_norm(item["cst_cofins"]) or ""
        if not cst_pis and not cst_cof:
            continue
        base_pis, aliq_pis, vpis = base_e_aliq_item(item, "pis")
        base_cof, aliq_cof, vcof = base_e_aliq_item(item, "cofins")
        chave = (
            item["cfop"] or "",
            cst_pis,
            cst_cof,
            arred2(aliq_pis),
            arred2(aliq_cof),
            item["origem"] or "",
        )
        if chave not in grupos:
            grupos[chave] = {
                "cfop": item["cfop"],
                "cst_pis": cst_pis or None,
                "cst_cofins": cst_cof or None,
                "aliq_pis": arred2(aliq_pis),
                "aliq_cofins": arred2(aliq_cof),
                "origem": item["origem"],
                "qtd_itens": 0,
                "base_pis": 0.0,
                "valor_pis": 0.0,
                "base_cofins": 0.0,
                "valor_cofins": 0.0,
                "vicms": 0.0,
                "vicms_st": 0.0,
            }
        g = grupos[chave]
        g["qtd_itens"] += 1
        g["base_pis"] += base_pis
        g["valor_pis"] += vpis
        g["base_cofins"] += base_cof
        g["valor_cofins"] += vcof
        g["vicms"] += n(item["vicms"])
        g["vicms_st"] += n(item["vicms_st"])

    linhas = []
    for g in grupos.values():
        for campo in ("base_pis", "valor_pis", "base_cofins", "valor_cofins", "vicms", "vicms_st"):
            g[campo] = arred2(g[campo])
        linhas.append(g)

    linhas.sort(key=lambda x: (
        x["cfop"] or "",
        x["cst_pis"] or "",
        x["cst_cofins"] or "",
        x["origem"] or "",
    ))
    return {
        "linhas": linhas,
        "total_combinacoes": len(linhas),
        "total_itens": sum(l["qtd_itens"] for l in linhas),
    }
