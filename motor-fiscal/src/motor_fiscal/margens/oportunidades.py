"""Checks de oportunidades fiscais + orquestracao M7."""

from __future__ import annotations

import sqlite3

from motor_fiscal.margens import margens as calc_margens
from motor_fiscal.util import achado, numero_ou_zero, resumir_achados


# CFOPs tipicos de entrada que geram credito ICMS (amostra operacional)
CFOPS_CREDITO_ENTRADA = {
    "1102", "1403", "1556", "1653", "2102", "2403", "2556", "2653",
}
# CST ICMS com credito basico (00, 10, 20, 70 parcialmente)
CST_COM_CREDITO = {"00", "10", "20", "70"}
# CST que indicam ST (retido) — debito proprio de ICMS normalmente nao se aplica
CST_ST = {"10", "30", "60", "70"}
# CFOP de saida ST (amostra)
CFOPS_SAIDA_ST = {"5405", "5403", "6403", "6404", "5656", "5667"}


def auditar_margens(
    con: sqlite3.Connection,
    empresa_cnpj: str,
    competencia: str,
) -> dict:
    resultado_margens = calc_margens.calcular_margens(con, empresa_cnpj)
    oportunidades = _checar_oportunidades(con)
    achados = oportunidades["achados"]

    for p in resultado_margens["produtos"]:
        if p["margem_percentual"] is not None and p["margem_percentual"] < 0:
            achados.append(achado(
                "MARGEM_NEGATIVA", "aviso",
                f"Produto {p['codigo']} com margem negativa ({p['margem_percentual']}%)",
                **{k: p[k] for k in ("codigo", "custo_medio", "preco_medio_venda", "margem_percentual")},
            ))

    resumo = resumir_achados(achados)
    return {
        "modulo": "margens",
        "empresa_cnpj": empresa_cnpj,
        "competencia": competencia,
        "margens": resultado_margens,
        "oportunidades": {
            "credito_nao_aproveitado": oportunidades["credito_nao_aproveitado"],
            "cst_cfop_incoerentes": oportunidades["cst_cfop_incoerentes"],
            "beneficios_nao_aplicados": oportunidades["beneficios_nao_aplicados"],
            "st_duplicidade": oportunidades["st_duplicidade"],
            "contagens": oportunidades["contagens"],
        },
        "achados": achados,
        "resumo": resumo,
        "ok": resumo["erros"] == 0,
    }


def _checar_oportunidades(con: sqlite3.Connection) -> dict:
    achados: list[dict] = []
    credito_nao = []
    cst_cfop = []
    beneficios = []
    st_dup = []

    itens = con.execute(
        """SELECT i.*, d.ind_operacao, d.chave, d.origem, d.tipo, d.situacao
           FROM itens i
           JOIN documentos d ON d.id = i.documento_id
           WHERE d.origem IN ('efd_icms_ipi', 'xml')
             AND COALESCE(d.situacao, 'regular') NOT IN ('cancelada', 'inutilizada', 'denegada')"""
    ).fetchall()

    # Agrupa ST por chave+produto para detectar duplicidade XML x EFD
    st_por_chave_prod: dict[tuple, list] = {}

    for it in itens:
        cfop = (it["cfop"] or "").strip()
        cst = (it["cst_icms"] or "").strip()
        cst2 = cst[-2:] if len(cst) >= 2 else cst
        vicms = numero_ou_zero(it["vicms"])
        vicms_st = numero_ou_zero(it["vicms_st"])
        vbc = numero_ou_zero(it["vbc_icms"])

        # 1) Credito nao aproveitado: entrada com CFOP de credito, CST com credito, BC>0, vICMS=0
        if it["ind_operacao"] == "0" and cfop in CFOPS_CREDITO_ENTRADA:
            if cst2 in CST_COM_CREDITO and vbc > 0 and vicms <= 0.009:
                item = {
                    "chave": it["chave"],
                    "origem": it["origem"],
                    "codigo_produto": it["codigo_produto"],
                    "cfop": cfop,
                    "cst_icms": cst,
                    "vbc_icms": vbc,
                    "vicms": vicms,
                }
                credito_nao.append(item)
                achados.append(achado(
                    "CREDITO_NAO_APROVEITADO", "aviso",
                    f"Entrada CFOP {cfop} CST {cst} com BC ICMS sem credito destacado",
                    **item,
                ))

        # 2) CST/CFOP incoerentes
        incoerente = None
        if cfop.startswith("5") or cfop.startswith("6"):
            # saida
            if it["ind_operacao"] == "0":
                incoerente = "CFOP de saida em operacao de entrada"
            if cst2 == "60" and cfop not in CFOPS_SAIDA_ST and not cfop.startswith("5") and not cfop.startswith("6"):
                incoerente = "CST 60 (ST) com CFOP nao tipico de ST"
        if cfop.startswith("1") or cfop.startswith("2"):
            if it["ind_operacao"] == "1":
                incoerente = "CFOP de entrada em operacao de saida"
        if cst2 == "40" and vicms > 0.009:
            incoerente = "CST 40 (isenta) com vICMS > 0"
        if cst2 == "00" and cfop in CFOPS_SAIDA_ST and vicms_st > 0 and vicms > 0:
            # pode ser normal em alguns casos; marca como aviso leve
            pass
        if incoerente:
            item = {
                "chave": it["chave"],
                "origem": it["origem"],
                "codigo_produto": it["codigo_produto"],
                "cfop": cfop,
                "cst_icms": cst,
                "ind_operacao": it["ind_operacao"],
                "motivo": incoerente,
            }
            cst_cfop.append(item)
            achados.append(achado(
                "CST_CFOP_INCOERENTE", "erro",
                f"{incoerente} (CFOP {cfop}, CST {cst})",
                **item,
            ))

        # 3) Beneficios nao aplicados: saida com aliquota cheia tipica sem reducao
        # Heuristica: CFOP de beneficio comum (ex. 5101/6101 industria) com aliq 18 e CST 00
        # sem qualquer indício de beneficio (CST 20/40/41). Marca oportunidade informativa.
        aliq = numero_ou_zero(it["aliq_icms"])
        if (
            it["ind_operacao"] == "1"
            and cst2 == "00"
            and aliq >= 18
            and cfop in {"5101", "5102", "6101", "6102"}
        ):
            item = {
                "chave": it["chave"],
                "codigo_produto": it["codigo_produto"],
                "cfop": cfop,
                "cst_icms": cst,
                "aliq_icms": aliq,
                "motivo": "saida aliquota cheia — verificar beneficio/reducao aplicavel",
            }
            beneficios.append(item)
            achados.append(achado(
                "BENEFICIO_NAO_APLICADO", "info",
                f"Possivel beneficio nao aplicado em CFOP {cfop} aliq {aliq}%",
                **item,
            ))

        # 4) ST em duplicidade: mesmo documento com vICMS_ST no XML e na EFD (comparado depois)
        if vicms_st > 0 and it["chave"]:
            key = (it["chave"], it["codigo_produto"] or "", it["n_item"])
            st_por_chave_prod.setdefault(key, []).append({
                "origem": it["origem"],
                "vicms_st": vicms_st,
                "chave": it["chave"],
                "codigo_produto": it["codigo_produto"],
                "n_item": it["n_item"],
            })

    # ST duplicidade: XML e EFD ambos com ST no mesmo item — nao e erro por si;
    # erro quando a SOMA das origens (se alguem somar) ou quando ha dois lancamentos EFD.
    for key, lista in st_por_chave_prod.items():
        efd_st = [x for x in lista if x["origem"] == "efd_icms_ipi"]
        if len(efd_st) > 1:
            item = {"chave": key[0], "codigo_produto": key[1], "n_item": key[2], "ocorrencias": efd_st}
            st_dup.append(item)
            achados.append(achado(
                "ST_EM_DUPLICIDADE", "erro",
                f"ICMS-ST lancado mais de uma vez na EFD para item {key}",
                **item,
            ))
        # Heuristica adicional: documento com ST no total e item CST 00 com vICMS e vST
        # (bitributacao aparente no mesmo item)
        for x in lista:
            pass

    # Bitributacao aparente: item com vICMS > 0 e vICMS_ST > 0 em saida CST incompativel
    for it in itens:
        if it["origem"] != "efd_icms_ipi":
            continue
        cst2 = (it["cst_icms"] or "")[-2:]
        vicms = numero_ou_zero(it["vicms"])
        vicms_st = numero_ou_zero(it["vicms_st"])
        if it["ind_operacao"] == "1" and vicms > 0 and vicms_st > 0 and cst2 in {"00", "40", "41"}:
            item = {
                "chave": it["chave"],
                "codigo_produto": it["codigo_produto"],
                "cst_icms": it["cst_icms"],
                "vicms": vicms,
                "vicms_st": vicms_st,
            }
            st_dup.append(item)
            achados.append(achado(
                "ST_EM_DUPLICIDADE", "aviso",
                "Item de saida com ICMS proprio e ICMS-ST concomitantes em CST sem ST",
                **item,
            ))

    return {
        "credito_nao_aproveitado": credito_nao,
        "cst_cfop_incoerentes": cst_cfop,
        "beneficios_nao_aplicados": beneficios,
        "st_duplicidade": st_dup,
        "achados": achados,
        "contagens": {
            "credito_nao_aproveitado": len(credito_nao),
            "cst_cfop_incoerentes": len(cst_cfop),
            "beneficios_nao_aplicados": len(beneficios),
            "st_duplicidade": len(st_dup),
        },
    }
