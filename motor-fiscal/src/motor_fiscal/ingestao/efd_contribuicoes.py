"""Ingestao da EFD-Contribuicoes (PIS/COFINS) para o SQLite.

Registros tipados: 0000, A100, A170, C100, C170, C180, C190 (layout proprio
da Contribuicoes), F100, F600, M100, M105, M200, M210, M500, M505, M600, M610
e 9900. Todos os registros vao crus para ``registros_efd``.
"""

from __future__ import annotations

import os
import sqlite3

from motor_fiscal.ingestao import gravacao, sped
from motor_fiscal.ingestao.efd_icms_ipi import MODELO_TIPO, SITUACAO

ARQUIVO = "efd_contribuicoes"

LAYOUTS: dict[str, list[str]] = {
    "0000": ["COD_VER", "TIPO_ESCRIT", "IND_SIT_ESP", "NUM_REC_ANTERIOR", "DT_INI",
             "DT_FIN", "NOME", "CNPJ", "UF", "COD_MUN", "SUFRAMA", "IND_NAT_PJ", "IND_ATIV"],
    "A100": ["IND_OPER", "IND_EMIT", "COD_PART", "COD_SIT", "SER", "SUB", "NUM_DOC",
             "CHV_NFSE", "DT_DOC", "DT_EXE_SERV", "VL_DOC", "IND_PGTO", "VL_DESC",
             "VL_BC_PIS", "VL_PIS", "VL_BC_COFINS", "VL_COFINS", "VL_PIS_RET",
             "VL_COFINS_RET", "VL_ISS"],
    "A170": ["NUM_ITEM", "COD_ITEM", "DESCR_COMPL", "VL_ITEM", "VL_DESC",
             "NAT_BC_CRED", "IND_ORIG_CRED", "CST_PIS", "VL_BC_PIS", "ALIQ_PIS",
             "VL_PIS", "CST_COFINS", "VL_BC_COFINS", "ALIQ_COFINS", "VL_COFINS",
             "COD_CTA", "COD_CCUS"],
    # C100/C170 da Contribuicoes seguem o mesmo desenho de campos da EFD ICMS/IPI.
    "C100": ["IND_OPER", "IND_EMIT", "COD_PART", "COD_MOD", "COD_SIT", "SER", "NUM_DOC",
             "CHV_NFE", "DT_DOC", "DT_E_S", "VL_DOC", "IND_PGTO", "VL_DESC", "VL_ABAT_NT",
             "VL_MERC", "IND_FRT", "VL_FRT", "VL_SEG", "VL_OUT_DA", "VL_BC_ICMS", "VL_ICMS",
             "VL_BC_ICMS_ST", "VL_ICMS_ST", "VL_IPI", "VL_PIS", "VL_COFINS",
             "VL_PIS_ST", "VL_COFINS_ST"],
    "C170": ["NUM_ITEM", "COD_ITEM", "DESCR_COMPL", "QTD", "UNID", "VL_ITEM", "VL_DESC",
             "IND_MOV", "CST_ICMS", "CFOP", "COD_NAT", "VL_BC_ICMS", "ALIQ_ICMS", "VL_ICMS",
             "VL_BC_ICMS_ST", "ALIQ_ST", "VL_ICMS_ST", "IND_APUR", "CST_IPI", "COD_ENQ",
             "VL_BC_IPI", "ALIQ_IPI", "VL_IPI", "CST_PIS", "VL_BC_PIS", "ALIQ_PIS",
             "QUANT_BC_PIS", "ALIQ_PIS_QUANT", "VL_PIS", "CST_COFINS", "VL_BC_COFINS",
             "ALIQ_COFINS", "QUANT_BC_COFINS", "ALIQ_COFINS_QUANT", "VL_COFINS",
             "COD_CTA", "VL_ABAT_NT"],
    "C180": ["COD_MOD", "DT_DOC_INI", "DT_DOC_FIN", "COD_ITEM", "COD_NCM", "EX_IPI",
             "VL_TOT_ITEM"],
    "C190": ["COD_MOD", "DT_REF_INI", "DT_REF_FIN", "COD_ITEM", "COD_NCM", "EX_IPI",
             "VL_TOT_ITEM"],
    "F100": ["IND_OPER", "COD_PART", "COD_ITEM", "DT_OPER", "VL_OPER", "CST_PIS",
             "VL_BC_PIS", "ALIQ_PIS", "VL_PIS", "CST_COFINS", "VL_BC_COFINS",
             "ALIQ_COFINS", "VL_COFINS", "NAT_BC_CRED", "IND_ORIG_CRED", "COD_CTA",
             "COD_CCUS", "DESC_DOC_OPER"],
    "F600": ["IND_NAT_RET", "DT_RET", "VL_BC_RET", "VL_RET", "COD_REC", "IND_NAT_REC",
             "CNPJ", "VL_RET_PIS", "VL_RET_COFINS", "IND_DEC"],
    "M100": ["COD_CRED", "IND_CRED_ORI", "VL_BC_PIS", "ALIQ_PIS", "QUANT_BC_PIS",
             "ALIQ_PIS_QUANT", "VL_CRED", "VL_AJUS_ACRES", "VL_AJUS_REDUC",
             "VL_CRED_DIF", "VL_CRED_DISP", "IND_DESC_CRED", "VL_CRED_DESC", "SLD_CRED"],
    "M105": ["NAT_BC_CRED", "CST_PIS", "VL_BC_PIS_TOT", "VL_BC_PIS_CUM", "VL_BC_PIS_NC",
             "VL_BC_PIS", "QUANT_BC_PIS_TOT", "QUANT_BC_PIS", "DESC_CRED"],
    "M200": ["VL_TOT_CONT_NC_PER", "VL_TOT_CRED_DESC", "VL_TOT_CRED_DESC_ANT",
             "VL_TOT_CONT_NC_DEV", "VL_RET_NC", "VL_OUT_DED_NC", "VL_CONT_NC_REC",
             "VL_TOT_CONT_CUM_PER", "VL_RET_CUM", "VL_OUT_DED_CUM", "VL_CONT_CUM_REC",
             "VL_TOT_CONT_REC"],
    "M210": ["COD_CONT", "VL_REC_BRT", "VL_BC_CONT", "VL_AJUS_ACRES_BC_PIS",
             "VL_AJUS_REDUC_BC_PIS", "VL_BC_CONT_AJUS", "ALIQ_PIS", "QUANT_BC_PIS",
             "ALIQ_PIS_QUANT", "VL_CONT_APUR", "VL_AJUS_ACRES", "VL_AJUS_REDUC",
             "VL_CONT_DIFER", "VL_CONT_DIFER_ANT", "VL_CONT_PER"],
    "M500": ["COD_CRED", "IND_CRED_ORI", "VL_BC_COFINS", "ALIQ_COFINS",
             "QUANT_BC_COFINS", "ALIQ_COFINS_QUANT", "VL_CRED", "VL_AJUS_ACRES",
             "VL_AJUS_REDUC", "VL_CRED_DIF", "VL_CRED_DISP", "IND_DESC_CRED",
             "VL_CRED_DESC", "SLD_CRED"],
    "M505": ["NAT_BC_CRED", "CST_COFINS", "VL_BC_COFINS_TOT", "VL_BC_COFINS_CUM",
             "VL_BC_COFINS_NC", "VL_BC_COFINS", "QUANT_BC_COFINS_TOT",
             "QUANT_BC_COFINS", "DESC_CRED"],
    "M600": ["VL_TOT_CONT_NC_PER", "VL_TOT_CRED_DESC", "VL_TOT_CRED_DESC_ANT",
             "VL_TOT_CONT_NC_DEV", "VL_RET_NC", "VL_OUT_DED_NC", "VL_CONT_NC_REC",
             "VL_TOT_CONT_CUM_PER", "VL_RET_CUM", "VL_OUT_DED_CUM", "VL_CONT_CUM_REC",
             "VL_TOT_CONT_REC"],
    "M610": ["COD_CONT", "VL_REC_BRT", "VL_BC_CONT", "VL_AJUS_ACRES_BC_COFINS",
             "VL_AJUS_REDUC_BC_COFINS", "VL_BC_CONT_AJUS", "ALIQ_COFINS",
             "QUANT_BC_COFINS", "ALIQ_COFINS_QUANT", "VL_CONT_APUR", "VL_AJUS_ACRES",
             "VL_AJUS_REDUC", "VL_CONT_DIFER", "VL_CONT_DIFER_ANT", "VL_CONT_PER"],
    "9900": ["REG_BLC", "QTD_REG_BLC"],
}

ESTRUTURAIS = {
    "0001", "0110", "0140", "0990", "A001", "A990", "C001", "C990", "D001", "D990",
    "F001", "F990", "I001", "I990", "M001", "M990", "P001", "P990", "1001", "1990",
    "9001", "9990", "9999",
}

CONHECIDOS = set(LAYOUTS) | ESTRUTURAIS

# Registro do bloco M -> (tributo, campo de valor a recolher/apurado)
APURACOES = {
    "M100": ("pis", None),
    "M105": ("pis", None),
    "M200": ("pis", "VL_TOT_CONT_REC"),
    "M210": ("pis", "VL_CONT_PER"),
    "M500": ("cofins", None),
    "M505": ("cofins", None),
    "M600": ("cofins", "VL_TOT_CONT_REC"),
    "M610": ("cofins", "VL_CONT_PER"),
}


def importar(
    con: sqlite3.Connection,
    caminho: str | os.PathLike,
    empresa: str,
    competencia: str,
) -> dict:
    """Importa um arquivo EFD-Contribuicoes para o banco. Retorna resumo."""
    resultado = sped.parse_arquivo(caminho, registros_conhecidos=CONHECIDOS)
    arquivo_nome = sped.caminho_str(caminho)

    doc_atual: int | None = None
    reg_pai: dict[str, int | None] = {}

    for reg in resultado.registros:
        dados = sped.tipificar(reg, LAYOUTS[reg.registro]) if reg.registro in LAYOUTS else None

        pai_id = None
        if reg.registro == "A170":
            pai_id = reg_pai.get("A100")
        elif reg.registro == "C170":
            pai_id = reg_pai.get("C100")
        elif reg.registro == "M105":
            pai_id = reg_pai.get("M100")
        elif reg.registro == "M210":
            pai_id = reg_pai.get("M200")
        elif reg.registro == "M505":
            pai_id = reg_pai.get("M500")
        elif reg.registro == "M610":
            pai_id = reg_pai.get("M600")

        reg_id = gravacao.inserir_registro_efd(
            con, empresa, competencia, ARQUIVO, reg, dados, pai_id
        )
        reg_pai[reg.registro] = reg_id

        if dados is None:
            continue

        if reg.registro == "A100":
            doc_atual = _inserir_documento_a100(con, empresa, competencia, dados, arquivo_nome)
        elif reg.registro == "A170" and doc_atual is not None:
            _inserir_item_a170(con, doc_atual, dados)
        elif reg.registro == "C100":
            doc_atual = _inserir_documento_c100(con, empresa, competencia, dados, arquivo_nome)
        elif reg.registro == "C170" and doc_atual is not None:
            _inserir_item_c170(con, doc_atual, dados)
        elif reg.registro in APURACOES:
            tributo, campo_valor = APURACOES[reg.registro]
            gravacao.inserir_apuracao(
                con, empresa, competencia, ARQUIVO, tributo, reg.registro, dados,
                valor_recolher=sped.numero(dados.get(campo_valor)) if campo_valor else None,
            )

    con.commit()
    return {
        "arquivo": arquivo_nome,
        "total_linhas": resultado.total_linhas,
        "registros": dict(resultado.contagem),
        "nao_tipados": dict(resultado.desconhecidos),
        "avisos": resultado.avisos,
    }


def _inserir_documento_a100(
    con: sqlite3.Connection, empresa: str, competencia: str, d: dict, arquivo_nome: str
) -> int:
    return gravacao.inserir_documento(con, {
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "origem": ARQUIVO,
        "tipo": "nfse",
        "chave": d["CHV_NFSE"] or None,
        "serie": d["SER"] or None,
        "numero": d["NUM_DOC"] or None,
        "ind_operacao": d["IND_OPER"],
        "ind_emitente": d["IND_EMIT"],
        "data_emissao": sped.data_iso(d["DT_DOC"]),
        "data_entrada_saida": sped.data_iso(d["DT_EXE_SERV"]),
        "situacao": SITUACAO.get(d["COD_SIT"], d["COD_SIT"]),
        "participante_codigo": d["COD_PART"] or None,
        "valor_total": sped.numero(d["VL_DOC"]),
        "valor_desconto": sped.numero(d["VL_DESC"]),
        "vpis": sped.numero(d["VL_PIS"]),
        "vcofins": sped.numero(d["VL_COFINS"]),
        "arquivo_origem": arquivo_nome,
    })


def _inserir_item_a170(con: sqlite3.Connection, documento_id: int, d: dict) -> int:
    return gravacao.inserir_item(con, {
        "documento_id": documento_id,
        "n_item": int(d["NUM_ITEM"]) if d["NUM_ITEM"].isdigit() else None,
        "codigo_produto": d["COD_ITEM"] or None,
        "descricao": d["DESCR_COMPL"] or None,
        "valor_produto": sped.numero(d["VL_ITEM"]),
        "valor_desconto": sped.numero(d["VL_DESC"]),
        "cst_pis": d["CST_PIS"] or None,
        "vbc_pis": sped.numero(d["VL_BC_PIS"]),
        "aliq_pis": sped.numero(d["ALIQ_PIS"]),
        "vpis": sped.numero(d["VL_PIS"]),
        "cst_cofins": d["CST_COFINS"] or None,
        "vbc_cofins": sped.numero(d["VL_BC_COFINS"]),
        "aliq_cofins": sped.numero(d["ALIQ_COFINS"]),
        "vcofins": sped.numero(d["VL_COFINS"]),
    })


def _inserir_documento_c100(
    con: sqlite3.Connection, empresa: str, competencia: str, d: dict, arquivo_nome: str
) -> int:
    return gravacao.inserir_documento(con, {
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "origem": ARQUIVO,
        "tipo": MODELO_TIPO.get(d["COD_MOD"], f"mod_{d['COD_MOD']}"),
        "chave": d["CHV_NFE"] or None,
        "modelo": d["COD_MOD"],
        "serie": d["SER"] or None,
        "numero": d["NUM_DOC"] or None,
        "ind_operacao": d["IND_OPER"],
        "ind_emitente": d["IND_EMIT"],
        "data_emissao": sped.data_iso(d["DT_DOC"]),
        "data_entrada_saida": sped.data_iso(d["DT_E_S"]),
        "situacao": SITUACAO.get(d["COD_SIT"], d["COD_SIT"]),
        "participante_codigo": d["COD_PART"] or None,
        "valor_total": sped.numero(d["VL_DOC"]),
        "valor_produtos": sped.numero(d["VL_MERC"]),
        "valor_desconto": sped.numero(d["VL_DESC"]),
        "valor_frete": sped.numero(d["VL_FRT"]),
        "vbc_icms": sped.numero(d["VL_BC_ICMS"]),
        "vicms": sped.numero(d["VL_ICMS"]),
        "vbc_icms_st": sped.numero(d["VL_BC_ICMS_ST"]),
        "vicms_st": sped.numero(d["VL_ICMS_ST"]),
        "vipi": sped.numero(d["VL_IPI"]),
        "vpis": sped.numero(d["VL_PIS"]),
        "vcofins": sped.numero(d["VL_COFINS"]),
        "arquivo_origem": arquivo_nome,
    })


def _inserir_item_c170(con: sqlite3.Connection, documento_id: int, d: dict) -> int:
    qtd = sped.numero(d["QTD"])
    vl_item = sped.numero(d["VL_ITEM"])
    return gravacao.inserir_item(con, {
        "documento_id": documento_id,
        "n_item": int(d["NUM_ITEM"]) if d["NUM_ITEM"].isdigit() else None,
        "codigo_produto": d["COD_ITEM"] or None,
        "descricao": d["DESCR_COMPL"] or None,
        "cfop": d["CFOP"] or None,
        "unidade": d["UNID"] or None,
        "quantidade": qtd,
        "valor_unitario": (vl_item / qtd) if (vl_item is not None and qtd) else None,
        "valor_produto": vl_item,
        "valor_desconto": sped.numero(d["VL_DESC"]),
        "cst_icms": d["CST_ICMS"] or None,
        "vbc_icms": sped.numero(d["VL_BC_ICMS"]),
        "aliq_icms": sped.numero(d["ALIQ_ICMS"]),
        "vicms": sped.numero(d["VL_ICMS"]),
        "cst_pis": d["CST_PIS"] or None,
        "vbc_pis": sped.numero(d["VL_BC_PIS"]),
        "aliq_pis": sped.numero(d["ALIQ_PIS"]),
        "vpis": sped.numero(d["VL_PIS"]),
        "cst_cofins": d["CST_COFINS"] or None,
        "vbc_cofins": sped.numero(d["VL_BC_COFINS"]),
        "aliq_cofins": sped.numero(d["ALIQ_COFINS"]),
        "vcofins": sped.numero(d["VL_COFINS"]),
    })
