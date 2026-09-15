"""Os 13 cruzamentos da conciliacao de ICMS."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from motor_fiscal.icms.bloco_e import recomputar_e110, recomputar_e210, recomputar_e310
from motor_fiscal.icms.ciap import recomputar_g110
from motor_fiscal.icms.livro import montar_livro, totais_energia_comunicacao, totais_icms_documentos
from motor_fiscal.util import arred, eh_igual, n

CRUZAMENTOS_NOMES = {
    1: "XML x escrituracao",
    2: "Total entradas x livro fiscal",
    3: "Total saidas x livro fiscal",
    4: "Debitos ICMS notas x apuracao",
    5: "Creditos ICMS notas x apuracao",
    6: "Ajustes x documentos comprobatorios",
    7: "CIAP x credito lancado",
    8: "ST x apuracao ST",
    9: "DIFAL x apuracao DIFAL",
    10: "FCP x apuracao FCP",
    11: "Saldo anterior x mes anterior",
    12: "Apuracao x EFD",
    13: "EFD x guia",
}


def _item(num: int, fecha: bool, **extra) -> dict:
    out = {
        "id": num,
        "nome": CRUZAMENTOS_NOMES[num],
        "fecha": fecha,
        "ok": fecha,
    }
    out.update(extra)
    return out


def carregar_guias(caminho: str | Path | None) -> dict | None:
    if not caminho:
        return None
    p = Path(caminho)
    if not p.is_file():
        return None
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def executar_cruzamentos(
    con: sqlite3.Connection,
    *,
    e110: dict | None = None,
    e210: list[dict] | None = None,
    e310: list[dict] | None = None,
    g110: dict | None = None,
    guias: dict | None = None,
    saldo_mes_anterior: float | None = None,
    fecoep: dict | None = None,
    config_uf: dict | None = None,
) -> list[dict]:
    """Executa os 13 cruzamentos; cada um retorna fecha=True/False."""
    livro = montar_livro(con)
    e110 = e110 or recomputar_e110(con)
    e210 = e210 if e210 is not None else recomputar_e210(con)
    e310 = e310 if e310 is not None else recomputar_e310(con)
    g110 = g110 or recomputar_g110(con)
    docs_efd = totais_icms_documentos(con, "efd_icms_ipi")
    resultado: list[dict] = []

    # 1 — XML x escrituracao (chaves)
    resultado.append(_cruzamento_xml_efd(con))

    # 2 — Total entradas x livro (C100/D100 + energia/comunicação C590/D590)
    energia = totais_energia_comunicacao(con)
    ent_doc = docs_efd.get("entrada", {})
    ent_extra = energia.get("entrada", {})
    valor_docs_ent = arred(ent_doc.get("valor_total", 0.0) + ent_extra.get("vl_opr", 0.0))
    vicms_docs_ent = arred(ent_doc.get("vicms", 0.0) + ent_extra.get("vl_icms", 0.0))
    fecha2 = eh_igual(valor_docs_ent, livro["totais_entradas"]["vl_opr"])
    # Frete D190 pode nao estar no valor_total do D100 da mesma forma — confere ICMS como apoio
    if not fecha2:
        fecha2 = eh_igual(vicms_docs_ent, livro["totais_entradas"]["vl_icms"])
    resultado.append(_item(
        2, fecha2,
        valor_documentos=valor_docs_ent,
        valor_livro=livro["totais_entradas"]["vl_opr"],
        vicms_documentos=vicms_docs_ent,
        vicms_livro=livro["totais_entradas"]["vl_icms"],
    ))

    # 3 — Total saidas x livro
    sai_doc = docs_efd.get("saida", {})
    sai_extra = energia.get("saida", {})
    valor_docs_sai = arred(sai_doc.get("valor_total", 0.0) + sai_extra.get("vl_opr", 0.0))
    vicms_docs_sai = arred(sai_doc.get("vicms", 0.0) + sai_extra.get("vl_icms", 0.0))
    fecha3 = eh_igual(valor_docs_sai, livro["totais_saidas"]["vl_opr"])
    if not fecha3:
        fecha3 = eh_igual(vicms_docs_sai, livro["totais_saidas"]["vl_icms"])
    resultado.append(_item(
        3, fecha3,
        valor_documentos=valor_docs_sai,
        valor_livro=livro["totais_saidas"]["vl_opr"],
        vicms_documentos=vicms_docs_sai,
        vicms_livro=livro["totais_saidas"]["vl_icms"],
    ))

    # 4 — Debitos ICMS notas x apuracao
    deb_notas = livro["totais_saidas"]["vl_icms"]
    deb_apur = e110["recomputado"]["VL_TOT_DEBITOS"]
    resultado.append(_item(4, eh_igual(deb_notas, deb_apur), notas=deb_notas, apuracao=deb_apur))

    # 5 — Creditos ICMS notas x apuracao
    cred_notas = livro["totais_entradas"]["vl_icms"]
    cred_apur = e110["recomputado"]["VL_TOT_CREDITOS"]
    resultado.append(_item(5, eh_igual(cred_notas, cred_apur), notas=cred_notas, apuracao=cred_apur))

    # 6 — Ajustes x documentos comprobatorios
    # Sem arquivo de comprovantes: confere soma E111 x campos E110 de ajustes
    aj = e110.get("ajustes_e111", {})
    soma_aj = arred(aj.get("vl_tot_aj_creditos", 0) + aj.get("vl_tot_aj_debitos", 0))
    e110_aj = arred(
        e110["recomputado"]["VL_TOT_AJ_CREDITOS"] + e110["recomputado"]["VL_TOT_AJ_DEBITOS"]
    )
    # Lista vazia = sem comprovantes informados (nao zerar o cruzamento).
    comprovantes = (guias or {}).get("ajustes") if guias else None
    if comprovantes:
        soma_comp = arred(sum(n(a.get("valor")) for a in comprovantes))
        fecha6 = eh_igual(soma_aj, soma_comp)
        resultado.append(_item(6, fecha6, ajustes_efd=soma_aj, comprovantes=soma_comp))
    else:
        fecha6 = eh_igual(soma_aj, e110_aj)
        resultado.append(_item(
            6, fecha6,
            ajustes_e111=soma_aj,
            e110_ajustes=e110_aj,
            observacao="sem lista de comprovantes; conferido E111 x E110",
        ))

    # 7 — CIAP x credito lancado
    cred_ciap = g110.get("credito_apropiado", 0.0)
    # Credito CIAP tipicamente em E111 ou ICMS_APROP; se G110 zerado, fecha
    if cred_ciap == 0 and g110.get("ok", True):
        resultado.append(_item(7, True, credito_ciap=0.0, observacao="CIAP zerado/sem movimento"))
    else:
        # procura ajuste E111 com natureza credito cuja descricao cite CIAP
        aj_ciap = sum(
            a["vl_aj_apur"]
            for a in aj.get("ajustes", [])
            if a["natureza"] == "credito"
            and "CIAP" in (a.get("descr_compl_aj") or "").upper()
        )
        fecha7 = eh_igual(cred_ciap, aj_ciap) or (cred_ciap == 0)
        resultado.append(_item(7, fecha7, credito_ciap=cred_ciap, ajuste_e111_ciap=arred(aj_ciap)))

    # 8 — ST x apuracao ST
    st_livro = arred(livro["totais_saidas"]["vl_icms_st"] + livro["totais_entradas"]["vl_icms_st"])
    st_apur = arred(sum(e["recomputado"].get("VL_RETENCAO_ST", 0) + e["recomputado"].get("VL_DEVOL_ST", 0) for e in e210))
    resultado.append(_item(8, eh_igual(st_livro, st_apur), st_livro=st_livro, st_apuracao=st_apur))

    # 9 — DIFAL x apuracao DIFAL
    difal_apur = arred(sum(e["recomputado"].get("VL_TOT_DEBITOS_DIFAL", 0) for e in e310))
    difal_decl = arred(sum(n(e["declarado"].get("VL_TOT_DEBITOS_DIFAL")) for e in e310 if e.get("declarado")))
    resultado.append(_item(
        9, eh_igual(difal_apur, difal_decl),
        recomputado=difal_apur, declarado=difal_decl,
    ))

    # 10 — FCP x apuracao FCP
    fcp_apur = arred(sum(e["recomputado"].get("VL_TOT_DEB_FCP", 0) for e in e310))
    fcp_decl = arred(sum(n(e["declarado"].get("VL_TOT_DEB_FCP")) for e in e310 if e.get("declarado")))
    resultado.append(_item(
        10, eh_igual(fcp_apur, fcp_decl),
        recomputado=fcp_apur, declarado=fcp_decl,
    ))

    # 11 — Saldo anterior x mes anterior
    sld_e110 = e110["recomputado"]["VL_SLD_CREDOR_ANT"]
    if saldo_mes_anterior is None:
        resultado.append(_item(
            11, True,
            saldo_e110=sld_e110,
            observacao="mes anterior indisponivel; aceito saldo declarado/recomputado",
            status="nao_aplicavel",
        ))
    else:
        resultado.append(_item(
            11, eh_igual(sld_e110, saldo_mes_anterior),
            saldo_e110=sld_e110, saldo_mes_anterior=saldo_mes_anterior,
        ))

    # 12 — Apuracao x EFD (E110 recompute x declarado)
    fecha12 = not e110.get("divergencias")
    resultado.append(_item(
        12, fecha12,
        divergencias=e110.get("divergencias", []),
        vl_icms_recolher_recomp=e110["recomputado"].get("VL_ICMS_RECOLHER"),
        vl_icms_recolher_efd=e110.get("declarado", {}).get("VL_ICMS_RECOLHER"),
    ))

    # 13 — EFD x guia (inclui FECOEP Normal/DIFAL quando houver)
    resultado.append(_cruzamento_efd_guia(con, e110, guias, fecoep=fecoep, config_uf=config_uf))

    return resultado


def _cruzamento_xml_efd(con: sqlite3.Connection) -> dict:
    xml = {
        r["chave"]
        for r in con.execute(
            """
            SELECT DISTINCT chave FROM documentos
            WHERE origem = 'xml' AND chave IS NOT NULL AND chave != ''
              AND (situacao IS NULL OR situacao NOT IN ('cancelada', 'denegada', 'inutilizada'))
            """
        )
    }
    efd = {
        r["chave"]
        for r in con.execute(
            """
            SELECT DISTINCT chave FROM documentos
            WHERE origem = 'efd_icms_ipi' AND chave IS NOT NULL AND chave != ''
              AND (situacao IS NULL OR situacao NOT IN ('cancelada', 'denegada', 'inutilizada'))
            """
        )
    }
    if not xml:
        return _item(1, True, observacao="sem XML para comparar", status="nao_aplicavel",
                     faltantes_na_efd=[], faltantes_no_xml=[])
    faltantes_efd = sorted(xml - efd)
    faltantes_xml = sorted(efd - xml)
    fecha = not faltantes_efd and not faltantes_xml
    return _item(
        1, fecha,
        qtd_xml=len(xml),
        qtd_efd=len(efd),
        faltantes_na_efd=faltantes_efd,
        faltantes_no_xml=faltantes_xml,
    )


def _cruzamento_efd_guia(
    con: sqlite3.Connection,
    e110: dict,
    guias: dict | None,
    *,
    fecoep: dict | None = None,
    config_uf: dict | None = None,
) -> dict:
    e116 = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = 'E116'
        ORDER BY numero_linha
        """
    ).fetchall()
    obrigacoes = []
    for row in e116:
        if not row["dados"]:
            continue
        d = json.loads(row["dados"])
        obrigacoes.append({
            "cod_or": d.get("COD_OR"),
            "cod_rec": d.get("COD_REC"),
            "vl_or": arred(n(d.get("VL_OR"))),
            "dt_vcto": d.get("DT_VCTO"),
            "txt_compl": d.get("TXT_COMPL"),
        })
    soma_efd = arred(sum(o["vl_or"] for o in obrigacoes))
    fecoep_cfg = (config_uf or {}).get("fecoep") or {}
    cod_rec_fecoep = str(fecoep_cfg.get("cod_rec_normal", "50059"))
    cod_rec_fecoep_difal = str(fecoep_cfg.get("cod_rec_difal", "50075"))
    cod_rec_icms = str(fecoep_cfg.get("cod_rec_icms", "13170"))
    cod_rec_icms_difal = str(fecoep_cfg.get("cod_rec_icms_difal", "15610"))

    def _vl_rec(mapa: dict[str, float], cod: str) -> float:
        return arred(mapa.get(cod, 0.0))

    por_rec_efd: dict[str, float] = {}
    for o in obrigacoes:
        cod = str(o.get("cod_rec") or "")
        por_rec_efd[cod] = arred(por_rec_efd.get(cod, 0.0) + o["vl_or"])

    itens_gate3 = [
        {
            "tributo": "icms",
            "nome": "ICMS Normal",
            "cod_rec": cod_rec_icms,
            "vl_efd": _vl_rec(por_rec_efd, cod_rec_icms),
            "vl_motor": e110["recomputado"].get("VL_ICMS_RECOLHER"),
        },
        {
            "tributo": "fecoep",
            "nome": "FECOEP Normal",
            "cod_rec": cod_rec_fecoep,
            "vl_efd": _vl_rec(por_rec_efd, cod_rec_fecoep),
            "vl_motor": (fecoep or {}).get("vl_fecoep_recolher"),
        },
        {
            "tributo": "icms_difal",
            "nome": "ICMS DIFAL",
            "cod_rec": cod_rec_icms_difal,
            "vl_efd": _vl_rec(por_rec_efd, cod_rec_icms_difal),
            "vl_motor": None,
        },
        {
            "tributo": "fecoep_difal",
            "nome": "FECOEP DIFAL",
            "cod_rec": cod_rec_fecoep_difal,
            "vl_efd": _vl_rec(por_rec_efd, cod_rec_fecoep_difal),
            "vl_motor": (fecoep or {}).get("vl_fecoep_difal_recolher"),
        },
    ]

    # Se VL_OR=0 e ha saldo credor, guia pode ser 0
    if guias is None:
        return _item(
            13, True,
            soma_efd=soma_efd,
            observacao="guias.json nao informado",
            status="nao_aplicavel",
            obrigacoes_efd=obrigacoes,
            itens_gate3=itens_gate3,
        )
    lista = guias.get("guias") or guias.get("obrigacoes") or []
    soma_guia = arred(sum(n(g.get("valor", g.get("valor_guia"))) for g in lista))
    # Conferencia por codigo de receita quando disponivel
    por_rec_guia: dict[str, float] = {}
    for g in lista:
        cod = str(g.get("codigo_receita", g.get("cod_rec", "")))
        por_rec_guia[cod] = arred(por_rec_guia.get(cod, 0.0) + n(g.get("valor", g.get("valor_guia"))))

    for item in itens_gate3:
        cod = item["cod_rec"]
        item["vl_guia"] = _vl_rec(por_rec_guia, cod) if cod in por_rec_guia else None
        if item["vl_guia"] is not None:
            item["fecha"] = eh_igual(item["vl_efd"], item["vl_guia"])
            if item["vl_motor"] is not None:
                item["fecha"] = item["fecha"] and eh_igual(item["vl_motor"], item["vl_guia"])
        else:
            item["fecha"] = item["vl_efd"] == 0.0 or cod not in por_rec_efd

    fecha = eh_igual(soma_efd, soma_guia)
    if por_rec_guia and por_rec_efd:
        fecha = fecha and all(
            eh_igual(por_rec_efd.get(c, 0.0), v) for c, v in por_rec_guia.items()
        )
    # Tambem aceita guia = VL_ICMS_RECOLHER quando E116 espelha a apuracao
    if not fecha and eh_igual(soma_guia, e110["recomputado"]["VL_ICMS_RECOLHER"]):
        fecha = eh_igual(soma_efd, e110["recomputado"]["VL_ICMS_RECOLHER"]) or (
            e110["recomputado"]["VL_ICMS_RECOLHER"] == 0 and soma_guia == 0 and soma_efd == 0
        )
    return _item(
        13, fecha,
        soma_efd=soma_efd,
        soma_guia=soma_guia,
        obrigacoes_efd=obrigacoes,
        guias=lista,
        por_cod_rec_efd=por_rec_efd,
        por_cod_rec_guia=por_rec_guia,
        itens_gate3=itens_gate3,
        fecoep_normal=next((i for i in itens_gate3 if i["tributo"] == "fecoep"), None),
        fecoep_difal=next((i for i in itens_gate3 if i["tributo"] == "fecoep_difal"), None),
    )
