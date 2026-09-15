"""Testes M3 — IPI: E500-E530 e mapa tributario."""

from pathlib import Path

import pytest

from motor_fiscal.ingestao import efd_icms_ipi
from motor_fiscal.ipi import auditar_ipi
from motor_fiscal.ipi.e500 import recomputar_e520
from tests.conftest import COMPETENCIA, EMPRESA, FIXTURES


@pytest.fixture
def con_ipi(con):
    efd_icms_ipi.importar(con, FIXTURES / "efd_ipi_2026-06.txt", EMPRESA, COMPETENCIA)
    return con


def test_ingestao_e520_tipado(con_ipi):
    from motor_fiscal.db import consultas

    ap = consultas.contar_apuracoes(con_ipi)
    assert ap["ipi/E520"] == 1
    e520 = consultas.registros_efd_por_tipo(con_ipi, "E520", "efd_icms_ipi")[0]
    assert e520["VL_DEB_IPI"] == "25,00"
    assert e520["VL_CRED_IPI"] == "50,00"
    assert e520["VL_SC_IPI"] == "25,00"


def test_recompute_e520_conforme(con_ipi):
    e520 = recomputar_e520(con_ipi)
    assert e520["recomputado"]["VL_DEB_IPI"] == 25.0
    assert e520["recomputado"]["VL_CRED_IPI"] == 50.0
    assert e520["recomputado"]["VL_SC_IPI"] == 25.0
    assert e520["recomputado"]["VL_SD_IPI"] == 0.0
    assert e520["divergencias"] == []
    assert len(e520["e510"]) == 2


def test_auditar_ipi_ok(con_ipi):
    config = Path(__file__).resolve().parents[1] / "config"
    resultado = auditar_ipi(
        con_ipi, empresa=EMPRESA, competencia=COMPETENCIA, config_dir=config
    )
    assert resultado["ok"] is True
    assert resultado["resumo"]["vl_cred_ipi"] == 50.0
    assert resultado["mapa_tributario"]["ok"] is True


def test_e520_divergente_plantado(con_ipi):
    import json

    row = con_ipi.execute("SELECT dados FROM apuracoes WHERE registro='E520'").fetchone()
    d = json.loads(row["dados"])
    d["VL_DEB_IPI"] = "999,00"
    payload = json.dumps(d, ensure_ascii=False)
    con_ipi.execute("UPDATE apuracoes SET dados = ? WHERE registro = 'E520'", (payload,))
    con_ipi.execute(
        "UPDATE registros_efd SET dados = ? WHERE registro = 'E520'", (payload,)
    )
    con_ipi.commit()

    e520 = recomputar_e520(con_ipi)
    assert any(d["campo"] == "VL_DEB_IPI" for d in e520["divergencias"])
    resultado = auditar_ipi(con_ipi, empresa=EMPRESA, competencia=COMPETENCIA)
    assert resultado["ok"] is False
