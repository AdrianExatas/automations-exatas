"""Recompute / conferencia do CIAP (G110)."""

from __future__ import annotations

import json
import sqlite3

from motor_fiscal.util import arred, eh_igual, n


def recomputar_g110(con: sqlite3.Connection) -> dict:
    """Le G110 declarado e confere formula IND_PER_SAI / ICMS_APROP.

    Formula (Guia Pratico):
      IND_PER_SAI = VL_TRIB_EXP / VL_TOTAL   (quando VL_TOTAL > 0)
      ICMS_APROP  = SOM_PARC * IND_PER_SAI
    """
    rows = con.execute(
        """
        SELECT dados FROM apuracoes
        WHERE origem = 'efd_icms_ipi' AND registro = 'G110'
        ORDER BY id
        """
    ).fetchall()
    if not rows:
        # tenta registros_efd crus
        rows = con.execute(
            """
            SELECT dados FROM registros_efd
            WHERE arquivo = 'efd_icms_ipi' AND registro = 'G110'
            ORDER BY numero_linha
            """
        ).fetchall()

    if not rows or not rows[0]["dados"]:
        return {
            "declarado": {},
            "recomputado": {},
            "divergencias": [],
            "ok": True,
            "observacao": "sem G110 na competencia",
        }

    d = json.loads(rows[0]["dados"])
    saldo_in = n(d.get("SALDO_IN_ICMS"))
    som_parc = n(d.get("SOM_PARC"))
    vl_trib_exp = n(d.get("VL_TRIB_EXP"))
    vl_total = n(d.get("VL_TOTAL"))
    som_icms_oc = n(d.get("SOM_ICMS_OC"))

    ind_per = arred(vl_trib_exp / vl_total, 8) if vl_total else 0.0
    icms_aprop = arred(som_parc * ind_per)

    recomputado = {
        "DT_INI": d.get("DT_INI"),
        "DT_FIN": d.get("DT_FIN"),
        "SALDO_IN_ICMS": arred(saldo_in),
        "SOM_PARC": arred(som_parc),
        "VL_TRIB_EXP": arred(vl_trib_exp),
        "VL_TOTAL": arred(vl_total),
        "IND_PER_SAI": ind_per,
        "ICMS_APROP": icms_aprop,
        "SOM_ICMS_OC": arred(som_icms_oc),
    }
    declarado = {
        "DT_INI": d.get("DT_INI"),
        "DT_FIN": d.get("DT_FIN"),
        "SALDO_IN_ICMS": arred(n(d.get("SALDO_IN_ICMS"))),
        "SOM_PARC": arred(n(d.get("SOM_PARC"))),
        "VL_TRIB_EXP": arred(n(d.get("VL_TRIB_EXP"))),
        "VL_TOTAL": arred(n(d.get("VL_TOTAL"))),
        "IND_PER_SAI": n(d.get("IND_PER_SAI")),
        "ICMS_APROP": arred(n(d.get("ICMS_APROP"))),
        "SOM_ICMS_OC": arred(n(d.get("SOM_ICMS_OC"))),
    }

    divergencias = []
    for campo in ("IND_PER_SAI", "ICMS_APROP"):
        # IND_PER_SAI pode ter mais casas
        tol = 0.0001 if campo == "IND_PER_SAI" else 0.01
        if not eh_igual(recomputado[campo], declarado[campo], tol):
            divergencias.append({
                "campo": campo,
                "recomputado": recomputado[campo],
                "declarado": declarado[campo],
                "diferenca": arred(recomputado[campo] - declarado[campo], 8),
            })

    return {
        "declarado": declarado,
        "recomputado": recomputado,
        "divergencias": divergencias,
        "ok": not divergencias,
        "credito_apropiado": recomputado["ICMS_APROP"],
    }
