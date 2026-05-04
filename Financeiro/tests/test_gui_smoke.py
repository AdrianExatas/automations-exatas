from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path


os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

try:
    from PySide6.QtWidgets import QApplication
    from financeiro_nfse.gui.renomear_window import (
        MainWindow,
        ProcessWorker,
        RenameWorker,
        Worker,
    )
except ImportError:  # pragma: no cover
    QApplication = None
    MainWindow = None
    Worker = None


@unittest.skipIf(QApplication is None, "PySide6 nao disponivel no ambiente")
class TestGuiSmoke(unittest.TestCase):
    def test_instancia_janela_unificada(self):
        app = QApplication.instance() or QApplication([])
        win = MainWindow()
        self.assertIsNotNone(win.statusBar)
        self.assertEqual(win.btn_processar.text(), "Baixar e organizar notas")
        self.assertEqual(win.btn_renomear.text(), "Renomear notas externas")
        self.assertEqual(win.btn_cancelar.text(), "Cancelar")
        self.assertFalse(win.btn_cancelar.isEnabled())
        self.assertFalse(hasattr(win, "btn_consultar"))
        self.assertFalse(hasattr(win, "btn_baixar"))
        self.assertFalse(hasattr(win, "edit_json_input"))
        self.assertFalse(win.advanced_group.isChecked())
        self.assertFalse(win.advanced_content.isVisible())
        self.assertFalse(win.details_group.isChecked())
        self.assertFalse(win.details_content.isVisible())
        self.assertEqual(win.combo_format.currentData(), "ambos")
        self.assertTrue(win.check_headless.isChecked())
        self.assertEqual(win.combo_tipo.currentData(), "servico")
        self.assertEqual(win.edit_data_inicial.text(), "")
        self.assertEqual(win.edit_data_final.text(), "")
        self.assertFalse(hasattr(win, "edit_competencia"))

        win._set_action_buttons_enabled(False)
        self.assertFalse(win.btn_processar.isEnabled())
        self.assertFalse(win.btn_renomear.isEnabled())
        self.assertTrue(win.btn_cancelar.isEnabled())
        win._set_action_buttons_enabled(True)

        win.close()
        app.quit()

    def test_instancia_workers(self):
        app = QApplication.instance() or QApplication([])
        with tempfile.TemporaryDirectory() as tmp:
            process_worker = ProcessWorker(
                data_inicial="25/03/2026",
                data_final="31/03/2026",
                competencia="03-2026",
                output_dir=Path(tmp),
                env_file=None,
                config_path=None,
                file_format="ambos",
                headless=True,
                limit=None,
                http_timeout=120,
                retries=3,
                rename_dest_dir=None,
                rename_prefix="",
            )
            rename_worker = RenameWorker(
                pasta_origem=Path(tmp),
                pasta_destino=None,
                tipo="servico",
                competencia="03-2026",
                prefixo="",
                dry_run=True,
                config_path=None,
                log_file=None,
            )
            worker_alias = Worker(
                pasta_origem=Path(tmp),
                pasta_destino=None,
                tipo="servico",
                competencia="03-2026",
                prefixo="",
                dry_run=True,
                config_path=None,
                log_file=None,
            )

            self.assertIsNotNone(process_worker)
            self.assertEqual(process_worker.data_inicial, "25/03/2026")
            self.assertEqual(process_worker.data_final, "31/03/2026")
            self.assertEqual(process_worker.competencia, "03-2026")
            self.assertIsNotNone(rename_worker)
            self.assertIsNotNone(worker_alias)

        app.quit()
