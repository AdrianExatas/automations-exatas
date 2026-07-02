from __future__ import annotations

from datetime import date, datetime


DATE_FORMAT = "%d/%m/%Y"


def parse_br_date(value: str) -> date:
    value = value.strip()
    try:
        return datetime.strptime(value, DATE_FORMAT).date()
    except ValueError as exc:
        raise ValueError(f"Data invalida: {value}. Use DD/MM/AAAA.") from exc


def format_br_date(value: date) -> str:
    return value.strftime(DATE_FORMAT)


def format_current_month(value: date) -> str:
    return value.strftime("%m/%Y")
