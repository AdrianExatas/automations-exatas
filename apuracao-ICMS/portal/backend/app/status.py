"""Descricoes fixas dos 19 status do fluxo de fechamento do ICMS.

Fonte: apuracao-ICMS/skills/apuracao-icms/references/mapa-macro-processo.md
(secao "Status de workflow (19)").
"""

from __future__ import annotations

STATUS_DESCRICOES: dict[int, str] = {
    1: "Aguardando documentação",
    2: "Documentação recebida",
    3: "Conferência documental",
    4: "Pendência documental",
    5: "Escrituração",
    6: "Conferência de entradas",
    7: "Conferência de saídas",
    8: "Análise tributária",
    9: "Apurações especiais",
    10: "Apuração preliminar",
    11: "Pendência fiscal",
    12: "Revisão da apuração",
    13: "Apuração aprovada",
    14: "Validação EFD",
    15: "EFD transmitida",
    16: "Guias geradas",
    17: "Aguardando pagamento",
    18: "Pagamento confirmado",
    19: "Fechamento concluído",
}

STATUS_CODIGO_PADRAO = 1
STATUS_CODIGO_MIN = 1
STATUS_CODIGO_MAX = 19


def descricao_status(codigo: int | None) -> str:
    if codigo is None:
        codigo = STATUS_CODIGO_PADRAO
    return STATUS_DESCRICOES.get(codigo, "Status desconhecido")


def status_codigo_valido(codigo: int) -> bool:
    return STATUS_CODIGO_MIN <= codigo <= STATUS_CODIGO_MAX
