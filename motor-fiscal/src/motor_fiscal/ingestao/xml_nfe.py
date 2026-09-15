"""Parser de XML de NF-e (modelo 55) e NFC-e (modelo 65) + eventos.

Aceita raiz ``nfeProc`` (com protocolo) ou ``NFe`` (sem protocolo).
Eventos (``procEventoNFe``/``evento``) sao parseados separadamente; o
cancelamento (tpEvento 110111) muda a situacao do documento na ingestao.
"""

from __future__ import annotations

import os
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field

from motor_fiscal.ingestao import xml_base as xb

TP_EVENTO_CANCELAMENTO = "110111"


@dataclass
class ItemNota:
    n_item: int | None
    cprod: str | None
    xprod: str | None
    ncm: str | None
    cfop: str | None
    unidade: str | None
    quantidade: float | None
    valor_unitario: float | None
    vprod: float | None
    vdesc: float | None
    cst_icms: str | None
    vbc_icms: float | None
    p_icms: float | None
    vicms: float | None
    vbc_icms_st: float | None
    vicms_st: float | None
    cst_ipi: str | None
    vipi: float | None
    cst_pis: str | None
    vpis: float | None
    cst_cofins: str | None
    vcofins: float | None
    pfcp: float | None = None
    vfcp: float | None = None
    vfcp_st: float | None = None
    vfcp_uf_dest: float | None = None
    vbc_uf_dest: float | None = None
    vicms_uf_dest: float | None = None
    picms_inter: float | None = None
    picms_uf_dest: float | None = None


@dataclass
class NotaFiscal:
    chave: str | None
    modelo: str | None
    serie: str | None
    numero: str | None
    tipo_operacao: str | None      # tpNF: '0' entrada, '1' saida
    data_emissao: str | None       # ISO
    situacao: str                  # 'autorizada' | 'cancelada' | 'denegada'
    emitente_cnpj: str | None
    emitente_nome: str | None
    emitente_uf: str | None
    destinatario_cnpj: str | None
    destinatario_nome: str | None
    destinatario_uf: str | None
    valor_total: float | None
    valor_produtos: float | None
    valor_desconto: float | None
    valor_frete: float | None
    vbc_icms: float | None
    vicms: float | None
    vbc_icms_st: float | None
    vicms_st: float | None
    vipi: float | None
    vpis: float | None
    vcofins: float | None
    vfcp: float | None = None
    vfcp_st: float | None = None
    vfcp_uf_dest: float | None = None
    itens: list[ItemNota] = field(default_factory=list)


@dataclass
class Evento:
    chave: str | None
    tipo_evento: str | None
    sequencia: int | None
    data_evento: str | None
    descricao: str | None
    protocolo: str | None


def eh_nfe(raiz: ET.Element) -> bool:
    return xb.tipo_raiz(raiz) in {"nfeProc", "NFe"}


def eh_evento(raiz: ET.Element) -> bool:
    return xb.tipo_raiz(raiz) in {"procEventoNFe", "evento", "envEvento"}


def parse(caminho: str | os.PathLike) -> NotaFiscal:
    """Parseia um XML de NF-e/NFC-e (nfeProc ou NFe)."""
    raiz = xb.raiz(caminho)
    nfe = raiz if xb.tipo_raiz(raiz) == "NFe" else xb.buscar(raiz, "NFe")
    if nfe is None:
        raise ValueError(f"XML sem elemento NFe: {caminho}")
    inf = xb.buscar(nfe, "infNFe")
    if inf is None:
        raise ValueError(f"XML sem infNFe: {caminho}")

    chave = _chave_do_id(inf.get("Id"), prefixo="NFe")
    ide = xb.buscar(inf, "ide")
    emit = xb.buscar(inf, "emit")
    dest = xb.buscar(inf, "dest")
    tot = xb.buscar(inf, "total/ICMSTot")

    data_emissao = xb.texto(ide, "dhEmi") or xb.texto(ide, "dEmi")
    if data_emissao and "T" in data_emissao:
        data_emissao = data_emissao.split("T")[0]

    situacao = "autorizada"
    cstat = xb.texto(raiz, "protNFe/infProt/cStat")
    if cstat == "101":
        situacao = "cancelada"
    elif cstat in {"110", "301", "302", "303"}:
        situacao = "denegada"

    nota = NotaFiscal(
        chave=chave or xb.texto(raiz, "protNFe/infProt/chNFe"),
        modelo=xb.texto(ide, "mod"),
        serie=xb.texto(ide, "serie"),
        numero=xb.texto(ide, "nNF"),
        tipo_operacao=xb.texto(ide, "tpNF"),
        data_emissao=data_emissao,
        situacao=situacao,
        emitente_cnpj=xb.texto(emit, "CNPJ") or xb.texto(emit, "CPF"),
        emitente_nome=xb.texto(emit, "xNome"),
        emitente_uf=xb.texto(emit, "enderEmit/UF"),
        destinatario_cnpj=xb.texto(dest, "CNPJ") or xb.texto(dest, "CPF"),
        destinatario_nome=xb.texto(dest, "xNome"),
        destinatario_uf=xb.texto(dest, "enderDest/UF"),
        valor_total=xb.numero(tot, "vNF"),
        valor_produtos=xb.numero(tot, "vProd"),
        valor_desconto=xb.numero(tot, "vDesc"),
        valor_frete=xb.numero(tot, "vFrete"),
        vbc_icms=xb.numero(tot, "vBC"),
        vicms=xb.numero(tot, "vICMS"),
        vbc_icms_st=xb.numero(tot, "vBCST"),
        vicms_st=xb.numero(tot, "vST"),
        vipi=xb.numero(tot, "vIPI"),
        vpis=xb.numero(tot, "vPIS"),
        vcofins=xb.numero(tot, "vCOFINS"),
        vfcp=xb.numero(tot, "vFCP"),
        vfcp_st=xb.numero(tot, "vFCPST"),
        vfcp_uf_dest=xb.numero(tot, "vFCPUFDest"),
    )
    for det in xb.buscar_todos(inf, "det"):
        nota.itens.append(_parse_item(det))
    return nota


def _parse_item(det: ET.Element) -> ItemNota:
    prod = xb.buscar(det, "prod")
    imposto = xb.buscar(det, "imposto")
    n_item = det.get("nItem")

    cst_icms = vbc = p_icms = vicms = vbc_st = vicms_st = None
    pfcp = vfcp = vfcp_st = None
    grupo_icms = _primeiro_filho(xb.buscar(imposto, "ICMS")) if imposto is not None else None
    if grupo_icms is not None:
        cst = xb.texto(grupo_icms, "CST") or xb.texto(grupo_icms, "CSOSN")
        orig = xb.texto(grupo_icms, "orig") or ""
        cst_icms = f"{orig}{cst}" if cst else None
        vbc = xb.numero(grupo_icms, "vBC")
        p_icms = xb.numero(grupo_icms, "pICMS")
        vicms = xb.numero(grupo_icms, "vICMS")
        vbc_st = xb.numero(grupo_icms, "vBCST")
        vicms_st = xb.numero(grupo_icms, "vICMSST")
        pfcp = xb.numero(grupo_icms, "pFCP")
        vfcp = xb.numero(grupo_icms, "vFCP")
        vfcp_st = xb.numero(grupo_icms, "vFCPST")

    vbc_uf_dest = vicms_uf_dest = vfcp_uf_dest = picms_inter = picms_uf_dest = None
    uf_dest = xb.buscar(imposto, "ICMSUFDest") if imposto is not None else None
    if uf_dest is not None:
        vbc_uf_dest = xb.numero(uf_dest, "vBCUFDest")
        vicms_uf_dest = xb.numero(uf_dest, "vICMSUFDest")
        vfcp_uf_dest = xb.numero(uf_dest, "vFCPUFDest")
        picms_inter = xb.numero(uf_dest, "pICMSInter")
        picms_uf_dest = xb.numero(uf_dest, "pICMSUFDest")
        if pfcp is None:
            pfcp = xb.numero(uf_dest, "pFCPUFDest")

    cst_ipi = vipi = None
    grupo_ipi = xb.buscar(imposto, "IPI") if imposto is not None else None
    if grupo_ipi is not None:
        trib = xb.buscar(grupo_ipi, "IPITrib")
        if trib is None:
            trib = xb.buscar(grupo_ipi, "IPINT")
        cst_ipi = xb.texto(trib, "CST")
        vipi = xb.numero(trib, "vIPI")

    cst_pis, vpis = _pis_cofins(imposto, "PIS")
    cst_cofins, vcofins = _pis_cofins(imposto, "COFINS")

    return ItemNota(
        n_item=int(n_item) if n_item and n_item.isdigit() else None,
        cprod=xb.texto(prod, "cProd"),
        xprod=xb.texto(prod, "xProd"),
        ncm=xb.texto(prod, "NCM"),
        cfop=xb.texto(prod, "CFOP"),
        unidade=xb.texto(prod, "uCom"),
        quantidade=xb.numero(prod, "qCom"),
        valor_unitario=xb.numero(prod, "vUnCom"),
        vprod=xb.numero(prod, "vProd"),
        vdesc=xb.numero(prod, "vDesc"),
        cst_icms=cst_icms,
        vbc_icms=vbc,
        p_icms=p_icms,
        vicms=vicms,
        vbc_icms_st=vbc_st,
        vicms_st=vicms_st,
        cst_ipi=cst_ipi,
        vipi=vipi,
        cst_pis=cst_pis,
        vpis=vpis,
        cst_cofins=cst_cofins,
        vcofins=vcofins,
        pfcp=pfcp,
        vfcp=vfcp,
        vfcp_st=vfcp_st,
        vfcp_uf_dest=vfcp_uf_dest,
        vbc_uf_dest=vbc_uf_dest,
        vicms_uf_dest=vicms_uf_dest,
        picms_inter=picms_inter,
        picms_uf_dest=picms_uf_dest,
    )


def _pis_cofins(imposto: ET.Element | None, nome: str) -> tuple[str | None, float | None]:
    if imposto is None:
        return None, None
    grupo = _primeiro_filho(xb.buscar(imposto, nome))
    if grupo is None:
        return None, None
    return xb.texto(grupo, "CST"), xb.numero(grupo, f"v{nome}")


def _primeiro_filho(elem: ET.Element | None) -> ET.Element | None:
    if elem is None:
        return None
    for filho in elem:
        return filho
    return None


def _chave_do_id(id_attr: str | None, prefixo: str) -> str | None:
    if not id_attr:
        return None
    return id_attr[len(prefixo):] if id_attr.startswith(prefixo) else id_attr


def parse_evento(caminho: str | os.PathLike) -> Evento:
    """Parseia XML de evento de NF-e (procEventoNFe / evento)."""
    raiz = xb.raiz(caminho)
    inf = xb.buscar(raiz, "evento/infEvento")
    if inf is None:
        inf = xb.buscar(raiz, "infEvento")
    if inf is None:
        raise ValueError(f"XML de evento sem infEvento: {caminho}")
    data = xb.texto(inf, "dhEvento")
    if data and "T" in data:
        data = data.split("T")[0]
    seq = xb.texto(inf, "nSeqEvento")
    return Evento(
        chave=xb.texto(inf, "chNFe"),
        tipo_evento=xb.texto(inf, "tpEvento"),
        sequencia=int(seq) if seq and seq.isdigit() else None,
        data_evento=data,
        descricao=xb.texto(inf, "detEvento/descEvento"),
        protocolo=xb.texto(raiz, "retEvento/infEvento/nProt"),
    )
