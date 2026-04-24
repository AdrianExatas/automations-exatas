from __future__ import annotations

from datetime import datetime
from decimal import Decimal


def parse_decimal_br(value: str) -> Decimal:
    normalized = value.strip().replace(".", "").replace(",", ".")
    return Decimal(normalized)


def parse_date_br(value: str):
    return datetime.strptime(value.strip(), "%d/%m/%Y").date()


def normalize_whitespace(value: str) -> str:
    return " ".join(value.split())

