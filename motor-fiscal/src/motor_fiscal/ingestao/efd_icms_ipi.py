"""Ingestao da EFD ICMS/IPI (Guia Pratico) para o SQLite.

Registros tipados: 0000, 0150, 0190, 0200, C100, C170, C190, C191, C590, D100,
D190, D590, E100, E110, E111, E116, E200, E210, E300, E310, E500, E510, E520,
E530, G110, H005, H010, K100, K200, 1300-1370 e 9900. Todos os registros
(tipados ou nao) vao crus para ``registros_efd``; os nao tipados sao contabilizados.
"""

from __future__ import annotations

import os
import sqlite3

from motor_fiscal.ingestao import gravacao, sped

ARQUIVO = "efd_icms_ipi"

# Layouts (nomes de campos apos o REG), conforme Guia Pratico da EFD ICMS/IPI.
LAYOUTS: dict[str, list[str]] = {
    "0000": ["COD_VER", "COD_FIN", "DT_INI", "DT_FIN", "NOME", "CNPJ", "CPF", "UF",
             "IE", "COD_MUN", "IM", "SUFRAMA", "IND_PERFIL", "IND_ATIV"],
    "0150": ["COD_PART", "NOME", "COD_PAIS", "CNPJ", "CPF", "IE", "COD_MUN",
             "SUFRAMA", "END", "NUM", "COMPL", "BAIRRO"],
    "0190": ["UNID", "DESCR"],
    "0200": ["COD_ITEM", "DESCR_ITEM", "COD_BARRA", "COD_ANT_ITEM", "UNID_INV",
             "TIPO_ITEM", "COD_NCM", "EX_IPI", "COD_GEN", "COD_LST", "ALIQ_ICMS", "CEST"],
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
    "C190": ["CST_ICMS", "CFOP", "ALIQ_ICMS", "VL_OPR", "VL_BC_ICMS", "VL_ICMS",
             "VL_BC_ICMS_ST", "VL_ICMS_ST", "VL_RED_BC", "VL_IPI", "COD_OBS"],
    "C191": ["VL_FCP_OP", "VL_FCP_ST", "VL_FCP_RET"],
    "C590": ["CST_ICMS", "CFOP", "ALIQ_ICMS", "VL_OPR", "VL_BC_ICMS", "VL_ICMS",
             "VL_BC_ICMS_ST", "VL_ICMS_ST", "VL_RED_BC", "COD_OBS"],
    "D100": ["IND_OPER", "IND_EMIT", "COD_PART", "COD_MOD", "COD_SIT", "SER", "SUB",
             "NUM_DOC", "CHV_CTE", "DT_DOC", "DT_A_P", "TP_CTE", "CHV_CTE_REF", "VL_DOC",
             "VL_DESC", "IND_FRT", "VL_SERV", "VL_BC_ICMS", "VL_ICMS", "VL_NT",
             "COD_INF", "COD_CTA", "COD_MUN_ORIG", "COD_MUN_DEST"],
    "D190": ["CST_ICMS", "CFOP", "ALIQ_ICMS", "VL_OPR", "VL_BC_ICMS", "VL_ICMS",
             "VL_RED_BC", "COD_OBS"],
    "D590": ["CST_ICMS", "CFOP", "ALIQ_ICMS", "VL_OPR", "VL_BC_ICMS", "VL_ICMS",
             "VL_BC_ICMS_ST", "VL_ICMS_ST", "VL_RED_BC", "COD_OBS"],
    "E100": ["DT_INI", "DT_FIN"],
    "E110": ["VL_TOT_DEBITOS", "VL_AJ_DEBITOS", "VL_TOT_AJ_DEBITOS", "VL_ESTORNOS_CRED",
             "VL_TOT_CREDITOS", "VL_AJ_CREDITOS", "VL_TOT_AJ_CREDITOS", "VL_ESTORNOS_DEB",
             "VL_SLD_CREDOR_ANT", "VL_SLD_APURADO", "VL_TOT_DED", "VL_ICMS_RECOLHER",
             "VL_SLD_CREDOR_TRANSPORTAR", "DEB_ESP"],
    "E111": ["COD_AJ_APUR", "DESCR_COMPL_AJ", "VL_AJ_APUR"],
    "E116": ["COD_OR", "VL_OR", "DT_VCTO", "COD_REC", "NUM_PROC", "IND_PROC", "PROC",
             "TXT_COMPL", "MES_REF"],
    "E200": ["UF", "DT_INI", "DT_FIN"],
    "E210": ["IND_MOV_ST", "VL_SLD_CRED_ANT_ST", "VL_DEVOL_ST", "VL_RESSARC_ST",
             "VL_OUT_CRED_ST", "VL_AJ_CREDITOS_ST", "VL_RETENCAO_ST", "VL_OUT_DEB_ST",
             "VL_AJ_DEBITOS_ST", "VL_SLD_DEV_ANT_ST", "VL_DEDUCOES_ST",
             "VL_ICMS_RECOL_ST", "VL_SLD_CRED_ST_TRANSPORTAR", "DEB_ESP_ST"],
    "E300": ["UF", "DT_INI", "DT_FIN"],
    "E310": ["IND_MOV_FCP_DIFAL", "VL_SLD_CRED_ANT_DIFAL", "VL_TOT_DEBITOS_DIFAL",
             "VL_OUT_DEB_DIFAL", "VL_TOT_CREDITOS_DIFAL", "VL_OUT_CRED_DIFAL",
             "VL_SLD_DEV_ANT_DIFAL", "VL_DEDUCOES_DIFAL", "VL_RECOL_DIFAL",
             "VL_SLD_CRED_TRANSPORTAR_DIFAL", "DEB_ESP_DIFAL", "VL_SLD_CRED_ANT_FCP",
             "VL_TOT_DEB_FCP", "VL_OUT_DEB_FCP", "VL_TOT_CRED_FCP", "VL_OUT_CRED_FCP",
             "VL_SLD_DEV_ANT_FCP", "VL_DEDUCOES_FCP", "VL_RECOL_FCP",
             "VL_SLD_CRED_TRANSPORTAR_FCP", "DEB_ESP_FCP"],
    "E500": ["IND_APUR", "DT_INI", "DT_FIN"],
    "E510": ["CFOP", "CST_IPI", "VL_CONT_IPI", "VL_BC_IPI", "VL_IPI"],
    "E520": ["VL_SD_ANT_IPI", "VL_DEB_IPI", "VL_CRED_IPI", "VL_OD_IPI", "VL_OC_IPI",
             "VL_SC_IPI", "VL_SD_IPI"],
    "E530": ["IND_AJ", "VL_AJ", "COD_AJ", "IND_DOC", "NUM_DOC", "DESCR_AJ"],
    "G110": ["DT_INI", "DT_FIN", "SALDO_IN_ICMS", "SOM_PARC", "VL_TRIB_EXP",
             "VL_TOTAL", "IND_PER_SAI", "ICMS_APROP", "SOM_ICMS_OC"],
    "H005": ["DT_INV", "VL_INV", "MOT_INV"],
    "H010": ["COD_ITEM", "UNID", "QTD", "VL_UNIT", "VL_ITEM", "IND_PROP", "COD_PART",
             "TXT_COMPL", "COD_CTA", "VL_ITEM_IR"],
    "K100": ["DT_INI", "DT_FIN"],
    "K200": ["DT_EST", "COD_ITEM", "QTD", "IND_EST", "COD_PART"],
    "1300": ["COD_ITEM", "DT_FECH", "ESTQ_ABERT", "VOL_ENTR", "VOL_DISP", "VOL_SAIDAS",
             "ESTQ_ESCR", "VAL_AJ_PERDA", "VAL_AJ_GANHO", "FECH_FISICO"],
    "1310": ["NUM_TANQUE", "ESTQ_ABERT", "VOL_ENTR", "VOL_DISP", "VOL_SAIDAS",
             "ESTQ_ESCR", "VAL_AJ_PERDA", "VAL_AJ_GANHO", "FECH_FISICO"],
    "1320": ["NUM_BICO", "NR_INTERV", "MOT_INTERV", "NOM_INTERV", "CNPJ_INTERV",
             "CPF_INTERV", "VAL_FECHA", "VAL_ABERT", "VOL_AFERI", "VOL_VENDAS"],
    "1350": ["SERIE", "FABRICANTE", "MODELO", "TIPO_MEDICAO"],
    "1360": ["NUM_LACRE", "DT_APLICACAO"],
    "1370": ["NUM_BICO", "COD_ITEM", "NUM_TANQUE"],
    "9900": ["REG_BLC", "QTD_REG_BLC"],
}

# Registros estruturais (abertura/fechamento de bloco): conhecidos, gravados crus.
ESTRUTURAIS = {
    "0001", "0990", "B001", "B990", "C001", "C990", "D001", "D990", "E001", "E990",
    "G001", "G990", "H001", "H990", "K001", "K990", "1001", "1010", "1990",
    "9001", "9990", "9999",
}

CONHECIDOS = set(LAYOUTS) | ESTRUTURAIS

MODELO_TIPO = {"55": "nfe", "65": "nfce", "57": "cte", "59": "cfe", "01": "nf", "2D": "cupom"}

SITUACAO = {
    "00": "regular", "01": "regular", "02": "cancelada", "03": "cancelada",
    "04": "denegada", "05": "inutilizada", "06": "regular", "07": "regular", "08": "regular",
}

# Registros do bloco E/G que alimentam a tabela apuracoes: registro -> (tributo, campo valor_recolher)
APURACOES = {
    "E110": ("icms", "VL_ICMS_RECOLHER"),
    "E111": ("icms", None),
    "E116": ("icms", "VL_OR"),
    "E210": ("icms_st", "VL_ICMS_RECOL_ST"),
    "E310": ("icms_difal_fcp", "VL_RECOL_DIFAL"),
    "E520": ("ipi", "VL_SD_IPI"),
    "E530": ("ipi", None),
    "G110": ("ciap", None),
}


def importar(
    con: sqlite3.Connection,
    caminho: str | os.PathLike,
    empresa: str,
    competencia: str,
) -> dict:
    """Importa um arquivo EFD ICMS/IPI para o banco. Retorna resumo da ingestao."""
    resultado = sped.parse_arquivo(caminho, registros_conhecidos=CONHECIDOS)
    arquivo_nome = sped.caminho_str(caminho)

    doc_atual: int | None = None          # id em documentos do C100/D100 corrente
    reg_pai: dict[str, int | None] = {}   # ultimo id por registro (hierarquia simplificada)
    uf_st: str | None = None              # UF do E200 corrente (para E210)
    uf_difal: str | None = None           # UF do E300 corrente (para E310)

    for reg in resultado.registros:
        dados = sped.tipificar(reg, LAYOUTS[reg.registro]) if reg.registro in LAYOUTS else None

        pai_id = None
        if reg.registro in {"C170", "C190"}:
            pai_id = reg_pai.get("C100")
        elif reg.registro == "C191":
            pai_id = reg_pai.get("C190")
        elif reg.registro == "D190":
            pai_id = reg_pai.get("D100")
        elif reg.registro in {"E110", "E111", "E116"}:
            pai_id = reg_pai.get("E100")
        elif reg.registro == "E210":
            pai_id = reg_pai.get("E200")
        elif reg.registro == "E310":
            pai_id = reg_pai.get("E300")
        elif reg.registro in {"E510", "E520", "E530"}:
            pai_id = reg_pai.get("E500")
        elif reg.registro == "H010":
            pai_id = reg_pai.get("H005")
        elif reg.registro == "K200":
            pai_id = reg_pai.get("K100")
        elif reg.registro in {"1310", "1370"}:
            pai_id = reg_pai.get("1300")
        elif reg.registro in {"1320"}:
            pai_id = reg_pai.get("1310")
        elif reg.registro in {"1350"}:
            pai_id = reg_pai.get("1320")
        elif reg.registro in {"1360"}:
            pai_id = reg_pai.get("1350")

        reg_id = gravacao.inserir_registro_efd(
            con, empresa, competencia, ARQUIVO, reg, dados, pai_id
        )
        reg_pai[reg.registro] = reg_id

        if dados is None:
            continue

        if reg.registro == "0200":
            gravacao.upsert_produto(
                con, empresa, competencia, "efd_0200",
                codigo=dados["COD_ITEM"], descricao=dados["DESCR_ITEM"],
                ncm=dados["COD_NCM"] or None, unidade=dados["UNID_INV"] or None,
                tipo_item=dados["TIPO_ITEM"] or None, cest=dados.get("CEST") or None,
                aliq_icms=sped.numero(dados["ALIQ_ICMS"]),
            )
        elif reg.registro == "C100":
            doc_atual = _inserir_documento_c100(con, empresa, competencia, dados, arquivo_nome)
        elif reg.registro == "C170" and doc_atual is not None:
            _inserir_item_c170(con, doc_atual, dados)
        elif reg.registro == "D100":
            doc_atual = _inserir_documento_d100(con, empresa, competencia, dados, arquivo_nome)
        elif reg.registro == "E200":
            uf_st = dados["UF"] or None
        elif reg.registro == "E300":
            uf_difal = dados["UF"] or None
        elif reg.registro in APURACOES:
            tributo, campo_valor = APURACOES[reg.registro]
            uf = uf_st if reg.registro == "E210" else uf_difal if reg.registro == "E310" else None
            gravacao.inserir_apuracao(
                con, empresa, competencia, ARQUIVO, tributo, reg.registro, dados,
                uf=uf,
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


def _inserir_documento_d100(
    con: sqlite3.Connection, empresa: str, competencia: str, d: dict, arquivo_nome: str
) -> int:
    return gravacao.inserir_documento(con, {
        "empresa_cnpj": empresa,
        "competencia": competencia,
        "origem": ARQUIVO,
        "tipo": MODELO_TIPO.get(d["COD_MOD"], f"mod_{d['COD_MOD']}"),
        "chave": d["CHV_CTE"] or None,
        "modelo": d["COD_MOD"],
        "serie": d["SER"] or None,
        "numero": d["NUM_DOC"] or None,
        "ind_operacao": d["IND_OPER"],
        "ind_emitente": d["IND_EMIT"],
        "data_emissao": sped.data_iso(d["DT_DOC"]),
        "data_entrada_saida": sped.data_iso(d["DT_A_P"]),
        "situacao": SITUACAO.get(d["COD_SIT"], d["COD_SIT"]),
        "participante_codigo": d["COD_PART"] or None,
        "valor_total": sped.numero(d["VL_DOC"]),
        "valor_produtos": sped.numero(d["VL_SERV"]),
        "valor_desconto": sped.numero(d["VL_DESC"]),
        "vbc_icms": sped.numero(d["VL_BC_ICMS"]),
        "vicms": sped.numero(d["VL_ICMS"]),
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
        "vbc_icms_st": sped.numero(d["VL_BC_ICMS_ST"]),
        "aliq_icms_st": sped.numero(d["ALIQ_ST"]),
        "vicms_st": sped.numero(d["VL_ICMS_ST"]),
        "cst_ipi": d["CST_IPI"] or None,
        "vbc_ipi": sped.numero(d["VL_BC_IPI"]),
        "aliq_ipi": sped.numero(d["ALIQ_IPI"]),
        "vipi": sped.numero(d["VL_IPI"]),
        "cst_pis": d["CST_PIS"] or None,
        "vbc_pis": sped.numero(d["VL_BC_PIS"]),
        "aliq_pis": sped.numero(d["ALIQ_PIS"]),
        "vpis": sped.numero(d["VL_PIS"]),
        "cst_cofins": d["CST_COFINS"] or None,
        "vbc_cofins": sped.numero(d["VL_BC_COFINS"]),
        "aliq_cofins": sped.numero(d["ALIQ_COFINS"]),
        "vcofins": sped.numero(d["VL_COFINS"]),
    })
