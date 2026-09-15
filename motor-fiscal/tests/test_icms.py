"""Testes M2 — ICMS: livro, Bloco E, cruzamentos, mapa."""

from pathlib import Path

import pytest

from motor_fiscal.icms import auditar_icms
from motor_fiscal.icms.bloco_e import recomputar_e110
from motor_fiscal.icms.livro import montar_livro
from motor_fiscal.ingestao import efd_icms_ipi, xml_importador
from tests.conftest import COMPETENCIA, EMPRESA, FIXTURES


@pytest.fixture
def con_conforme(con, efd_icms_ipi_arquivo):
    efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)
    return con


@pytest.fixture
def con_divergente(con):
    caminho = FIXTURES / "efd_icms_e110_divergente_2026-06.txt"
    efd_icms_ipi.importar(con, caminho, EMPRESA, COMPETENCIA)
    return con


def test_livro_entradas_saidas(con_conforme):
    livro = montar_livro(con_conforme)
    assert livro["totais_saidas"]["vl_icms"] == 90.0
    assert livro["totais_entradas"]["vl_icms"] == 210.0  # 180 NF + 30 CT-e
    assert any(l["cfop"] == "5656" for l in livro["saidas"])
    assert any(l["cfop"] == "1656" for l in livro["entradas"])
    assert any(l["cfop"] == "1352" for l in livro["entradas"])


def test_e110_conforme_recompute(con_conforme):
    e110 = recomputar_e110(con_conforme)
    assert e110["recomputado"]["VL_TOT_DEBITOS"] == 90.0
    assert e110["recomputado"]["VL_TOT_CREDITOS"] == 210.0
    assert e110["recomputado"]["VL_SLD_CREDOR_TRANSPORTAR"] == 120.0
    assert e110["recomputado"]["VL_ICMS_RECOLHER"] == 0.0
    assert e110["divergencias"] == []


def test_e110_divergente_detectado(con_divergente):
    e110 = recomputar_e110(con_divergente)
    assert e110["recomputado"]["VL_TOT_DEBITOS"] == 90.0
    assert e110["declarado"]["VL_TOT_DEBITOS"] == 999.0
    assert any(d["campo"] == "VL_TOT_DEBITOS" for d in e110["divergencias"])


def test_auditar_icms_conforme_com_guias(con_conforme):
    guias = FIXTURES / "guias_2026-06.json"
    config = Path(__file__).resolve().parents[1] / "config"
    resultado = auditar_icms(
        con_conforme,
        empresa=EMPRESA,
        competencia=COMPETENCIA,
        guias_path=guias,
        config_dir=config,
    )
    assert resultado["ok"] is True
    assert resultado["resumo"]["cruzamentos_ok"] == 13
    assert resultado["mapa_tributario"]["ok"] is True
    assert resultado["e210"][0]["divergencias"] == []
    assert resultado["g110"]["ok"] is True

    cruz = {c["id"]: c for c in resultado["cruzamentos"]}
    assert cruz[12]["fecha"] is True
    assert cruz[13]["fecha"] is True


def test_auditar_icms_detecta_falha_plantada(con_divergente):
    resultado = auditar_icms(
        con_divergente,
        empresa=EMPRESA,
        competencia=COMPETENCIA,
        guias_path=FIXTURES / "guias_2026-06.json",
        config_dir=Path(__file__).resolve().parents[1] / "config",
    )
    assert resultado["ok"] is False
    cruz12 = next(c for c in resultado["cruzamentos"] if c["id"] == 12)
    assert cruz12["fecha"] is False


def test_cruzamento_xml_efd_quando_ambos(con, efd_icms_ipi_arquivo, xml_dir):
    efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)
    xml_importador.importar_diretorio(con, xml_dir, EMPRESA, COMPETENCIA)
    resultado = auditar_icms(
        con,
        empresa=EMPRESA,
        competencia=COMPETENCIA,
        config_dir=Path(__file__).resolve().parents[1] / "config",
    )
    cruz1 = next(c for c in resultado["cruzamentos"] if c["id"] == 1)
    # Fixtures tem XMLs extras (NFCe/CFe/503) nao escriturados na EFD
    assert cruz1["fecha"] is False
    assert cruz1["faltantes_na_efd"]
