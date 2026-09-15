"""Parser de XML de CF-e SAT (modelo 59).

CF-e nao usa namespace; o helper xml_base opera por nome local e cobre
os dois casos. Extrai chave, itens basicos e totais.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

from motor_fiscal.ingestao import xml_base as xb


@dataclass
class ItemCfe:
    n_item: int | None
    cprod: str | None
    xprod: str | None
    ncm: str | None
    cfop: str | None
    unidade: str | None
    quantidade: float | None
    valor_unitario: float | None
    vprod: float | None
    cst_icms: str | None
    vicms: float | None


@dataclass
class Cfe:
    chave: str | None
    modelo: str | None
    numero: str | None                 # nCFe
    serie_sat: str | None              # nserieSAT
    data_emissao: str | None
    situacao: str                      # 'autorizada' | 'cancelada' (CFeCanc)
    emitente_cnpj: str | None
    emitente_nome: str | None
    valor_total: float | None          # vCFe
    valor_produtos: float | None
    valor_desconto: float | None
    vicms: float | None
    vpis: float | None
    vcofins: float | None
    itens: list[ItemCfe] = field(default_factory=list)


def eh_cfe(raiz: ET.Element) -> bool:
    return xb.tipo_raiz(raiz) in {"CFe", "CFeCanc"}


def parse(caminho: str | os.PathLike) -> Cfe:
    raiz = xb.raiz(caminho)
    cancelamento = xb.tipo_raiz(raiz) == "CFeCanc"
    inf = xb.buscar(raiz, "infCFe")
    if inf is None:
        raise ValueError(f"XML sem infCFe: {caminho}")

    ide = xb.buscar(inf, "ide")
    emit = xb.buscar(inf, "emit")
    tot = xb.buscar(inf, "total")

    data = xb.texto(ide, "dEmi")
    if data and len(data) == 8 and data.isdigit():
        data = f"{data[0:4]}-{data[4:6]}-{data[6:8]}"

    chave = None
    if inf.get("Id"):
        id_attr = inf.get("Id")
        chave = id_attr[3:] if id_attr.startswith("CFe") else id_attr

    cfe = Cfe(
        chave=chave,
        modelo=xb.texto(ide, "mod") or "59",
        numero=xb.texto(ide, "nCFe"),
        serie_sat=xb.texto(ide, "nserieSAT"),
        data_emissao=data,
        situacao="cancelada" if cancelamento else "autorizada",
        emitente_cnpj=xb.texto(emit, "CNPJ"),
        emitente_nome=xb.texto(emit, "xNome"),
        valor_total=xb.numero(tot, "vCFe"),
        valor_produtos=xb.numero(tot, "ICMSTot/vProd"),
        valor_desconto=xb.numero(tot, "ICMSTot/vDesc"),
        vicms=xb.numero(tot, "ICMSTot/vICMS"),
        vpis=xb.numero(tot, "ICMSTot/vPIS"),
        vcofins=xb.numero(tot, "ICMSTot/vCOFINS"),
    )
    for det in xb.buscar_todos(inf, "det"):
        cfe.itens.append(_parse_item(det))
    return cfe


def _parse_item(det: ET.Element) -> ItemCfe:
    prod = xb.buscar(det, "prod")
    n_item = det.get("nItem")

    cst = vicms = None
    grupo_icms = xb.buscar(det, "imposto/ICMS")
    if grupo_icms is not None:
        for filho in grupo_icms:
            cst = xb.texto(filho, "CST") or xb.texto(filho, "CSOSN")
            vicms = xb.numero(filho, "vICMS")
            break

    return ItemCfe(
        n_item=int(n_item) if n_item and n_item.isdigit() else None,
        cprod=xb.texto(prod, "cProd"),
        xprod=xb.texto(prod, "xProd"),
        ncm=xb.texto(prod, "NCM"),
        cfop=xb.texto(prod, "CFOP"),
        unidade=xb.texto(prod, "uCom"),
        quantidade=xb.numero(prod, "qCom"),
        valor_unitario=xb.numero(prod, "vUnCom"),
        vprod=xb.numero(prod, "vProd"),
        cst_icms=cst,
        vicms=vicms,
    )
