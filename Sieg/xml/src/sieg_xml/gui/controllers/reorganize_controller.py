"""Controller da aba de reorganizacao."""

from __future__ import annotations

import os
from typing import Callable

from ...core.xml_organizer import reorganizar_xmls
from ...utils import run_in_thread, update_gui
from ...utils.ui_utils import selecionar_diretorio
from ..constants import ORGANIZATION_LABEL_TO_MODE


class ReorganizeController:
    """Orquestra a reorganizacao de XMLs na GUI."""

    def __init__(
        self,
        *,
        root,
        view,
        progress,
        log_viewer,
        show_error: Callable[[str, str], None],
        refresh_actions: Callable[[], None],
    ) -> None:
        self.root = root
        self.view = view
        self.progress = progress
        self.log_viewer = log_viewer
        self.show_error = show_error
        self.refresh_actions = refresh_actions
        self.reorganize_active = False

        self.view.bind_actions(on_select_dir=self.select_reorganize_dir, on_reorganize=self.start_reorganize)

    def select_reorganize_dir(self) -> None:
        diretorio = selecionar_diretorio(
            "Selecione a pasta que sera reorganizada",
            self.view.reorganize_dir_var.get() or os.getcwd(),
        )
        if diretorio:
            self.view.reorganize_dir_var.set(diretorio)

    def start_reorganize(self) -> None:
        if self.reorganize_active:
            return

        pasta = self.view.reorganize_dir_var.get().strip()
        if not pasta:
            self.show_error("Pasta obrigatoria", "Selecione a pasta que sera reorganizada.")
            return

        self.reorganize_active = True
        self.refresh_actions()
        self.progress.reset()
        self.progress.set_status("Preparando reorganizacao...")
        self.log_viewer.info(f"Reorganizando pasta {pasta} para modo {self.view.reorganize_mode_var.get().lower()}.")
        run_in_thread(self._reorganize_worker, pasta, ORGANIZATION_LABEL_TO_MODE[self.view.reorganize_mode_var.get()])

    def _reorganize_worker(self, pasta: str, mode: str) -> None:
        try:
            resultado = reorganizar_xmls(pasta, mode, progress_callback=self.handle_reorganize_progress)
            update_gui(self.root, self.finish_reorganize, resultado, None)
        except Exception as exc:
            update_gui(self.root, self.finish_reorganize, None, exc)

    def handle_reorganize_progress(self, *, current: int, total: int, path: str, message: str) -> None:
        update_gui(self.root, self.progress.set_progress, current, total)
        update_gui(self.root, self.progress.set_status, f"Reorganizando XML {current}/{total}")
        update_gui(self.root, self.log_viewer.info, f"[Reorganizar {current}/{total}] {message}: {path}")

    def finish_reorganize(self, resultado: dict[str, object] | None, erro: Exception | None) -> None:
        self.reorganize_active = False
        self.refresh_actions()

        if erro is not None:
            self.progress.set_status("Falha na reorganizacao")
            self.log_viewer.error(str(erro))
            self.show_error("Erro na reorganizacao", str(erro))
            return

        assert resultado is not None
        if "erro" in resultado:
            self.progress.set_status("Falha na reorganizacao")
            self.log_viewer.error(str(resultado["erro"]))
            self.show_error("Erro na reorganizacao", str(resultado["erro"]))
            return

        self.progress.set_status("Reorganizacao concluida")
        self.log_viewer.success(
            "Reorganizacao concluida. "
            f"Movidos: {resultado['movidos']} | Ja organizados: {resultado['ja_organizados']} | "
            f"Conflitos: {resultado['conflitos']} | Sem data: {resultado['sem_data']} | Erros: {resultado['erros']}"
        )

    def clear(self) -> None:
        self.view.reorganize_dir_var.set("")
        self.view.reorganize_mode_var.set("Por ano")

    def refresh_view_state(self, other_active: bool) -> None:
        if self.reorganize_active or other_active:
            self.view.reorganize_button.config(state="disabled")
            return
        self.view.reorganize_button.config(state="normal")
