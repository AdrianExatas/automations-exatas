"""Helpers numericos (valores monetarios SPED / SQLite)."""

from __future__ import annotations

from typing import Any


def n(valor: Any, padrao: float = 0.0) -> float:
    """Converte valor para float; None/vazio -> padrao."""
    if valor is None or valor == "":
        return padrao
    if isinstance(valor, (int, float)):
        return float(valor)
    try:
        texto = str(valor).strip()
        if not texto:
            return padrao
        if "," in texto:
            return float(texto.replace(".", "").replace(",", "."))
        return float(texto)
    except (TypeError, ValueError):
        return padrao


def arred(valor: float, casas: int = 2) -> float:
    """Arredonda half-up em casas decimais (padrao monetario)."""
    fator = 10**casas
    return float(int(valor * fator + (0.5 if valor >= 0 else -0.5))) / fator


def eh_igual(a: float, b: float, tol: float = 0.01) -> bool:
    """Compara monetario em centavos inteiros (evita falso negativo em |diff|==tol)."""
    cent_tol = max(1, int(round(tol * 100)))
    return abs(int(round(arred(a) * 100)) - int(round(arred(b) * 100))) <= cent_tol
