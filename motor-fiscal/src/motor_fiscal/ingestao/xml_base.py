"""Helpers de leitura de XML fiscais com xml.etree.ElementTree.

A busca opera por *local name* (ignora o namespace), o que atende NF-e/NFC-e
e CT-e (namespace portalfiscal) e CF-e SAT (sem namespace) com o mesmo codigo.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET


def local(tag: str) -> str:
    """Nome local da tag, sem o namespace '{...}'."""
    return tag.split("}")[-1]


def filhos(elem: ET.Element, nome: str) -> list[ET.Element]:
    return [c for c in elem if local(c.tag) == nome]


def buscar_todos(elem: ET.Element, caminho: str) -> list[ET.Element]:
    """Busca descendentes seguindo um caminho de nomes locais, ex.: 'infNFe/total/ICMSTot'."""
    atuais = [elem]
    for parte in caminho.split("/"):
        proximos: list[ET.Element] = []
        for e in atuais:
            proximos.extend(filhos(e, parte))
        atuais = proximos
    return atuais


def buscar(elem: ET.Element, caminho: str) -> ET.Element | None:
    encontrados = buscar_todos(elem, caminho)
    return encontrados[0] if encontrados else None


def texto(elem: ET.Element | None, caminho: str | None = None) -> str | None:
    if elem is None:
        return None
    alvo = buscar(elem, caminho) if caminho else elem
    if alvo is None or alvo.text is None:
        return None
    valor = alvo.text.strip()
    return valor or None


def numero(elem: ET.Element | None, caminho: str | None = None) -> float | None:
    valor = texto(elem, caminho)
    if valor is None:
        return None
    try:
        return float(valor)
    except ValueError:
        return None


def raiz(caminho_arquivo: str | os.PathLike) -> ET.Element:
    return ET.parse(caminho_arquivo).getroot()


def tipo_raiz(elem: ET.Element) -> str:
    """Nome local da raiz do documento ('nfeProc', 'NFe', 'procEventoNFe', 'cteProc', 'CFe'...)."""
    return local(elem.tag)
