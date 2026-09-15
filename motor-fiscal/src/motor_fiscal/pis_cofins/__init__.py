"""M4 — PIS/COFINS: apuracao bloco M, cruzamento documental e exclusao do ICMS da base."""

from __future__ import annotations

from motor_fiscal.pis_cofins.auditoria import auditar
from motor_fiscal.registro_modulos import registrar

registrar("pis_cofins", auditar)

__all__ = ["auditar"]
