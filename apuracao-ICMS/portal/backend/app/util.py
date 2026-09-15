"""Utilitarios pequenos e compartilhados pelo backend."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone

COMPETENCIA_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def somente_digitos(valor: str | None) -> str:
    """Remove tudo que nao for digito (usado para normalizar CNPJ)."""
    return re.sub(r"\D", "", valor or "")


def sem_acentos(texto: str) -> str:
    nfkd = unicodedata.normalize("NFKD", texto or "")
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def competencia_valida(competencia: str) -> bool:
    return bool(COMPETENCIA_RE.match(competencia or ""))


def competencia_para_pasta(competencia: str) -> str:
    """AAAA-MM → MM-AAAA (layout de ``empresas/<slug>/``)."""
    if not competencia_valida(competencia):
        raise ValueError(f"Competencia invalida: {competencia!r}")
    ano, mes = competencia.split("-")
    return f"{mes}-{ano}"


def pasta_para_competencia(pasta: str) -> str | None:
    """MM-AAAA → AAAA-MM; retorna None se o nome nao bater."""
    m = re.fullmatch(r"(0[1-9]|1[0-2])-(\d{4})", pasta or "")
    if not m:
        return None
    return f"{m.group(2)}-{m.group(1)}"


def agora_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
