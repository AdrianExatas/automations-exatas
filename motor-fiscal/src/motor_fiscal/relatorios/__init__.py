"""M8 — Relatorios: XLSX fiscal (entrega) + JSON tecnico."""

from motor_fiscal.relatorios.destino import PASTA_09_DOSSIE, resolver_destino_relatorios
from motor_fiscal.relatorios.gerador import NOME_RESUMO_XLSX, SUBPASTA_TECNICO, gerar_relatorios

__all__ = [
    "NOME_RESUMO_XLSX",
    "PASTA_09_DOSSIE",
    "SUBPASTA_TECNICO",
    "gerar_relatorios",
    "resolver_destino_relatorios",
]
