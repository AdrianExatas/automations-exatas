"""Saldo teorico x H005/H010 x K200/K220/K230."""

from __future__ import annotations

import json
import sqlite3

from motor_fiscal.db import consultas
from motor_fiscal.util import numero_ou_zero, quase_igual


def comparar_saldos(con: sqlite3.Connection, movimentacao: dict) -> dict:
    h010 = _ler_h010(con)
    k200 = _ler_k200(con)
    k220 = _ler_k_movimentacao(con, "K220")
    k230 = _ler_k_movimentacao(con, "K230")
    h005 = consultas.registros_efd_por_tipo(con, "H005", "efd_icms_ipi")

    por_codigo = {p["codigo"]: p for p in movimentacao["produtos"]}
    todos = set(por_codigo) | set(h010) | set(k200)

    comparacoes = []
    for cod in sorted(todos):
        mov = por_codigo.get(cod, {})
        teorico = mov.get("saldo_teorico_qtd")
        inv = h010.get(cod)
        est = k200.get(cod)
        qtd_h = inv["qtd"] if inv else None
        qtd_k = est["qtd"] if est else None
        item = {
            "codigo": cod,
            "descricao": (mov.get("descricao") or (inv or {}).get("descricao")
                          or (est or {}).get("descricao")),
            "saldo_teorico": teorico,
            "qtd_h010": qtd_h,
            "vl_h010": inv["vl_item"] if inv else None,
            "qtd_k200": qtd_k,
            "custo_medio": mov.get("custo_medio"),
            "divergencia_teorico_h010": _diff(teorico, qtd_h),
            "divergencia_teorico_k200": _diff(teorico, qtd_k),
            "divergencia_h010_k200": _diff(qtd_h, qtd_k),
        }
        comparacoes.append(item)

    vl_inv_declarado = None
    if h005:
        vl_inv_declarado = numero_ou_zero(h005[0].get("VL_INV"))
    vl_inv_itens = round(sum((h["vl_item"] or 0) for h in h010.values()), 2)

    return {
        "h005": {
            "registros": h005,
            "vl_inv_declarado": vl_inv_declarado,
            "vl_inv_soma_h010": vl_inv_itens,
            "divergencia_total": (
                None if vl_inv_declarado is None
                else round(vl_inv_declarado - vl_inv_itens, 2)
            ),
        },
        "comparacoes": comparacoes,
        "k220": k220,
        "k230": k230,
        "contagens": {
            "itens_comparados": len(comparacoes),
            "divergencias_teorico_h010": sum(
                1 for c in comparacoes if c["divergencia_teorico_h010"] is not None
                and abs(c["divergencia_teorico_h010"]) > 0.02
            ),
            "divergencias_teorico_k200": sum(
                1 for c in comparacoes if c["divergencia_teorico_k200"] is not None
                and abs(c["divergencia_teorico_k200"]) > 0.02
            ),
            "divergencias_h010_k200": sum(
                1 for c in comparacoes if c["divergencia_h010_k200"] is not None
                and abs(c["divergencia_h010_k200"]) > 0.02
            ),
        },
    }


def _diff(a, b):
    if a is None or b is None:
        return None
    if quase_igual(a, b):
        return 0.0
    return round(a - b, 6)


def _ler_h010(con: sqlite3.Connection) -> dict[str, dict]:
    out = {}
    for d in consultas.registros_efd_por_tipo(con, "H010", "efd_icms_ipi"):
        cod = d.get("COD_ITEM")
        if not cod:
            continue
        out[cod] = {
            "codigo": cod,
            "unidade": d.get("UNID"),
            "qtd": numero_ou_zero(d.get("QTD")),
            "vl_unit": numero_ou_zero(d.get("VL_UNIT")),
            "vl_item": numero_ou_zero(d.get("VL_ITEM")),
            "descricao": None,
        }
    return out


def _ler_k200(con: sqlite3.Connection) -> dict[str, dict]:
    out = {}
    for d in consultas.registros_efd_por_tipo(con, "K200", "efd_icms_ipi"):
        cod = d.get("COD_ITEM")
        if not cod:
            continue
        out[cod] = {
            "codigo": cod,
            "qtd": numero_ou_zero(d.get("QTD")),
            "dt_est": d.get("DT_EST"),
            "ind_est": d.get("IND_EST"),
            "descricao": None,
        }
    return out


def _ler_k_movimentacao(con: sqlite3.Connection, registro: str) -> list[dict]:
    """Le K220/K230 tipados ou crus (campos posicionais)."""
    # Layouts oficiais (Guia Pratico):
    # K220: DT_MOV, COD_ITEM_ORI, COD_ITEM_DEST, QTD
    # K230: DT_INI_OP, DT_FIN_OP, COD_DOC_OP, COD_ITEM_ORI, QTD_ENC
    layouts = {
        "K220": ["DT_MOV", "COD_ITEM_ORI", "COD_ITEM_DEST", "QTD"],
        "K230": ["DT_INI_OP", "DT_FIN_OP", "COD_DOC_OP", "COD_ITEM_ORI", "QTD_ENC"],
    }
    nomes = layouts.get(registro, [])
    resultado = []
    rows = con.execute(
        """SELECT dados, campos FROM registros_efd
           WHERE arquivo = 'efd_icms_ipi' AND registro = ?
           ORDER BY numero_linha""",
        (registro,),
    ).fetchall()
    for row in rows:
        if row["dados"]:
            resultado.append(json.loads(row["dados"]))
        else:
            campos = json.loads(row["campos"])
            resultado.append({nomes[i]: campos[i] if i < len(campos) else ""
                              for i in range(len(nomes))})
    return resultado
