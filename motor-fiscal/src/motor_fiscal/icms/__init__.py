"""M2 — ICMS: livro fiscal, recompute Bloco E, CIAP, cruzamentos e mapa tributario."""

from __future__ import annotations

from typing import Any

from motor_fiscal.icms.fecoep_al import calcular_fecoep_analitico, recomputar_fecoep_al
from motor_fiscal.icms.motor import auditar_icms
from motor_fiscal.registro_modulos import registrar


def auditar(con, empresa: str, competencia: str, **kwargs: Any) -> dict:
    """Handler padrao (registro_modulos / orquestracao)."""
    return auditar_icms(
        con,
        empresa=empresa,
        competencia=competencia,
        guias_path=kwargs.get("guias") or kwargs.get("guias_path"),
        db_dir=kwargs.get("db_dir"),
        config_dir=kwargs.get("config_dir"),
    )


registrar("icms", auditar)

__all__ = ["auditar", "auditar_icms", "recomputar_fecoep_al", "calcular_fecoep_analitico"]
