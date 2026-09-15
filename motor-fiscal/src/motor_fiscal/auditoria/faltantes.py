"""Documentos faltantes, canceladas escrituradas, duplicadas e outra competencia."""

from __future__ import annotations

import sqlite3
from collections import defaultdict

from motor_fiscal.util import achado, competencia_da_data


ORIGENS_EFD = ("efd_icms_ipi", "efd_contribuicoes")
ORIGEM_XML = "xml"
TIPOS_COM_CHAVE = ("nfe", "nfce", "cte", "cfe")


def auditar_faltantes(con: sqlite3.Connection, competencia: str) -> dict:
    achados: list[dict] = []
    docs = con.execute(
        """SELECT id, origem, tipo, chave, modelo, serie, numero, situacao,
                  data_emissao, valor_total
           FROM documentos
           WHERE chave IS NOT NULL AND chave != ''
             AND tipo IN ('nfe','nfce','cte','cfe')"""
    ).fetchall()

    por_chave: dict[str, list] = defaultdict(list)
    for d in docs:
        por_chave[d["chave"]].append(d)

    xml_sem_efd: list[dict] = []
    efd_sem_xml: list[dict] = []
    cancelada_escriturada: list[dict] = []
    duplicadas: list[dict] = []
    outra_competencia: list[dict] = []

    for chave, lista in por_chave.items():
        xmls = [d for d in lista if d["origem"] == ORIGEM_XML]
        efds = [d for d in lista if d["origem"] in ORIGENS_EFD]

        # Duplicadas: mesma chave mais de uma vez na mesma origem (ou >1 XML / >1 EFD ICMS)
        por_origem: dict[str, list] = defaultdict(list)
        for d in lista:
            por_origem[d["origem"]].append(d)
        for origem, grupo in por_origem.items():
            if len(grupo) > 1:
                item = {
                    "chave": chave,
                    "origem": origem,
                    "ocorrencias": len(grupo),
                    "ids": [g["id"] for g in grupo],
                }
                duplicadas.append(item)
                achados.append(achado(
                    "DOCUMENTO_DUPLICADO", "erro",
                    f"Chave {chave} aparece {len(grupo)}x na origem {origem}",
                    **item,
                ))

        if xmls and not efds:
            ref = xmls[0]
            item = _ref_doc(ref)
            xml_sem_efd.append(item)
            achados.append(achado(
                "XML_SEM_EFD", "erro",
                f"XML {ref['tipo']} chave {chave} sem correspondente na EFD",
                **item,
            ))

        if efds and not xmls:
            # Preferir EFD ICMS/IPI como referencia
            ref = next((d for d in efds if d["origem"] == "efd_icms_ipi"), efds[0])
            # Canceladas/inutilizadas na EFD nao exigem XML
            if ref["situacao"] in ("cancelada", "inutilizada", "denegada"):
                pass
            else:
                item = _ref_doc(ref)
                efd_sem_xml.append(item)
                achados.append(achado(
                    "EFD_SEM_XML", "erro",
                    f"EFD {ref['tipo']} chave {chave} sem XML correspondente",
                    **item,
                ))

        # Cancelada no XML (ou evento) mas escriturada como regular na EFD
        xml_canc = [d for d in xmls if (d["situacao"] or "").lower() == "cancelada"]
        efd_regular = [d for d in efds if (d["situacao"] or "").lower() == "regular"]
        if xml_canc and efd_regular:
            item = {"chave": chave, "xml_id": xml_canc[0]["id"], "efd_id": efd_regular[0]["id"]}
            cancelada_escriturada.append(item)
            achados.append(achado(
                "CANCELADA_ESCRITURADA", "erro",
                f"Documento {chave} cancelado no XML mas escriturado como regular na EFD",
                **item,
            ))

        for d in lista:
            comp_doc = competencia_da_data(d["data_emissao"])
            if comp_doc and comp_doc != competencia:
                item = {**_ref_doc(d), "competencia_doc": comp_doc, "competencia_esperada": competencia}
                outra_competencia.append(item)
                achados.append(achado(
                    "OUTRA_COMPETENCIA", "aviso",
                    f"Documento {chave} com emissao em {comp_doc}, competencia auditada {competencia}",
                    **item,
                ))

    return {
        "xml_sem_efd": xml_sem_efd,
        "efd_sem_xml": efd_sem_xml,
        "cancelada_escriturada": cancelada_escriturada,
        "duplicadas": duplicadas,
        "outra_competencia": outra_competencia,
        "achados": achados,
        "contagens": {
            "xml_sem_efd": len(xml_sem_efd),
            "efd_sem_xml": len(efd_sem_xml),
            "cancelada_escriturada": len(cancelada_escriturada),
            "duplicadas": len(duplicadas),
            "outra_competencia": len(outra_competencia),
        },
    }


def _ref_doc(d) -> dict:
    return {
        "id": d["id"],
        "origem": d["origem"],
        "tipo": d["tipo"],
        "chave": d["chave"],
        "modelo": d["modelo"],
        "serie": d["serie"],
        "numero": d["numero"],
        "situacao": d["situacao"],
        "data_emissao": d["data_emissao"],
        "valor_total": d["valor_total"],
    }
