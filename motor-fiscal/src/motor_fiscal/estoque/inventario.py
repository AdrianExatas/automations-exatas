"""Gerador de inventario (H010 proposto a partir da movimentacao)."""

from __future__ import annotations


def gerar_h010_proposto(movimentacao: dict, saldos: dict) -> dict:
    """Gera linhas H010 propostas com base no saldo teorico e custo medio.

    Nao grava na EFD — apenas estrutura para relatorio/M8.
    """
    h010_atual = {
        c["codigo"]: c
        for c in saldos["comparacoes"]
        if c.get("qtd_h010") is not None
    }
    propostos = []
    for p in movimentacao["produtos"]:
        qtd = p["saldo_teorico_qtd"]
        if qtd is None or abs(qtd) < 1e-9:
            continue
        custo = p.get("custo_medio") or 0.0
        if qtd < 0 and custo == 0:
            # saldo negativo: ainda propõe com qtd negativa para auditoria
            pass
        vl_item = round(qtd * custo, 2)
        atual = h010_atual.get(p["codigo"])
        propostos.append({
            "COD_ITEM": p["codigo"],
            "UNID": p.get("unidade") or "UN",
            "QTD": round(qtd, 6),
            "VL_UNIT": round(custo, 6) if custo else 0.0,
            "VL_ITEM": vl_item,
            "IND_PROP": "0",
            "descricao": p.get("descricao"),
            "qtd_h010_declarada": atual["qtd_h010"] if atual else None,
            "diferenca_qtd": (
                None if not atual or atual["qtd_h010"] is None
                else round(qtd - atual["qtd_h010"], 6)
            ),
        })

    # Itens so no H010 declarado, sem movimento (mantem proposta = declarado)
    mov_cod = {p["codigo"] for p in movimentacao["produtos"]}
    for c in saldos["comparacoes"]:
        if c["codigo"] in mov_cod:
            continue
        if c.get("qtd_h010") is None:
            continue
        propostos.append({
            "COD_ITEM": c["codigo"],
            "UNID": "UN",
            "QTD": c["qtd_h010"],
            "VL_UNIT": (c["vl_h010"] / c["qtd_h010"]) if c["qtd_h010"] else 0.0,
            "VL_ITEM": c["vl_h010"] or 0.0,
            "IND_PROP": "0",
            "descricao": c.get("descricao"),
            "qtd_h010_declarada": c["qtd_h010"],
            "diferenca_qtd": 0.0,
            "origem": "somente_h010",
        })

    total = round(sum(p["VL_ITEM"] for p in propostos), 2)
    return {
        "h010_proposto": propostos,
        "vl_inv_proposto": total,
        "contagens": {"linhas": len(propostos)},
    }
