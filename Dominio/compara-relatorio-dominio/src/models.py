from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any


@dataclass(slots=True)
class RegistroNormalizado:
    origem: str
    numero_nota: str
    data_emissao: date
    valor: Decimal
    status: str | None
    cliente_nome: str | None
    cliente_documento: str | None = None
    campos_brutos: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class ParseResult:
    registros: list[RegistroNormalizado]
    diagnosticos: list[str] = field(default_factory=list)


@dataclass(slots=True)
class ComparisonResult:
    resumo: list[dict[str, Any]]
    motivos: list[dict[str, Any]]
    analise_textual: str
    notas_canceladas_cliente: list[dict[str, Any]]
    somente_no_cliente: list[dict[str, Any]]
    somente_no_dominio: list[dict[str, Any]]
    valor_divergente: list[dict[str, Any]]
