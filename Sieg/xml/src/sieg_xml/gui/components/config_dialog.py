"""Dialogo de configuracoes basico."""

from __future__ import annotations

import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from sieg_xml import config


class ConfigDialog:
    def __init__(self, parent):
        self.parent = parent
        self.result = None
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Configuracoes")
        self.dialog.geometry("520x220")
        self.dialog.transient(parent)
        self.dialog.grab_set()

        frame = ttk.Frame(self.dialog, padding=20)
        frame.pack(fill="both", expand=True)

        ttk.Label(frame, text="API Key SIEG").grid(row=0, column=0, sticky="w", pady=5)
        self.api_key_var = tk.StringVar(value=config.SIEG_API_KEY or "")
        ttk.Entry(frame, textvariable=self.api_key_var, width=50, show="*").grid(row=0, column=1, sticky="ew", pady=5)

        ttk.Label(frame, text="Pasta padrao XMLs").grid(row=1, column=0, sticky="w", pady=5)
        self.pasta_var = tk.StringVar(value=config.PASTA_PADRAO_XMLS)
        ttk.Entry(frame, textvariable=self.pasta_var, width=50).grid(row=1, column=1, sticky="ew", pady=5)
        ttk.Button(frame, text="...", command=self._select_folder, width=3).grid(row=1, column=2, padx=5)

        ttk.Label(frame, text="Threads").grid(row=2, column=0, sticky="w", pady=5)
        self.threads_var = tk.StringVar(value=str(config.NUM_THREADS_PADRAO))
        ttk.Entry(frame, textvariable=self.threads_var, width=10).grid(row=2, column=1, sticky="w", pady=5)

        frame.columnconfigure(1, weight=1)
        buttons = ttk.Frame(frame)
        buttons.grid(row=3, column=0, columnspan=3, pady=20)
        ttk.Button(buttons, text="Salvar", command=self._save).pack(side="left", padx=5)
        ttk.Button(buttons, text="Cancelar", command=self._cancel).pack(side="left", padx=5)

    def _select_folder(self):
        pasta = filedialog.askdirectory(initialdir=self.pasta_var.get())
        if pasta:
            self.pasta_var.set(pasta)

    def _save(self):
        env_path = Path(config.BASE_DIR) / ".env"
        linhas = [
            "# Configuracoes do SIEG XML",
            f"SIEG_API_KEY={self.api_key_var.get().strip()}",
            f"PASTA_PADRAO_XMLS={self.pasta_var.get().strip()}",
            f"NUM_THREADS_PADRAO={self.threads_var.get().strip()}",
        ]
        env_path.write_text("\n".join(linhas) + "\n", encoding="utf-8")
        messagebox.showinfo("Sucesso", "Configuracoes salvas. Reinicie a aplicacao.")
        self.result = True
        self.dialog.destroy()

    def _cancel(self):
        self.result = False
        self.dialog.destroy()

    def show(self):
        self.dialog.wait_window()
        return self.result
