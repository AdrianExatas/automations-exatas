"""Orquestracao da auditoria/apuracao de IPI (M3)."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from motor_fiscal.ipi.e500 import recomputar_e520
from motor_fiscal.ipi.mapa import montar_mapa_ipi


def _uf_empresa(con: sqlite3.Connection) -> str:
    row = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = '0000'
        ORDER BY numero_linha LIMIT 1
        """
    ).fetchone()
    if row and row["dados"]:
        return (json.loads(row["dados"]).get("UF") or "default").upper()
    return "default"


def auditar_ipi(
    con: sqlite3.Connection,
    *,
    empresa: str,
    competencia: str,
    config_dir: str | Path | None = None,
) -> dict:
    """Recompute E500-E530 a partir de C170 + mapa tributario IPI."""
    e520 = recomputar_e520(con)
    uf = _uf_empresa(con)
    mapa = montar_mapa_ipi(con, uf=uf, config_dir=config_dir)
    ok = e520.get("ok", True) and mapa.get("ok", True)
    erros = len(e520.get("divergencias") or [])
    if not mapa.get("ok", True):
        erros += len(mapa.get("divergencias") or []) or 1
    return {
        "modulo": "ipi",
        "tributo": "ipi",
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "ok": ok,
        "e500": e520.get("e500"),
        "e510": e520.get("e510"),
        "e520": {
            "recomputado": e520["recomputado"],
            "declarado": e520["declarado"],
            "divergencias": e520["divergencias"],
            "ok": e520["ok"],
        },
        "e530": e520.get("e530"),
        "mapa_tributario": mapa,
        "resumo": {
            "vl_deb_ipi": e520["recomputado"].get("VL_DEB_IPI"),
            "vl_cred_ipi": e520["recomputado"].get("VL_CRED_IPI"),
            "vl_sd_ipi": e520["recomputado"].get("VL_SD_IPI"),
            "vl_sc_ipi": e520["recomputado"].get("VL_SC_IPI"),
            "e520_ok": e520.get("ok", True),
            "mapa_ok": mapa.get("ok", True),
            "erros": erros,
            "avisos": 0,
            "total": erros,
        },
    }
