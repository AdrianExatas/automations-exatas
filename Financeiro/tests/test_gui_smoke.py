from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path


os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

try:
    from PySide6.QtWidgets import QApplication
    from financeiro_nfse.gui.renomear_window import MainWindow, Worker
except ImportError:  # pragma: no cover
    QApplication = None
    MainWindow = None
    Worker = None


@unittest.skipIf(QApplication is None, "PySide6 nao disponivel no ambiente")
class TestGuiSmoke(unittest.TestCase):
    def test_instancia_janela_e_worker(self):
        app = QApplication.instance() or QApplication([])
        win = MainWindow()
        self.assertIsNotNone(win.statusBar)

        with tempfile.TemporaryDirectory() as tmp:
            worker = Worker(
                pasta_origem=Path(tmp),
                pasta_destino=None,
                tipo="servico",
                competencia="03-2026",
                prefixo="",
                dry_run=True,
                config_path=None,
                log_file=None,
            )
            self.assertIsNotNone(worker)

        win.close()
        app.quit()
