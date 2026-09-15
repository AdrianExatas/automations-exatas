"""Testes FECOEP AL — C191, E116 multi-tributo, recompute e Gate 3."""

from pathlib import Path

import pytest

from motor_fiscal.icms import auditar_icms
from motor_fiscal.icms.bloco_e import recomputar_e110, recomputar_e116
from motor_fiscal.icms.fecoep_al import calcular_fecoep_analitico, recomputar_fecoep_al, sumarizar_c191
from motor_fiscal.ingestao import efd_icms_ipi
from tests.conftest import FIXTURES

EMPRESA_AL = "11188276000161"
COMP_AL = "2026-05"
CONFIG = Path(__file__).resolve().parents[1] / "config"


@pytest.fixture
def con_fecoep(con):
    caminho = FIXTURES / "efd_fecoep_al_2026-05.txt"
    efd_icms_ipi.importar(con, caminho, EMPRESA_AL, COMP_AL)
    return con


def test_c191_tipado_e_hierarquia(con_fecoep):
    rows = con_fecoep.execute(
        "SELECT * FROM registros_efd WHERE registro = 'C191' ORDER BY numero_linha"
    ).fetchall()
    assert len(rows) == 2
    assert rows[0]["dados"] is not None
    import json
    d0 = json.loads(rows[0]["dados"])
    assert d0["VL_FCP_OP"] == "20,00"
    pai = con_fecoep.execute(
        "SELECT registro FROM registros_efd WHERE id = ?", (rows[0]["pai_id"],)
    ).fetchone()
    assert pai["registro"] == "C190"
    c191 = sumarizar_c191(con_fecoep)
    assert c191["qtd"] == 2
    assert c191["vl_fcp_op"] == 60.0
    assert c191["vl_fcp_op_entradas"] == 20.0
    assert c191["vl_fcp_op_saidas"] == 40.0


def test_recomputar_e116_multi_tributo_nao_falso_negativo(con_fecoep):
    e110 = recomputar_e110(con_fecoep)
    e116 = recomputar_e116(con_fecoep, e110)
    assert e116["multi_tributo"] is True
    assert e116["soma_vl_or"] == 240.0  # 195+20+22+3
    assert e116["soma_vl_or_icms"] == 195.0
    assert e116["por_cod_rec"]["50059"] == 20.0
    assert e116["por_cod_rec"]["50075"] == 3.0
    # ok compara só COD_OR=000 com VL_ICMS_RECOLHER — não a soma total
    assert e116["ok"] is True
    assert e110["recomputado"]["VL_ICMS_RECOLHER"] == 195.0
    # Sem a correção multi-tributo, soma_vl_or != VL_ICMS_RECOLHER geraria falso negativo
    assert e116["soma_vl_or"] != e116["vl_icms_recolher_e110"]


def test_fecoep_filtra_descricao_nao_fecoep():
    from motor_fiscal.icms.fecoep_al import _eh_ajuste_fecoep, _DEFAULT_FECOEP
    e111 = _DEFAULT_FECOEP["e111"]
    assert _eh_ajuste_fecoep("AL009999", "Debito FECOEP pelas saidas", e111)
    assert _eh_ajuste_fecoep("AL029999", "AJUSTE PARA ZERAR DEBITO DE FECOEP ANTECIPADO", e111)
    assert not _eh_ajuste_fecoep("AL029999", "CREDITO PRESUMIDO PRODESIM", e111)
    assert not _eh_ajuste_fecoep("AL009999", "REF. REVENDA SEM DESTAQUE", e111)
    assert _eh_ajuste_fecoep("AL040001", "qualquer", e111)


def test_fecoep_recompute_valores(con_fecoep):
    e110 = recomputar_e110(con_fecoep)
    fecoep = recomputar_fecoep_al(con_fecoep, config_dir=CONFIG, e110=e110)
    assert fecoep["vl_debitos"] == 45.0
    assert fecoep["vl_creditos"] == 25.0  # 15 + 10 (antecipado)
    assert fecoep["vl_bruto"] == 20.0
    assert fecoep["vl_fecoep_recolher"] == 20.0
    assert fecoep["vl_fecoep_difal_recolher"] == 3.0
    assert fecoep["ok"] is True


def test_auditar_icms_gate3_quatro_receitas(con_fecoep):
    resultado = auditar_icms(
        con_fecoep,
        empresa=EMPRESA_AL,
        competencia=COMP_AL,
        guias_path=FIXTURES / "guias_fecoep_al_2026-05.json",
        config_dir=CONFIG,
    )
    assert resultado["fecoep"]["vl_fecoep_recolher"] == 20.0
    assert resultado["fecoep"]["vl_fecoep_difal_recolher"] == 3.0
    assert resultado["resumo"]["vl_fecoep_recolher"] == 20.0
    assert resultado["e116"]["ok"] is True
    cruz13 = next(c for c in resultado["cruzamentos"] if c["id"] == 13)
    assert cruz13["fecha"] is True
    itens = {i["tributo"]: i for i in cruz13["itens_gate3"]}
    assert itens["fecoep"]["fecha"] is True
    assert itens["fecoep_difal"]["fecha"] is True
    assert itens["icms"]["fecha"] is True
    assert itens["icms_difal"]["fecha"] is True


def test_fecoep_analitico_usa_c191(con_fecoep):
    e110 = recomputar_e110(con_fecoep)
    recompute = recomputar_fecoep_al(con_fecoep, config_dir=CONFIG, e110=e110)
    analitico = calcular_fecoep_analitico(
        con_fecoep, config_dir=CONFIG, e110=e110, recompute=recompute
    )
    assert analitico["fonte"] == "c191"
    assert analitico["vl_debitos"] == 40.0
    assert analitico["vl_creditos"] == 20.0
    assert "referencia_efd" in analitico
