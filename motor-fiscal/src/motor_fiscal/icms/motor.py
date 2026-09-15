"""Orquestracao da auditoria/apuracao de ICMS (M2)."""

from __future__ import annotations

import sqlite3
from pathlib import Path

from motor_fiscal.icms.bloco_e import (
    recomputar_e110,
    recomputar_e116,
    recomputar_e210,
    recomputar_e310,
    saldo_credor_anterior,
)
from motor_fiscal.icms.ciap import recomputar_g110
from motor_fiscal.icms.cruzamentos import carregar_guias, executar_cruzamentos
from motor_fiscal.icms.fecoep_al import calcular_fecoep_analitico, recomputar_fecoep_al
from motor_fiscal.icms.livro import montar_livro
from motor_fiscal.icms.mapa import carregar_config_uf, montar_mapa, uf_empresa


def auditar_icms(
    con: sqlite3.Connection,
    *,
    empresa: str,
    competencia: str,
    guias_path: str | Path | None = None,
    db_dir: str | Path | None = None,
    config_dir: str | Path | None = None,
) -> dict:
    """Executa livro, recompute Bloco E/CIAP, 13 cruzamentos e mapa tributario."""
    sld_ant = None
    if db_dir is not None:
        sld_ant = saldo_credor_anterior(con, empresa, competencia, db_dir)

    uf = uf_empresa(con)
    config_uf = carregar_config_uf(uf or "AL", config_dir)
    fecoep_cfg = config_uf.get("fecoep") or {}
    cod_or_icms = str(fecoep_cfg.get("cod_or_icms", "000"))

    e110 = recomputar_e110(con, saldo_anterior=sld_ant)
    e116 = recomputar_e116(con, e110, cod_or_icms=cod_or_icms)
    e210 = recomputar_e210(con)
    e310 = recomputar_e310(con)
    g110 = recomputar_g110(con)
    livro = montar_livro(con)
    mapa = montar_mapa(con, config_dir=config_dir)
    fecoep = None
    fecoep_analitico = None
    if (uf or "").upper() == "AL" or fecoep_cfg:
        fecoep = recomputar_fecoep_al(
            con, config=config_uf, config_dir=config_dir, e110=e110
        )
        fecoep_analitico = calcular_fecoep_analitico(
            con,
            config=config_uf,
            config_dir=config_dir,
            e110=e110,
            recompute=fecoep,
        )
    guias = carregar_guias(guias_path)
    cruzamentos = executar_cruzamentos(
        con,
        e110=e110,
        e210=e210,
        e310=e310,
        g110=g110,
        guias=guias,
        saldo_mes_anterior=sld_ant,
        fecoep=fecoep,
        config_uf=config_uf,
    )

    ok_cruz = all(c.get("fecha") for c in cruzamentos)
    ok_e110 = not e110.get("divergencias")
    ok_e210 = all(not e.get("divergencias") for e in e210)
    ok_e310 = all(not e.get("divergencias") for e in e310)
    ok_e116 = e116.get("ok", True)
    ok_fecoep = fecoep.get("ok", True) if fecoep else True
    ok = (
        ok_cruz and ok_e110 and ok_e210 and ok_e310 and ok_e116
        and ok_fecoep and g110.get("ok", True) and mapa.get("ok", True)
    )

    erros = 0
    if not ok_e110:
        erros += len(e110.get("divergencias") or []) or 1
    erros += sum(len(e.get("divergencias") or []) for e in e210)
    erros += sum(len(e.get("divergencias") or []) for e in e310)
    erros += sum(1 for c in cruzamentos if not c.get("fecha"))
    if not mapa.get("ok", True):
        erros += len(mapa.get("divergencias") or []) or 1
    if not g110.get("ok", True):
        erros += len(g110.get("divergencias") or []) or 1
    if not ok_e116:
        erros += 1
    if fecoep and not ok_fecoep:
        erros += len(fecoep.get("divergencias") or []) or 1

    resumo = {
        "cruzamentos_ok": sum(1 for c in cruzamentos if c.get("fecha")),
        "cruzamentos_total": len(cruzamentos),
        "e110_ok": ok_e110,
        "e116_ok": ok_e116,
        "mapa_ok": mapa.get("ok", True),
        "vl_icms_recolher": e110["recomputado"].get("VL_ICMS_RECOLHER"),
        "vl_sld_credor_transportar": e110["recomputado"].get("VL_SLD_CREDOR_TRANSPORTAR"),
        "erros": erros,
        "avisos": 0,
        "total": erros,
    }
    if fecoep:
        resumo["vl_fecoep_recolher"] = fecoep.get("vl_fecoep_recolher")
        resumo["vl_fecoep_difal_recolher"] = fecoep.get("vl_fecoep_difal_recolher")
        resumo["fecoep_ok"] = ok_fecoep

    out = {
        "modulo": "icms",
        "tributo": "icms",
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "ok": ok,
        "livro": livro,
        "e110": e110,
        "e116": e116,
        "e210": e210,
        "e310": e310,
        "g110": g110,
        "cruzamentos": cruzamentos,
        "mapa_tributario": mapa,
        "resumo": resumo,
    }
    if fecoep is not None:
        out["fecoep"] = fecoep
    if fecoep_analitico is not None:
        out["fecoep_analitico"] = fecoep_analitico
    return out
