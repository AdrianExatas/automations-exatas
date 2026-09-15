"""LMC: registros 1300-1370 x vendas CF-e/NFC-e x estoque K."""

from __future__ import annotations

import sqlite3
from collections import defaultdict

from motor_fiscal.auditoria.correlacao_produtos import mapa_de_para
from motor_fiscal.db import consultas
from motor_fiscal.util import achado, numero_ou_zero, resumir_achados


def auditar_lmc(
    con: sqlite3.Connection,
    empresa_cnpj: str,
    competencia: str,
) -> dict:
    r1300 = consultas.registros_efd_por_tipo(con, "1300", "efd_icms_ipi")
    r1310 = consultas.registros_efd_por_tipo(con, "1310", "efd_icms_ipi")
    r1320 = consultas.registros_efd_por_tipo(con, "1320", "efd_icms_ipi")
    r1350 = consultas.registros_efd_por_tipo(con, "1350", "efd_icms_ipi")
    r1360 = consultas.registros_efd_por_tipo(con, "1360", "efd_icms_ipi")
    r1370 = consultas.registros_efd_por_tipo(con, "1370", "efd_icms_ipi")
    k200 = {
        d.get("COD_ITEM"): numero_ou_zero(d.get("QTD"))
        for d in consultas.registros_efd_por_tipo(con, "K200", "efd_icms_ipi")
        if d.get("COD_ITEM")
    }

    de_para = mapa_de_para(con, empresa_cnpj)
    vendas = _vendas_combustivel(con, de_para)

    fechamentos = []
    achados: list[dict] = []

    for reg in r1300:
        cod = reg.get("COD_ITEM")
        dt = reg.get("DT_FECH")
        abert = numero_ou_zero(reg.get("ESTQ_ABERT"))
        entr = numero_ou_zero(reg.get("VOL_ENTR"))
        disp = numero_ou_zero(reg.get("VOL_DISP"))
        saidas = numero_ou_zero(reg.get("VOL_SAIDAS"))
        escr = numero_ou_zero(reg.get("ESTQ_ESCR"))
        perda = numero_ou_zero(reg.get("VAL_AJ_PERDA"))
        ganho = numero_ou_zero(reg.get("VAL_AJ_GANHO"))
        fisico = numero_ou_zero(reg.get("FECH_FISICO"))

        vol_disp_calc = abert + entr
        fech_calc = vol_disp_calc - saidas - perda + ganho

        vendas_dia = vendas.get((cod, _data_iso_sped(dt)), 0.0)
        # tambem aceita agregacao so por produto no dia (sem exigir match exato de data format)
        if vendas_dia == 0.0:
            vendas_dia = vendas.get((cod, dt), 0.0)

        item = {
            "codigo": cod,
            "dt_fech": dt,
            "estq_abert": abert,
            "vol_entr": entr,
            "vol_disp": disp,
            "vol_disp_calculado": round(vol_disp_calc, 6),
            "vol_saidas": saidas,
            "estq_escr": escr,
            "fech_fisico": fisico,
            "fech_calculado": round(fech_calc, 6),
            "vendas_cfe_nfce": round(vendas_dia, 6),
            "divergencia_vol_disp": round(disp - vol_disp_calc, 6),
            "divergencia_fechamento": round(fisico - fech_calc, 6) if fisico else round(escr - fech_calc, 6),
            "divergencia_vendas": round(saidas - vendas_dia, 6),
            "qtd_k200": k200.get(cod),
            "divergencia_k200": (
                None if cod not in k200 else round(escr - k200[cod], 6)
            ),
        }
        fechamentos.append(item)

        if abs(item["divergencia_vol_disp"]) > 0.02:
            achados.append(achado(
                "LMC_VOL_DISP_DIVERGENTE", "erro",
                f"LMC {cod} {dt}: VOL_DISP declarado diverge do calculado",
                **item,
            ))
        if abs(item["divergencia_fechamento"]) > 0.02:
            achados.append(achado(
                "LMC_FECHAMENTO_DIVERGENTE", "erro",
                f"LMC {cod} {dt}: fechamento fisico/escriturado diverge do calculado",
                **item,
            ))
        if vendas_dia > 0 and abs(item["divergencia_vendas"]) > 0.02:
            achados.append(achado(
                "LMC_VENDAS_DIVERGENTES", "erro",
                f"LMC {cod} {dt}: VOL_SAIDAS={saidas} x vendas CF-e/NFC-e={vendas_dia}",
                codigo=cod, dt_fech=dt, vol_saidas=saidas, vendas=vendas_dia,
            ))
        elif saidas > 0 and vendas_dia == 0:
            achados.append(achado(
                "LMC_SEM_VENDAS_XML", "aviso",
                f"LMC {cod} {dt}: ha VOL_SAIDAS sem vendas CF-e/NFC-e correlacionadas",
                codigo=cod, dt_fech=dt, vol_saidas=saidas,
            ))
        if item["divergencia_k200"] is not None and abs(item["divergencia_k200"]) > 0.02:
            achados.append(achado(
                "LMC_DIVERGENCIA_K200", "aviso",
                f"LMC {cod}: ESTQ_ESCR={escr} diverge de K200={k200.get(cod)}",
                codigo=cod, estq_escr=escr, k200=k200.get(cod),
            ))

    # Consistencia bicos/tanques (1370 referencia 1310/1320)
    bicos_1370 = {r.get("NUM_BICO") for r in r1370 if r.get("NUM_BICO")}
    # 1320 tem NUM_BICO
    bicos_1320 = {r.get("NUM_BICO") for r in r1320 if r.get("NUM_BICO")}
    for bico in sorted(bicos_1320 - bicos_1370):
        achados.append(achado(
            "LMC_BICO_SEM_CADASTRO", "aviso",
            f"Bico {bico} com movimento 1320 sem cadastro 1370",
            num_bico=bico,
        ))

    resumo = resumir_achados(achados)
    return {
        "modulo": "lmc",
        "empresa_cnpj": empresa_cnpj,
        "competencia": competencia,
        "registros": {
            "1300": len(r1300),
            "1310": len(r1310),
            "1320": len(r1320),
            "1350": len(r1350),
            "1360": len(r1360),
            "1370": len(r1370),
        },
        "fechamentos_diarios": fechamentos,
        "vendas_por_produto_dia": [
            {"codigo": k[0], "data": k[1], "quantidade": v}
            for k, v in sorted(vendas.items())
        ],
        "achados": achados,
        "resumo": resumo,
        "ok": resumo["erros"] == 0,
    }


def _vendas_combustivel(con: sqlite3.Connection, de_para: dict[str, str]) -> dict[tuple, float]:
    """Soma quantidades de itens de CF-e/NFC-e (e NFe saida combustivel) por produto/dia."""
    rows = con.execute(
        """SELECT i.codigo_produto, i.quantidade, d.data_emissao, d.tipo, d.origem, d.situacao
           FROM itens i
           JOIN documentos d ON d.id = i.documento_id
           WHERE d.tipo IN ('nfce', 'cfe')
             AND COALESCE(d.situacao, 'regular') NOT IN ('cancelada', 'inutilizada', 'denegada')
             AND i.codigo_produto IS NOT NULL"""
    ).fetchall()
    agg: dict[tuple, float] = defaultdict(float)
    for r in rows:
        cod = de_para.get(r["codigo_produto"], r["codigo_produto"])
        data = r["data_emissao"] or ""
        # chave tambem em DDMMAAAA para cruzar com DT_FECH do 1300
        data_sped = ""
        if len(data) >= 10 and data[4] == "-":
            data_sped = data[8:10] + data[5:7] + data[0:4]
        qtd = numero_ou_zero(r["quantidade"])
        agg[(cod, data)] += qtd
        if data_sped:
            agg[(cod, data_sped)] += qtd
    return dict(agg)


def _data_iso_sped(dt: str | None) -> str | None:
    if not dt or len(dt) != 8 or not dt.isdigit():
        return dt
    return f"{dt[4:8]}-{dt[2:4]}-{dt[0:2]}"
