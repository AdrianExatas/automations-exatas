"""Recompute independente do Bloco E (E110/E111/E116, E200/E210, E300/E310)."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from motor_fiscal.icms.livro import montar_livro
from motor_fiscal.util import arred, eh_igual, n

# Tabela 5.1.1 — COD_AJ_APUR = UF + apuração(1) + utilização(1) + seq(4).
# O 4º caractere (índice 3) define o campo do E110. Sobrescrevível via mapa_ajustes.
_UTILIZACAO_E111 = {
    "0": "debito",            # VL_TOT_AJ_DEBITOS
    "1": "estorno_credito",   # VL_ESTORNOS_CRED
    "2": "credito",           # VL_TOT_AJ_CREDITOS
    "3": "estorno_debito",    # VL_ESTORNOS_DEB
    "4": "deducao",           # VL_TOT_DED
    "5": "debito_especial",   # DEB_ESP
    "9": "controle_extra",    # registro 1200 / fora da conta gráfica E110
}


def _apuracao_declarada(con: sqlite3.Connection, registro: str) -> list[dict]:
    rows = con.execute(
        """
        SELECT uf, dados, valor_recolher FROM apuracoes
        WHERE origem = 'efd_icms_ipi' AND registro = ?
        ORDER BY id
        """,
        (registro,),
    ).fetchall()
    out = []
    for r in rows:
        dados = json.loads(r["dados"]) if r["dados"] else {}
        out.append({"uf": r["uf"], "dados": dados, "valor_recolher": r["valor_recolher"]})
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


def classificar_ajuste_e111(cod_aj: str, mapa_ajustes: dict | None = None) -> str:
    """Classifica E111 pelo 4º caractere da Tabela 5.1.1 (utilização).

    Retornos: credito, debito, estorno_credito, estorno_debito, deducao,
    debito_especial, controle_extra ou desconhecido.
    """
    cod = (cod_aj or "").strip().upper()
    if mapa_ajustes and cod in mapa_ajustes:
        return mapa_ajustes[cod]
    if len(cod) < 4:
        return "desconhecido"
    return _UTILIZACAO_E111.get(cod[3], "desconhecido")


def _ajustes_e111(con: sqlite3.Connection, mapa_ajustes: dict | None = None) -> dict:
    totais = {
        "vl_tot_aj_creditos": 0.0,
        "vl_tot_aj_debitos": 0.0,
        "vl_estornos_cred": 0.0,
        "vl_estornos_deb": 0.0,
        "vl_tot_ded": 0.0,
        "deb_esp": 0.0,
    }
    detalhe = []
    for d in _registros(con, "E111"):
        vl = n(d.get("VL_AJ_APUR"))
        natureza = classificar_ajuste_e111(d.get("COD_AJ_APUR", ""), mapa_ajustes)
        if natureza == "credito":
            totais["vl_tot_aj_creditos"] = arred(totais["vl_tot_aj_creditos"] + vl)
        elif natureza == "debito":
            totais["vl_tot_aj_debitos"] = arred(totais["vl_tot_aj_debitos"] + vl)
        elif natureza == "estorno_credito":
            totais["vl_estornos_cred"] = arred(totais["vl_estornos_cred"] + vl)
        elif natureza == "estorno_debito":
            totais["vl_estornos_deb"] = arred(totais["vl_estornos_deb"] + vl)
        elif natureza == "deducao":
            totais["vl_tot_ded"] = arred(totais["vl_tot_ded"] + vl)
        elif natureza == "debito_especial":
            totais["deb_esp"] = arred(totais["deb_esp"] + vl)
        detalhe.append({
            "cod_aj_apur": d.get("COD_AJ_APUR"),
            "descr_compl_aj": d.get("DESCR_COMPL_AJ"),
            "vl_aj_apur": arred(vl),
            "natureza": natureza,
        })
    totais["ajustes"] = detalhe
    return totais


def saldo_credor_anterior(con: sqlite3.Connection, empresa: str, competencia: str,
                          db_dir: str | Path | None = None) -> float | None:
    """Busca VL_SLD_CREDOR_TRANSPORTAR do mes anterior no DB, se existir."""
    from motor_fiscal.db.schema import caminho_banco, conectar

    try:
        ano, mes = competencia.split("-")
        ano_i, mes_i = int(ano), int(mes)
        if mes_i == 1:
            ant = f"{ano_i - 1}-12"
        else:
            ant = f"{ano_i}-{mes_i - 1:02d}"
    except (ValueError, AttributeError):
        return None

    if db_dir is None:
        # tenta a partir do path do banco atual via pragma — caller passa db_dir
        return None

    caminho = caminho_banco(empresa, ant, db_dir)
    if not caminho.exists():
        return None
    con_ant = conectar(caminho)
    try:
        row = con_ant.execute(
            "SELECT dados FROM apuracoes WHERE registro = 'E110' LIMIT 1"
        ).fetchone()
        if not row or not row["dados"]:
            return None
        dados = json.loads(row["dados"])
        return n(dados.get("VL_SLD_CREDOR_TRANSPORTAR"))
    finally:
        con_ant.close()


def recomputar_e110(
    con: sqlite3.Connection,
    *,
    saldo_anterior: float | None = None,
    mapa_ajustes: dict | None = None,
    usar_declarado_parcial: bool = True,
) -> dict:
    """Reconstroi a conta grafica E110 a partir do livro + E111.

    Campos de documento (VL_AJ_DEBITOS/CREDITOS, estornos) sem C197/C195
    ficam 0, salvo ``usar_declarado_parcial`` (copia do E110 declarado).
    """
    livro = montar_livro(con)
    ajustes = _ajustes_e111(con, mapa_ajustes)
    declarado_lista = _apuracao_declarada(con, "E110")
    declarado = declarado_lista[0]["dados"] if declarado_lista else {}

    vl_tot_debitos = livro["totais_saidas"]["vl_icms"]
    vl_tot_creditos = livro["totais_entradas"]["vl_icms"]

    if saldo_anterior is None:
        saldo_anterior = n(declarado.get("VL_SLD_CREDOR_ANT")) if declarado else 0.0

    # Ajustes de documento (C197/C195) ainda sem fonte analitica → opcionalmente
    # copia do declarado. Estornos/deduções/débito especial vêm do E111 (5.1.1).
    if usar_declarado_parcial and declarado:
        vl_aj_debitos = n(declarado.get("VL_AJ_DEBITOS"))
        vl_aj_creditos = n(declarado.get("VL_AJ_CREDITOS"))
    else:
        vl_aj_debitos = vl_aj_creditos = 0.0

    vl_tot_aj_debitos = ajustes["vl_tot_aj_debitos"]
    vl_tot_aj_creditos = ajustes["vl_tot_aj_creditos"]
    vl_estornos_cred = ajustes["vl_estornos_cred"]
    vl_estornos_deb = ajustes["vl_estornos_deb"]
    vl_tot_ded = ajustes["vl_tot_ded"]
    deb_esp = ajustes["deb_esp"]
    # Fallback: se E111 nao trouxe o campo, aceita declarado (escrituracoes antigas).
    if usar_declarado_parcial and declarado:
        if vl_estornos_cred == 0:
            vl_estornos_cred = n(declarado.get("VL_ESTORNOS_CRED"))
        if vl_estornos_deb == 0:
            vl_estornos_deb = n(declarado.get("VL_ESTORNOS_DEB"))
        if vl_tot_ded == 0:
            vl_tot_ded = n(declarado.get("VL_TOT_DED"))
        if deb_esp == 0:
            deb_esp = n(declarado.get("DEB_ESP"))

    # Conta grafica (Guia Pratico E110):
    # saldo = debitos(+aj+estornos cred) - creditos(+aj+estornos deb) - sld ant
    bruto = (
        vl_tot_debitos + vl_aj_debitos + vl_tot_aj_debitos + vl_estornos_cred
        - vl_tot_creditos - vl_aj_creditos - vl_tot_aj_creditos - vl_estornos_deb
        - saldo_anterior
    )
    bruto = arred(bruto)
    if bruto > 0:
        vl_sld_apurado = bruto
        vl_icms_recolher = arred(max(0.0, vl_sld_apurado - vl_tot_ded))
        vl_sld_credor_transportar = 0.0
    else:
        vl_sld_apurado = 0.0
        vl_icms_recolher = 0.0
        vl_sld_credor_transportar = arred(-bruto)

    recomputado = {
        "VL_TOT_DEBITOS": arred(vl_tot_debitos),
        "VL_AJ_DEBITOS": arred(vl_aj_debitos),
        "VL_TOT_AJ_DEBITOS": arred(vl_tot_aj_debitos),
        "VL_ESTORNOS_CRED": arred(vl_estornos_cred),
        "VL_TOT_CREDITOS": arred(vl_tot_creditos),
        "VL_AJ_CREDITOS": arred(vl_aj_creditos),
        "VL_TOT_AJ_CREDITOS": arred(vl_tot_aj_creditos),
        "VL_ESTORNOS_DEB": arred(vl_estornos_deb),
        "VL_SLD_CREDOR_ANT": arred(saldo_anterior),
        "VL_SLD_APURADO": arred(vl_sld_apurado),
        "VL_TOT_DED": arred(vl_tot_ded),
        "VL_ICMS_RECOLHER": arred(vl_icms_recolher),
        "VL_SLD_CREDOR_TRANSPORTAR": arred(vl_sld_credor_transportar),
        "DEB_ESP": arred(deb_esp),
    }
    return {
        "recomputado": recomputado,
        "declarado": {k: arred(n(v)) for k, v in declarado.items()} if declarado else {},
        "ajustes_e111": ajustes,
        "divergencias": _diff_dicts(recomputado, {k: arred(n(v)) for k, v in declarado.items()} if declarado else {}),
    }


def recomputar_e116(
    con: sqlite3.Connection,
    e110: dict | None = None,
    *,
    cod_or_icms: str = "000",
) -> dict:
    """Obrigações a recolher (E116), conferidas por tributo/COD_REC.

    Em UFs multi-tributo (ex.: AL com FECOEP/DIFAL), a soma total de ``VL_OR``
    não deve ser confrontada com ``VL_ICMS_RECOLHER``. O ok compara apenas as
    linhas de ICMS próprio (``COD_OR`` = ``cod_or_icms``, tipicamente ``000``).
    """
    if e110 is None:
        e110 = recomputar_e110(con)
    declarado = _registros(con, "E116")
    vl_recolher = e110["recomputado"]["VL_ICMS_RECOLHER"]
    linhas = [
        {
            "cod_or": d.get("COD_OR"),
            "vl_or": arred(n(d.get("VL_OR"))),
            "dt_vcto": d.get("DT_VCTO"),
            "cod_rec": d.get("COD_REC"),
            "mes_ref": d.get("MES_REF"),
            "txt_compl": d.get("TXT_COMPL"),
        }
        for d in declarado
    ]
    soma_or = arred(sum(l["vl_or"] for l in linhas))
    por_cod_rec: dict[str, float] = {}
    por_cod_or: dict[str, float] = {}
    for l in linhas:
        rec = str(l.get("cod_rec") or "")
        oor = str(l.get("cod_or") or "")
        por_cod_rec[rec] = arred(por_cod_rec.get(rec, 0.0) + l["vl_or"])
        por_cod_or[oor] = arred(por_cod_or.get(oor, 0.0) + l["vl_or"])

    cod_or_alvo = str(cod_or_icms or "000")
    tem_icms_proprio = any(str(l.get("cod_or") or "") == cod_or_alvo for l in linhas)
    if tem_icms_proprio:
        soma_icms = por_cod_or.get(cod_or_alvo, 0.0)
        ok = eh_igual(soma_icms, vl_recolher)
    else:
        # Escrituração legada / fixture com uma unica obrigação: aceita soma total.
        soma_icms = soma_or
        ok = eh_igual(soma_or, vl_recolher) or (vl_recolher == 0 and soma_or == 0)

    multi_tributo = len([c for c, v in por_cod_rec.items() if v]) > 1 or len(
        [c for c, v in por_cod_or.items() if v]
    ) > 1

    return {
        "declarado": linhas,
        "vl_icms_recolher_e110": vl_recolher,
        "soma_vl_or": soma_or,
        "soma_vl_or_icms": arred(soma_icms),
        "por_cod_rec": por_cod_rec,
        "por_cod_or": por_cod_or,
        "multi_tributo": multi_tributo,
        "ok": ok,
    }


def recomputar_e210(con: sqlite3.Connection) -> list[dict]:
    """ICMS-ST por UF: retem ST de saidas C190 e creditos de entradas; fecha conta E210."""
    livro = montar_livro(con)
    st_saidas = livro["totais_saidas"]["vl_icms_st"]
    st_entradas = livro["totais_entradas"]["vl_icms_st"]

    declarados = _apuracao_declarada(con, "E210")
    # UFs do E200
    ufs = [d.get("UF") for d in _registros(con, "E200")]
    if not ufs and declarados:
        ufs = [d["uf"] for d in declarados]
    if not ufs:
        ufs = [None]

    resultados = []
    # Sem rateio por UF nos analiticos: atribui ST total a cada UF declarada (tipicamente 1).
    for i, uf in enumerate(ufs):
        decl = declarados[i]["dados"] if i < len(declarados) else {}
        sld_ant = n(decl.get("VL_SLD_CRED_ANT_ST"))
        devol = n(decl.get("VL_DEVOL_ST")) if decl else st_entradas
        ressarc = n(decl.get("VL_RESSARC_ST"))
        out_cred = n(decl.get("VL_OUT_CRED_ST"))
        aj_cred = n(decl.get("VL_AJ_CREDITOS_ST"))
        retencao = st_saidas if not decl else n(decl.get("VL_RETENCAO_ST")) or st_saidas
        # Se declarado zerado e livro tambem, mantem 0
        if not decl:
            retencao = st_saidas
            devol = st_entradas
        else:
            # recompute independente: usa livro para retencao/devolucao
            retencao = st_saidas
            devol = st_entradas if st_entradas else n(decl.get("VL_DEVOL_ST"))
        out_deb = n(decl.get("VL_OUT_DEB_ST"))
        aj_deb = n(decl.get("VL_AJ_DEBITOS_ST"))
        deducoes = n(decl.get("VL_DEDUCOES_ST"))
        deb_esp = n(decl.get("DEB_ESP_ST"))

        bruto = (
            retencao + out_deb + aj_deb
            - sld_ant - devol - ressarc - out_cred - aj_cred
        )
        bruto = arred(bruto)
        if bruto > 0:
            sld_dev = bruto
            recolher = arred(max(0.0, sld_dev - deducoes))
            transportar = 0.0
        else:
            sld_dev = 0.0
            recolher = 0.0
            transportar = arred(-bruto)

        recomputado = {
            "IND_MOV_ST": "1" if (retencao or devol or sld_ant) else "0",
            "VL_SLD_CRED_ANT_ST": arred(sld_ant),
            "VL_DEVOL_ST": arred(devol),
            "VL_RESSARC_ST": arred(ressarc),
            "VL_OUT_CRED_ST": arred(out_cred),
            "VL_AJ_CREDITOS_ST": arred(aj_cred),
            "VL_RETENCAO_ST": arred(retencao),
            "VL_OUT_DEB_ST": arred(out_deb),
            "VL_AJ_DEBITOS_ST": arred(aj_deb),
            "VL_SLD_DEV_ANT_ST": arred(sld_dev),
            "VL_DEDUCOES_ST": arred(deducoes),
            "VL_ICMS_RECOL_ST": arred(recolher),
            "VL_SLD_CRED_ST_TRANSPORTAR": arred(transportar),
            "DEB_ESP_ST": arred(deb_esp),
        }
        declarado_num = _normalizar_declarado(decl)
        resultados.append({
            "uf": uf,
            "recomputado": recomputado,
            "declarado": declarado_num,
            "divergencias": _diff_dicts(recomputado, declarado_num),
        })
    return resultados


def recomputar_e310(con: sqlite3.Connection) -> list[dict]:
    """DIFAL/FCP por UF. Sem campos DIFAL no C170, recompute fecha a conta com bases do declarado
    (ajustes/outros) e totais de debito/credito zerados quando nao houver fonte analitica.
    """
    declarados = _apuracao_declarada(con, "E310")
    ufs = [d.get("UF") for d in _registros(con, "E300")]
    if not ufs and declarados:
        ufs = [d["uf"] for d in declarados]
    if not ufs:
        ufs = [None]

    # Fontes analiticas futuras: C191/C195 etc. Por enquanto 0 (fixture sem DIFAL).
    tot_deb_difal = 0.0
    tot_cred_difal = 0.0
    tot_deb_fcp = 0.0
    tot_cred_fcp = 0.0

    resultados = []
    for i, uf in enumerate(ufs):
        decl = declarados[i]["dados"] if i < len(declarados) else {}
        # Se o declarado informa movimentos e nao ha fonte, usa declarado como proxy
        # apenas para campos auxiliares; totais analiticos permanecem 0 → detecta divergencia.
        sld_ant_d = n(decl.get("VL_SLD_CRED_ANT_DIFAL"))
        out_deb_d = n(decl.get("VL_OUT_DEB_DIFAL"))
        out_cred_d = n(decl.get("VL_OUT_CRED_DIFAL"))
        ded_d = n(decl.get("VL_DEDUCOES_DIFAL"))
        deb_esp_d = n(decl.get("DEB_ESP_DIFAL"))

        bruto_d = tot_deb_difal + out_deb_d - sld_ant_d - tot_cred_difal - out_cred_d
        bruto_d = arred(bruto_d)
        if bruto_d > 0:
            sld_dev_d = bruto_d
            recol_d = arred(max(0.0, sld_dev_d - ded_d))
            transp_d = 0.0
        else:
            sld_dev_d = 0.0
            recol_d = 0.0
            transp_d = arred(-bruto_d)

        sld_ant_f = n(decl.get("VL_SLD_CRED_ANT_FCP"))
        out_deb_f = n(decl.get("VL_OUT_DEB_FCP"))
        out_cred_f = n(decl.get("VL_OUT_CRED_FCP"))
        ded_f = n(decl.get("VL_DEDUCOES_FCP"))
        deb_esp_f = n(decl.get("DEB_ESP_FCP"))
        bruto_f = tot_deb_fcp + out_deb_f - sld_ant_f - tot_cred_fcp - out_cred_f
        bruto_f = arred(bruto_f)
        if bruto_f > 0:
            sld_dev_f = bruto_f
            recol_f = arred(max(0.0, sld_dev_f - ded_f))
            transp_f = 0.0
        else:
            sld_dev_f = 0.0
            recol_f = 0.0
            transp_f = arred(-bruto_f)

        ind = "1" if (tot_deb_difal or tot_cred_difal or tot_deb_fcp or tot_cred_fcp
                      or sld_ant_d or sld_ant_f) else "0"
        recomputado = {
            "IND_MOV_FCP_DIFAL": ind,
            "VL_SLD_CRED_ANT_DIFAL": arred(sld_ant_d),
            "VL_TOT_DEBITOS_DIFAL": arred(tot_deb_difal),
            "VL_OUT_DEB_DIFAL": arred(out_deb_d),
            "VL_TOT_CREDITOS_DIFAL": arred(tot_cred_difal),
            "VL_OUT_CRED_DIFAL": arred(out_cred_d),
            "VL_SLD_DEV_ANT_DIFAL": arred(sld_dev_d),
            "VL_DEDUCOES_DIFAL": arred(ded_d),
            "VL_RECOL_DIFAL": arred(recol_d),
            "VL_SLD_CRED_TRANSPORTAR_DIFAL": arred(transp_d),
            "DEB_ESP_DIFAL": arred(deb_esp_d),
            "VL_SLD_CRED_ANT_FCP": arred(sld_ant_f),
            "VL_TOT_DEB_FCP": arred(tot_deb_fcp),
            "VL_OUT_DEB_FCP": arred(out_deb_f),
            "VL_TOT_CRED_FCP": arred(tot_cred_fcp),
            "VL_OUT_CRED_FCP": arred(out_cred_f),
            "VL_SLD_DEV_ANT_FCP": arred(sld_dev_f),
            "VL_DEDUCOES_FCP": arred(ded_f),
            "VL_RECOL_FCP": arred(recol_f),
            "VL_SLD_CRED_TRANSPORTAR_FCP": arred(transp_f),
            "DEB_ESP_FCP": arred(deb_esp_f),
        }
        declarado_num = _normalizar_declarado(decl)
        resultados.append({
            "uf": uf,
            "recomputado": recomputado,
            "declarado": declarado_num,
            "divergencias": _diff_dicts(recomputado, declarado_num),
        })
    return resultados


def _normalizar_declarado(decl: dict) -> dict:
    """Converte campos numericos; preserva IND_* como string."""
    if not decl:
        return {}
    out = {}
    for k, v in decl.items():
        if k.startswith("IND_"):
            # "0" / 0 / 0.0 -> "0"
            out[k] = str(int(n(v))) if v not in (None, "") else str(v or "")
        else:
            out[k] = arred(n(v))
    return out


def _diff_dicts(recomp: dict, decl: dict, tol: float = 0.01) -> list[dict]:
    if not decl:
        return []
    diffs = []
    for chave, valor_r in recomp.items():
        if chave not in decl:
            continue
        valor_d = decl[chave]
        if chave.startswith("IND_"):
            if str(valor_r).strip() != str(valor_d).strip():
                diffs.append({
                    "campo": chave,
                    "recomputado": valor_r,
                    "declarado": valor_d,
                    "diferenca": None,
                })
            continue
        if isinstance(valor_r, (int, float)) and isinstance(valor_d, (int, float)):
            if not eh_igual(float(valor_r), float(valor_d), tol):
                diffs.append({
                    "campo": chave,
                    "recomputado": arred(float(valor_r)),
                    "declarado": arred(float(valor_d)),
                    "diferenca": arred(float(valor_r) - float(valor_d)),
                })
        elif str(valor_r) != str(valor_d):
            diffs.append({
                "campo": chave,
                "recomputado": valor_r,
                "declarado": valor_d,
                "diferenca": None,
            })
    return diffs
