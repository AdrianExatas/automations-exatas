from __future__ import annotations

import contextlib
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable

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
    QSpinBox,
    QStatusBar,
    QVBoxLayout,
    QWidget,
)

from .. import webiss
from ..config import DEFAULT_OUTPUT_ROOT, ROOT_DIR, format_br_date, parse_date_range
from ..renaming import TIPO_PRODUTOS, TIPO_SERVICO
from ..workflows import (
    process_previous_month_workflow,
    rename_existing_pdfs_workflow,
)


class _SignalWriter:
    def __init__(self, emit: Callable[[str], None]) -> None:
        self.emit = emit
        self._buffer = ""

    def write(self, text: str) -> int:
        self._buffer += text
        while "\n" in self._buffer:
            line, self._buffer = self._buffer.split("\n", 1)
            if line.strip():
                self.emit(line.rstrip())
        return len(text)

    def flush(self) -> None:
        if self._buffer.strip():
            self.emit(self._buffer.rstrip())
        self._buffer = ""


def friendly_error(exc: Exception) -> str:
    text = str(exc).strip() or type(exc).__name__
    if "Arquivo .env nao encontrado" in text:
        return "As credenciais da Omie nao foram encontradas. Verifique o arquivo config/.env do pacote."
    if "Variaveis ausentes no .env" in text:
        return "As credenciais da Omie estao incompletas no arquivo config/.env."
    if "playwright nao esta instalado" in text:
        return "O componente de geracao de PDF nao foi encontrado no pacote."
    if "chrome" in text.lower():
        return "Nao foi possivel abrir o Google Chrome. Verifique se ele esta instalado neste computador."
    return text


class BaseWorker(QThread):
    log_line = Signal(str)
    failed = Signal(str)

    def _run_with_captured_output(self, callback):
        writer = _SignalWriter(self.log_line.emit)
        try:
            with contextlib.redirect_stdout(writer), contextlib.redirect_stderr(writer):
                return callback()
        finally:
            writer.flush()

    def _emit_error(self, exc: Exception) -> None:
        message = friendly_error(exc)
        self.log_line.emit(f"Falhou: {message}")
        self.failed.emit(message)


class ProcessWorker(BaseWorker):
    finished_with_result = Signal(str, int, int, str)

    def __init__(
        self,
        *,
        data_inicial: str,
        data_final: str,
        competencia: str,
        output_dir: Path | None,
        env_file: Path | None,
        config_path: Path | None,
        file_format: str,
        headless: bool,
        limit: int | None,
        http_timeout: int,
        retries: int,
        rename_dest_dir: Path | None,
        rename_prefix: str,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.data_inicial = data_inicial
        self.data_final = data_final
        self.competencia = competencia
        self.output_dir = output_dir
        self.env_file = env_file
        self.config_path = config_path
        self.file_format = file_format
        self.headless = headless
        self.limit = limit
        self.http_timeout = http_timeout
        self.retries = retries
        self.rename_dest_dir = rename_dest_dir
        self.rename_prefix = rename_prefix

    def run(self) -> None:
        try:
            result = self._run_with_captured_output(
                lambda: process_previous_month_workflow(
                    data_inicial=self.data_inicial,
                    data_final=self.data_final,
                    competencia=self.competencia,
                    output_dir=self.output_dir,
                    env_file=self.env_file,
                    config_path=self.config_path,
                    file_format=self.file_format,
                    headless=self.headless,
                    limit=self.limit,
                    http_timeout=self.http_timeout,
                    retries=self.retries,
                    rename_dest_dir=self.rename_dest_dir,
                    rename_prefix=self.rename_prefix,
                )
            )
            self.finished_with_result.emit(
                str(result.json_path),
                result.download.successes,
                result.download.failures,
                str(result.download.output_dir),
            )
        except Exception as exc:
            self._emit_error(exc)


class RenameWorker(BaseWorker):
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
    ) -> None:
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
            result = self._run_with_captured_output(
                lambda: rename_existing_pdfs_workflow(
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
            )
            self.finished_with_result.emit(result.renomeados, result.nao_encontrados, result.erros)
        except Exception as exc:
            self._emit_error(exc)


Worker = RenameWorker


class MainWindow(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.worker: BaseWorker | None = None
        self.active_button: QPushButton | None = None
        self.cancel_requested = False
        self._build_ui()
        self._carregar_padroes()

    def _build_ui(self) -> None:
        self.setWindowTitle("Financeiro NFS-e")
        self.setMinimumWidth(700)
        self.resize(780, 620)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)

        title = QLabel("Notas fiscais de servico")
        title.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(title)

        subtitle = QLabel("Consulte, baixe e organize as NFS-e por periodo em poucos passos.")
        subtitle.setStyleSheet("color: #555;")
        layout.addWidget(subtitle)

        layout.addWidget(self._build_main_group())

        actions = QHBoxLayout()
        self.btn_processar = QPushButton("Baixar e organizar notas")
        self.btn_processar.setMinimumHeight(48)
        self.btn_processar.setDefault(True)
        self.btn_processar.clicked.connect(self._executar_processar)
        self.btn_renomear = QPushButton("Renomear notas externas")
        self.btn_renomear.setMinimumHeight(48)
        self.btn_renomear.clicked.connect(self._executar_renomear)
        actions.addWidget(self.btn_processar)
        actions.addWidget(self.btn_renomear)
        layout.addLayout(actions)

        cancel_row = QHBoxLayout()
        cancel_row.addStretch()
        self.btn_cancelar = QPushButton("Cancelar")
        self.btn_cancelar.setEnabled(False)
        self.btn_cancelar.clicked.connect(self._cancelar_execucao)
        cancel_row.addWidget(self.btn_cancelar)
        layout.addLayout(cancel_row)

        self.label_status = QLabel("Pronto")
        self.label_status.setStyleSheet("font-size: 15px; font-weight: 600; color: #1f5f2f;")
        layout.addWidget(self.label_status)

        self.advanced_group = self._build_advanced_group()
        layout.addWidget(self.advanced_group)

        self.details_group = self._build_details_group()
        layout.addWidget(self.details_group)
        layout.addStretch()

        self.statusBar = QStatusBar()
        self.setStatusBar(self.statusBar)

    def _build_main_group(self) -> QGroupBox:
        grp = QGroupBox("Dados principais")
        form = QFormLayout(grp)

        self.edit_data_inicial = QLineEdit()
        self.edit_data_inicial.setPlaceholderText("DD/MM/AAAA")
        self.edit_data_inicial.setMaxLength(10)
        self.edit_data_inicial.textChanged.connect(self._atualizar_periodo_consulta)
        form.addRow("Data inicial:", self.edit_data_inicial)

        self.edit_data_final = QLineEdit()
        self.edit_data_final.setPlaceholderText("DD/MM/AAAA")
        self.edit_data_final.setMaxLength(10)
        self.edit_data_final.textChanged.connect(self._atualizar_periodo_consulta)
        form.addRow("Data final:", self.edit_data_final)

        self.label_periodo = QLabel("")
        form.addRow("Intervalo consultado:", self.label_periodo)

        self.edit_output_dir = QLineEdit()
        self.edit_output_dir.setPlaceholderText("Escolha onde salvar os arquivos")
        form.addRow("Salvar em:", self._path_row(self.edit_output_dir, self._escolher_output_dir))

        self.edit_rename_origin = QLineEdit()
        self.edit_rename_origin.setPlaceholderText("Pasta com PDFs de notas externas")
        form.addRow("Notas externas:", self._path_row(self.edit_rename_origin, self._escolher_rename_origin))
        return grp

    def _build_advanced_group(self) -> QGroupBox:
        grp = QGroupBox("Opcoes avancadas")
        grp.setCheckable(True)
        grp.setChecked(False)
        layout = QVBoxLayout(grp)

        self.advanced_content = QWidget()
        form = QFormLayout(self.advanced_content)

        self.combo_format = self._format_combo()
        form.addRow("Formato:", self.combo_format)

        self.check_headless = QCheckBox("Gerar PDF sem abrir janela do Chrome")
        self.check_headless.setChecked(True)
        form.addRow("", self.check_headless)

        self.spin_limit = self._optional_limit_spin()
        form.addRow("Limite de notas:", self.spin_limit)

        self.spin_timeout = self._timeout_spin()
        form.addRow("Timeout HTTP:", self.spin_timeout)

        self.spin_retries = self._retries_spin()
        form.addRow("Tentativas:", self.spin_retries)

        self.edit_rename_dest = QLineEdit()
        self.edit_rename_dest.setPlaceholderText("Opcional: destino dos PDFs renomeados")
        form.addRow("Destino renomeados:", self._path_row(self.edit_rename_dest, self._escolher_rename_dest))

        self.combo_tipo = QComboBox()
        self.combo_tipo.addItem("Servico", TIPO_SERVICO)
        self.combo_tipo.addItem("Produtos", TIPO_PRODUTOS)
        form.addRow("Tipo de nota:", self.combo_tipo)

        self.edit_prefixo = QLineEdit()
        self.edit_prefixo.setPlaceholderText("Opcional: prefixo customizado")
        form.addRow("Prefixo:", self.edit_prefixo)

        self.edit_env = QLineEdit()
        self.edit_env.setPlaceholderText("Opcional: arquivo .env alternativo")
        form.addRow(".env:", self._file_row(self.edit_env, self._escolher_env))

        self.edit_config = QLineEdit()
        self.edit_config.setPlaceholderText("Opcional: financeiro.ini alternativo")
        form.addRow("Config:", self._file_row(self.edit_config, self._escolher_config))

        self.check_dry_run = QCheckBox("Simular renomeacao")
        form.addRow("", self.check_dry_run)

        self.check_log = QCheckBox("Gravar log em arquivo")
        form.addRow("", self.check_log)

        layout.addWidget(self.advanced_content)
        self.advanced_content.setVisible(False)
        grp.toggled.connect(self.advanced_content.setVisible)
        return grp

    def _build_details_group(self) -> QGroupBox:
        grp = QGroupBox("Detalhes")
        grp.setCheckable(True)
        grp.setChecked(False)
        layout = QVBoxLayout(grp)

        self.details_content = QWidget()
        details_layout = QVBoxLayout(self.details_content)
        details_layout.setContentsMargins(0, 0, 0, 0)
        self.log_output = QPlainTextEdit()
        self.log_output.setReadOnly(True)
        self.log_output.setMinimumHeight(150)
        details_layout.addWidget(self.log_output)

        bottom = QHBoxLayout()
        bottom.addStretch()
        self.btn_limpar = QPushButton("Limpar detalhes")
        self.btn_limpar.clicked.connect(self.log_output.clear)
        bottom.addWidget(self.btn_limpar)
        details_layout.addLayout(bottom)

        layout.addWidget(self.details_content)
        self.details_content.setVisible(False)
        grp.toggled.connect(self.details_content.setVisible)
        return grp

    def _path_row(self, edit: QLineEdit, callback) -> QWidget:
        widget = QWidget()
        row = QHBoxLayout(widget)
        row.setContentsMargins(0, 0, 0, 0)
        btn = QPushButton("Escolher")
        btn.clicked.connect(callback)
        row.addWidget(edit)
        row.addWidget(btn)
        return widget

    def _file_row(self, edit: QLineEdit, callback) -> QWidget:
        return self._path_row(edit, callback)

    def _format_combo(self) -> QComboBox:
        combo = QComboBox()
        combo.addItem("XML e PDF", "ambos")
        combo.addItem("Somente XML", "xml")
        combo.addItem("Somente PDF", "pdf")
        return combo

    def _optional_limit_spin(self) -> QSpinBox:
        spin = QSpinBox()
        spin.setRange(0, 999999)
        spin.setSpecialValueText("Sem limite")
        return spin

    def _timeout_spin(self) -> QSpinBox:
        spin = QSpinBox()
        spin.setRange(1, 3600)
        spin.setValue(webiss.DEFAULT_HTTP_TIMEOUT)
        spin.setSuffix(" s")
        return spin

    def _retries_spin(self) -> QSpinBox:
        spin = QSpinBox()
        spin.setRange(0, 20)
        spin.setValue(webiss.DEFAULT_RETRIES)
        return spin

    def _carregar_padroes(self) -> None:
        self.edit_output_dir.setText(str(DEFAULT_OUTPUT_ROOT))
        self.edit_rename_origin.setText(str(DEFAULT_OUTPUT_ROOT))

    def _periodo_consulta(self):
        data_inicial = self.edit_data_inicial.text().strip()
        data_final = self.edit_data_final.text().strip()
        try:
            return parse_date_range(data_inicial, data_final)
        except RuntimeError as exc:
            self._set_status("Falhou", str(exc), failed=True)
            return None

    def _output_dir(self) -> Path | None:
        return self._optional_path(self.edit_output_dir)

    def _config_path(self) -> Path | None:
        return self._optional_path(self.edit_config)

    def _env_path(self) -> Path | None:
        return self._optional_path(self.edit_env)

    def _optional_path(self, edit: QLineEdit) -> Path | None:
        value = edit.text().strip()
        return Path(value) if value else None

    def _spin_limit(self) -> int | None:
        value = self.spin_limit.value()
        return value if value > 0 else None

    def _atualizar_periodo_consulta(self, _text: str = "") -> None:
        data_inicial = self.edit_data_inicial.text().strip()
        data_final = self.edit_data_final.text().strip()
        if not data_inicial and not data_final:
            self.label_periodo.setText("Informe data inicial e data final.")
            return
        try:
            periodo = parse_date_range(data_inicial, data_final)
        except RuntimeError:
            self.label_periodo.setText("Informe no formato DD/MM/AAAA, dentro do mesmo mes.")
            return
        self.label_periodo.setText(
            f"{format_br_date(periodo.start_date)} ate {format_br_date(periodo.end_date)}"
        )

    def _choose_dir(self, title: str, edit: QLineEdit, fallback: str = "") -> None:
        pasta = QFileDialog.getExistingDirectory(self, title, edit.text() or fallback)
        if pasta:
            edit.setText(pasta)

    def _choose_file(self, title: str, edit: QLineEdit, filter_text: str) -> None:
        path, _ = QFileDialog.getOpenFileName(self, title, edit.text() or str(ROOT_DIR), filter_text)
        if path:
            edit.setText(path)

    def _escolher_output_dir(self) -> None:
        self._choose_dir("Onde salvar os arquivos", self.edit_output_dir)

    def _escolher_rename_origin(self) -> None:
        self._choose_dir("Pasta com PDFs", self.edit_rename_origin, self.edit_output_dir.text())

    def _escolher_rename_dest(self) -> None:
        self._choose_dir("Destino dos PDFs renomeados", self.edit_rename_dest, self.edit_output_dir.text())

    def _escolher_env(self) -> None:
        self._choose_file("Arquivo .env", self.edit_env, "Env (*.env);;Todos (*.*)")

    def _escolher_config(self) -> None:
        self._choose_file("Arquivo financeiro.ini", self.edit_config, "INI (*.ini);;Todos (*.*)")

    def _set_status(self, title: str, message: str = "", *, failed: bool = False) -> None:
        color = "#9d1c1c" if failed else "#1f5f2f"
        detail = title if not message else f"{title}: {message}"
        if failed:
            label_text = detail
        elif title == "Cancelado":
            label_text = "Cancelado"
        elif title == "Executando":
            label_text = "Executando..."
        elif title == "Concluido":
            label_text = "Concluido"
        else:
            label_text = title
        self.label_status.setText(label_text)
        self.label_status.setStyleSheet(f"font-size: 15px; font-weight: 600; color: {color};")
        self.statusBar.showMessage(detail)

    def _set_action_buttons_enabled(self, enabled: bool) -> None:
        self.btn_processar.setEnabled(enabled)
        self.btn_renomear.setEnabled(enabled)
        self.btn_cancelar.setEnabled(not enabled)

    def _executar_worker(self, worker: BaseWorker, button: QPushButton, titulo: str) -> None:
        if self.worker is not None:
            self._set_status("Executando", "aguarde a automacao atual terminar")
            return
        self.worker = worker
        self.active_button = button
        self.cancel_requested = False
        self.log_output.appendPlainText(f"\n--- {datetime.now().isoformat()} {titulo} ---")
        self._set_status("Executando", titulo)
        self._set_action_buttons_enabled(False)
        worker.log_line.connect(self._on_log)
        worker.failed.connect(self._on_failed)
        worker.finished.connect(self._on_worker_finished)
        worker.start()

    @Slot()
    def _cancelar_execucao(self) -> None:
        if self.worker is None:
            return
        self.cancel_requested = True
        self.btn_cancelar.setEnabled(False)
        self.log_output.appendPlainText("Cancelamento solicitado pelo usuario.")
        self._set_status("Executando", "cancelando")
        self.worker.requestInterruption()
        if not self.worker.wait(500):
            self.worker.terminate()
            self.worker.wait(3000)
        self._set_status("Cancelado")

    @Slot()
    def _executar_processar(self) -> None:
        periodo = self._periodo_consulta()
        if periodo is None:
            return
        worker = ProcessWorker(
            data_inicial=format_br_date(periodo.start_date),
            data_final=format_br_date(periodo.end_date),
            competencia=periodo.competencia,
            output_dir=self._output_dir(),
            env_file=self._env_path(),
            config_path=self._config_path(),
            file_format=self.combo_format.currentData(),
            headless=self.check_headless.isChecked(),
            limit=self._spin_limit(),
            http_timeout=self.spin_timeout.value(),
            retries=self.spin_retries.value(),
            rename_dest_dir=self._optional_path(self.edit_rename_dest),
            rename_prefix=self.edit_prefixo.text().strip(),
            parent=self,
        )
        worker.finished_with_result.connect(self._on_processar_finished)
        self._executar_worker(worker, self.btn_processar, "baixar e organizar notas")

    @Slot()
    def _executar_renomear(self) -> None:
        periodo = self._periodo_consulta()
        if periodo is None:
            return
        origem_texto = self.edit_rename_origin.text().strip()
        if not origem_texto:
            self._escolher_rename_origin()
            origem_texto = self.edit_rename_origin.text().strip()
        if not origem_texto:
            self._set_status("Falhou", "escolha a pasta com os PDFs", failed=True)
            return
        pasta_origem = Path(origem_texto)
        if not pasta_origem.is_dir():
            self._set_status("Falhou", f"pasta nao encontrada: {pasta_origem}", failed=True)
            return
        worker = RenameWorker(
            pasta_origem=pasta_origem,
            pasta_destino=self._optional_path(self.edit_rename_dest),
            tipo=self.combo_tipo.currentData(),
            competencia=periodo.competencia,
            prefixo=self.edit_prefixo.text().strip(),
            dry_run=self.check_dry_run.isChecked(),
            config_path=self._config_path(),
            log_file="auto" if self.check_log.isChecked() else None,
            parent=self,
        )
        worker.finished_with_result.connect(self._on_renomear_finished)
        self._executar_worker(worker, self.btn_renomear, "renomear PDFs")

    def _on_log(self, msg: str) -> None:
        self.log_output.appendPlainText(msg)

    def _on_failed(self, msg: str) -> None:
        self._set_status("Falhou", msg, failed=True)

    def _on_processar_finished(self, json_path: str, sucessos: int, falhas: int, output_dir: str) -> None:
        if self.cancel_requested:
            return
        self.log_output.appendPlainText(f"JSON gerado em: {json_path}")
        self.log_output.appendPlainText(f"Concluido. Sucessos: {sucessos} | Falhas: {falhas} | Saida: {output_dir}")
        self._set_status("Concluido", f"{sucessos} notas processadas, {falhas} falhas")

    def _on_renomear_finished(self, renomeados: int, nao_encontrados: int, erros: int) -> None:
        if self.cancel_requested:
            return
        if self.check_dry_run.isChecked():
            self.log_output.appendPlainText(
                f"[DRY-RUN] Seriam renomeados: {renomeados}; nao encontrados: {nao_encontrados}; erros: {erros}."
            )
        else:
            self.log_output.appendPlainText(
                f"Renomeados: {renomeados}; nao encontrados: {nao_encontrados}; erros: {erros}."
            )
        self._set_status("Concluido", f"{renomeados} PDFs renomeados, {erros} erros")

    def _on_worker_finished(self) -> None:
        self.worker = None
        self._set_action_buttons_enabled(True)
        if self.cancel_requested:
            self._set_status("Cancelado")
        self.active_button = None
        self.cancel_requested = False


def main() -> int:
    app = QApplication.instance() or QApplication(sys.argv)
    app.setApplicationName("Financeiro NFS-e")
    win = MainWindow()
    win.show()
    return app.exec()
