"""FECOEP (AL) — Fundo Estadual de Combate à Pobreza (Lei 6.558/2004).

Não confundir com FCP genérico do E310. Em Alagoas o recolhimento é DAR próprio
(E116 COD_REC 50059 Normal / 50075 DIFAL), alimentado por ajustes E111
(AL009999/AL029999 filtrados por descrição FECOEP, AL040001/AL050001) e, na
fase analítica, por C191/XML (vFCP) × alíquota 1%/2%.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from motor_fiscal.icms.bloco_e import recomputar_e110
from motor_fiscal.icms.mapa import carregar_config_uf, uf_empresa
from motor_fiscal.util import arred, eh_igual, n

_DEFAULT_FECOEP = {
    "cod_rec_normal": "50059",
    "cod_rec_difal": "50075",
    "cod_rec_icms_difal": "15610",
    "cod_or_normal": "006",
    "cod_or_difal": "090",
    "aliq_default": 2.0,
    "e111": {
        "debito_controle": "AL009999",
        "credito_controle": "AL029999",
        "deducao_icms": "AL040001",
        "debito_especial": "AL050001",
        "debito_especial_difal": "AL050020",
        "filtro_descricao": "FECOEP",
    },
}


def _cfg_fecoep(config: dict | None) -> dict:
    base = dict(_DEFAULT_FECOEP)
    if not config:
        return base
    overlay = config.get("fecoep") or {}
    out = {**base, **{k: v for k, v in overlay.items() if k != "e111"}}
    e111 = dict(base["e111"])
    e111.update(overlay.get("e111") or {})
    out["e111"] = e111
    return out


def _registros(con: sqlite3.Connection, registro: str) -> list[dict]:
    rows = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = ?
        ORDER BY numero_linha
        """,
        (registro,),
    ).fetchall()
    return [json.loads(r["dados"]) for r in rows if r["dados"]]


def _eh_ajuste_fecoep(cod_aj: str, descr: str, e111_cfg: dict) -> bool:
    cod = (cod_aj or "").strip().upper()
    desc = (descr or "").upper()
    filtro = (e111_cfg.get("filtro_descricao") or "FECOEP").upper()
    especiais = {
        (e111_cfg.get("deducao_icms") or "AL040001").upper(),
        (e111_cfg.get("debito_especial") or "AL050001").upper(),
    }
    if cod in especiais:
        return True
    return filtro in desc


def sumarizar_c191(con: sqlite3.Connection) -> dict:
    """Soma C191 tipado, separando por sentido do C100 pai (via C190)."""
    rows = con.execute(
        """
        SELECT c191.dados AS dados_c191,
               c100.dados AS dados_c100,
               c190.dados AS dados_c190
        FROM registros_efd c191
        LEFT JOIN registros_efd c190 ON c190.id = c191.pai_id
        LEFT JOIN registros_efd c100 ON c100.id = c190.pai_id
        WHERE c191.arquivo = 'efd_icms_ipi' AND c191.registro = 'C191'
        ORDER BY c191.numero_linha
        """
    ).fetchall()
    totais = {
        "qtd": 0,
        "vl_fcp_op": 0.0,
        "vl_fcp_st": 0.0,
        "vl_fcp_ret": 0.0,
        "vl_fcp_op_entradas": 0.0,
        "vl_fcp_op_saidas": 0.0,
    }
    for row in rows:
        if not row["dados_c191"]:
            continue
        d = json.loads(row["dados_c191"])
        op = n(d.get("VL_FCP_OP"))
        st = n(d.get("VL_FCP_ST"))
        ret = n(d.get("VL_FCP_RET"))
        totais["qtd"] += 1
        totais["vl_fcp_op"] = arred(totais["vl_fcp_op"] + op)
        totais["vl_fcp_st"] = arred(totais["vl_fcp_st"] + st)
        totais["vl_fcp_ret"] = arred(totais["vl_fcp_ret"] + ret)
        ind = None
        if row["dados_c100"]:
            ind = json.loads(row["dados_c100"]).get("IND_OPER")
        if ind == "0":
            totais["vl_fcp_op_entradas"] = arred(totais["vl_fcp_op_entradas"] + op)
        elif ind == "1":
            totais["vl_fcp_op_saidas"] = arred(totais["vl_fcp_op_saidas"] + op)
    return totais


def _soma_e116_cod_rec(con: sqlite3.Connection, cod_rec: str) -> float:
    total = 0.0
    for d in _registros(con, "E116"):
        if str(d.get("COD_REC") or "") == str(cod_rec):
            total = arred(total + n(d.get("VL_OR")))
    return total


def _soma_e111_cod(con: sqlite3.Connection, cod_aj: str) -> float:
    total = 0.0
    alvo = (cod_aj or "").strip().upper()
    for d in _registros(con, "E111"):
        if (d.get("COD_AJ_APUR") or "").strip().upper() == alvo:
            total = arred(total + n(d.get("VL_AJ_APUR")))
    return total


def recomputar_fecoep_al(
    con: sqlite3.Connection,
    *,
    config: dict | None = None,
    config_dir: str | Path | None = None,
    e110: dict | None = None,
) -> dict:
    """Recompute/auditoria FECOEP Normal e DIFAL a partir da EFD (Fase 1)."""
    if config is None:
        uf = uf_empresa(con) or "AL"
        config = carregar_config_uf(uf, config_dir)
    cfg = _cfg_fecoep(config)
    e111_cfg = cfg["e111"]
    if e110 is None:
        e110 = recomputar_e110(con)

    debitos: list[dict] = []
    creditos: list[dict] = []
    outros: list[dict] = []
    vl_debito = 0.0
    vl_credito = 0.0
    vl_deducao = 0.0
    vl_deb_esp = 0.0

    cod_deb = (e111_cfg.get("debito_controle") or "AL009999").upper()
    cod_cred = (e111_cfg.get("credito_controle") or "AL029999").upper()
    cod_ded = (e111_cfg.get("deducao_icms") or "AL040001").upper()
    cod_desp = (e111_cfg.get("debito_especial") or "AL050001").upper()
    cod_difal_esp = (e111_cfg.get("debito_especial_difal") or "AL050020").upper()

    for d in _registros(con, "E111"):
        cod = (d.get("COD_AJ_APUR") or "").strip().upper()
        descr = d.get("DESCR_COMPL_AJ") or ""
        vl = arred(n(d.get("VL_AJ_APUR")))
        item = {"cod_aj_apur": cod, "descr_compl_aj": descr, "vl_aj_apur": vl}
        if not _eh_ajuste_fecoep(cod, descr, e111_cfg):
            continue
        if cod == cod_ded:
            vl_deducao = arred(vl_deducao + vl)
            outros.append({**item, "papel": "deducao_icms"})
        elif cod == cod_desp:
            vl_deb_esp = arred(vl_deb_esp + vl)
            outros.append({**item, "papel": "debito_especial"})
        elif cod == cod_deb:
            vl_debito = arred(vl_debito + vl)
            debitos.append(item)
        elif cod == cod_cred:
            vl_credito = arred(vl_credito + vl)
            creditos.append(item)
        else:
            outros.append({**item, "papel": "outro_fecoep"})

    bruto = arred(max(0.0, vl_debito - vl_credito))
    # Teto legal: só recolhe até o ICMS a recolher antes da dedução FECOEP.
    icms_antes_ded = arred(
        e110["recomputado"].get("VL_ICMS_RECOLHER", 0.0)
        + vl_deducao
    )
    if icms_antes_ded <= 0 and e110.get("declarado"):
        # Fallback: VL_SLD_APURADO declarado (antes da dedução FECOEP).
        icms_antes_ded = arred(n(e110["declarado"].get("VL_SLD_APURADO")))
    vl_fecoep_teto = arred(min(bruto, icms_antes_ded)) if icms_antes_ded > 0 else 0.0

    # Fonte canônica de recolhimento: AL050001 / E116 50059 (quando escriturado).
    e116_normal = _soma_e116_cod_rec(con, cfg["cod_rec_normal"])
    e116_difal = _soma_e116_cod_rec(con, cfg["cod_rec_difal"])
    e116_icms_difal = _soma_e116_cod_rec(con, cfg["cod_rec_icms_difal"])
    al050020 = _soma_e111_cod(con, cod_difal_esp)

    vl_fecoep_recolher = vl_deb_esp if vl_deb_esp else (
        e116_normal if e116_normal else vl_fecoep_teto
    )
    # Preferência: E116 50075; senão fatia AL050020 − E116 ICMS DIFAL.
    fatia_al050020 = arred(max(0.0, al050020 - e116_icms_difal)) if al050020 else 0.0
    vl_fecoep_difal_recolher = e116_difal if e116_difal else fatia_al050020

    c191 = sumarizar_c191(con)

    divergencias = []
    if vl_deducao and not eh_igual(vl_deducao, vl_fecoep_recolher):
        divergencias.append({
            "campo": "AL040001_x_recolher",
            "recomputado": vl_fecoep_recolher,
            "declarado": vl_deducao,
            "diferenca": arred(vl_fecoep_recolher - vl_deducao),
        })
    if e116_normal and not eh_igual(vl_fecoep_recolher, e116_normal):
        divergencias.append({
            "campo": "e116_50059",
            "recomputado": vl_fecoep_recolher,
            "declarado": e116_normal,
            "diferenca": arred(vl_fecoep_recolher - e116_normal),
        })
    if bruto and vl_fecoep_recolher and not eh_igual(bruto, vl_fecoep_recolher):
        # Informativo: bruto E111 vs teto/recolher (pode divergir pelo teto ICMS).
        if not eh_igual(vl_fecoep_teto, vl_fecoep_recolher):
            divergencias.append({
                "campo": "bruto_x_recolher",
                "recomputado": vl_fecoep_teto,
                "declarado": vl_fecoep_recolher,
                "diferenca": arred(vl_fecoep_teto - vl_fecoep_recolher),
            })
    if e116_difal and fatia_al050020 and not eh_igual(e116_difal, fatia_al050020):
        divergencias.append({
            "campo": "fecoep_difal_al050020_x_e116",
            "recomputado": fatia_al050020,
            "declarado": e116_difal,
            "diferenca": arred(fatia_al050020 - e116_difal),
        })

    ok = (
        (not e116_normal or eh_igual(vl_fecoep_recolher, e116_normal))
        and (not vl_deducao or eh_igual(vl_fecoep_recolher, vl_deducao))
        and (not vl_deb_esp or eh_igual(vl_fecoep_recolher, vl_deb_esp))
        and (not e116_difal or eh_igual(vl_fecoep_difal_recolher, e116_difal))
    )

    return {
        "uf": "AL",
        "tributo": "fecoep",
        "ok": ok,
        "vl_debitos": arred(vl_debito),
        "vl_creditos": arred(vl_credito),
        "vl_bruto": bruto,
        "vl_teto_icms": arred(icms_antes_ded),
        "vl_fecoep_teto": vl_fecoep_teto,
        "vl_fecoep_recolher": arred(vl_fecoep_recolher),
        "vl_fecoep_difal_recolher": arred(vl_fecoep_difal_recolher),
        "vl_deducao_al040001": arred(vl_deducao),
        "vl_debito_especial_al050001": arred(vl_deb_esp),
        "vl_al050020": arred(al050020),
        "e116": {
            "cod_rec_normal": cfg["cod_rec_normal"],
            "vl_normal": e116_normal,
            "cod_rec_difal": cfg["cod_rec_difal"],
            "vl_difal": e116_difal,
            "cod_rec_icms_difal": cfg["cod_rec_icms_difal"],
            "vl_icms_difal": e116_icms_difal,
        },
        "debitos_e111": debitos,
        "creditos_e111": creditos,
        "outros_e111": outros,
        "c191": c191,
        "divergencias": divergencias,
    }


def _aliq_fecoep_ncm(ncm: str | None, cfg: dict) -> float:
    """Resolve alíquota FECOEP (1% ou 2%) por NCM/grupo; default 2%."""
    default = float(cfg.get("aliq_default", 2.0))
    if not ncm:
        return default
    ncm_limpo = "".join(c for c in str(ncm) if c.isdigit())
    tabela = cfg.get("aliq_fecoep") or {}
    # Chaves podem ser NCM completo, prefixo ou lista em "ncm_1" / "ncm_2"
    if ncm_limpo in tabela:
        return float(tabela[ncm_limpo])
    for tamanho in (8, 6, 4, 2):
        prefixo = ncm_limpo[:tamanho]
        if prefixo in tabela:
            return float(tabela[prefixo])
    for chave in ("ncm_1", "excecoes_1"):
        lista = tabela.get(chave) or cfg.get(chave) or []
        for item in lista:
            pref = "".join(c for c in str(item) if c.isdigit())
            if pref and ncm_limpo.startswith(pref):
                return 1.0
    return default


def calcular_fecoep_analitico(
    con: sqlite3.Connection,
    *,
    config: dict | None = None,
    config_dir: str | Path | None = None,
    e110: dict | None = None,
    recompute: dict | None = None,
) -> dict:
    """Fase 2: calcula FECOEP a partir de C191/XML (vFCP) e alíquotas 1%/2%.

    Preferência de base:
    1. Itens XML com ``vfcp`` / ``vfcp_uf_dest`` quando houver;
    2. Soma C191 por sentido (saídas=débito, entradas=crédito);
    3. Fallback: BC ICMS do item × alíquota FECOEP do NCM.
    """
    if config is None:
        uf = uf_empresa(con) or "AL"
        config = carregar_config_uf(uf, config_dir)
    cfg = _cfg_fecoep(config)
    recompute = recompute or recomputar_fecoep_al(
        con, config=config, config_dir=config_dir, e110=e110
    )
    if e110 is None:
        e110 = recomputar_e110(con)

    # --- XML itens ---
    cols = {r[1] for r in con.execute("PRAGMA table_info(itens)").fetchall()}
    tem_fcp = "vfcp" in cols
    deb_xml = cred_xml = 0.0
    difal_xml = 0.0
    qtd_itens_fcp = 0
    por_cfop: dict[str, dict] = {}

    if tem_fcp:
        rows = con.execute(
            """
            SELECT i.cfop, i.ncm, i.vbc_icms, i.vfcp, i.pfcp, i.vfcp_uf_dest,
                   i.vbc_uf_dest, d.ind_operacao, d.origem
            FROM itens i
            JOIN documentos d ON d.id = i.documento_id
            WHERE d.origem = 'xml'
              AND (d.situacao IS NULL OR d.situacao NOT IN ('cancelada','denegada','inutilizada'))
            """
        ).fetchall()
        for r in rows:
            vfcp = n(r["vfcp"]) if r["vfcp"] is not None else None
            vbc = n(r["vbc_icms"])
            aliq = n(r["pfcp"]) if r["pfcp"] is not None else _aliq_fecoep_ncm(r["ncm"], cfg)
            if vfcp is None and vbc:
                vfcp = arred(vbc * aliq / 100.0)
            if not vfcp:
                vfcp = 0.0
            else:
                qtd_itens_fcp += 1
            cfop = str(r["cfop"] or "")
            bucket = por_cfop.setdefault(cfop, {"debito": 0.0, "credito": 0.0, "difal": 0.0})
            if r["ind_operacao"] == "1":
                deb_xml = arred(deb_xml + vfcp)
                bucket["debito"] = arred(bucket["debito"] + vfcp)
            elif r["ind_operacao"] == "0":
                cred_xml = arred(cred_xml + vfcp)
                bucket["credito"] = arred(bucket["credito"] + vfcp)
            vdif = n(r["vfcp_uf_dest"])
            if not vdif and r["vbc_uf_dest"] is not None:
                vdif = arred(n(r["vbc_uf_dest"]) * aliq / 100.0)
            if vdif:
                difal_xml = arred(difal_xml + vdif)
                bucket["difal"] = arred(bucket["difal"] + vdif)

    c191 = recompute.get("c191") or sumarizar_c191(con)
    # Escolha da fonte: XML se houver vFCP; senão C191.
    if qtd_itens_fcp:
        debitos = deb_xml
        creditos = cred_xml
        fonte = "xml_vfcp"
    else:
        debitos = c191.get("vl_fcp_op_saidas", 0.0)
        creditos = c191.get("vl_fcp_op_entradas", 0.0)
        fonte = "c191"

    bruto = arred(max(0.0, debitos - creditos))
    icms_antes = arred(
        e110["recomputado"].get("VL_ICMS_RECOLHER", 0.0)
        + recompute.get("vl_deducao_al040001", 0.0)
    )
    if icms_antes <= 0 and e110.get("declarado"):
        icms_antes = arred(n(e110["declarado"].get("VL_SLD_APURADO")))
    vl_recolher = arred(min(bruto, icms_antes)) if icms_antes > 0 else 0.0

    vl_difal = difal_xml if difal_xml else recompute.get("vl_fecoep_difal_recolher", 0.0)

    ref_normal = recompute.get("vl_fecoep_recolher", 0.0)
    ref_difal = recompute.get("vl_fecoep_difal_recolher", 0.0)
    divergencias = []
    if ref_normal and not eh_igual(vl_recolher, ref_normal):
        divergencias.append({
            "campo": "analitico_x_e116_normal",
            "recomputado": vl_recolher,
            "referencia_efd": ref_normal,
            "diferenca": arred(vl_recolher - ref_normal),
            "observacao": (
                "C191/XML pode incluir naturezas fora do filtro E111 FECOEP; "
                "divergência esperada até aplicar filtros por CFOP/grupo."
            ),
        })
    if ref_difal and difal_xml and not eh_igual(vl_difal, ref_difal):
        divergencias.append({
            "campo": "analitico_x_e116_difal",
            "recomputado": vl_difal,
            "referencia_efd": ref_difal,
            "diferenca": arred(vl_difal - ref_difal),
        })

    return {
        "uf": "AL",
        "tributo": "fecoep_analitico",
        "fonte": fonte,
        "aliq_default": cfg.get("aliq_default", 2.0),
        "vl_debitos": arred(debitos),
        "vl_creditos": arred(creditos),
        "vl_bruto": bruto,
        "vl_teto_icms": arred(icms_antes),
        "vl_fecoep_recolher": vl_recolher,
        "vl_fecoep_difal_recolher": arred(vl_difal),
        "por_cfop": por_cfop,
        "c191": c191,
        "qtd_itens_xml_fcp": qtd_itens_fcp,
        "referencia_efd": {
            "vl_fecoep_recolher": ref_normal,
            "vl_fecoep_difal_recolher": ref_difal,
        },
        "divergencias": divergencias,
        "ok": not divergencias or all(
            abs(d.get("diferenca") or 0) < 1.0 for d in divergencias
        ),
        "observacao": (
            "Paridade estrita com a planilha APURAÇÃO exige filtros por natureza/"
            "CFOP (indústria×comércio); use divergencias para investigar."
        ),
    }
