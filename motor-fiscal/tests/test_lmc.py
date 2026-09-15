"""M6 — LMC: fechamento diario e divergencias de volume."""

from motor_fiscal.ingestao import efd_icms_ipi
from motor_fiscal.lmc import auditar_lmc
from tests.conftest import COMPETENCIA, EMPRESA
from tests import helpers_db as H


def test_lmc_conforme(con):
    """1300 bate com vendas NFC-e do dia e com K200."""
    H.reg_efd(con, "1300", {
        "COD_ITEM": "P001", "DT_FECH": "15062026",
        "ESTQ_ABERT": "1000,00", "VOL_ENTR": "500,00", "VOL_DISP": "1500,00",
        "VOL_SAIDAS": "300,00", "ESTQ_ESCR": "1200,00",
        "VAL_AJ_PERDA": "0,00", "VAL_AJ_GANHO": "0,00", "FECH_FISICO": "1200,00",
    }, 1)
    H.reg_efd(con, "1310", {
        "NUM_TANQUE": "1", "ESTQ_ABERT": "1000,00", "VOL_ENTR": "500,00",
        "VOL_DISP": "1500,00", "VOL_SAIDAS": "300,00", "ESTQ_ESCR": "1200,00",
        "VAL_AJ_PERDA": "0,00", "VAL_AJ_GANHO": "0,00", "FECH_FISICO": "1200,00",
    }, 2)
    H.reg_efd(con, "1320", {
        "NUM_BICO": "1", "NR_INTERV": "", "MOT_INTERV": "", "NOM_INTERV": "",
        "CNPJ_INTERV": "", "CPF_INTERV": "", "VAL_FECHA": "500300,00",
        "VAL_ABERT": "500000,00", "VOL_AFERI": "", "VOL_VENDAS": "300,00",
    }, 3)
    H.reg_efd(con, "1370", {"NUM_BICO": "1", "COD_ITEM": "P001", "NUM_TANQUE": "1"}, 4)
    H.reg_efd(con, "K200", {
        "DT_EST": "30062026", "COD_ITEM": "P001", "QTD": "1200,00", "IND_EST": "0", "COD_PART": "",
    }, 5)
    nfce = H.doc(
        con, origem="xml", tipo="nfce", chave="1" * 44, modelo="65",
        numero="900", data_emissao="2026-06-15", valor_total=1500, ind_operacao="1",
    )
    H.item(con, nfce, codigo_produto="P001", quantidade=300, valor_produto=1500, unidade="LT", cfop="5656")
    H.commit(con)

    r = auditar_lmc(con, EMPRESA, COMPETENCIA)
    assert r["registros"]["1300"] == 1
    assert len(r["fechamentos_diarios"]) == 1
    f = r["fechamentos_diarios"][0]
    assert f["divergencia_vol_disp"] == 0.0
    assert f["divergencia_fechamento"] == 0.0
    assert f["divergencia_vendas"] == 0.0
    assert not any(a["severidade"] == "erro" for a in r["achados"])
    assert r["ok"] is True


def test_lmc_divergencias_plantadas(con):
    H.reg_efd(con, "1300", {
        "COD_ITEM": "P001", "DT_FECH": "15062026",
        "ESTQ_ABERT": "1000,00", "VOL_ENTR": "500,00", "VOL_DISP": "1400,00",  # deveria 1500
        "VOL_SAIDAS": "300,00", "ESTQ_ESCR": "1100,00",
        "VAL_AJ_PERDA": "0,00", "VAL_AJ_GANHO": "0,00", "FECH_FISICO": "1000,00",  # diverge
    }, 1)
    H.reg_efd(con, "1320", {
        "NUM_BICO": "9", "NR_INTERV": "", "MOT_INTERV": "", "NOM_INTERV": "",
        "CNPJ_INTERV": "", "CPF_INTERV": "", "VAL_FECHA": "0", "VAL_ABERT": "0",
        "VOL_AFERI": "", "VOL_VENDAS": "10,00",
    }, 2)
    # vendas XML diferentes do VOL_SAIDAS
    nfce = H.doc(
        con, origem="xml", tipo="nfce", chave="2" * 44, modelo="65",
        numero="901", data_emissao="2026-06-15", valor_total=100, ind_operacao="1",
    )
    H.item(con, nfce, codigo_produto="P001", quantidade=100, valor_produto=100, cfop="5656")
    H.reg_efd(con, "K200", {
        "DT_EST": "30062026", "COD_ITEM": "P001", "QTD": "999,00", "IND_EST": "0", "COD_PART": "",
    }, 3)
    H.commit(con)

    r = auditar_lmc(con, EMPRESA, COMPETENCIA)
    codigos = {a["codigo"] for a in r["achados"]}
    assert "LMC_VOL_DISP_DIVERGENTE" in codigos
    assert "LMC_FECHAMENTO_DIVERGENTE" in codigos
    assert "LMC_VENDAS_DIVERGENTES" in codigos
    assert "LMC_BICO_SEM_CADASTRO" in codigos
    assert "LMC_DIVERGENCIA_K200" in codigos
    assert r["ok"] is False


def test_fixtures_m0_lmc_roda(con, efd_icms_ipi_arquivo):
    efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)
    r = auditar_lmc(con, EMPRESA, COMPETENCIA)
    assert r["modulo"] == "lmc"
    assert r["registros"]["1300"] == 1
    assert r["fechamentos_diarios"][0]["codigo"] == "P001"
