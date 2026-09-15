"""M3 — IPI: apuracao E500-E530 e mapa tributario."""

from __future__ import annotations

from typing import Any

from motor_fiscal.ipi.motor import auditar_ipi
from motor_fiscal.registro_modulos import registrar


def auditar(con, empresa: str, competencia: str, **kwargs: Any) -> dict:
    """Handler padrao (registro_modulos / orquestracao)."""
    return auditar_ipi(
        con,
        empresa=empresa,
        competencia=competencia,
        config_dir=kwargs.get("config_dir"),
    )


registrar("ipi", auditar)

__all__ = ["auditar", "auditar_ipi"]
