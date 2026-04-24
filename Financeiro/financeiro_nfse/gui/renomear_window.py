from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

from PySide6.QtCore import QThread, Signal, Slot
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMainWindow,
    QPlainTextEdit,
    QPushButton,
    QStatusBar,
    QVBoxLayout,
    QWidget,
)

from ..config import default_competencia
from ..renaming import TIPO_PRODUTOS, TIPO_SERVICO
from ..workflows import rename_existing_pdfs_workflow


class Worker(QThread):
    log_line = Signal(str)
    finished_with_result = Signal(int, int, int)

    def __init__(
        self,
        *,
        pasta_origem: Path,
        pasta_destino: Path | None,
        tipo: str,
        competencia: str,
        prefixo: str,
        dry_run: bool,
        config_path: Path | None,
        log_file: str | Path | None,
        parent=None,
    ):
        super().__init__(parent)
        self.pasta_origem = pasta_origem
        self.pasta_destino = pasta_destino
        self.tipo = tipo
        self.competencia = competencia
        self.prefixo = prefixo
        self.dry_run = dry_run
        self.config_path = config_path
        self.log_file = log_file

    def run(self) -> None:
        try:
            result = rename_existing_pdfs_workflow(
                pasta_origem=self.pasta_origem,
                tipo=self.tipo,
                pasta_destino=self.pasta_destino,
                competencia=self.competencia,
                prefixo=self.prefixo,
                dry_run=self.dry_run,
                config_path=self.config_path,
                log_file=self.log_file,
                log_callback=self.log_line.emit,
            )
            self.finished_with_result.emit(result.renomeados, result.nao_encontrados, result.erros)
        except Exception as exc:
            self.log_line.emit(f"Erro: {type(exc).__name__}: {exc}")
            self.finished_with_result.emit(0, 0, 1)


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.worker: Worker | None = None
        self._build_ui()
        self._carregar_padroes()

    def _build_ui(self) -> None:
        self.setWindowTitle("Renomear Notas Fiscais")
        self.setMinimumWidth(560)
        self.resize(640, 520)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        grp_pastas = QGroupBox("Pastas")
        form_pastas = QFormLayout()
        grp_pastas.setLayout(form_pastas)

        self.edit_origem = QLineEdit()
        self.edit_origem.setPlaceholderText("Pasta onde estao os PDFs")
        btn_origem = QPushButton("...")
        btn_origem.setFixedWidth(36)
        btn_origem.clicked.connect(self._escolher_origem)
        row_origem = QHBoxLayout()
        row_origem.addWidget(self.edit_origem)
        row_origem.addWidget(btn_origem)
        form_pastas.addRow("Pasta origem:", row_origem)

        self.edit_destino = QLineEdit()
        self.edit_destino.setPlaceholderText("Vazio = RENOMEADOS (na origem)")
        btn_destino = QPushButton("...")
        btn_destino.setFixedWidth(36)
        btn_destino.clicked.connect(self._escolher_destino)
        row_destino = QHBoxLayout()
        row_destino.addWidget(self.edit_destino)
        row_destino.addWidget(btn_destino)
        form_pastas.addRow("Pasta destino:", row_destino)
        layout.addWidget(grp_pastas)

        grp_opcoes = QGroupBox("Opcoes")
        form_opcoes = QFormLayout()
        grp_opcoes.setLayout(form_opcoes)

        self.combo_tipo = QComboBox()
        self.combo_tipo.addItem("Servico", TIPO_SERVICO)
        self.combo_tipo.addItem("Produtos", TIPO_PRODUTOS)
        form_opcoes.addRow("Tipo de nota:", self.combo_tipo)

        self.edit_competencia = QLineEdit()
        self.edit_competencia.setPlaceholderText("MM-AAAA. Vazio = mes anterior")
        self.edit_competencia.setMaxLength(7)
        form_opcoes.addRow("Competencia:", self.edit_competencia)

        self.edit_prefixo = QLineEdit()
        self.edit_prefixo.setPlaceholderText("Opcional: override do prefixo completo")
        form_opcoes.addRow("Prefixo (override):", self.edit_prefixo)

        self.edit_config = QLineEdit()
        self.edit_config.setPlaceholderText("Opcional: caminho do financeiro.ini")
        form_opcoes.addRow("Config:", self.edit_config)

        self.check_dry_run = QCheckBox("Simular (nao mover arquivos)")
        form_opcoes.addRow("", self.check_dry_run)

        self.check_log = QCheckBox("Gravar log em arquivo automaticamente")
        form_opcoes.addRow("", self.check_log)
        layout.addWidget(grp_opcoes)

        layout.addWidget(QLabel("Saida:"))
        self.log_output = QPlainTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setMinimumHeight(160)
        layout.addWidget(self.log_output)

        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        self.btn_executar = QPushButton("Executar")
        self.btn_executar.setDefault(True)
        self.btn_executar.clicked.connect(self._executar)
        self.btn_limpar = QPushButton("Limpar saida")
        self.btn_limpar.clicked.connect(self.log_output.clear)
        btn_layout.addWidget(self.btn_executar)
        btn_layout.addWidget(self.btn_limpar)
        layout.addLayout(btn_layout)

        self.statusBar = QStatusBar()
        self.setStatusBar(self.statusBar)

    def _carregar_padroes(self) -> None:
        self.edit_origem.setText(str(Path.cwd()))
        self.edit_competencia.setText(default_competencia())

    def _escolher_origem(self) -> None:
        pasta = QFileDialog.getExistingDirectory(self, "Pasta de origem", self.edit_origem.text() or "")
        if pasta:
            self.edit_origem.setText(pasta)

    def _escolher_destino(self) -> None:
        pasta = QFileDialog.getExistingDirectory(self, "Pasta de destino", self.edit_destino.text() or self.edit_origem.text())
        if pasta:
            self.edit_destino.setText(pasta)

    @Slot()
    def _executar(self) -> None:
        origem_texto = self.edit_origem.text().strip()
        if not origem_texto:
            self.statusBar.showMessage("Informe a pasta de origem.")
            return

        pasta_origem = Path(origem_texto)
        if not pasta_origem.is_dir():
            self.statusBar.showMessage(f"Pasta de origem nao existe: {pasta_origem}")
            return

        destino_texto = self.edit_destino.text().strip()
        pasta_destino = Path(destino_texto) if destino_texto else None
        config_texto = self.edit_config.text().strip()
        config_path = Path(config_texto) if config_texto else None
        tipo = self.combo_tipo.currentData()
        prefixo = self.edit_prefixo.text().strip()
        competencia = self.edit_competencia.text().strip()
        dry_run = self.check_dry_run.isChecked()
        log_file = "auto" if self.check_log.isChecked() else None

        self.log_output.appendPlainText(f"\n--- {datetime.now().isoformat()} tipo={tipo} dry_run={dry_run} ---")
        self.btn_executar.setEnabled(False)
        self.statusBar.showMessage("Executando...")

        self.worker = Worker(
            pasta_origem=pasta_origem,
            pasta_destino=pasta_destino,
            tipo=tipo,
            competencia=competencia,
            prefixo=prefixo,
            dry_run=dry_run,
            config_path=config_path,
            log_file=log_file,
            parent=self,
        )
        self.worker.log_line.connect(self._on_log)
        self.worker.finished_with_result.connect(self._on_finished)
        self.worker.finished.connect(self._on_worker_finished)
        self.worker.start()

    def _on_log(self, msg: str) -> None:
        self.log_output.appendPlainText(msg)

    def _on_finished(self, renomeados: int, nao_encontrados: int, erros: int) -> None:
        if self.check_dry_run.isChecked():
            self.log_output.appendPlainText(
                f"[DRY-RUN] Seriam renomeados: {renomeados}; nao encontrados: {nao_encontrados}; erros: {erros}."
            )
        else:
            self.log_output.appendPlainText(
                f"Renomeados: {renomeados}; nao encontrados: {nao_encontrados}; erros: {erros}."
            )
        self.log_output.appendPlainText("Processo concluido.")
        self.statusBar.showMessage(
            f"Concluido: {renomeados} renomeados, {nao_encontrados} nao encontrados, {erros} erros."
        )

    def _on_worker_finished(self) -> None:
        self.worker = None
        self.btn_executar.setEnabled(True)


def main() -> int:
    app = QApplication.instance() or QApplication(sys.argv)
    app.setApplicationName("Renomear Notas")
    win = MainWindow()
    win.show()
    return app.exec()
