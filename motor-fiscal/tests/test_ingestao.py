"""Teste ponta a ponta: CLI importar -> SQLite -> contagens."""

import sqlite3

import pytest

from motor_fiscal.__main__ import main
from motor_fiscal.db import consultas
from tests.conftest import CHAVE_NFE_503, COMPETENCIA, EMPRESA


@pytest.fixture
def banco(tmp_path, xml_dir, efd_icms_ipi_arquivo, efd_contribuicoes_arquivo, capsys):
    codigo = main([
        "importar",
        "--empresa", "12.345.678/0001-99",   # mascara deve ser aceita
        "--competencia", COMPETENCIA,
        "--xml-dir", str(xml_dir),
        "--efd", str(efd_icms_ipi_arquivo),
        "--efd-contrib", str(efd_contribuicoes_arquivo),
        "--db-dir", str(tmp_path),
    ])
    assert codigo == 0
    caminho = tmp_path / EMPRESA / f"{COMPETENCIA}.db"
    assert caminho.exists(), "banco deve ficar em <db-dir>/<cnpj>/<AAAA-MM>.db"
    con = sqlite3.connect(caminho)
    con.row_factory = sqlite3.Row
    yield con
    con.close()


def test_contagens_documentos(banco):
    docs = consultas.contar_documentos(banco)
    assert docs["xml/nfe"] == 3          # entrada + saida 501 + saida 503 (cancelada)
    assert docs["xml/nfce"] == 1
    assert docs["xml/cte"] == 1
    assert docs["xml/cfe"] == 1
    assert docs["efd_icms_ipi/nfe"] == 2
    assert docs["efd_icms_ipi/cte"] == 1
    assert docs["efd_contribuicoes/nfe"] == 1
    assert docs["efd_contribuicoes/nfse"] == 1


def test_cancelamento_aplicado_por_evento(banco):
    doc = consultas.documento_por_chave(banco, CHAVE_NFE_503, origem="xml")
    assert doc["situacao"] == "cancelada"
    assert consultas.contar_eventos(banco) == 1


def test_itens_e_produtos(banco):
    # XML: 3 NF-e x1 + NFC-e x1 + CF-e x1 = 5; EFD ICMS/IPI: 2 C170; Contribuicoes: A170 + C170 = 2
    assert consultas.contar_itens(banco) == 9
    produtos = consultas.contar_produtos(banco)
    assert produtos["efd_0200"] == 2
    assert produtos["xml"] == 3          # G001, P001, P002


def test_registros_e_apuracoes(banco):
    resumo = consultas.resumo_importacao(banco)
    assert resumo["registros_efd_icms_ipi"] == 105
    assert resumo["registros_efd_contribuicoes"] == 61
    assert sum(resumo["apuracoes"].values()) == 14   # 6 do bloco E/G + 8 do bloco M


def test_resumo_impresso(tmp_path, xml_dir, capsys):
    codigo = main([
        "importar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--xml-dir", str(xml_dir),
        "--db-dir", str(tmp_path),
    ])
    assert codigo == 0
    saida = capsys.readouterr().out
    assert "Resumo do banco apos importacao" in saida
    assert "xml/nfe: 3" in saida


def test_sem_inputs_retorna_erro(tmp_path, capsys):
    codigo = main([
        "importar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--db-dir", str(tmp_path),
    ])
    assert codigo == 2
    assert "pelo menos um input" in capsys.readouterr().err


def test_competencia_invalida(tmp_path, xml_dir, capsys):
    codigo = main([
        "importar",
        "--empresa", EMPRESA,
        "--competencia", "06/2026",
        "--xml-dir", str(xml_dir),
        "--db-dir", str(tmp_path),
    ])
    assert codigo == 2
