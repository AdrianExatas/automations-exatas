"""Apuracao recomputada de creditos/debitos PIS/COFINS × bloco M declarado."""

from __future__ import annotations

import sqlite3
from typing import Any

from motor_fiscal.pis_cofins._util import (
    CST_CREDITO,
    CST_DEBITO,
    apuracoes_m,
    arred2,
    base_e_aliq_item,
    cst_norm,
    itens_contribuicao,
    n,
    quase_igual,
    registros_f100,
)


def apurar(con: sqlite3.Connection) -> dict[str, Any]:
    """Recomputa PIS e COFINS a partir dos documentos e confronta com M100–M610.

    A recomputacao usa itens da EFD-Contribuicoes (e F100), nao o XML, para
    evitar dupla contagem quando o mesmo documento existe nas duas fontes.
    O cruzamento XML×EFD fica em ``cruzamento.py``.
    """
    itens = [i for i in itens_contribuicao(con) if i["origem"] == "efd_contribuicoes"]
    f100s = registros_f100(con)
    return {
        "pis": _apurar_tributo(con, "pis", itens, f100s),
        "cofins": _apurar_tributo(con, "cofins", itens, f100s),
    }


def _apurar_tributo(
    con: sqlite3.Connection,
    tributo: str,
    itens: list[sqlite3.Row],
    f100s: list[dict],
) -> dict[str, Any]:
    cst_campo = "cst_pis" if tributo == "pis" else "cst_cofins"
    recomp_cred = {"base": 0.0, "valor": 0.0, "itens": 0}
    recomp_deb = {"base": 0.0, "valor": 0.0, "itens": 0}
    detalhe_cred: list[dict] = []
    detalhe_deb: list[dict] = []

    for item in itens:
        cst = cst_norm(item[cst_campo])
        if cst is None:
            continue
        base, aliq, valor = base_e_aliq_item(item, tributo)
        if base <= 0 and valor <= 0:
            continue
        entrada = {
            "origem": item["origem"],
            "chave": item["chave"],
            "n_item": item["n_item"],
            "codigo_produto": item["codigo_produto"],
            "cst": cst,
            "cfop": item["cfop"],
            "base": arred2(base),
            "aliq": aliq,
            "valor": arred2(valor),
        }
        if cst in CST_CREDITO:
            recomp_cred["base"] += base
            recomp_cred["valor"] += valor
            recomp_cred["itens"] += 1
            detalhe_cred.append(entrada)
        elif cst in CST_DEBITO:
            recomp_deb["base"] += base
            recomp_deb["valor"] += valor
            recomp_deb["itens"] += 1
            detalhe_deb.append(entrada)

    for f in f100s:
        cst = cst_norm(f.get("CST_PIS" if tributo == "pis" else "CST_COFINS"))
        if cst is None:
            continue
        if tributo == "pis":
            base, valor = n(f.get("VL_BC_PIS")), n(f.get("VL_PIS"))
            aliq = n(f.get("ALIQ_PIS"))
        else:
            base, valor = n(f.get("VL_BC_COFINS")), n(f.get("VL_COFINS"))
            aliq = n(f.get("ALIQ_COFINS"))
        if base <= 0 and valor <= 0:
            continue
        entrada = {
            "origem": "efd_contribuicoes",
            "chave": None,
            "n_item": None,
            "codigo_produto": f.get("COD_ITEM") or None,
            "cst": cst,
            "cfop": None,
            "base": arred2(base),
            "aliq": aliq,
            "valor": arred2(valor),
            "registro": "F100",
            "desc": f.get("DESC_DOC_OPER") or None,
        }
        if cst in CST_CREDITO:
            recomp_cred["base"] += base
            recomp_cred["valor"] += valor
            recomp_cred["itens"] += 1
            detalhe_cred.append(entrada)
        elif cst in CST_DEBITO:
            recomp_deb["base"] += base
            recomp_deb["valor"] += valor
            recomp_deb["itens"] += 1
            detalhe_deb.append(entrada)

    recomp_cred = {**recomp_cred, "base": arred2(recomp_cred["base"]), "valor": arred2(recomp_cred["valor"])}
    recomp_deb = {**recomp_deb, "base": arred2(recomp_deb["base"]), "valor": arred2(recomp_deb["valor"])}

    declarados = apuracoes_m(con, tributo)
    por_reg = {a["registro"]: a for a in declarados}

    if tributo == "pis":
        reg_cred, reg_cred_det, reg_cons, reg_deb = "M100", "M105", "M200", "M210"
        campo_bc_cred, campo_vl_cred = "VL_BC_PIS", "VL_CRED"
        campo_bc_deb, campo_vl_deb = "VL_BC_CONT", "VL_CONT_PER"
    else:
        reg_cred, reg_cred_det, reg_cons, reg_deb = "M500", "M505", "M600", "M610"
        campo_bc_cred, campo_vl_cred = "VL_BC_COFINS", "VL_CRED"
        campo_bc_deb, campo_vl_deb = "VL_BC_CONT", "VL_CONT_PER"

    decl_cred = _totais_declarados(por_reg.get(reg_cred), campo_bc_cred, campo_vl_cred)
    decl_deb = _totais_declarados(por_reg.get(reg_deb), campo_bc_deb, campo_vl_deb)
    m_cons = por_reg.get(reg_cons)
    total_rec_decl = n(m_cons["dados"].get("VL_TOT_CONT_REC")) if m_cons else 0.0
    if m_cons and m_cons.get("valor_recolher") is not None:
        total_rec_decl = n(m_cons["valor_recolher"])

    divergencias: list[dict] = []
    for eixo, decl, recomp, rotulo_base, rotulo_valor in (
        ("credito", decl_cred, recomp_cred, "base_credito", "valor_credito"),
        ("debito", decl_deb, recomp_deb, "base_debito", "valor_debito"),
    ):
        if not quase_igual(decl["base"], recomp["base"]):
            divergencias.append({
                "eixo": eixo,
                "campo": rotulo_base,
                "declarado": decl["base"],
                "recomputado": recomp["base"],
                "diferenca": arred2(recomp["base"] - decl["base"]),
            })
        if not quase_igual(decl["valor"], recomp["valor"]):
            divergencias.append({
                "eixo": eixo,
                "campo": rotulo_valor,
                "declarado": decl["valor"],
                "recomputado": recomp["valor"],
                "diferenca": arred2(recomp["valor"] - decl["valor"]),
            })

    # Conta grafica simplificada: debito periodo - credito descontado (M200/M600)
    credito_desc_decl = 0.0
    if m_cons:
        credito_desc_decl = n(m_cons["dados"].get("VL_TOT_CRED_DESC"))
    a_recolher_recomp = arred2(max(0.0, recomp_deb["valor"] - recomp_cred["valor"]))
    # Na pratica o M200 usa credito descontado (pode diferir do credito total M100);
    # reportamos ambos para o painel M8.
    a_recolher_via_m = arred2(max(0.0, recomp_deb["valor"] - credito_desc_decl))

    return {
        "tributo": tributo,
        "creditos": {
            "declarado": decl_cred,
            "recomputado": recomp_cred,
            "detalhe_recomputado": detalhe_cred,
            "registro_referencia": reg_cred,
            "registro_detalhe": reg_cred_det,
            "detalhe_declarado": _dados_reg(por_reg.get(reg_cred_det)),
        },
        "debitos": {
            "declarado": decl_deb,
            "recomputado": recomp_deb,
            "detalhe_recomputado": detalhe_deb,
            "registro_referencia": reg_deb,
        },
        "consolidado": {
            "registro": reg_cons,
            "vl_tot_cont_rec_declarado": arred2(total_rec_decl),
            "vl_tot_cred_desc_declarado": arred2(credito_desc_decl),
            "a_recolher_recomputado_bruto": a_recolher_recomp,
            "a_recolher_recomputado_com_cred_desc_decl": a_recolher_via_m,
            "dados_declarados": _dados_reg(m_cons),
        },
        "divergencias": divergencias,
        "conforme": len(divergencias) == 0,
    }


def _totais_declarados(apuracao: dict | None, campo_base: str, campo_valor: str) -> dict[str, float]:
    if not apuracao:
        return {"base": 0.0, "valor": 0.0}
    dados = apuracao["dados"]
    valor = n(dados.get(campo_valor))
    if apuracao.get("valor_recolher") is not None and campo_valor in {
        "VL_CONT_PER", "VL_TOT_CONT_REC",
    }:
        valor = n(apuracao["valor_recolher"])
    return {"base": arred2(n(dados.get(campo_base))), "valor": arred2(valor)}


def _dados_reg(apuracao: dict | None) -> dict:
    return dict(apuracao["dados"]) if apuracao else {}
