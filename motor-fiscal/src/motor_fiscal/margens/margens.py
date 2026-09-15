"""Margem por produto (preco medio venda x custo medio entrada)."""

from __future__ import annotations

import sqlite3

from motor_fiscal.estoque.movimentacao import calcular_movimentacao


def calcular_margens(con: sqlite3.Connection, empresa_cnpj: str) -> dict:
    mov = calcular_movimentacao(con, empresa_cnpj)
    produtos = []
    for p in mov["produtos"]:
        custo = p.get("custo_medio")
        preco = p.get("preco_medio_saida")
        margem_unit = None
        margem_pct = None
        if custo is not None and preco is not None:
            margem_unit = round(preco - custo, 6)
            if custo:
                margem_pct = round((margem_unit / custo) * 100, 4)
        produtos.append({
            "codigo": p["codigo"],
            "descricao": p.get("descricao"),
            "qtd_entrada": p["qtd_entrada"],
            "qtd_saida": p["qtd_saida"],
            "custo_medio": custo,
            "preco_medio_venda": preco,
            "margem_unitaria": margem_unit,
            "margem_percentual": margem_pct,
            "valor_entrada": p["valor_entrada"],
            "valor_saida": p["valor_saida"],
            "lucro_bruto_estimado": (
                round(p["valor_saida"] - (p["qtd_saida"] * custo), 2)
                if custo is not None and p["qtd_saida"]
                else None
            ),
        })
    return {
        "produtos": produtos,
        "contagens": {
            "produtos": len(produtos),
            "com_margem": sum(1 for p in produtos if p["margem_unitaria"] is not None),
        },
    }
