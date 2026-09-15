"""Correlacao de produtos XML x 0200 EFD e persistencia em de_para_produtos."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from motor_fiscal.util import achado, similaridade_descricao


LIMIAR_DESCRICAO = 0.5


def correlacionar_produtos(
    con: sqlite3.Connection,
    empresa_cnpj: str,
    persistir: bool = True,
) -> dict:
    """Monta de-para cProd/xProd (XML) x COD_ITEM/DESCR_ITEM (0200).

    Metodos: ``exato`` (mesmo codigo) e ``descricao`` (Jaccard >= limiar).
    Persistido em ``de_para_produtos`` (UNIQUE empresa+codigo_xml+codigo_efd).
    """
    xmls = con.execute(
        """SELECT codigo, descricao FROM produtos
           WHERE origem = 'xml' AND empresa_cnpj = ?""",
        (empresa_cnpj,),
    ).fetchall()
    efds = con.execute(
        """SELECT codigo, descricao FROM produtos
           WHERE origem = 'efd_0200' AND empresa_cnpj = ?""",
        (empresa_cnpj,),
    ).fetchall()

    efd_por_codigo = {e["codigo"]: e for e in efds if e["codigo"]}
    pares: list[dict] = []
    usados_efd: set[str] = set()
    achados: list[dict] = []

    # 1) Match exato por codigo
    for x in xmls:
        cod = x["codigo"]
        if not cod:
            continue
        if cod in efd_por_codigo:
            e = efd_por_codigo[cod]
            pares.append(_par(cod, e["codigo"], x["descricao"], e["descricao"], "exato", 1.0))
            usados_efd.add(e["codigo"])

    ja_xml = {p["codigo_xml"] for p in pares}

    # 2) Match por descricao para os restantes
    for x in xmls:
        if not x["codigo"] or x["codigo"] in ja_xml:
            continue
        melhor = None
        melhor_score = 0.0
        for e in efds:
            if e["codigo"] in usados_efd:
                continue
            score = similaridade_descricao(x["descricao"], e["descricao"])
            if score > melhor_score:
                melhor_score = score
                melhor = e
        if melhor and melhor_score >= LIMIAR_DESCRICAO:
            pares.append(_par(
                x["codigo"], melhor["codigo"], x["descricao"], melhor["descricao"],
                "descricao", round(melhor_score, 4),
            ))
            usados_efd.add(melhor["codigo"])
            ja_xml.add(x["codigo"])
        else:
            achados.append(achado(
                "PRODUTO_XML_SEM_DEPARA", "aviso",
                f"Produto XML {x['codigo']} ({x['descricao']}) sem correspondente no 0200",
                codigo_xml=x["codigo"], descricao_xml=x["descricao"],
            ))

    efd_sem_xml = [e for e in efds if e["codigo"] not in usados_efd]
    for e in efd_sem_xml:
        achados.append(achado(
            "PRODUTO_EFD_SEM_DEPARA", "info",
            f"Produto EFD 0200 {e['codigo']} ({e['descricao']}) sem correspondente XML nesta competencia",
            codigo_efd=e["codigo"], descricao_efd=e["descricao"],
        ))

    if persistir and pares:
        agora = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        for p in pares:
            con.execute(
                """INSERT INTO de_para_produtos
                   (empresa_cnpj, codigo_xml, codigo_efd, descricao_xml, descricao_efd,
                    metodo, confianca, atualizado_em)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                   ON CONFLICT (empresa_cnpj, codigo_xml, codigo_efd) DO UPDATE SET
                     descricao_xml = excluded.descricao_xml,
                     descricao_efd = excluded.descricao_efd,
                     metodo = excluded.metodo,
                     confianca = excluded.confianca,
                     atualizado_em = excluded.atualizado_em""",
                (
                    empresa_cnpj, p["codigo_xml"], p["codigo_efd"],
                    p["descricao_xml"], p["descricao_efd"],
                    p["metodo"], p["confianca"], agora,
                ),
            )
        con.commit()

    mapa_xml_para_efd = {p["codigo_xml"]: p["codigo_efd"] for p in pares}
    return {
        "pares": pares,
        "mapa_xml_para_efd": mapa_xml_para_efd,
        "sem_depara_xml": [a["detalhes"] for a in achados if a["codigo"] == "PRODUTO_XML_SEM_DEPARA"],
        "sem_depara_efd": [a["detalhes"] for a in achados if a["codigo"] == "PRODUTO_EFD_SEM_DEPARA"],
        "achados": achados,
        "contagens": {
            "pares": len(pares),
            "exato": sum(1 for p in pares if p["metodo"] == "exato"),
            "descricao": sum(1 for p in pares if p["metodo"] == "descricao"),
            "xml_sem_depara": sum(1 for a in achados if a["codigo"] == "PRODUTO_XML_SEM_DEPARA"),
            "efd_sem_depara": sum(1 for a in achados if a["codigo"] == "PRODUTO_EFD_SEM_DEPARA"),
        },
    }


def mapa_de_para(con: sqlite3.Connection, empresa_cnpj: str) -> dict[str, str]:
    """Retorna codigo_xml -> codigo_efd (preferindo maior confianca)."""
    linhas = con.execute(
        """SELECT codigo_xml, codigo_efd, confianca FROM de_para_produtos
           WHERE empresa_cnpj = ?
           ORDER BY COALESCE(confianca, -1) DESC""",
        (empresa_cnpj,),
    ).fetchall()
    mapa: dict[str, str] = {}
    for l in linhas:
        if l["codigo_xml"] not in mapa:
            mapa[l["codigo_xml"]] = l["codigo_efd"]
    return mapa


def _par(cx, ce, dx, de, metodo, confianca) -> dict:
    return {
        "codigo_xml": cx,
        "codigo_efd": ce,
        "descricao_xml": dx,
        "descricao_efd": de,
        "metodo": metodo,
        "confianca": confianca,
    }
