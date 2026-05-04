from __future__ import annotations

import tempfile
import unittest
from unittest.mock import patch
import sys
from datetime import datetime
import importlib
from pathlib import Path

import financeiro_nfse.config as config_module
from financeiro_nfse.config import (
    default_competencia,
    parse_date_range,
    resolve_competencia,
    resolve_output_root,
    resolve_query_period,
)
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

    def test_parse_date_range_valido_deriva_competencia(self):
        periodo = parse_date_range("25/03/2026", "31/03/2026")

        self.assertEqual(periodo.start_date.isoformat(), "2026-03-25")
        self.assertEqual(periodo.end_date.isoformat(), "2026-03-31")
        self.assertEqual(periodo.competencia, "03-2026")

    def test_parse_date_range_data_invalida(self):
        with self.assertRaisesRegex(RuntimeError, "Data inicial invalida"):
            parse_date_range("2026-03-25", "31/03/2026")

    def test_parse_date_range_bloqueia_final_antes_da_inicial(self):
        with self.assertRaisesRegex(RuntimeError, "Data final nao pode"):
            parse_date_range("31/03/2026", "25/03/2026")

    def test_parse_date_range_bloqueia_intervalo_entre_meses(self):
        with self.assertRaisesRegex(RuntimeError, "mes"):
            parse_date_range("31/03/2026", "01/04/2026")

    def test_resolve_query_period_prioriza_datas(self):
        periodo = resolve_query_period(
            data_inicial="25/03/2026",
            data_final="31/03/2026",
            competencia="04-2026",
        )

        self.assertEqual(periodo.start_date.isoformat(), "2026-03-25")
        self.assertEqual(periodo.end_date.isoformat(), "2026-03-31")
        self.assertEqual(periodo.competencia, "03-2026")

    def test_resolve_query_period_usa_competencia_legada(self):
        periodo = resolve_query_period(competencia="03-2026")

        self.assertEqual(periodo.start_date.isoformat(), "2026-03-01")
        self.assertEqual(periodo.end_date.isoformat(), "2026-03-31")
        self.assertEqual(periodo.competencia, "03-2026")

    def test_resolve_query_period_exige_datas_ou_competencia(self):
        with self.assertRaisesRegex(RuntimeError, "Informe data inicial"):
            resolve_query_period()

    def test_runtime_root_usa_pasta_do_executavel_quando_empacotado(self):
        fake_exe = Path("C:/pacote/Financeiro NFSe/Financeiro NFSe.exe")
        with patch.object(sys, "frozen", True, create=True), patch.object(sys, "executable", str(fake_exe)):
            reloaded = importlib.reload(config_module)
            self.assertEqual(reloaded.ROOT_DIR, fake_exe.parent)
            self.assertEqual(reloaded.DEFAULT_OUTPUT_ROOT, fake_exe.parent / "var" / "saida_nfse")

        importlib.reload(config_module)
