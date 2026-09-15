"""M9 — harness de paridade ControlDocs."""

import json
from pathlib import Path

from motor_fiscal.__main__ import main
from motor_fiscal.paridade import comparar, comparar_e_gravar
from tests.conftest import FIXTURES

PARIDADE = FIXTURES / "paridade"


def test_paridade_ok_sintetica(tmp_path):
    rel = comparar_e_gravar(
        PARIDADE / "motor_sintetico.json",
        PARIDADE / "controldocs_sintetico.json",
        saida=tmp_path / "paridade",
    )
    assert rel["ok"] is True
    assert rel["total_divergencias"] == 0
    assert Path(rel["arquivo"]).is_file()
    assert Path(rel["arquivo_md"]).is_file()


def test_paridade_detecta_divergencia():
    motor = json.loads((PARIDADE / "motor_sintetico.json").read_text(encoding="utf-8"))
    cd = json.loads((PARIDADE / "controldocs_divergente.json").read_text(encoding="utf-8"))
    rel = comparar(motor, cd)
    assert rel["ok"] is False
    assert "icms" in rel["modulos_divergentes"]
    campos = {d["campo"] for d in rel["divergencias"]}
    assert "vl_icms_recolher" in campos
    assert "cruzamentos_ok" in campos


def test_cli_paridade(tmp_path):
    saida = tmp_path / "out" / "paridade.json"
    codigo = main([
        "paridade",
        "--motor", str(PARIDADE / "motor_sintetico.json"),
        "--controldocs", str(PARIDADE / "controldocs_sintetico.json"),
        "--saida", str(saida),
    ])
    assert codigo == 0
    assert saida.is_file()


def test_smoke_import_painel():
    import importlib.util

    painel = Path(__file__).resolve().parents[1] / "app" / "painel.py"
    spec = importlib.util.spec_from_file_location("painel_motor_fiscal", painel)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    assert callable(mod.main)
    assert callable(mod._raiz_relatorios)
