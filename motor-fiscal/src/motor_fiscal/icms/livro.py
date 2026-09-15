"""Livro fiscal de ICMS a partir de C190/D190/C590/D590."""

from __future__ import annotations

import json
import sqlite3

from motor_fiscal.util import arred, n


def cfop_sentido(cfop: str | None) -> str | None:
    """Retorna 'entrada', 'saida' ou None conforme o primeiro digito do CFOP."""
    if not cfop:
        return None
    digito = str(cfop).strip()[:1]
    if digito in {"1", "2", "3"}:
        return "entrada"
    if digito in {"5", "6", "7"}:
        return "saida"
    return None


def _agregar_analiticos(
    con: sqlite3.Connection, registro: str
) -> list[dict]:
    """Soma C190 ou D190 por CST/CFOP/ALIQ."""
    linhas = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = ?
        ORDER BY numero_linha
        """,
        (registro,),
    ).fetchall()
    buckets: dict[tuple, dict] = {}
    for linha in linhas:
        if not linha["dados"]:
            continue
        d = json.loads(linha["dados"])
        chave = (
            (d.get("CST_ICMS") or "").strip(),
            (d.get("CFOP") or "").strip(),
            arred(n(d.get("ALIQ_ICMS"))),
        )
        if chave not in buckets:
            buckets[chave] = {
                "cst_icms": chave[0],
                "cfop": chave[1],
                "aliq_icms": chave[2],
                "sentido": cfop_sentido(chave[1]),
                "vl_opr": 0.0,
                "vl_bc_icms": 0.0,
                "vl_icms": 0.0,
                "vl_bc_icms_st": 0.0,
                "vl_icms_st": 0.0,
                "vl_ipi": 0.0,
                "origem_registro": registro,
                "qtd_linhas": 0,
            }
        b = buckets[chave]
        b["vl_opr"] = arred(b["vl_opr"] + n(d.get("VL_OPR")))
        b["vl_bc_icms"] = arred(b["vl_bc_icms"] + n(d.get("VL_BC_ICMS")))
        b["vl_icms"] = arred(b["vl_icms"] + n(d.get("VL_ICMS")))
        b["vl_bc_icms_st"] = arred(b["vl_bc_icms_st"] + n(d.get("VL_BC_ICMS_ST")))
        b["vl_icms_st"] = arred(b["vl_icms_st"] + n(d.get("VL_ICMS_ST")))
        b["vl_ipi"] = arred(b["vl_ipi"] + n(d.get("VL_IPI")))
        b["qtd_linhas"] += 1
    return list(buckets.values())


def montar_livro(con: sqlite3.Connection) -> dict:
    """Livro de entradas/saidas por CFOP/CST/aliquota (C190/D190 + energia C590/D590)."""
    analiticos = (
        _agregar_analiticos(con, "C190")
        + _agregar_analiticos(con, "D190")
        + _agregar_analiticos(con, "C590")
        + _agregar_analiticos(con, "D590")
    )
    entradas = [a for a in analiticos if a["sentido"] == "entrada"]
    saidas = [a for a in analiticos if a["sentido"] == "saida"]
    outros = [a for a in analiticos if a["sentido"] not in {"entrada", "saida"}]

    def _totais(linhas: list[dict]) -> dict:
        return {
            "vl_opr": arred(sum(x["vl_opr"] for x in linhas)),
            "vl_bc_icms": arred(sum(x["vl_bc_icms"] for x in linhas)),
            "vl_icms": arred(sum(x["vl_icms"] for x in linhas)),
            "vl_icms_st": arred(sum(x["vl_icms_st"] for x in linhas)),
            "linhas": len(linhas),
        }

    return {
        "entradas": sorted(entradas, key=lambda x: (x["cfop"], x["cst_icms"], x["aliq_icms"])),
        "saidas": sorted(saidas, key=lambda x: (x["cfop"], x["cst_icms"], x["aliq_icms"])),
        "outros": outros,
        "totais_entradas": _totais(entradas),
        "totais_saidas": _totais(saidas),
        "totais": _totais(analiticos),
    }


def totais_energia_comunicacao(con: sqlite3.Connection) -> dict:
    """Totais C590/D590 (energia/comunicação) — complementam C100/D100 no cruzamento."""
    saida = {"vl_opr": 0.0, "vl_icms": 0.0, "vl_icms_st": 0.0}
    entrada = {"vl_opr": 0.0, "vl_icms": 0.0, "vl_icms_st": 0.0}
    for registro in ("C590", "D590"):
        for a in _agregar_analiticos(con, registro):
            alvo = entrada if a["sentido"] == "entrada" else saida if a["sentido"] == "saida" else None
            if alvo is None:
                continue
            alvo["vl_opr"] = arred(alvo["vl_opr"] + a["vl_opr"])
            alvo["vl_icms"] = arred(alvo["vl_icms"] + a["vl_icms"])
            alvo["vl_icms_st"] = arred(alvo["vl_icms_st"] + a["vl_icms_st"])
    return {"entrada": entrada, "saida": saida}


def totais_icms_documentos(con: sqlite3.Connection, origem: str | None = "efd_icms_ipi") -> dict:
    """Soma vicms/vicms_st dos documentos C100/D100 (e opcionalmente XML)."""
    sql = """
        SELECT ind_operacao,
               COALESCE(SUM(vicms), 0) AS vicms,
               COALESCE(SUM(vicms_st), 0) AS vicms_st,
               COALESCE(SUM(valor_total), 0) AS valor_total,
               COUNT(*) AS qtd
        FROM documentos
        WHERE situacao IS NULL OR situacao NOT IN ('cancelada', 'denegada', 'inutilizada')
    """
    params: list = []
    if origem:
        sql += " AND origem = ?"
        params.append(origem)
    sql += " GROUP BY ind_operacao"
    por_oper: dict[str, dict] = {}
    for row in con.execute(sql, params).fetchall():
        chave = "entrada" if row["ind_operacao"] == "0" else "saida" if row["ind_operacao"] == "1" else "outro"
        por_oper[chave] = {
            "vicms": arred(row["vicms"]),
            "vicms_st": arred(row["vicms_st"]),
            "valor_total": arred(row["valor_total"]),
            "qtd": row["qtd"],
        }
    return por_oper
