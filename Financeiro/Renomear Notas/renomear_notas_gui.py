# -*- coding: utf-8 -*-
"""
Interface gráfica para Renomear Notas (PySide6).
Permite configurar pastas, tipo de nota, competência e executar o processamento.
"""
from __future__ import annotations

import sys
from datetime import datetime, timedelta
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

from renomear_notas import (
    TIPO_PRODUTOS,
    TIPO_SERVICO,
    build_prefix,
    load_config,
    run,
)


def _competencia_padrao() -> str:
    """Competência padrão: mês anterior à execução."""
    hoje = datetime.now()
    primeiro_do_mes = hoje.replace(day=1)
    mes_anterior = primeiro_do_mes - timedelta(days=1)
    return f"{mes_anterior.month:02d}-{mes_anterior.year}"


class Worker(QThread):
    """Worker que executa run() em thread separada."""
    log_line = Signal(str)
    finished_with_result = Signal(int, int, int)  # renomeados, nao_encontrados, erros

    def __init__(
        self,
        pasta_origem: Path,
        pasta_destino: Path,
        tipo: str,
        prefixo: str,
        dry_run: bool,
        log_path: Path | None,
        parent=None,
    ):
        super().__init__(parent)
        self.pasta_origem = pasta_origem
        self.pasta_destino = pasta_destino
        self.tipo = tipo
        self.prefixo = prefixo
        self.dry_run = dry_run
        self.log_path = log_path

    def run(self) -> None:
        def on_log(msg: str) -> None:
            self.log_line.emit(msg)

        try:
            renomeados, nao_encontrados, erros = run(
                self.pasta_origem,
                self.pasta_destino,
                self.tipo,
                self.prefixo,
                dry_run=self.dry_run,
                log_path=self.log_path,
                log_callback=on_log,
            )
            self.finished_with_result.emit(renomeados, nao_encontrados, erros)
        except Exception as e:
            self.log_line.emit(f"Erro: {type(e).__name__}: {e}")
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

        # --- Grupo: Pastas ---
        grp_pastas = QGroupBox("Pastas")
        form_pastas = QFormLayout()
        grp_pastas.setLayout(form_pastas)

        self.edit_origem = QLineEdit()
        self.edit_origem.setPlaceholderText("Pasta onde estão os PDFs")
        btn_origem = QPushButton("…")
        btn_origem.setFixedWidth(36)
        btn_origem.clicked.connect(self._escolher_origem)
        row_origem = QHBoxLayout()
        row_origem.addWidget(self.edit_origem)
        row_origem.addWidget(btn_origem)
        form_pastas.addRow("Pasta origem:", row_origem)

        self.edit_destino = QLineEdit()
        self.edit_destino.setPlaceholderText("Vazio = RENOMEADOS (na origem)")
        btn_destino = QPushButton("…")
        btn_destino.setFixedWidth(36)
        btn_destino.clicked.connect(self._escolher_destino)
        row_destino = QHBoxLayout()
        row_destino.addWidget(self.edit_destino)
        row_destino.addWidget(btn_destino)
        form_pastas.addRow("Pasta destino:", row_destino)

        layout.addWidget(grp_pastas)

        # --- Grupo: Opções ---
        grp_opcoes = QGroupBox("Opções")
        form_opcoes = QFormLayout()
        grp_opcoes.setLayout(form_opcoes)

        self.combo_tipo = QComboBox()
        self.combo_tipo.addItem("Serviço", TIPO_SERVICO)
        self.combo_tipo.addItem("Produtos", TIPO_PRODUTOS)
        form_opcoes.addRow("Tipo de nota:", self.combo_tipo)

        self.edit_competencia = QLineEdit()
        self.edit_competencia.setPlaceholderText("MM-AAAA (ex.: 12-2025). Vazio = mês anterior")
        self.edit_competencia.setMaxLength(7)
        form_opcoes.addRow("Competência:", self.edit_competencia)

        self.edit_prefixo = QLineEdit()
        self.edit_prefixo.setPlaceholderText("Opcional: override do prefixo completo")
        form_opcoes.addRow("Prefixo (override):", self.edit_prefixo)

        self.check_dry_run = QCheckBox("Simular (não mover arquivos)")
        form_opcoes.addRow("", self.check_dry_run)

        self.check_log = QCheckBox("Gravar log em arquivo (renomear_notas_YYYYMMDD.log)")
        form_opcoes.addRow("", self.check_log)

        layout.addWidget(grp_opcoes)

        # --- Área de log ---
        layout.addWidget(QLabel("Saída:"))
        self.log_output = QPlainTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setMinimumHeight(160)
        layout.addWidget(self.log_output)

        # --- Botões ---
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        self.btn_executar = QPushButton("Executar")
        self.btn_executar.setDefault(True)
        self.btn_executar.clicked.connect(self._executar)
        self.btn_limpar = QPushButton("Limpar saída")
        self.btn_limpar.clicked.connect(self.log_output.clear)
        btn_layout.addWidget(self.btn_executar)
        btn_layout.addWidget(self.btn_limpar)
        layout.addLayout(btn_layout)

        self.statusBar = QStatusBar()
        self.setStatusBar(self.statusBar)

    def _carregar_padroes(self) -> None:
        """Preenche origem com pasta do script e competência padrão."""
        pasta_script = Path(__file__).resolve().parent
        self.edit_origem.setText(str(pasta_script))
        self.edit_competencia.setText(_competencia_padrao())
        # Carregar config da pasta origem para sugerir destino
        config = load_config(pasta_script)
        if config and config.get("pasta_destino"):
            dest = config.get("pasta_destino", "").strip()
            if dest:
                self.edit_destino.setText(dest)

    def _escolher_origem(self) -> None:
        pasta = QFileDialog.getExistingDirectory(self, "Pasta de origem", self.edit_origem.text() or "")
        if pasta:
            self.edit_origem.setText(pasta)
            config = load_config(Path(pasta))
            if config and config.get("pasta_destino") and not self.edit_destino.text().strip():
                self.edit_destino.setText(config.get("pasta_destino", "").strip())

    def _escolher_destino(self) -> None:
        pasta = QFileDialog.getExistingDirectory(self, "Pasta de destino", self.edit_destino.text() or self.edit_origem.text())
        if pasta:
            self.edit_destino.setText(pasta)

    def _obter_prefixo(self) -> str:
        origem = Path(self.edit_origem.text().strip())
        config = load_config(origem)
        tipo = self.combo_tipo.currentData()
        competencia = self.edit_competencia.text().strip()
        if not competencia and config and config.get("competencia"):
            competencia = config.get("competencia", "").strip()
        if not competencia:
            competencia = _competencia_padrao()
        prefixo_servico = (config.get("prefixo_servico") if config else None) or "NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP"
        prefixo_produtos = (config.get("prefixo_produtos") if config else None) or "NOTA FISCAL SERVIÇO CONTÁBIL 2-2 COMP"
        return build_prefix(tipo, competencia, prefixo_servico, prefixo_produtos)

    @Slot()
    def _executar(self) -> None:
        origem_texto = self.edit_origem.text().strip()
        if not origem_texto:
            self.statusBar.showMessage("Informe a pasta de origem.")
            return
        pasta_origem = Path(origem_texto)
        if not pasta_origem.is_dir():
            self.statusBar.showMessage(f"Pasta de origem não existe: {pasta_origem}")
            return

        destino_texto = self.edit_destino.text().strip()
        if destino_texto:
            pasta_destino = Path(destino_texto)
        else:
            pasta_destino = pasta_origem / "RENOMEADOS"

        tipo = self.combo_tipo.currentData()
        prefixo_override = self.edit_prefixo.text().strip()
        if prefixo_override:
            prefixo = prefixo_override if prefixo_override.endswith(" ") else prefixo_override + " "
        else:
            prefixo = self._obter_prefixo()

        dry_run = self.check_dry_run.isChecked()
        log_path: Path | None = None
        if self.check_log.isChecked():
            log_path = pasta_origem / f"renomear_notas_{datetime.now().strftime('%Y%m%d')}.log"

        self.log_output.appendPlainText(f"\n--- {datetime.now().isoformat()} tipo={tipo} dry_run={dry_run} ---")
        self.btn_executar.setEnabled(False)
        self.statusBar.showMessage("Executando…")

        self.worker = Worker(
            pasta_origem,
            pasta_destino,
            tipo,
            prefixo,
            dry_run,
            log_path,
            self,
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
                f"[DRY-RUN] Seriam renomeados: {renomeados}; não encontrados: {nao_encontrados}; erros: {erros}."
            )
        else:
            self.log_output.appendPlainText(
                f"Renomeados: {renomeados}; não encontrados: {nao_encontrados}; erros: {erros}."
            )
        self.log_output.appendPlainText("Processo concluído.")
        self.statusBar.showMessage(
            f"Concluído: {renomeados} renomeados, {nao_encontrados} não encontrados, {erros} erros."
        )

    def _on_worker_finished(self) -> None:
        self.worker = None
        self.btn_executar.setEnabled(True)


def main() -> int:
    app = QApplication(sys.argv)
    app.setApplicationName("Renomear Notas")
    win = MainWindow()
    win.show()
    return app.exec()


if __name__ == "__main__":
    sys.exit(main())
