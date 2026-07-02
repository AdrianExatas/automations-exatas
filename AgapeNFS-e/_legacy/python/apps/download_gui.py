from __future__ import annotations

import queue
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext

from tkcalendar import DateEntry

PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from agape_nfse import AgapeNfseClient, AppConfig  # noqa: E402


class DownloadGui:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Agape NFS-e - Download XML")
        self.root.geometry("760x560")
        self.config = AppConfig.from_env()
        self.messages: queue.Queue[tuple[str, object]] = queue.Queue()
        self.worker: threading.Thread | None = None

        self.login_var = tk.StringVar(value=self.config.login)
        self.password_var = tk.StringVar(value=self.config.password)
        self.start_var = tk.StringVar()
        self.end_var = tk.StringVar()
        self.destino_var = tk.StringVar()

        self._build()
        self._poll_messages()

    def _build(self) -> None:
        container = tk.Frame(self.root, padx=14, pady=14)
        container.pack(fill=tk.BOTH, expand=True)

        form = tk.Frame(container)
        form.pack(fill=tk.X)
        for col in range(4):
            form.columnconfigure(col, weight=1)

        self._entry(form, "Login", self.login_var, 0, 0)
        self._entry(form, "Senha", self.password_var, 0, 2, show="*")
        self._date_entry(form, "Data inicial", self.start_var, 1, 0)
        self._date_entry(form, "Data final", self.end_var, 1, 2)
        self._folder_entry(form, "Pasta destino", self.destino_var, 2, 0)

        actions = tk.Frame(container)
        actions.pack(fill=tk.X, pady=(12, 8))
        self.download_button = tk.Button(actions, text="Baixar XMLs", command=self._start_download, width=18)
        self.download_button.pack(side=tk.LEFT)

        self.status_var = tk.StringVar(value="Pronto")
        tk.Label(actions, textvariable=self.status_var, anchor="w").pack(side=tk.LEFT, padx=(12, 0), fill=tk.X, expand=True)

        self.log_text = scrolledtext.ScrolledText(container, height=22, wrap=tk.WORD)
        self.log_text.pack(fill=tk.BOTH, expand=True)
        self.log_text.configure(state=tk.DISABLED)

    def _entry(
        self,
        parent: tk.Frame,
        label: str,
        variable: tk.StringVar,
        row: int,
        column: int,
        show: str | None = None,
        placeholder: str = "",
    ) -> None:
        tk.Label(parent, text=label, anchor="w").grid(row=row, column=column, sticky="ew", padx=(0, 8), pady=5)
        entry = tk.Entry(parent, textvariable=variable, show=show)
        entry.grid(row=row, column=column + 1, sticky="ew", padx=(0, 16), pady=5)
        if placeholder and not variable.get():
            entry.insert(0, placeholder)
            entry.configure(fg="#777")

            def clear_placeholder(_event: object) -> None:
                if entry.get() == placeholder:
                    entry.delete(0, tk.END)
                    entry.configure(fg="#000")

            def restore_placeholder(_event: object) -> None:
                if not entry.get():
                    entry.insert(0, placeholder)
                    entry.configure(fg="#777")

            entry.bind("<FocusIn>", clear_placeholder)
            entry.bind("<FocusOut>", restore_placeholder)

    def _date_entry(self, parent: tk.Frame, label: str, variable: tk.StringVar, row: int, column: int) -> None:
        tk.Label(parent, text=label, anchor="w").grid(row=row, column=column, sticky="ew", padx=(0, 8), pady=5)
        entry = DateEntry(
            parent,
            textvariable=variable,
            date_pattern="dd/mm/yyyy",
            locale="pt_BR",
            width=16,
        )
        entry.grid(row=row, column=column + 1, sticky="ew", padx=(0, 16), pady=5)

    def _folder_entry(self, parent: tk.Frame, label: str, variable: tk.StringVar, row: int, column: int) -> None:
        tk.Label(parent, text=label, anchor="w").grid(row=row, column=column, sticky="ew", padx=(0, 8), pady=5)
        entry = tk.Entry(parent, textvariable=variable)
        entry.grid(row=row, column=column + 1, columnspan=2, sticky="ew", padx=(0, 8), pady=5)
        tk.Button(parent, text="Selecionar...", command=self._select_folder).grid(row=row, column=3, sticky="ew", pady=5)

    def _select_folder(self) -> None:
        selected = filedialog.askdirectory(title="Selecionar pasta de destino")
        if selected:
            self.destino_var.set(selected)

    def _start_download(self) -> None:
        login = self.login_var.get().strip()
        password = self.password_var.get()
        start = self._clean_date_value(self.start_var.get())
        end = self._clean_date_value(self.end_var.get())
        destino = self._destination_dir()

        if not login or not password or not start or not end:
            messagebox.showerror("Campos obrigatorios", "Informe login, senha, data inicial e data final.")
            return

        self.download_button.configure(state=tk.DISABLED)
        self.status_var.set("Executando...")
        self._append_log("Iniciando download...")

        self.worker = threading.Thread(
            target=self._run_download,
            args=(login, password, start, end, destino),
            daemon=True,
        )
        self.worker.start()

    def _run_download(self, login: str, password: str, start: str, end: str, destino: Path) -> None:
        try:
            with AgapeNfseClient(login=login, password=password, alias="pmboquim", max_workers=5) as client:
                result = client.baixar_periodo(
                    data_inicial=start,
                    data_final=end,
                    destino_base=destino,
                    log=lambda msg: self.messages.put(("log", msg)),
                )
            self.messages.put(("done", result))
        except Exception as exc:  # noqa: BLE001 - erro deve aparecer na GUI.
            self.messages.put(("error", exc))

    def _poll_messages(self) -> None:
        try:
            while True:
                kind, payload = self.messages.get_nowait()
                if kind == "log":
                    self._append_log(str(payload))
                elif kind == "done":
                    self._append_log(
                        "Concluido: "
                        f"{payload.baixados} baixado(s), {payload.pulados} pulado(s), "
                        f"{payload.erros} erro(s), {payload.total_notas} nota(s) encontrada(s)."
                    )
                    self._append_log(f"Destino: {payload.destino}")
                    self.status_var.set("Concluido")
                    self.download_button.configure(state=tk.NORMAL)
                elif kind == "error":
                    self._append_log(f"ERRO: {payload}")
                    self.status_var.set("Erro")
                    self.download_button.configure(state=tk.NORMAL)
                    messagebox.showerror("Erro", str(payload))
        except queue.Empty:
            pass
        self.root.after(150, self._poll_messages)

    def _append_log(self, message: str) -> None:
        self.log_text.configure(state=tk.NORMAL)
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
        self.log_text.configure(state=tk.DISABLED)

    def _clean_date_value(self, value: str) -> str:
        value = value.strip()
        return "" if value == "DD/MM/AAAA" else value

    def _destination_dir(self) -> Path:
        value = self.destino_var.get().strip()
        if not value:
            return self.config.downloads_dir
        return Path(value).expanduser()


def main() -> None:
    root = tk.Tk()
    DownloadGui(root)
    root.mainloop()


if __name__ == "__main__":
    main()
