"""Parser de XML de CT-e (modelo 57).

Extrai chave, tomador, chaves de NF-e referenciadas (infNFe/chave),
vTPrest e vICMS. Aceita raiz ``cteProc`` ou ``CTe``.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

from motor_fiscal.ingestao import xml_base as xb


@dataclass
class Cte:
    chave: str | None
    modelo: str | None
    serie: str | None
    numero: str | None
    data_emissao: str | None
    situacao: str                      # 'autorizada' | 'cancelada'
    tomador: str | None                # indicador toma (0..4)
    emitente_cnpj: str | None
    emitente_nome: str | None
    emitente_uf: str | None
    destinatario_cnpj: str | None
    destinatario_nome: str | None
    destinatario_uf: str | None
    valor_prestacao: float | None      # vTPrest
    vbc_icms: float | None
    vicms: float | None
    chaves_nfe: list[str] = field(default_factory=list)


def eh_cte(raiz: ET.Element) -> bool:
    return xb.tipo_raiz(raiz) in {"cteProc", "CTe"}


def parse(caminho: str | os.PathLike) -> Cte:
    raiz = xb.raiz(caminho)
    cte = raiz if xb.tipo_raiz(raiz) == "CTe" else xb.buscar(raiz, "CTe")
    if cte is None:
        raise ValueError(f"XML sem elemento CTe: {caminho}")
    inf = xb.buscar(cte, "infCte")
    if inf is None:
        raise ValueError(f"XML sem infCte: {caminho}")

    ide = xb.buscar(inf, "ide")
    emit = xb.buscar(inf, "emit")
    dest = xb.buscar(inf, "dest")

    data = xb.texto(ide, "dhEmi")
    if data and "T" in data:
        data = data.split("T")[0]

    situacao = "autorizada"
    cstat = xb.texto(raiz, "protCTe/infProt/cStat")
    if cstat == "101":
        situacao = "cancelada"

    # Tomador: toma3/toma ou toma4/toma
    tomador = xb.texto(ide, "toma3/toma") or xb.texto(ide, "toma4/toma") or xb.texto(ide, "toma")

    # ICMS: primeiro grupo dentro de imp/ICMS (ICMS00, ICMS20, ...)
    vbc = vicms = None
    grupo_icms = xb.buscar(inf, "imp/ICMS")
    if grupo_icms is not None:
        for filho in grupo_icms:
            vbc = xb.numero(filho, "vBC")
            vicms = xb.numero(filho, "vICMS")
            break

    chaves_nfe = [
        chave for el in xb.buscar_todos(inf, "infCTeNorm/infDoc/infNFe")
        if (chave := xb.texto(el, "chave"))
    ]

    chave = None
    if inf.get("Id"):
        id_attr = inf.get("Id")
        chave = id_attr[3:] if id_attr.startswith("CTe") else id_attr

    return Cte(
        chave=chave or xb.texto(raiz, "protCTe/infProt/chCTe"),
        modelo=xb.texto(ide, "mod"),
        serie=xb.texto(ide, "serie"),
        numero=xb.texto(ide, "nCT"),
        data_emissao=data,
        situacao=situacao,
        tomador=tomador,
        emitente_cnpj=xb.texto(emit, "CNPJ"),
        emitente_nome=xb.texto(emit, "xNome"),
        emitente_uf=xb.texto(emit, "enderEmit/UF"),
        destinatario_cnpj=xb.texto(dest, "CNPJ") or xb.texto(dest, "CPF"),
        destinatario_nome=xb.texto(dest, "xNome"),
        destinatario_uf=xb.texto(dest, "enderDest/UF"),
        valor_prestacao=xb.numero(inf, "vPrest/vTPrest"),
        vbc_icms=vbc,
        vicms=vicms,
        chaves_nfe=chaves_nfe,
    )
