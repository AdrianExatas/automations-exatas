"""Helpers compartilhados pelos modulos de auditoria (texto, achados, datas)."""

from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone
from typing import Any


def agora_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def numero_flex(valor: Any) -> float | None:
    """Converte str SPED, float ou int em float; vazio/None -> None."""
    if valor is None or valor == "":
        return None
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor).strip()
    if not texto:
        return None
    try:
        if "," in texto:
            return float(texto.replace(".", "").replace(",", "."))
        return float(texto)
    except ValueError:
        return None


def numero_ou_zero(valor: Any) -> float:
    n = numero_flex(valor)
    return 0.0 if n is None else n


def normalizar_texto(texto: str | None) -> str:
    """Remove acentos, pontuacao e espacos extras; uppercase."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    limpo = re.sub(r"[^A-Z0-9]+", " ", sem_acento.upper())
    return " ".join(limpo.split())


def tokens_descricao(texto: str | None) -> set[str]:
    return {t for t in normalizar_texto(texto).split() if len(t) > 1}


def similaridade_descricao(a: str | None, b: str | None) -> float:
    """Similaridade Jaccard simples entre tokens de descricao (0..1)."""
    ta, tb = tokens_descricao(a), tokens_descricao(b)
    if not ta or not tb:
        return 0.0
    inter = ta & tb
    uniao = ta | tb
    return len(inter) / len(uniao)


def competencia_da_data(data_iso: str | None) -> str | None:
    """Extrai AAAA-MM de data ISO AAAA-MM-DD (ou com hora)."""
    if not data_iso or len(data_iso) < 7:
        return None
    return data_iso[:7]


def achado(
    codigo: str,
    severidade: str,
    mensagem: str,
    /,
    **detalhes: Any,
) -> dict:
    """Formato padrao de achado para consumo por M8/relatorios.

    Os tres primeiros argumentos sao posicionais-only para permitir
    ``codigo=...`` nos detalhes (ex.: codigo do produto) sem conflito.
    """
    item = {
        "codigo": codigo,
        "severidade": severidade,  # erro | aviso | info
        "mensagem": mensagem,
    }
    if detalhes:
        item["detalhes"] = detalhes
    return item


def resumir_achados(achados: list[dict]) -> dict[str, int]:
    resumo = {"erros": 0, "avisos": 0, "infos": 0, "total": len(achados)}
    for a in achados:
        sev = a.get("severidade")
        if sev == "erro":
            resumo["erros"] += 1
        elif sev == "aviso":
            resumo["avisos"] += 1
        else:
            resumo["infos"] += 1
    return resumo


def quase_igual(a: float | None, b: float | None, tol: float = 0.02) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return abs(a - b) <= tol
