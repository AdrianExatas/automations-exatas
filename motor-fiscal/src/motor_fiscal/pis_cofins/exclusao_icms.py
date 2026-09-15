"""Exclusao do ICMS da base de PIS/COFINS (tese RE 574.706).

Variantes:
- ``normal``: exclui ICMS proprio destacado (``vicms``);
- ``st``: exclui ICMS-ST destacado (``vicms_st``);
- ``difal``: exclui DIFAL destacado (``vicms_difal``, coluna opcional).

Para cada item com base de PIS/COFINS, recalcula base e contribuicao sem o ICMS
da variante e reporta a diferenca (oportunidade) por competencia.
"""

from __future__ import annotations

import sqlite3
from typing import Any, Literal

from motor_fiscal.pis_cofins._util import (
    CST_CREDITO,
    CST_DEBITO,
    arred2,
    base_e_aliq_item,
    cst_norm,
    garantir_coluna_vicms_difal,
    itens_contribuicao,
    n,
)

Variante = Literal["normal", "st", "difal"]
VARIANTES: tuple[Variante, ...] = ("normal", "st", "difal")


def calcular(con: sqlite3.Connection) -> dict[str, Any]:
    """Calcula exclusao do ICMS nas tres variantes e totais de oportunidade."""
    garantir_coluna_vicms_difal(con)
    itens = _deduplicar_itens(itens_contribuicao(con))
    variantes: dict[str, Any] = {}
    oportunidade = {"pis": 0.0, "cofins": 0.0, "total": 0.0}

    for variante in VARIANTES:
        rel = _calcular_variante(itens, variante)
        variantes[variante] = rel
        oportunidade["pis"] += rel["totais"]["oportunidade_pis"]
        oportunidade["cofins"] += rel["totais"]["oportunidade_cofins"]

    oportunidade = {k: arred2(v) for k, v in oportunidade.items()}
    oportunidade["total"] = arred2(oportunidade["pis"] + oportunidade["cofins"])

    return {
        "tese": "RE 574.706",
        "descricao": (
            "Recalculo da base de PIS/COFINS excluindo o ICMS destacado na NF. "
            "Diferenca positiva indica contribuicao paga a maior (oportunidade)."
        ),
        "variantes": variantes,
        "oportunidade_competencia": oportunidade,
    }


_PRIORIDADE_ORIGEM = {"xml": 0, "efd_contribuicoes": 1, "efd_icms_ipi": 2}


def _deduplicar_itens(itens: list[sqlite3.Row]) -> list[sqlite3.Row]:
    """Evita somar duas vezes o mesmo documento presente em XML e EFD.

    Preferencia: xml > efd_contribuicoes > efd_icms_ipi. Itens sem chave
    (ex.: NFSe A100) sao mantidos todos.
    """
    escolhidos: dict[tuple, sqlite3.Row] = {}
    sem_chave: list[sqlite3.Row] = []
    for item in itens:
        chave = item["chave"]
        if not chave:
            sem_chave.append(item)
            continue
        n_item = item["n_item"] if item["n_item"] is not None else 0
        key = (chave, int(n_item))
        atual = escolhidos.get(key)
        if atual is None:
            escolhidos[key] = item
            continue
        pri_novo = _PRIORIDADE_ORIGEM.get(item["origem"], 9)
        pri_atual = _PRIORIDADE_ORIGEM.get(atual["origem"], 9)
        if pri_novo < pri_atual:
            escolhidos[key] = item
    return list(escolhidos.values()) + sem_chave


def _icms_variante(item: sqlite3.Row, variante: Variante) -> float:
    if variante == "normal":
        return max(0.0, n(item["vicms"]))
    if variante == "st":
        return max(0.0, n(item["vicms_st"]))
    # difal
    try:
        return max(0.0, n(item["vicms_difal"]))
    except (IndexError, KeyError):
        return 0.0


def _calcular_variante(itens: list[sqlite3.Row], variante: Variante) -> dict[str, Any]:
    linhas: list[dict] = []
    tot = {
        "base_pis_original": 0.0,
        "base_pis_ajustada": 0.0,
        "pis_original": 0.0,
        "pis_ajustado": 0.0,
        "oportunidade_pis": 0.0,
        "base_cofins_original": 0.0,
        "base_cofins_ajustada": 0.0,
        "cofins_original": 0.0,
        "cofins_ajustado": 0.0,
        "oportunidade_cofins": 0.0,
        "icms_excluido": 0.0,
        "itens_com_efeito": 0,
    }

    for item in itens:
        cst_pis = cst_norm(item["cst_pis"])
        cst_cofins = cst_norm(item["cst_cofins"])
        # So opera sobre itens com PIS/COFINS tributados (debito ou credito com base)
        if not ((cst_pis in CST_DEBITO or cst_pis in CST_CREDITO)
                or (cst_cofins in CST_DEBITO or cst_cofins in CST_CREDITO)):
            continue

        icms = _icms_variante(item, variante)
        if icms <= 0:
            continue

        base_pis, aliq_pis, vpis = base_e_aliq_item(item, "pis")
        base_cof, aliq_cof, vcof = base_e_aliq_item(item, "cofins")
        if base_pis <= 0 and base_cof <= 0:
            continue

        base_pis_aj = arred2(max(0.0, base_pis - icms))
        base_cof_aj = arred2(max(0.0, base_cof - icms))
        pis_aj = arred2(base_pis_aj * aliq_pis / 100) if aliq_pis else 0.0
        cof_aj = arred2(base_cof_aj * aliq_cof / 100) if aliq_cof else 0.0
        dif_pis = arred2(vpis - pis_aj)
        dif_cof = arred2(vcof - cof_aj)

        if abs(dif_pis) < 0.005 and abs(dif_cof) < 0.005:
            continue

        linha = {
            "variante": variante,
            "origem": item["origem"],
            "chave": item["chave"],
            "n_item": item["n_item"],
            "codigo_produto": item["codigo_produto"],
            "cfop": item["cfop"],
            "cst_pis": cst_pis,
            "cst_cofins": cst_cofins,
            "icms_excluido": arred2(icms),
            "pis": {
                "base_original": arred2(base_pis),
                "base_ajustada": base_pis_aj,
                "aliq": aliq_pis,
                "valor_original": arred2(vpis),
                "valor_ajustado": pis_aj,
                "diferenca": dif_pis,
            },
            "cofins": {
                "base_original": arred2(base_cof),
                "base_ajustada": base_cof_aj,
                "aliq": aliq_cof,
                "valor_original": arred2(vcof),
                "valor_ajustado": cof_aj,
                "diferenca": dif_cof,
            },
        }
        linhas.append(linha)

        tot["base_pis_original"] += base_pis
        tot["base_pis_ajustada"] += base_pis_aj
        tot["pis_original"] += vpis
        tot["pis_ajustado"] += pis_aj
        tot["oportunidade_pis"] += max(0.0, dif_pis)
        tot["base_cofins_original"] += base_cof
        tot["base_cofins_ajustada"] += base_cof_aj
        tot["cofins_original"] += vcof
        tot["cofins_ajustado"] += cof_aj
        tot["oportunidade_cofins"] += max(0.0, dif_cof)
        tot["icms_excluido"] += icms
        tot["itens_com_efeito"] += 1

    tot_arred = {k: arred2(v) if isinstance(v, float) else v for k, v in tot.items()}
    tot_arred["oportunidade_total"] = arred2(
        tot_arred["oportunidade_pis"] + tot_arred["oportunidade_cofins"]
    )
    return {
        "variante": variante,
        "itens": linhas,
        "totais": tot_arred,
        "ha_oportunidade": tot_arred["oportunidade_total"] > 0,
    }
