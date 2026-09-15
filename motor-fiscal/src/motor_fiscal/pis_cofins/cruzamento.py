"""Cruzamento PIS/COFINS entre XML, registros C/A/F da EFD-Contribuicoes e bloco M."""

from __future__ import annotations

import sqlite3
from typing import Any

from motor_fiscal.pis_cofins._util import arred2, n, quase_igual, registros_f100


CAMPOS_DOC = ("vpis", "vcofins", "vicms", "valor_total")
CAMPOS_ITEM = ("vpis", "vcofins", "vicms", "valor_produto")


def cruzar(con: sqlite3.Connection) -> dict[str, Any]:
    """Confronta documentos XML × EFD-Contribuicoes e totais de itens × cabecalho."""
    docs_xml = _docs_por_chave(con, "xml")
    docs_efd = _docs_por_chave(con, "efd_contribuicoes")

    divergencias_docs: list[dict] = []
    pares_ok = 0
    so_xml = sorted(set(docs_xml) - set(docs_efd))
    so_efd = sorted(set(docs_efd) - set(docs_xml))

    for chave in sorted(set(docs_xml) & set(docs_efd)):
        xml = docs_xml[chave]
        efd = docs_efd[chave]
        diffs: list[dict] = []
        for campo in CAMPOS_DOC:
            vx, ve = n(xml[campo]), n(efd[campo])
            if not quase_igual(vx, ve):
                diffs.append({
                    "campo": campo,
                    "xml": arred2(vx),
                    "efd_contribuicoes": arred2(ve),
                    "diferenca": arred2(vx - ve),
                })
        itens_xml = _itens_por_n(con, xml["id"])
        itens_efd = _itens_por_n(con, efd["id"])
        for n_item in sorted(set(itens_xml) | set(itens_efd)):
            ix, ie = itens_xml.get(n_item), itens_efd.get(n_item)
            if ix is None or ie is None:
                diffs.append({
                    "campo": f"item[{n_item}]",
                    "xml": "presente" if ix else "ausente",
                    "efd_contribuicoes": "presente" if ie else "ausente",
                    "diferenca": None,
                })
                continue
            for campo in CAMPOS_ITEM:
                vx, ve = n(ix[campo]), n(ie[campo])
                if not quase_igual(vx, ve):
                    diffs.append({
                        "campo": f"item[{n_item}].{campo}",
                        "xml": arred2(vx),
                        "efd_contribuicoes": arred2(ve),
                        "diferenca": arred2(vx - ve),
                    })
        if diffs:
            divergencias_docs.append({
                "chave": chave,
                "numero_xml": xml["numero"],
                "numero_efd": efd["numero"],
                "divergencias": diffs,
            })
        else:
            pares_ok += 1

    inconsistencias_totais: list[dict] = []
    for doc in con.execute(
        """
        SELECT id, chave, numero, origem, vpis, vcofins, situacao
          FROM documentos
         WHERE origem IN ('efd_contribuicoes', 'xml')
           AND COALESCE(situacao, 'regular') NOT IN ('cancelada', 'denegada', 'inutilizada')
        """
    ):
        soma = con.execute(
            "SELECT COALESCE(SUM(vpis),0) AS p, COALESCE(SUM(vcofins),0) AS c "
            "FROM itens WHERE documento_id = ?",
            (doc["id"],),
        ).fetchone()
        for campo, cab, som in (
            ("vpis", n(doc["vpis"]), n(soma["p"])),
            ("vcofins", n(doc["vcofins"]), n(soma["c"])),
        ):
            if cab > 0 and som > 0 and not quase_igual(cab, som):
                inconsistencias_totais.append({
                    "origem": doc["origem"],
                    "chave": doc["chave"],
                    "numero": doc["numero"],
                    "campo": campo,
                    "cabecalho": arred2(cab),
                    "soma_itens": arred2(som),
                    "diferenca": arred2(cab - som),
                })

    f100 = registros_f100(con)
    resumo_f = {
        "registros": len(f100),
        "vl_pis": arred2(sum(n(f.get("VL_PIS")) for f in f100)),
        "vl_cofins": arred2(sum(n(f.get("VL_COFINS")) for f in f100)),
    }

    return {
        "documentos": {
            "pares_ok": pares_ok,
            "pares_divergentes": len(divergencias_docs),
            "somente_xml": so_xml,
            "somente_efd_contribuicoes": so_efd,
            "divergencias": divergencias_docs,
        },
        "totais_cabecalho_x_itens": inconsistencias_totais,
        "f100": resumo_f,
        "conforme": len(divergencias_docs) == 0 and len(inconsistencias_totais) == 0,
    }


def _docs_por_chave(con: sqlite3.Connection, origem: str) -> dict[str, sqlite3.Row]:
    rows = con.execute(
        """
        SELECT * FROM documentos
         WHERE origem = ? AND chave IS NOT NULL AND chave != ''
           AND COALESCE(situacao, 'regular') NOT IN ('cancelada', 'denegada', 'inutilizada')
        """,
        (origem,),
    ).fetchall()
    return {r["chave"]: r for r in rows}


def _itens_por_n(con: sqlite3.Connection, documento_id: int) -> dict[int, sqlite3.Row]:
    rows = con.execute(
        "SELECT * FROM itens WHERE documento_id = ? ORDER BY n_item",
        (documento_id,),
    ).fetchall()
    out: dict[int, sqlite3.Row] = {}
    for r in rows:
        n_item = r["n_item"] if r["n_item"] is not None else 0
        out[int(n_item)] = r
    return out
