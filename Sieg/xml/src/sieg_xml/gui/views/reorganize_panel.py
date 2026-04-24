"""Painel de reorganizacao da interface desktop."""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk
from typing import Callable

from ..constants import ORGANIZATION_OPTIONS


class ReorganizePanel(ttk.Frame):
    """View com os controles da aba de reorganizacao."""

    def __init__(self, parent) -> None:
        super().__init__(parent, padding=12)
        self.reorganize_dir_var = tk.StringVar(value="")
        self.reorganize_mode_var = tk.StringVar(value="Por ano")
        self._create_layout()

    def _create_layout(self) -> None:
        ttk.Label(
            self,
            text="Selecione qualquer pasta com XMLs e reorganize para pasta unica, por ano ou por ano e mes.",
            foreground="#555555",
            wraplength=860,
            justify="left",
        ).pack(anchor="w")

        top = ttk.Frame(self)
        top.pack(fill="x", pady=(10, 0))
        ttk.Entry(top, textvariable=self.reorganize_dir_var).pack(side="left", fill="x", expand=True)
        self.select_dir_button = ttk.Button(top, text="Selecionar pasta")
        self.select_dir_button.pack(side="left", padx=(8, 0))

        bottom = ttk.Frame(self)
        bottom.pack(fill="x", pady=(10, 0))
        ttk.Label(bottom, text="Formato alvo").pack(side="left")
        ttk.Combobox(
            bottom,
            textvariable=self.reorganize_mode_var,
            values=ORGANIZATION_OPTIONS,
            state="readonly",
            width=18,
        ).pack(side="left", padx=(8, 0))
        self.reorganize_button = ttk.Button(bottom, text="Organizar agora")
        self.reorganize_button.pack(side="left", padx=(12, 0))

    def bind_actions(self, *, on_select_dir: Callable[[], None], on_reorganize: Callable[[], None]) -> None:
        self.select_dir_button.config(command=on_select_dir)
        self.reorganize_button.config(command=on_reorganize)
