"""Painel de download da interface desktop."""

from __future__ import annotations

import tkinter as tk
from tkinter import scrolledtext, ttk
from typing import Callable

from ...config import NUM_THREADS_DOWNLOAD
from ..constants import ORGANIZATION_OPTIONS


class DownloadPanel(ttk.Frame):
    """View com os controles da aba de download."""

    def __init__(self, parent) -> None:
        super().__init__(parent, padding=12)
        self.source_mode = tk.StringVar(value="file")
        self.output_dir_var = tk.StringVar(value="")
        self.summary_var = tk.StringVar(value="Selecione um arquivo ou cole chaves para validar automaticamente.")
        self.download_mode_var = tk.StringVar(value="Por ano")
        self.download_threads_var = tk.IntVar(value=NUM_THREADS_DOWNLOAD)
        self.pause_button_var = tk.StringVar(value="Pausar")
        self._create_layout()

    def _create_layout(self) -> None:
        origem = ttk.LabelFrame(self, text="1. Origem das chaves", padding=10)
        origem.pack(fill="x", pady=(0, 10))

        mode_frame = ttk.Frame(origem)
        mode_frame.pack(fill="x")
        self.file_mode_button = ttk.Radiobutton(
            mode_frame, text="Usar arquivos (Excel/TXT/CSV)", variable=self.source_mode, value="file"
        )
        self.file_mode_button.pack(side="left")
        self.manual_mode_button = ttk.Radiobutton(
            mode_frame,
            text="Colar chaves manualmente",
            variable=self.source_mode,
            value="manual",
        )
        self.manual_mode_button.pack(side="left", padx=(16, 0))

        self.file_frame = ttk.Frame(origem)
        self.file_frame.pack(fill="x", pady=(12, 8))
        self.source_files_box = scrolledtext.ScrolledText(self.file_frame, height=4, wrap="none", state="disabled")
        self.source_files_box.pack(side="left", fill="both", expand=True)
        self.select_file_button = ttk.Button(self.file_frame, text="Selecionar arquivos")
        self.select_file_button.pack(side="left", padx=(8, 0))

        self.manual_frame = ttk.Frame(origem)
        ttk.Label(self.manual_frame, text="Cole uma chave por linha ou varias linhas com chaves.").pack(anchor="w")
        self.manual_text = tk.Text(self.manual_frame, height=8, wrap="word")
        self.manual_text.pack(fill="x", expand=True, pady=(8, 0))
        self.manual_text.edit_modified(False)

        resumo = ttk.LabelFrame(self, text="2. Resumo das chaves", padding=10)
        resumo.pack(fill="x", pady=(0, 10))
        ttk.Label(
            resumo,
            text="A validacao acontece automaticamente ao selecionar arquivos, trocar o modo ou editar o texto.",
            foreground="#555555",
            wraplength=860,
            justify="left",
        ).pack(anchor="w")
        ttk.Label(resumo, textvariable=self.summary_var, wraplength=860, justify="left").pack(anchor="w", pady=(8, 0))

        destino = ttk.LabelFrame(self, text="3. Pasta de destino e organizacao", padding=10)
        destino.pack(fill="x", pady=(0, 10))
        destino_top = ttk.Frame(destino)
        destino_top.pack(fill="x")
        ttk.Entry(destino_top, textvariable=self.output_dir_var).pack(side="left", fill="x", expand=True)
        self.select_output_dir_button = ttk.Button(destino_top, text="Selecionar pasta")
        self.select_output_dir_button.pack(side="left", padx=(8, 0))

        destino_bottom = ttk.Frame(destino)
        destino_bottom.pack(fill="x", pady=(10, 0))
        ttk.Label(destino_bottom, text="Modo de organizacao").pack(side="left")
        ttk.Combobox(
            destino_bottom,
            textvariable=self.download_mode_var,
            values=ORGANIZATION_OPTIONS,
            state="readonly",
            width=18,
        ).pack(side="left", padx=(8, 0))
        ttk.Label(destino_bottom, text="Threads").pack(side="left", padx=(16, 0))
        ttk.Spinbox(destino_bottom, from_=1, to=20, textvariable=self.download_threads_var, width=6).pack(side="left", padx=(8, 0))

        actions = ttk.Frame(self)
        actions.pack(fill="x")
        self.start_button = ttk.Button(actions, text="Iniciar download")
        self.start_button.pack(side="left")
        self.retry_button = ttk.Button(actions, text="Reprocessar erros", state="disabled")
        self.retry_button.pack(side="left", padx=(8, 0))
        self.pause_button = ttk.Button(actions, textvariable=self.pause_button_var, state="disabled")
        self.pause_button.pack(side="left", padx=(8, 0))
        self.cancel_button = ttk.Button(actions, text="Cancelar", state="disabled")
        self.cancel_button.pack(side="left", padx=(8, 0))
        self.open_output_button = ttk.Button(actions, text="Abrir pasta final")
        self.open_output_button.pack(side="left", padx=(8, 0))
        self.clear_button = ttk.Button(actions, text="Limpar")
        self.clear_button.pack(side="left", padx=(8, 0))

        self.update_source_mode()

    def set_source_files(self, paths: list[str]) -> None:
        self.source_files_box.configure(state="normal")
        self.source_files_box.delete("1.0", "end")
        if paths:
            self.source_files_box.insert("1.0", "\n".join(paths))
        self.source_files_box.configure(state="disabled")

    def bind_actions(
        self,
        *,
        on_source_mode_change: Callable[[], None],
        on_select_file: Callable[[], None],
        on_manual_modified: Callable[..., None],
        on_select_output_dir: Callable[[], None],
        on_start_download: Callable[[], None],
        on_start_retry: Callable[[], None],
        on_toggle_pause: Callable[[], None],
        on_cancel: Callable[[], None],
        on_open_output_folder: Callable[[], None],
        on_clear: Callable[[], None],
    ) -> None:
        self.file_mode_button.config(command=on_source_mode_change)
        self.manual_mode_button.config(command=on_source_mode_change)
        self.select_file_button.config(command=on_select_file)
        self.manual_text.bind("<<Modified>>", on_manual_modified)
        self.select_output_dir_button.config(command=on_select_output_dir)
        self.start_button.config(command=on_start_download)
        self.retry_button.config(command=on_start_retry)
        self.pause_button.config(command=on_toggle_pause)
        self.cancel_button.config(command=on_cancel)
        self.open_output_button.config(command=on_open_output_folder)
        self.clear_button.config(command=on_clear)

    def update_source_mode(self) -> None:
        if self.source_mode.get() == "file":
            self.manual_frame.pack_forget()
            self.file_frame.pack(fill="x", pady=(12, 8))
        else:
            self.file_frame.pack_forget()
            self.manual_frame.pack(fill="x", pady=(12, 0))
