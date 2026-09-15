"""Apuracao de IPI recomputada a partir de C170 (E500/E510/E520/E530)."""

from __future__ import annotations

import json
import sqlite3
from collections import defaultdict

from motor_fiscal.icms.livro import cfop_sentido
from motor_fiscal.util import arred, eh_igual, n

# CST IPI que geram credito (entradas) / debito (saidas) na conta grafica.
CST_CREDITO = {"00", "49"}
CST_DEBITO = {"50", "99"}


def _itens_c170(con: sqlite3.Connection) -> list[dict]:
    rows = con.execute(
        """
        SELECT i.cfop, i.cst_ipi, i.vbc_ipi, i.aliq_ipi, i.vipi,
               d.ind_operacao, d.situacao
        FROM itens i
        JOIN documentos d ON d.id = i.documento_id
        WHERE d.origem = 'efd_icms_ipi'
          AND (d.situacao IS NULL OR d.situacao NOT IN ('cancelada', 'denegada', 'inutilizada'))
        ORDER BY i.id
        """
    ).fetchall()
    return [dict(r) for r in rows]


def montar_e510(con: sqlite3.Connection) -> list[dict]:
    """Consolida C170 em linhas analiticas E510 (CFOP x CST_IPI)."""
    buckets: dict[tuple, dict] = {}
    for item in _itens_c170(con):
        cfop = (item.get("cfop") or "").strip()
        cst = (item.get("cst_ipi") or "").strip()
        if not cfop and not cst:
            continue
        # E510 agrupa mesmo com IPI zerado quando ha CST
        chave = (cfop, cst)
        if chave not in buckets:
            buckets[chave] = {
                "CFOP": cfop,
                "CST_IPI": cst,
                "VL_CONT_IPI": 0.0,
                "VL_BC_IPI": 0.0,
                "VL_IPI": 0.0,
                "sentido": cfop_sentido(cfop),
            }
        b = buckets[chave]
        # VL_CONT_IPI ≈ valor contabil do item (aproximado pela BC quando ha IPI, senao 0)
        contrib = n(item.get("vbc_ipi")) or 0.0
        if contrib == 0 and n(item.get("vipi")):
            contrib = n(item.get("vipi"))
        b["VL_CONT_IPI"] = arred(b["VL_CONT_IPI"] + contrib)
        b["VL_BC_IPI"] = arred(b["VL_BC_IPI"] + n(item.get("vbc_ipi")))
        b["VL_IPI"] = arred(b["VL_IPI"] + n(item.get("vipi")))
    return sorted(buckets.values(), key=lambda x: (x["CFOP"], x["CST_IPI"]))


def _totais_debito_credito(e510: list[dict]) -> tuple[float, float]:
    deb = 0.0
    cred = 0.0
    for lin in e510:
        cst = lin["CST_IPI"]
        vl = lin["VL_IPI"]
        sentido = lin["sentido"]
        if sentido == "saida" and (cst in CST_DEBITO or (cst == "" and vl)):
            deb = arred(deb + vl)
        elif sentido == "entrada" and (cst in CST_CREDITO or (cst == "" and vl)):
            cred = arred(cred + vl)
        elif sentido == "saida" and cst in CST_CREDITO:
            # CST de credito em saida: ignora / trata como nao debito
            pass
        elif sentido == "entrada" and cst in CST_DEBITO:
            # CST 50 em entrada (erro comum em fixtures): nao gera credito
            pass
    return deb, cred


def _e520_declarado(con: sqlite3.Connection) -> dict:
    row = con.execute(
        """
        SELECT dados FROM apuracoes
        WHERE origem = 'efd_icms_ipi' AND registro = 'E520'
        ORDER BY id LIMIT 1
        """
    ).fetchone()
    if not row:
        row = con.execute(
            """
            SELECT dados FROM registros_efd
            WHERE arquivo = 'efd_icms_ipi' AND registro = 'E520'
            ORDER BY numero_linha LIMIT 1
            """
        ).fetchone()
    if not row or not row["dados"]:
        return {}
    return json.loads(row["dados"])


def _e530(con: sqlite3.Connection) -> list[dict]:
    rows = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = 'E530'
        ORDER BY numero_linha
        """
    ).fetchall()
    out = []
    for r in rows:
        if not r["dados"]:
            continue
        d = json.loads(r["dados"])
        out.append({
            "IND_AJ": d.get("IND_AJ"),
            "VL_AJ": arred(n(d.get("VL_AJ"))),
            "COD_AJ": d.get("COD_AJ"),
            "IND_DOC": d.get("IND_DOC"),
            "NUM_DOC": d.get("NUM_DOC"),
            "DESCR_AJ": d.get("DESCR_AJ"),
        })
    return out


def recomputar_e520(con: sqlite3.Connection, saldo_anterior: float | None = None) -> dict:
    """Conta grafica IPI (E520) a partir de C170 + ajustes E530."""
    e510 = montar_e510(con)
    deb, cred = _totais_debito_credito(e510)
    ajustes = _e530(con)
    # IND_AJ: 0 = ajuste a debito, 1 = ajuste a credito (Guia Pratico)
    od = arred(sum(a["VL_AJ"] for a in ajustes if a.get("IND_AJ") == "0"))
    oc = arred(sum(a["VL_AJ"] for a in ajustes if a.get("IND_AJ") == "1"))

    declarado = _e520_declarado(con)
    if saldo_anterior is None:
        saldo_anterior = n(declarado.get("VL_SD_ANT_IPI")) if declarado else 0.0

    # VL_SC_IPI = saldo credor = sld_ant + cred + oc - deb - od (se > 0)
    # VL_SD_IPI = saldo devedor (IPI a recolher) caso contrario
    bruto = arred(deb + od - saldo_anterior - cred - oc)
    if bruto > 0:
        vl_sd = bruto
        vl_sc = 0.0
    else:
        vl_sd = 0.0
        vl_sc = arred(-bruto)

    recomputado = {
        "VL_SD_ANT_IPI": arred(saldo_anterior),
        "VL_DEB_IPI": arred(deb),
        "VL_CRED_IPI": arred(cred),
        "VL_OD_IPI": arred(od),
        "VL_OC_IPI": arred(oc),
        "VL_SC_IPI": arred(vl_sc),
        "VL_SD_IPI": arred(vl_sd),
    }
    declarado_num = {k: arred(n(v)) for k, v in declarado.items()} if declarado else {}
    divergencias = []
    for campo, valor in recomputado.items():
        if campo in declarado_num and not eh_igual(valor, declarado_num[campo]):
            divergencias.append({
                "campo": campo,
                "recomputado": valor,
                "declarado": declarado_num[campo],
                "diferenca": arred(valor - declarado_num[campo]),
            })

    e500 = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = 'E500'
        ORDER BY numero_linha LIMIT 1
        """
    ).fetchone()
    periodo = json.loads(e500["dados"]) if e500 and e500["dados"] else {}

    return {
        "e500": periodo,
        "e510": e510,
        "e530": ajustes,
        "recomputado": recomputado,
        "declarado": declarado_num,
        "divergencias": divergencias,
        "ok": not divergencias if declarado_num else True,
    }
