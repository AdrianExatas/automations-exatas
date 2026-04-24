from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from financeiro_nfse.models import DownloadResult, NFSeItem
from financeiro_nfse.workflows import download_from_json_workflow, query_nfse_workflow


class TestWorkflows(unittest.TestCase):
    def test_query_nfse_workflow_gera_json(self):
        item = NFSeItem(cnpj_emissor="1", codigo_verificacao="ABC", numero="123", data_emissao="01/03/2026")

        with tempfile.TemporaryDirectory() as tmp, \
            patch("financeiro_nfse.workflows.load_env", return_value={"APP_KEY": "a", "APP_SECRET": "b"}), \
            patch("financeiro_nfse.workflows.omie.fetch_all_nfse", return_value=[item]):
            path = query_nfse_workflow(competencia="03-2026", output_dir=tmp)

            self.assertTrue(path.exists())
            self.assertIn("nfse_2026-03.json", path.name)

    def test_download_workflow_chama_renomeacao_automatica(self):
        with tempfile.TemporaryDirectory() as tmp:
            input_path = Path(tmp) / "nfse_2026-03.json"
            input_path.write_text(
                '[{"cCNPJEmissor":"1","cCodigoVerifNFSe":"ABC","nNumeroNFSe":"123","Emissao":{"cDataEmissao":"01/03/2026"}}]',
                encoding="utf-8",
            )

            def fake_download(items, output_dir, **kwargs):
                pdf_path = Path(tmp) / "teste.pdf"
                pdf_path.write_bytes(b"%PDF-1.4\n")
                kwargs["rename_callback"](pdf_path)
                return DownloadResult(successes=1, failures=0, output_dir=output_dir)

            with patch("financeiro_nfse.workflows.webiss.download_documents", side_effect=fake_download), \
                patch(
                    "financeiro_nfse.workflows.renaming.rename_pdf_file",
                    return_value=("renomeado", Path(tmp) / "RENOMEADOS" / "teste.pdf"),
                ) as rename_mock:
                result = download_from_json_workflow(input_path=input_path, output_dir=tmp)

            self.assertEqual(result.successes, 1)
            rename_mock.assert_called_once()

    def test_download_workflow_falha_quando_nao_consegue_renomear(self):
        with tempfile.TemporaryDirectory() as tmp:
            input_path = Path(tmp) / "nfse_2026-03.json"
            input_path.write_text(
                '[{"cCNPJEmissor":"1","cCodigoVerifNFSe":"ABC","nNumeroNFSe":"123","Emissao":{"cDataEmissao":"01/03/2026"}}]',
                encoding="utf-8",
            )

            def fake_download(items, output_dir, **kwargs):
                pdf_path = Path(tmp) / "teste.pdf"
                pdf_path.write_bytes(b"%PDF-1.4\n")
                kwargs["rename_callback"](pdf_path)
                return DownloadResult(successes=1, failures=0, output_dir=output_dir)

            with patch("financeiro_nfse.workflows.webiss.download_documents", side_effect=fake_download), \
                patch("financeiro_nfse.workflows.renaming.rename_pdf_file", return_value=("nao_encontrado", None)):
                with self.assertRaises(RuntimeError):
                    download_from_json_workflow(input_path=input_path, output_dir=tmp)
