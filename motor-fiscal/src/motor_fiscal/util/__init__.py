"""Utilitarios compartilhados do motor fiscal."""

from motor_fiscal.util.comum import (
    achado,
    agora_iso,
    competencia_da_data,
    normalizar_texto,
    numero_flex,
    numero_ou_zero,
    quase_igual,
    resumir_achados,
    similaridade_descricao,
    tokens_descricao,
)
from motor_fiscal.util.numeros import arred, eh_igual, n

__all__ = [
    "achado",
    "agora_iso",
    "arred",
    "competencia_da_data",
    "eh_igual",
    "n",
    "normalizar_texto",
    "numero_flex",
    "numero_ou_zero",
    "quase_igual",
    "resumir_achados",
    "similaridade_descricao",
    "tokens_descricao",
]
