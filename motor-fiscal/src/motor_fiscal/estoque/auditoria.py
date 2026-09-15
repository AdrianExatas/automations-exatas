"""Auditoria de estoque/inventario (M5)."""

from __future__ import annotations

import sqlite3

from motor_fiscal.estoque import inventario, movimentacao, saldo
from motor_fiscal.util import achado, resumir_achados


def auditar_estoque(
    con: sqlite3.Connection,
    empresa_cnpj: str,
    competencia: str,
) -> dict:
    mov = movimentacao.calcular_movimentacao(con, empresa_cnpj)
    saldos = saldo.comparar_saldos(con, mov)
    h010 = inventario.gerar_h010_proposto(mov, saldos)

    achados: list[dict] = []

    for p in mov["produtos"]:
        if p["saldo_teorico_qtd"] is not None and p["saldo_teorico_qtd"] < -0.02:
            achados.append(achado(
                "ESTOQUE_SALDO_NEGATIVO", "erro",
                f"Produto {p['codigo']} com saldo teorico negativo ({p['saldo_teorico_qtd']})",
                codigo=p["codigo"], saldo=p["saldo_teorico_qtd"],
            ))
        if p["qtd_saida"] > 0 and p["qtd_entrada"] == 0:
            achados.append(achado(
                "ESTOQUE_GIRO_INCOERENTE", "aviso",
                f"Produto {p['codigo']} com saidas e sem entradas na competencia",
                codigo=p["codigo"], qtd_saida=p["qtd_saida"],
            ))

    for s in mov["sem_movimentacao_0200"]:
        tem_saldo = any(
            c["codigo"] == s["codigo"] and (
                c.get("qtd_h010") is not None or c.get("qtd_k200") is not None
            )
            for c in saldos["comparacoes"]
        )
        if tem_saldo:
            achados.append(achado(
                "ESTOQUE_SEM_MOVIMENTACAO", "aviso",
                f"Produto {s['codigo']} no inventario/K200 sem movimentacao C170",
                **s,
            ))
        else:
            achados.append(achado(
                "ESTOQUE_SEM_MOVIMENTACAO", "info",
                f"Produto 0200 {s['codigo']} sem movimentacao na competencia",
                **s,
            ))

    for c in saldos["comparacoes"]:
        for campo, cod_achado in (
            ("divergencia_teorico_h010", "ESTOQUE_DIVERGENCIA_H010"),
            ("divergencia_teorico_k200", "ESTOQUE_DIVERGENCIA_K200"),
            ("divergencia_h010_k200", "ESTOQUE_DIVERGENCIA_H010_K200"),
        ):
            dif = c.get(campo)
            if dif is not None and abs(dif) > 0.02:
                achados.append(achado(
                    cod_achado, "erro",
                    f"Produto {c['codigo']}: {campo} = {dif}",
                    codigo_produto=c["codigo"], diferenca=dif,
                    teorico=c["saldo_teorico"], h010=c["qtd_h010"], k200=c["qtd_k200"],
                ))

    h005 = saldos["h005"]
    if h005.get("divergencia_total") is not None and abs(h005["divergencia_total"]) > 0.02:
        achados.append(achado(
            "ESTOQUE_H005_DIVERGENTE", "erro",
            f"H005 VL_INV diverge da soma H010 em {h005['divergencia_total']}",
            vl_inv_declarado=h005["vl_inv_declarado"],
            vl_inv_soma_h010=h005["vl_inv_soma_h010"],
            divergencia_total=h005["divergencia_total"],
        ))

    resumo = resumir_achados(achados)
    return {
        "modulo": "estoque",
        "empresa_cnpj": empresa_cnpj,
        "competencia": competencia,
        "movimentacao": mov,
        "saldos": saldos,
        "inventario_proposto": h010,
        "achados": achados,
        "resumo": resumo,
        "ok": resumo["erros"] == 0,
    }
