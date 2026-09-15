"""Testes da ingestao da EFD-Contribuicoes no SQLite."""

import pytest

from motor_fiscal.db import consultas
from motor_fiscal.ingestao import efd_contribuicoes
from tests.conftest import CHAVE_NFE_501, COMPETENCIA, EMPRESA


@pytest.fixture
def resumo(con, efd_contribuicoes_arquivo):
    return efd_contribuicoes.importar(con, efd_contribuicoes_arquivo, EMPRESA, COMPETENCIA)


def test_arquivo_valido_sem_avisos(con, resumo):
    assert resumo["avisos"] == []
    assert resumo["nao_tipados"] == {}
    contagens = consultas.contar_registros_efd(con, "efd_contribuicoes")
    assert sum(contagens.values()) == 61
    assert contagens["9900"] == 31


def test_a100_vira_documento_servico(con, resumo):
    docs = con.execute(
        "SELECT * FROM documentos WHERE origem = 'efd_contribuicoes' AND tipo = 'nfse'"
    ).fetchall()
    assert len(docs) == 1
    doc = docs[0]
    assert doc["numero"] == "10"
    assert doc["valor_total"] == 2000.0
    assert doc["vpis"] == 33.0
    assert doc["vcofins"] == 152.0

    itens = consultas.itens_do_documento(con, doc["id"])
    assert len(itens) == 1
    assert itens[0]["codigo_produto"] == "SERV1"
    assert itens[0]["cst_pis"] == "50"
    assert itens[0]["vcofins"] == 152.0


def test_c100_contribuicoes_vira_documento(con, resumo):
    doc = consultas.documento_por_chave(con, CHAVE_NFE_501, origem="efd_contribuicoes")
    assert doc is not None
    assert doc["tipo"] == "nfe"
    assert doc["vpis"] == 8.25
    itens = consultas.itens_do_documento(con, doc["id"])
    assert itens[0]["cfop"] == "5656"


def test_c180_c190_tipados(con, resumo):
    c180 = consultas.registros_efd_por_tipo(con, "C180", "efd_contribuicoes")
    assert c180[0]["COD_ITEM"] == "P001"
    assert c180[0]["VL_TOT_ITEM"] == "500,00"
    c190 = consultas.registros_efd_por_tipo(con, "C190", "efd_contribuicoes")
    assert c190[0]["VL_TOT_ITEM"] == "1000,00"


def test_f100_f600_tipados(con, resumo):
    f100 = consultas.registros_efd_por_tipo(con, "F100", "efd_contribuicoes")
    assert f100[0]["DESC_DOC_OPER"] == "ALUGUEL MAQUINA"
    f600 = consultas.registros_efd_por_tipo(con, "F600", "efd_contribuicoes")
    assert f600[0]["VL_RET_PIS"] == "6,50"
    assert f600[0]["VL_RET_COFINS"] == "30,00"


def test_bloco_m_vira_apuracao(con, resumo):
    apuracoes = consultas.contar_apuracoes(con)
    for registro in ("M100", "M105", "M200", "M210"):
        assert apuracoes[f"pis/{registro}"] == 1
    for registro in ("M500", "M505", "M600", "M610"):
        assert apuracoes[f"cofins/{registro}"] == 1

    m210 = con.execute(
        "SELECT valor_recolher FROM apuracoes WHERE registro = 'M210'"
    ).fetchone()
    assert m210["valor_recolher"] == 8.25
    m610 = con.execute(
        "SELECT valor_recolher FROM apuracoes WHERE registro = 'M610'"
    ).fetchone()
    assert m610["valor_recolher"] == 38.0


def test_hierarquia_m105_m100(con, resumo):
    m105 = con.execute("SELECT * FROM registros_efd WHERE registro = 'M105'").fetchone()
    pai = con.execute("SELECT registro FROM registros_efd WHERE id = ?", (m105["pai_id"],)).fetchone()
    assert pai["registro"] == "M100"
