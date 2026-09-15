"""Importa um diretorio de XMLs fiscais (NF-e/NFC-e, CT-e, CF-e, eventos) para o SQLite.

Identifica o tipo de cada arquivo pela raiz do XML. Eventos de cancelamento
(tpEvento 110111) atualizam a situacao do documento correspondente.
"""

from __future__ import annotations

import json
import os
import sqlite3
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from motor_fiscal.ingestao import gravacao, xml_base as xb, xml_cfe, xml_cte, xml_nfe


def importar_diretorio(
    con: sqlite3.Connection,
    diretorio: str | os.PathLike,
    empresa: str,
    competencia: str,
) -> dict:
    """Importa recursivamente todos os .xml do diretorio. Retorna resumo."""
    diretorio = Path(diretorio)
    contagem: Counter = Counter()
    erros: list[str] = []

    arquivos = sorted(diretorio.rglob("*.xml"))
    for arquivo in arquivos:
        try:
            raiz = xb.raiz(arquivo)
        except ET.ParseError as exc:
            erros.append(f"{arquivo.name}: XML invalido ({exc})")
            continue
        try:
            tipo = _importar_arquivo(con, raiz, arquivo, empresa, competencia)
            contagem[tipo] += 1
        except ValueError as exc:
            erros.append(f"{arquivo.name}: {exc}")

    _aplicar_cancelamentos(con, empresa, competencia)
    con.commit()
    return {
        "diretorio": str(diretorio),
        "arquivos_lidos": len(arquivos),
        "por_tipo": dict(contagem),
        "erros": erros,
    }


def _importar_arquivo(
    con: sqlite3.Connection,
    raiz: ET.Element,
    arquivo: Path,
    empresa: str,
    competencia: str,
) -> str:
    if xml_nfe.eh_evento(raiz):
        evento = xml_nfe.parse_evento(arquivo)
        gravacao.inserir_evento(
            con, empresa, competencia,
            chave_documento=evento.chave or "",
            tipo_evento=evento.tipo_evento,
            descricao=evento.descricao,
            sequencia=evento.sequencia,
            data_evento=evento.data_evento,
            protocolo=evento.protocolo,
            arquivo_origem=str(arquivo),
        )
        return "evento"
    if xml_nfe.eh_nfe(raiz):
        _gravar_nfe(con, xml_nfe.parse(arquivo), arquivo, empresa, competencia)
        return "nfe"
    if xml_cte.eh_cte(raiz):
        _gravar_cte(con, xml_cte.parse(arquivo), arquivo, empresa, competencia)
        return "cte"
    if xml_cfe.eh_cfe(raiz):
        _gravar_cfe(con, xml_cfe.parse(arquivo), arquivo, empresa, competencia)
        return "cfe"
    raise ValueError(f"raiz XML nao reconhecida: {xb.tipo_raiz(raiz)}")


def _gravar_nfe(
    con: sqlite3.Connection, nota: xml_nfe.NotaFiscal, arquivo: Path, empresa: str, competencia: str
) -> None:
    doc_id = gravacao.inserir_documento(con, {
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "origem": "xml",
        "tipo": "nfce" if nota.modelo == "65" else "nfe",
        "chave": nota.chave,
        "modelo": nota.modelo,
        "serie": nota.serie,
        "numero": nota.numero,
        "ind_operacao": nota.tipo_operacao,
        "data_emissao": nota.data_emissao,
        "situacao": nota.situacao,
        "emitente_cnpj": nota.emitente_cnpj,
        "emitente_nome": nota.emitente_nome,
        "emitente_uf": nota.emitente_uf,
        "destinatario_cnpj": nota.destinatario_cnpj,
        "destinatario_nome": nota.destinatario_nome,
        "destinatario_uf": nota.destinatario_uf,
        "valor_total": nota.valor_total,
        "valor_produtos": nota.valor_produtos,
        "valor_desconto": nota.valor_desconto,
        "valor_frete": nota.valor_frete,
        "vbc_icms": nota.vbc_icms,
        "vicms": nota.vicms,
        "vbc_icms_st": nota.vbc_icms_st,
        "vicms_st": nota.vicms_st,
        "vipi": nota.vipi,
        "vpis": nota.vpis,
        "vcofins": nota.vcofins,
        "vfcp": nota.vfcp,
        "vfcp_st": nota.vfcp_st,
        "vfcp_uf_dest": nota.vfcp_uf_dest,
        "arquivo_origem": str(arquivo),
    })
    for item in nota.itens:
        gravacao.inserir_item(con, {
            "documento_id": doc_id,
            "n_item": item.n_item,
            "codigo_produto": item.cprod,
            "descricao": item.xprod,
            "ncm": item.ncm,
            "cfop": item.cfop,
            "unidade": item.unidade,
            "quantidade": item.quantidade,
            "valor_unitario": item.valor_unitario,
            "valor_produto": item.vprod,
            "valor_desconto": item.vdesc,
            "cst_icms": item.cst_icms,
            "vbc_icms": item.vbc_icms,
            "aliq_icms": item.p_icms,
            "vicms": item.vicms,
            "vbc_icms_st": item.vbc_icms_st,
            "vicms_st": item.vicms_st,
            "cst_ipi": item.cst_ipi,
            "vipi": item.vipi,
            "cst_pis": item.cst_pis,
            "vpis": item.vpis,
            "cst_cofins": item.cst_cofins,
            "vcofins": item.vcofins,
            "pfcp": item.pfcp,
            "vfcp": item.vfcp,
            "vfcp_st": item.vfcp_st,
            "vfcp_uf_dest": item.vfcp_uf_dest,
            "vbc_uf_dest": item.vbc_uf_dest,
            "vicms_uf_dest": item.vicms_uf_dest,
            "picms_inter": item.picms_inter,
            "picms_uf_dest": item.picms_uf_dest,
        })
        if item.cprod:
            gravacao.upsert_produto(
                con, empresa, competencia, "xml",
                codigo=item.cprod, descricao=item.xprod,
                ncm=item.ncm, unidade=item.unidade,
            )


def _gravar_cte(
    con: sqlite3.Connection, cte: xml_cte.Cte, arquivo: Path, empresa: str, competencia: str
) -> None:
    gravacao.inserir_documento(con, {
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "origem": "xml",
        "tipo": "cte",
        "chave": cte.chave,
        "modelo": cte.modelo,
        "serie": cte.serie,
        "numero": cte.numero,
        "data_emissao": cte.data_emissao,
        "situacao": cte.situacao,
        "tomador": cte.tomador,
        "emitente_cnpj": cte.emitente_cnpj,
        "emitente_nome": cte.emitente_nome,
        "emitente_uf": cte.emitente_uf,
        "destinatario_cnpj": cte.destinatario_cnpj,
        "destinatario_nome": cte.destinatario_nome,
        "destinatario_uf": cte.destinatario_uf,
        "valor_total": cte.valor_prestacao,
        "vbc_icms": cte.vbc_icms,
        "vicms": cte.vicms,
        "chaves_referenciadas": json.dumps(cte.chaves_nfe) if cte.chaves_nfe else None,
        "arquivo_origem": str(arquivo),
    })


def _gravar_cfe(
    con: sqlite3.Connection, cfe: xml_cfe.Cfe, arquivo: Path, empresa: str, competencia: str
) -> None:
    doc_id = gravacao.inserir_documento(con, {
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "origem": "xml",
        "tipo": "cfe",
        "chave": cfe.chave,
        "modelo": cfe.modelo,
        "serie": cfe.serie_sat,
        "numero": cfe.numero,
        "data_emissao": cfe.data_emissao,
        "situacao": cfe.situacao,
        "emitente_cnpj": cfe.emitente_cnpj,
        "emitente_nome": cfe.emitente_nome,
        "valor_total": cfe.valor_total,
        "valor_produtos": cfe.valor_produtos,
        "valor_desconto": cfe.valor_desconto,
        "vicms": cfe.vicms,
        "vpis": cfe.vpis,
        "vcofins": cfe.vcofins,
        "arquivo_origem": str(arquivo),
    })
    for item in cfe.itens:
        gravacao.inserir_item(con, {
            "documento_id": doc_id,
            "n_item": item.n_item,
            "codigo_produto": item.cprod,
            "descricao": item.xprod,
            "ncm": item.ncm,
            "cfop": item.cfop,
            "unidade": item.unidade,
            "quantidade": item.quantidade,
            "valor_unitario": item.valor_unitario,
            "valor_produto": item.vprod,
            "cst_icms": item.cst_icms,
            "vicms": item.vicms,
        })


def _aplicar_cancelamentos(con: sqlite3.Connection, empresa: str, competencia: str) -> None:
    """Marca como cancelados os documentos XML com evento de cancelamento registrado."""
    con.execute(
        """UPDATE documentos SET situacao = 'cancelada'
           WHERE origem = 'xml' AND empresa_cnpj = ? AND competencia = ?
             AND chave IN (
               SELECT chave_documento FROM eventos
               WHERE tipo_evento = ? AND empresa_cnpj = ? AND competencia = ?
             )""",
        (empresa, competencia, xml_nfe.TP_EVENTO_CANCELAMENTO, empresa, competencia),
    )
