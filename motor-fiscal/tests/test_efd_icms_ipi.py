"""Testes da ingestao da EFD ICMS/IPI no SQLite."""

import pytest

from motor_fiscal.db import consultas
from motor_fiscal.ingestao import efd_icms_ipi
from tests.conftest import CHAVE_CTE_77, CHAVE_NFE_501, CHAVE_NFE_ENTRADA, COMPETENCIA, EMPRESA


@pytest.fixture
def resumo(con, efd_icms_ipi_arquivo):
    return efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)


def test_todos_os_registros_gravados_crus(con, resumo):
    assert resumo["avisos"] == []
    contagens = consultas.contar_registros_efd(con, "efd_icms_ipi")
    assert sum(contagens.values()) == 105
    assert contagens["C100"] == 2
    assert contagens["9900"] == 49
    # estruturais (nao tipados) tambem estao la
    assert contagens["0990"] == 1


def test_registros_estruturais_nao_sao_desconhecidos(resumo):
    assert resumo["nao_tipados"] == {}


def test_c100_vira_documento(con, resumo):
    doc = consultas.documento_por_chave(con, CHAVE_NFE_ENTRADA)
    assert doc is not None
    assert doc["origem"] == "efd_icms_ipi"
    assert doc["tipo"] == "nfe"
    assert doc["ind_operacao"] == "0"
    assert doc["situacao"] == "regular"
    assert doc["numero"] == "123"
    assert doc["data_emissao"] == "2026-06-05"
    assert doc["valor_total"] == 1000.0
    assert doc["vicms"] == 180.0

    saida = consultas.documento_por_chave(con, CHAVE_NFE_501, origem="efd_icms_ipi")
    assert saida["ind_operacao"] == "1"
    assert saida["valor_total"] == 500.0


def test_c170_vira_item_vinculado(con, resumo):
    doc = consultas.documento_por_chave(con, CHAVE_NFE_ENTRADA)
    itens = consultas.itens_do_documento(con, doc["id"])
    assert len(itens) == 1
    item = itens[0]
    assert item["codigo_produto"] == "P001"
    assert item["cfop"] == "1656"
    assert item["cst_icms"] == "000"
    assert item["quantidade"] == 200.0
    assert item["vicms"] == 180.0
    assert item["vpis"] == 16.5
    assert item["vcofins"] == 76.0


def test_d100_vira_documento_cte(con, resumo):
    doc = consultas.documento_por_chave(con, CHAVE_CTE_77)
    assert doc is not None
    assert doc["tipo"] == "cte"
    assert doc["modelo"] == "57"
    assert doc["valor_total"] == 250.0
    assert doc["vicms"] == 30.0


def test_0200_vira_produto(con, resumo):
    produtos = con.execute(
        "SELECT * FROM produtos WHERE origem = 'efd_0200' ORDER BY codigo"
    ).fetchall()
    assert [p["codigo"] for p in produtos] == ["P001", "P002"]
    assert produtos[0]["descricao"] == "GASOLINA COMUM"
    assert produtos[0]["ncm"] == "27101259"
    assert produtos[0]["aliq_icms"] == 18.0


def test_bloco_e_vira_apuracao(con, resumo):
    apuracoes = consultas.contar_apuracoes(con)
    assert apuracoes["icms/E110"] == 1
    assert apuracoes["icms/E111"] == 1
    assert apuracoes["icms/E116"] == 1
    assert apuracoes["icms_st/E210"] == 1
    assert apuracoes["icms_difal_fcp/E310"] == 1
    assert apuracoes["ciap/G110"] == 1

    e110 = consultas.registros_efd_por_tipo(con, "E110", "efd_icms_ipi")[0]
    assert e110["VL_TOT_DEBITOS"] == "90,00"
    assert e110["VL_SLD_CREDOR_TRANSPORTAR"] == "120,00"

    # E210/E310 carregam a UF do E200/E300 pai
    uf_st = con.execute("SELECT uf FROM apuracoes WHERE registro = 'E210'").fetchone()
    assert uf_st["uf"] == "BA"


def test_hierarquia_pai_filho(con, resumo):
    c170 = con.execute(
        "SELECT * FROM registros_efd WHERE registro = 'C170' ORDER BY numero_linha"
    ).fetchall()
    pai = con.execute(
        "SELECT * FROM registros_efd WHERE id = ?", (c170[0]["pai_id"],)
    ).fetchone()
    assert pai["registro"] == "C100"


def test_registros_1300_tipados(con, resumo):
    lmc = consultas.registros_efd_por_tipo(con, "1300", "efd_icms_ipi")
    assert lmc[0]["COD_ITEM"] == "P001"
    assert lmc[0]["ESTQ_ABERT"] == "1000,00"
    bico = consultas.registros_efd_por_tipo(con, "1370", "efd_icms_ipi")
    assert bico[0]["NUM_BICO"] == "1"
