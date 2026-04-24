from __future__ import annotations

import unittest
from pathlib import Path
from unittest.mock import patch

from financeiro_nfse import cli
from financeiro_nfse.models import DownloadResult, ProcessResult


class TestCLI(unittest.TestCase):
    def test_consultar_dispatch(self):
        with patch("financeiro_nfse.cli.workflows.query_nfse_workflow", return_value=Path("out.json")) as mock_query:
            exit_code = cli.main(["consultar", "--competencia", "03-2026"])
        self.assertEqual(exit_code, 0)
        mock_query.assert_called_once()

    def test_baixar_dispatch(self):
        with patch(
            "financeiro_nfse.cli.workflows.download_from_json_workflow",
            return_value=DownloadResult(successes=1, failures=0, output_dir=Path("saida")),
        ) as mock_download:
            exit_code = cli.main(["baixar", "--input", "arquivo.json"])
        self.assertEqual(exit_code, 0)
        mock_download.assert_called_once()

    def test_renomear_dispatch(self):
        with patch(
            "financeiro_nfse.cli.workflows.rename_existing_pdfs_workflow",
            return_value=type("RenameSummary", (), {"renomeados": 1, "nao_encontrados": 0, "erros": 0})(),
        ) as mock_rename:
            exit_code = cli.main(["renomear", "--tipo", "servico"])
        self.assertEqual(exit_code, 0)
        mock_rename.assert_called_once()

    def test_processar_dispatch(self):
        with patch(
            "financeiro_nfse.cli.workflows.process_previous_month_workflow",
            return_value=ProcessResult(
                json_path=Path("out.json"),
                download=DownloadResult(successes=1, failures=0, output_dir=Path("saida")),
            ),
        ) as mock_process:
            exit_code = cli.main(["processar"])
        self.assertEqual(exit_code, 0)
        mock_process.assert_called_once()

    def test_gui_dispatch(self):
        with patch("financeiro_nfse.gui.renomear_window.main", return_value=0) as mock_gui:
            exit_code = cli.main(["gui", "renomear"])
        self.assertEqual(exit_code, 0)
        mock_gui.assert_called_once()
