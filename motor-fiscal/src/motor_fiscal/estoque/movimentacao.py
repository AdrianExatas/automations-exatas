"""Movimentacao de estoque por produto (C170 + de-para) com custo medio."""

from __future__ import annotations

import sqlite3
from collections import defaultdict

from motor_fiscal.auditoria.correlacao_produtos import mapa_de_para
from motor_fiscal.db import consultas
from motor_fiscal.util import numero_ou_zero


def calcular_movimentacao(con: sqlite3.Connection, empresa_cnpj: str) -> dict:
    """Agrega entradas/saidas por codigo EFD a partir de itens de documentos EFD ICMS/IPI.

    Usa ``ind_operacao`` do documento (0=entrada, 1=saida). Codigos XML sao
    normalizados via de-para quando o item vier de XML (nao usado no calculo
    principal — C170 ja traz codigo EFD).
    """
    de_para = mapa_de_para(con, empresa_cnpj)
    # Inverso: efd -> lista xml (informativo)
    inverso: dict[str, list[str]] = defaultdict(list)
    for cx, ce in de_para.items():
        inverso[ce].append(cx)

    linhas = con.execute(
        """SELECT i.codigo_produto, i.descricao, i.quantidade, i.valor_produto,
                  i.unidade, d.ind_operacao, d.origem, d.tipo, d.chave, d.situacao
           FROM itens i
           JOIN documentos d ON d.id = i.documento_id
           WHERE d.origem = 'efd_icms_ipi'
             AND d.tipo IN ('nfe', 'nfce', 'cfe')
             AND COALESCE(d.situacao, 'regular') NOT IN ('cancelada', 'inutilizada', 'denegada')
             AND i.codigo_produto IS NOT NULL"""
    ).fetchall()

    agg: dict[str, dict] = {}
    for l in linhas:
        cod = l["codigo_produto"]
        # Se por algum motivo veio codigo XML, mapeia
        cod = de_para.get(cod, cod)
        slot = agg.setdefault(cod, {
            "codigo": cod,
            "descricao": l["descricao"],
            "unidade": l["unidade"],
            "qtd_entrada": 0.0,
            "qtd_saida": 0.0,
            "valor_entrada": 0.0,
            "valor_saida": 0.0,
            "movimentos": 0,
        })
        qtd = numero_ou_zero(l["quantidade"])
        valor = numero_ou_zero(l["valor_produto"])
        if l["ind_operacao"] == "0":
            slot["qtd_entrada"] += qtd
            slot["valor_entrada"] += valor
        else:
            slot["qtd_saida"] += qtd
            slot["valor_saida"] += valor
        slot["movimentos"] += 1
        if l["descricao"] and not slot["descricao"]:
            slot["descricao"] = l["descricao"]

    produtos = []
    for cod, s in sorted(agg.items()):
        custo_medio = (s["valor_entrada"] / s["qtd_entrada"]) if s["qtd_entrada"] else None
        preco_medio_saida = (s["valor_saida"] / s["qtd_saida"]) if s["qtd_saida"] else None
        saldo_qtd = s["qtd_entrada"] - s["qtd_saida"]
        produtos.append({
            **s,
            "saldo_teorico_qtd": round(saldo_qtd, 6),
            "custo_medio": round(custo_medio, 6) if custo_medio is not None else None,
            "preco_medio_saida": round(preco_medio_saida, 6) if preco_medio_saida is not None else None,
            "valor_estoque_teorico": round(saldo_qtd * custo_medio, 2) if custo_medio is not None else None,
            "codigos_xml": inverso.get(cod, []),
        })

    # Produtos 0200 sem movimentacao (tabela produtos e/ou registros_efd)
    mov_codigos = set(agg)
    sem_mov_map: dict[str, dict] = {}
    for p in con.execute(
        """SELECT codigo, descricao, unidade FROM produtos
           WHERE origem = 'efd_0200' AND empresa_cnpj = ?""",
        (empresa_cnpj,),
    ).fetchall():
        if p["codigo"] and p["codigo"] not in mov_codigos:
            sem_mov_map[p["codigo"]] = {
                "codigo": p["codigo"],
                "descricao": p["descricao"],
                "unidade": p["unidade"],
            }
    for p in consultas.registros_efd_por_tipo(con, "0200", "efd_icms_ipi"):
        cod = p.get("COD_ITEM")
        if cod and cod not in mov_codigos and cod not in sem_mov_map:
            sem_mov_map[cod] = {
                "codigo": cod,
                "descricao": p.get("DESCR_ITEM"),
                "unidade": p.get("UNID_INV"),
            }
    sem_mov = list(sem_mov_map.values())

    return {
        "produtos": produtos,
        "sem_movimentacao_0200": sem_mov,
        "contagens": {
            "produtos_com_movimento": len(produtos),
            "produtos_0200_sem_movimento": len(sem_mov),
        },
    }
