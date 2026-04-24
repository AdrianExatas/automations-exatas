"""Controller da aba de download."""

from __future__ import annotations

import os
from typing import Callable

from ...config import NUM_THREADS_DOWNLOAD
from ...core.chave_extractor import processar_arquivos, processar_texto_digitado
from ...services.download_service import DownloadService
from ...utils import run_in_thread, update_gui
from ...utils.concurrency import CancellationToken
from ...utils.ui_utils import selecionar_diretorio, selecionar_multiplas_planilhas
from ..constants import ORGANIZATION_LABEL_TO_MODE, ORGANIZATION_MODE_TO_LABEL

AUTO_VALIDATE_DEBOUNCE_MS = 350


class DownloadController:
    """Orquestra validacao e download a partir do painel de download."""

    def __init__(
        self,
        *,
        root,
        view,
        progress,
        log_viewer,
        show_error: Callable[[str, str], None],
        show_warning: Callable[[str, str], None],
        show_info: Callable[[str, str], None],
        refresh_actions: Callable[[], None],
    ) -> None:
        self.root = root
        self.view = view
        self.progress = progress
        self.log_viewer = log_viewer
        self.show_error = show_error
        self.show_warning = show_warning
        self.show_info = show_info
        self.refresh_actions = refresh_actions

        self.validated_keys: list[str] = []
        self.invalid_lines: list[str] = []
        self.last_result: dict[str, object] | None = None
        self.last_failed_keys: list[str] = []
        self.last_download_request: dict[str, object] | None = None
        self.last_validation_signature: tuple[str, str | tuple[str, ...]] | None = None
        self.last_validation_ok = False
        self.download_received_result = False
        self.download_control = CancellationToken()
        self.download_active = False
        self.validation_job = None
        self.source_files: list[str] = []

        self.view.bind_actions(
            on_source_mode_change=self.handle_source_mode_change,
            on_select_file=self.select_file,
            on_manual_modified=self.on_manual_text_modified,
            on_select_output_dir=self.select_output_dir,
            on_start_download=self.start_download,
            on_start_retry=self.start_retry_download,
            on_toggle_pause=self.toggle_pause_download,
            on_cancel=self.cancel_download,
            on_open_output_folder=self.open_output_folder,
            on_clear=lambda: None,
        )
        self.schedule_auto_validation()

    def set_clear_action(self, callback: Callable[[], None]) -> None:
        self.view.clear_button.config(command=callback)

    def handle_source_mode_change(self) -> None:
        self.view.update_source_mode()
        self.schedule_auto_validation()

    def select_file(self) -> None:
        arquivos = selecionar_multiplas_planilhas()
        if arquivos:
            self.source_files = list(arquivos)
            self.view.set_source_files(self.source_files)
            self.schedule_auto_validation()

    def select_output_dir(self) -> None:
        diretorio = selecionar_diretorio(
            "Selecione a pasta onde os XMLs serao salvos",
            self.view.output_dir_var.get() or os.getcwd(),
        )
        if diretorio:
            self.view.output_dir_var.set(diretorio)

    def on_manual_text_modified(self, _event=None) -> None:
        if self.view.manual_text.edit_modified():
            self.view.manual_text.edit_modified(False)
            self.schedule_auto_validation()

    def schedule_auto_validation(self) -> None:
        if self.validation_job is not None:
            self.root.after_cancel(self.validation_job)
        self.validation_job = self.root.after(AUTO_VALIDATE_DEBOUNCE_MS, self.run_auto_validation)

    def build_validation_signature(self) -> tuple[str, str | tuple[str, ...]]:
        if self.view.source_mode.get() == "file":
            return ("file", tuple(sorted(self.source_files)))
        return ("manual", self.view.manual_text.get("1.0", "end").strip())

    def ensure_current_validation(self) -> bool:
        assinatura_atual = self.build_validation_signature()
        if self.last_validation_signature == assinatura_atual:
            return self.last_validation_ok
        return self.run_auto_validation()

    def run_auto_validation(self) -> bool:
        self.validation_job = None
        self.last_validation_signature = self.build_validation_signature()
        self.last_validation_ok = False
        self.validated_keys = []
        self.invalid_lines = []

        try:
            if self.view.source_mode.get() == "file":
                if not self.source_files:
                    self.view.summary_var.set("Selecione um ou mais arquivos Excel, TXT ou CSV para extrair as chaves.")
                    return False
                self.validated_keys = processar_arquivos(self.source_files)
            else:
                conteudo = self.view.manual_text.get("1.0", "end").strip()
                if not conteudo:
                    self.view.summary_var.set("Cole chaves manualmente para validar automaticamente.")
                    return False
                self.validated_keys, self.invalid_lines = processar_texto_digitado(conteudo)

            if not self.validated_keys:
                if self.invalid_lines:
                    self.view.summary_var.set(
                        f"Nenhuma chave valida encontrada. {len(self.invalid_lines)} linha(s) com digitos foram ignoradas."
                    )
                else:
                    self.view.summary_var.set("Nenhuma chave valida encontrada.")
                return False

            resumo = f"{len(self.validated_keys)} chave(s) valida(s) pronta(s) para download."
            if self.invalid_lines:
                resumo += f" {len(self.invalid_lines)} linha(s) invalida(s) ignorada(s)."
            self.view.summary_var.set(resumo)
            self.last_validation_ok = True
            return True
        except Exception as exc:
            self.validated_keys = []
            self.invalid_lines = []
            self.view.summary_var.set(f"Erro ao validar as chaves: {exc}")
            return False

    def start_download(self) -> None:
        if not self.ensure_current_validation():
            self.show_warning("Nenhuma chave valida", "Nao ha chaves validas para iniciar o download.")
            return

        output_dir = self.view.output_dir_var.get().strip()
        if not output_dir:
            self.show_error("Destino obrigatorio", "Selecione a pasta onde os XMLs serao salvos.")
            return

        self.last_failed_keys = []
        self.last_download_request = {
            "keys": list(self.validated_keys),
            "output_dir": output_dir,
            "organization_mode": ORGANIZATION_LABEL_TO_MODE[self.view.download_mode_var.get()],
            "num_threads": int(self.view.download_threads_var.get()),
        }
        self.begin_download(
            list(self.validated_keys),
            output_dir=output_dir,
            organization_mode=ORGANIZATION_LABEL_TO_MODE[self.view.download_mode_var.get()],
            num_threads=int(self.view.download_threads_var.get()),
            is_retry=False,
        )

    def start_retry_download(self) -> None:
        if not self.last_failed_keys or not self.last_download_request:
            self.show_info("Sem falhas", "Nao ha falhas da ultima sessao para reprocessar.")
            return

        request = self.last_download_request
        self.begin_download(
            list(self.last_failed_keys),
            output_dir=str(request["output_dir"]),
            organization_mode=str(request["organization_mode"]),
            num_threads=int(request["num_threads"]),
            is_retry=True,
        )

    def begin_download(
        self,
        keys: list[str],
        *,
        output_dir: str,
        organization_mode: str,
        num_threads: int,
        is_retry: bool,
    ) -> None:
        if self.download_active:
            return

        self.download_control.reset()
        self.download_active = True
        self.download_received_result = False
        self.view.pause_button_var.set("Pausar")
        self.refresh_actions()
        self.progress.reset()
        self.progress.set_indeterminate(True)
        self.progress.set_status("Aquecendo conexoes...")
        acao = "reprocessamento" if is_retry else "download"
        modo_label = ORGANIZATION_MODE_TO_LABEL.get(organization_mode, organization_mode)
        self.log_viewer.info(
            f"Iniciando {acao} de {len(keys)} chave(s) em modo {modo_label.lower()} com {num_threads} thread(s)."
        )
        run_in_thread(
            self._download_worker,
            list(keys),
            output_dir,
            organization_mode,
            num_threads,
            is_retry,
        )

    def _download_worker(
        self,
        keys: list[str],
        output_dir: str,
        organization_mode: str,
        num_threads: int,
        is_retry: bool,
    ) -> None:
        try:
            service = DownloadService()
            resultado = service.baixar_xmls(
                keys,
                output_dir=output_dir,
                organization_mode=organization_mode,
                num_threads=num_threads,
                progress_callback=self.handle_download_progress,
                control_token=self.download_control,
            )
            update_gui(self.root, self.finish_download, resultado, None, is_retry)
        except Exception as exc:
            update_gui(self.root, self.finish_download, None, exc, is_retry)

    def handle_download_progress(self, **payload) -> None:
        event_type = str(payload.get("event_type", "result"))
        if event_type == "dispatch":
            if not self.download_received_result:
                update_gui(self.root, self.progress.set_status, str(payload.get("message", "Aquecendo conexoes...")))
            return

        current = int(payload["current"])
        total = int(payload["total"])
        chave = str(payload["chave"])
        success = bool(payload["success"])
        message = str(payload["message"])

        if not self.download_received_result:
            self.download_received_result = True
            update_gui(self.root, self.progress.set_indeterminate, False)

        update_gui(self.root, self.progress.set_progress, current, total)
        update_gui(self.root, self.progress.set_status, f"Baixando XML {current}/{total}")
        if success:
            update_gui(self.root, self.log_viewer.info, f"[Download {current}/{total}] {chave} OK")
        else:
            update_gui(self.root, self.log_viewer.error, f"[Download {current}/{total}] {chave} ERRO: {message}")

    def finish_download(self, resultado: dict[str, object] | None, erro: Exception | None, is_retry: bool) -> None:
        self.download_active = False
        self.download_received_result = False
        self.view.pause_button_var.set("Pausar")
        self.progress.set_indeterminate(False)

        if erro is not None:
            self.progress.set_status("Falha no download")
            self.log_viewer.error(str(erro))
            self.refresh_actions()
            self.show_error("Erro no download", str(erro))
            return

        assert resultado is not None
        self.last_result = resultado
        self.last_failed_keys = list(resultado.get("chaves_com_falha", []))
        status = str(resultado["status"])
        acao = "Reprocessamento" if is_retry else "Download"
        if status == "cancelled":
            self.progress.set_status(f"{acao} cancelado")
            self.log_viewer.warning(
                f"{acao} cancelado. Sucesso: {resultado['sucesso']} | Falhas: {resultado['falhas']} | Pendentes: {resultado['pendentes']}"
            )
        else:
            self.progress.set_status(f"{acao} concluido")
            logger = self.log_viewer.warning if self.last_failed_keys else self.log_viewer.success
            logger(
                f"{acao} concluido. Sucesso: {resultado['sucesso']} | Falhas: {resultado['falhas']} | "
                f"Pasta: {resultado['output_dir']}"
            )

        if is_retry:
            self.log_viewer.info(
                f"Resultado consolidado apos reprocessamento. Falhas remanescentes: {len(self.last_failed_keys)}."
            )

        self.refresh_actions()

    def toggle_pause_download(self) -> None:
        if not self.download_active:
            return
        if self.download_control.is_paused():
            self.download_control.resume()
            self.view.pause_button_var.set("Pausar")
            self.progress.set_status("Retomando download...")
            self.log_viewer.info("Download retomado.")
        else:
            self.download_control.pause()
            self.view.pause_button_var.set("Retomar")
            self.progress.set_status("Download pausado. Aguardando retomada...")
            self.log_viewer.warning("Download pausado.")

    def cancel_download(self) -> None:
        if not self.download_active:
            return
        self.download_control.cancel()
        self.view.pause_button_var.set("Pausar")
        self.progress.set_status("Cancelando download apos o item atual...")
        self.log_viewer.warning("Cancelamento solicitado para o download atual.")

    def open_output_folder(self) -> None:
        diretorio = self.view.output_dir_var.get().strip()
        if not diretorio:
            self.show_info("Pasta nao definida", "Selecione primeiro uma pasta de destino.")
            return
        if not os.path.isdir(diretorio):
            self.show_error("Pasta inexistente", "A pasta de destino nao existe.")
            return
        os.startfile(diretorio)

    def clear(self) -> None:
        self.source_files = []
        self.view.set_source_files([])
        self.view.output_dir_var.set("")
        self.validated_keys = []
        self.invalid_lines = []
        self.last_result = None
        self.last_failed_keys = []
        self.last_download_request = None
        self.last_validation_signature = None
        self.last_validation_ok = False
        self.view.pause_button_var.set("Pausar")
        self.view.manual_text.delete("1.0", "end")
        self.view.manual_text.edit_modified(False)
        self.view.summary_var.set("Selecione um arquivo ou cole chaves para validar automaticamente.")
        self.schedule_auto_validation()

    def refresh_view_state(self, other_active: bool) -> None:
        if self.download_active:
            self.view.start_button.config(state="disabled")
            self.view.retry_button.config(state="disabled")
            self.view.pause_button.config(state="normal")
            self.view.cancel_button.config(state="normal")
            return
        if other_active:
            self.view.start_button.config(state="disabled")
            self.view.retry_button.config(state="disabled")
            self.view.pause_button.config(state="disabled")
            self.view.cancel_button.config(state="disabled")
            return
        self.view.start_button.config(state="normal")
        self.view.retry_button.config(state="normal" if self.last_failed_keys else "disabled")
        self.view.pause_button.config(state="disabled")
        self.view.cancel_button.config(state="disabled")
