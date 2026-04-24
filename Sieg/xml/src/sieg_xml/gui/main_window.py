"""Janela principal da aplicacao desktop."""

from __future__ import annotations

import tkinter as tk
from tkinter import messagebox, ttk

from sieg_xml.config import ACTIVE_ENV_FILE, MACHINE_ENV_FILE

from .components.log_viewer import LogViewer
from .components.progress_bar import ProgressBar
from .controllers import DownloadController, ReorganizeController
from .views import DownloadPanel, ReorganizePanel


class MainWindow:
    """Orquestra a GUI principal e coordena os controllers."""

    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("SIEG XML - Download")
        self.root.geometry("980x860")
        self.root.minsize(900, 760)
        self.env_status_var = tk.StringVar(value=self._build_env_status())

        main = ttk.Frame(self.root, padding=16)
        main.pack(fill="both", expand=True)

        self._create_header(main)

        notebook = ttk.Notebook(main)
        notebook.pack(fill="x", pady=(0, 12))

        self.download_panel = DownloadPanel(notebook)
        notebook.add(self.download_panel, text="Download")

        self.reorganize_panel = ReorganizePanel(notebook)
        notebook.add(self.reorganize_panel, text="Organizacao")

        self.progress = ProgressBar(main)
        self.progress.frame.pack(fill="x", pady=(0, 12))
        self.log_viewer = LogViewer(main, height=16)
        self.log_viewer.frame.pack(fill="both", expand=True)

        self.download_controller = DownloadController(
            root=self.root,
            view=self.download_panel,
            progress=self.progress,
            log_viewer=self.log_viewer,
            show_error=self._show_error,
            show_warning=self._show_warning,
            show_info=self._show_info,
            refresh_actions=self._refresh_action_states,
        )
        self.download_controller.set_clear_action(self._clear_form)

        self.reorganize_controller = ReorganizeController(
            root=self.root,
            view=self.reorganize_panel,
            progress=self.progress,
            log_viewer=self.log_viewer,
            show_error=self._show_error,
            refresh_actions=self._refresh_action_states,
        )

        self._refresh_action_states()

    def _build_env_status(self) -> str:
        if ACTIVE_ENV_FILE:
            return f"Configuracao carregada de: {ACTIVE_ENV_FILE}"
        return f"Configuracao nao encontrada. Esperado em: {MACHINE_ENV_FILE}"

    def _create_header(self, parent) -> None:
        header = ttk.Frame(parent)
        header.pack(fill="x", pady=(0, 12))
        ttk.Label(header, text="SIEG XML", font=("Segoe UI", 18, "bold")).pack(anchor="w")
        ttk.Label(
            header,
            text="Baixe XMLs com validacao automatica das chaves e reorganize pastas existentes em abas separadas.",
            wraplength=880,
            justify="left",
        ).pack(anchor="w", pady=(6, 0))
        ttk.Label(header, textvariable=self.env_status_var, foreground="#555555").pack(anchor="w", pady=(6, 0))

    def _show_error(self, title: str, message: str) -> None:
        messagebox.showerror(title, message)

    def _show_warning(self, title: str, message: str) -> None:
        messagebox.showwarning(title, message)

    def _show_info(self, title: str, message: str) -> None:
        messagebox.showinfo(title, message)

    def _refresh_action_states(self) -> None:
        self.download_controller.refresh_view_state(self.reorganize_controller.reorganize_active)
        self.reorganize_controller.refresh_view_state(self.download_controller.download_active)

    def _clear_form(self) -> None:
        if self.download_controller.download_active or self.reorganize_controller.reorganize_active:
            self._show_info("Operacao em andamento", "Aguarde a operacao atual terminar antes de limpar.")
            return
        self.download_controller.clear()
        self.reorganize_controller.clear()
        self.progress.reset()
        self.log_viewer.clear()
        self._refresh_action_states()

    def run(self) -> None:
        self.root.mainloop()
