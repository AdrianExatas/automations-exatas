from __future__ import annotations

import tempfile
import unittest
from datetime import datetime
from pathlib import Path

from financeiro_nfse.config import default_competencia, resolve_competencia, resolve_output_root
from financeiro_nfse.models import NFSeItem


class TestConfig(unittest.TestCase):
    def test_default_competencia_usa_mes_anterior(self):
        self.assertEqual(default_competencia(reference=datetime(2026, 4, 9)), "03-2026")

    def test_resolve_competencia_prioriza_input(self):
        competencia = resolve_competencia(input_path=Path("nfse_2026-03.json"))
        self.assertEqual(competencia, "03-2026")

    def test_resolve_competencia_pelo_item(self):
        item = NFSeItem(
            cnpj_emissor="1",
            codigo_verificacao="2",
            numero="3",
            data_emissao="09/04/2026",
        )
        competencia = resolve_competencia(items=[item])
        self.assertEqual(competencia, "04-2026")

    def test_resolve_output_root_usa_config(self):
        with tempfile.TemporaryDirectory() as tmp:
            config_path = Path(tmp) / "financeiro.ini"
            config_path.write_text("[paths]\noutput_dir = saida-custom\n", encoding="utf-8")
            output = resolve_output_root(None, competencia="03-2026", config_path=config_path)
            self.assertEqual(output, (Path(tmp) / "saida-custom" / "03-2026").resolve())
