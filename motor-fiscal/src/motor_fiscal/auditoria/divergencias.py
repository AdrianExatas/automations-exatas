"""Divergencias de notas (XML x C100) e de produtos (item XML x C170)."""

from __future__ import annotations

import sqlite3

from motor_fiscal.auditoria.correlacao_produtos import mapa_de_para
from motor_fiscal.util import achado, quase_igual


CAMPOS_NOTA = (
    ("valor_total", "valor_total"),
    ("valor_produtos", "valor_produtos"),
    ("vicms", "vicms"),
    ("vicms_st", "vicms_st"),
    ("vipi", "vipi"),
    ("vpis", "vpis"),
    ("vcofins", "vcofins"),
)

CAMPOS_ITEM = (
    ("quantidade", "quantidade"),
    ("valor_produto", "valor_produto"),
    ("vicms", "vicms"),
    ("vicms_st", "vicms_st"),
    ("vipi", "vipi"),
    ("cfop", "cfop"),
    ("cst_icms", "cst_icms"),
)


def auditar_divergencias(con: sqlite3.Connection, empresa_cnpj: str) -> dict:
    notas = _divergencias_notas(con)
    produtos = _divergencias_produtos(con, empresa_cnpj)
    achados = notas["achados"] + produtos["achados"]
    return {
        "notas": notas["itens"],
        "produtos": produtos["itens"],
        "achados": achados,
        "contagens": {
            "notas_divergentes": len(notas["itens"]),
            "produtos_divergentes": len(produtos["itens"]),
        },
    }


def _divergencias_notas(con: sqlite3.Connection) -> dict:
    xmls = {
        r["chave"]: r
        for r in con.execute(
            """SELECT * FROM documentos
               WHERE origem = 'xml' AND chave IS NOT NULL AND chave != ''
                 AND tipo IN ('nfe','nfce','cte','cfe')"""
        )
    }
    efds = {
        r["chave"]: r
        for r in con.execute(
            """SELECT * FROM documentos
               WHERE origem = 'efd_icms_ipi' AND chave IS NOT NULL AND chave != ''"""
        )
    }

    itens = []
    achados = []
    for chave, xml in xmls.items():
        efd = efds.get(chave)
        if not efd:
            continue
        diffs = {}
        for campo_xml, campo_efd in CAMPOS_NOTA:
            vx, ve = xml[campo_xml], efd[campo_efd]
            if isinstance(vx, str) or isinstance(ve, str):
                if (vx or "") != (ve or ""):
                    diffs[campo_xml] = {"xml": vx, "efd": ve}
            elif not quase_igual(vx, ve):
                diffs[campo_xml] = {"xml": vx, "efd": ve}
        if diffs:
            item = {
                "chave": chave,
                "tipo": xml["tipo"],
                "xml_id": xml["id"],
                "efd_id": efd["id"],
                "diferencas": diffs,
            }
            itens.append(item)
            achados.append(achado(
                "DIVERGENCIA_NOTA", "erro",
                f"Divergencia de valores XML x C100/D100 na chave {chave}: {', '.join(diffs)}",
                **item,
            ))
    return {"itens": itens, "achados": achados}


def _divergencias_produtos(con: sqlite3.Connection, empresa_cnpj: str) -> dict:
    de_para = mapa_de_para(con, empresa_cnpj)
    xml_docs = {
        r["chave"]: r["id"]
        for r in con.execute(
            """SELECT id, chave FROM documentos
               WHERE origem = 'xml' AND chave IS NOT NULL AND tipo IN ('nfe','nfce')"""
        )
    }
    efd_docs = {
        r["chave"]: r["id"]
        for r in con.execute(
            """SELECT id, chave FROM documentos
               WHERE origem = 'efd_icms_ipi' AND chave IS NOT NULL AND tipo IN ('nfe','nfce')"""
        )
    }

    itens_out = []
    achados = []
    for chave, xml_id in xml_docs.items():
        efd_id = efd_docs.get(chave)
        if not efd_id:
            continue
        itens_xml = con.execute(
            "SELECT * FROM itens WHERE documento_id = ? ORDER BY n_item", (xml_id,)
        ).fetchall()
        itens_efd = con.execute(
            "SELECT * FROM itens WHERE documento_id = ? ORDER BY n_item", (efd_id,)
        ).fetchall()
        efd_por_n = {i["n_item"]: i for i in itens_efd}
        efd_por_cod = {}
        for i in itens_efd:
            efd_por_cod.setdefault(i["codigo_produto"], []).append(i)

        for ix in itens_xml:
            alvo = efd_por_n.get(ix["n_item"])
            if alvo is None:
                cod_efd = de_para.get(ix["codigo_produto"] or "", ix["codigo_produto"])
                candidatos = efd_por_cod.get(cod_efd) or efd_por_cod.get(ix["codigo_produto"]) or []
                alvo = candidatos[0] if candidatos else None
            if alvo is None:
                item = {
                    "chave": chave,
                    "n_item": ix["n_item"],
                    "codigo_xml": ix["codigo_produto"],
                    "motivo": "item_ausente_efd",
                }
                itens_out.append(item)
                achados.append(achado(
                    "DIVERGENCIA_PRODUTO", "erro",
                    f"Item {ix['n_item']} da NF {chave} presente no XML e ausente na EFD",
                    **item,
                ))
                continue

            diffs = {}
            # Codigo: comparar via de-para
            cod_xml_mapeado = de_para.get(ix["codigo_produto"] or "", ix["codigo_produto"])
            if cod_xml_mapeado != alvo["codigo_produto"] and ix["codigo_produto"] != alvo["codigo_produto"]:
                diffs["codigo_produto"] = {
                    "xml": ix["codigo_produto"],
                    "xml_mapeado": cod_xml_mapeado,
                    "efd": alvo["codigo_produto"],
                }
            for campo, _ in CAMPOS_ITEM:
                vx, ve = ix[campo], alvo[campo]
                if campo in ("cfop", "cst_icms"):
                    # CST EFD vem com origem (3 digitos); XML pode ter 2
                    sx, se = (vx or ""), (ve or "")
                    if campo == "cst_icms":
                        if sx.zfill(2) != se[-2:] and sx != se:
                            diffs[campo] = {"xml": vx, "efd": ve}
                    elif sx != se:
                        diffs[campo] = {"xml": vx, "efd": ve}
                elif not quase_igual(vx if not isinstance(vx, str) else None,
                                     ve if not isinstance(ve, str) else None):
                    if vx != ve:
                        diffs[campo] = {"xml": vx, "efd": ve}
            if diffs:
                item = {
                    "chave": chave,
                    "n_item": ix["n_item"],
                    "codigo_xml": ix["codigo_produto"],
                    "codigo_efd": alvo["codigo_produto"],
                    "diferencas": diffs,
                }
                itens_out.append(item)
                achados.append(achado(
                    "DIVERGENCIA_PRODUTO", "erro",
                    f"Divergencia item {ix['n_item']} NF {chave}: {', '.join(diffs)}",
                    **item,
                ))
    return {"itens": itens_out, "achados": achados}
