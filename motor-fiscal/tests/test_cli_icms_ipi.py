"""CLI auditar/apurar para modulos ICMS e IPI (M2/M3)."""

import json
from pathlib import Path

from motor_fiscal.__main__ import main
from tests.conftest import COMPETENCIA, EMPRESA, FIXTURES

CONFIG = Path(__file__).resolve().parents[1] / "config"


def test_cli_auditar_icms_ipi(tmp_path):
    db_dir = tmp_path / "db"
    saida = tmp_path / "out.json"
    assert main([
        "importar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--efd", str(FIXTURES / "efd_ipi_2026-06.txt"),
        "--db-dir", str(db_dir),
    ]) == 0

    assert main([
        "auditar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--modulos", "icms,ipi",
        "--db-dir", str(db_dir),
        "--saida", str(saida),
        "--config-dir", str(CONFIG),
        "--guias", str(FIXTURES / "guias_2026-06.json"),
    ]) == 0

    data = json.loads(saida.read_text(encoding="utf-8"))
    assert "icms" in data["modulos"]
    assert "ipi" in data["modulos"]
    assert data["resumo"]["ok"] is True
    assert len(data["modulos"]["icms"]["cruzamentos"]) == 13


def test_cli_apurar_icms(tmp_path):
    db_dir = tmp_path / "db"
    saida = tmp_path / "icms.json"
    assert main([
        "importar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--efd", str(FIXTURES / "efd_icms_ipi_2026-06.txt"),
        "--db-dir", str(db_dir),
    ]) == 0
    assert main([
        "apurar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--tributo", "icms",
        "--db-dir", str(db_dir),
        "--saida", str(saida),
        "--guias", str(FIXTURES / "guias_2026-06.json"),
        "--config-dir", str(CONFIG),
    ]) == 0
    data = json.loads(saida.read_text(encoding="utf-8"))
    assert list(data["modulos"]) == ["icms"]
