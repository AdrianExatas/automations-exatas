from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"

EMPRESA = "12345678000199"
COMPETENCIA = "2026-06"

CHAVE_NFE_ENTRADA = "28260698765432000188550010000001231000001234"
CHAVE_NFE_501 = "28260612345678000199550010000005011000005017"
CHAVE_NFE_503 = "28260612345678000199550010000005031000005039"
CHAVE_NFCE_900 = "28260612345678000199650010000009001000009005"
CHAVE_CTE_77 = "28260611222333000144570010000000771000000772"
CHAVE_CFE_42 = "28260612345678000199590001234560000421234567"


@pytest.fixture
def fixtures_dir() -> Path:
    return FIXTURES


@pytest.fixture
def efd_icms_ipi_arquivo() -> Path:
    return FIXTURES / "efd_icms_ipi_2026-06.txt"


@pytest.fixture
def efd_contribuicoes_arquivo() -> Path:
    return FIXTURES / "efd_contribuicoes_2026-06.txt"


@pytest.fixture
def xml_dir() -> Path:
    return FIXTURES / "xmls"


@pytest.fixture
def con(tmp_path):
    from motor_fiscal.db import conectar

    con = conectar(tmp_path / "teste.db")
    yield con
    con.close()
