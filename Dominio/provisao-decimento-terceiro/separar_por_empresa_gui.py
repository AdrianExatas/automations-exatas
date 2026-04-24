from __future__ import annotations

import os
import threading
import traceback
from pathlib import Path
from queue import Empty, Queue
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from provisao_splitter import build_output_filename, split_pdf_by_company


DEFAULT_INPUT_NAME = "Provisão de Décimo Terceiro Salário.pdf"
DEFAULT_OUTPUT_DIR = Path("output/pdf/empresas")


class App:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Separador de Provisão por Empresa")
        self.root.geometry("760x520")
        self.root.minsize(700, 460)

        self.events: Queue[tuple[str, object]] = Queue()
        self.worker: threading.Thread | None = None

        self.input_var = tk.StringVar(value=self._default_input_path())
        self.output_var = tk.StringVar(value=str(Path.cwd() / DEFAULT_OUTPUT_DIR))
        self.overwrite_var = tk.BooleanVar(value=False)
        self.dry_run_var = tk.BooleanVar(value=False)
        self.status_var = tk.StringVar(value="Selecione o PDF e clique em Executar.")

        self._build()
        self.root.after(150, self._poll_events)
        self._apply_automation_options()

    def _default_input_path(self) -> str:
        candidate = Path.cwd() / DEFAULT_INPUT_NAME
        if candidate.exists():
            return str(candidate)
        return ""

    def _build(self) -> None:
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        frame = ttk.Frame(self.root, padding=16)
        frame.grid(sticky="nsew")
        frame.columnconfigure(1, weight=1)
        frame.rowconfigure(5, weight=1)

        title = ttk.Label(
            frame,
            text="Separar relatório por empresa",
            font=("Segoe UI", 16, "bold"),
        )
        title.grid(row=0, column=0, columnspan=3, sticky="w")

        subtitle = ttk.Label(
            frame,
            text="Gera um PDF por empresa com o nome {{codigo}}-Provisão de Décimo Terceiro Salário.pdf",
        )
        subtitle.grid(row=1, column=0, columnspan=3, sticky="w", pady=(4, 16))

        ttk.Label(frame, text="PDF de entrada").grid(row=2, column=0, sticky="w", pady=(0, 8))
        ttk.Entry(frame, textvariable=self.input_var).grid(
            row=2,
            column=1,
            sticky="ew",
            pady=(0, 8),
            padx=(8, 8),
        )
        ttk.Button(frame, text="Procurar", command=self._browse_input).grid(row=2, column=2, sticky="ew")

        ttk.Label(frame, text="Pasta de saída").grid(row=3, column=0, sticky="w", pady=(0, 8))
        ttk.Entry(frame, textvariable=self.output_var).grid(
            row=3,
            column=1,
            sticky="ew",
            pady=(0, 8),
            padx=(8, 8),
        )
        ttk.Button(frame, text="Procurar", command=self._browse_output).grid(row=3, column=2, sticky="ew")

        options = ttk.Frame(frame)
        options.grid(row=4, column=0, columnspan=3, sticky="w", pady=(4, 12))
        ttk.Checkbutton(options, text="Sobrescrever arquivos existentes", variable=self.overwrite_var).grid(
            row=0,
            column=0,
            sticky="w",
            padx=(0, 16),
        )
        ttk.Checkbutton(options, text="Simular sem gerar arquivos", variable=self.dry_run_var).grid(
            row=0,
            column=1,
            sticky="w",
        )

        log_frame = ttk.LabelFrame(frame, text="Saída")
        log_frame.grid(row=5, column=0, columnspan=3, sticky="nsew")
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)

        self.log = tk.Text(log_frame, wrap="word", height=14, state="disabled")
        self.log.grid(row=0, column=0, sticky="nsew")
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log.yview)
        scrollbar.grid(row=0, column=1, sticky="ns")
        self.log.configure(yscrollcommand=scrollbar.set)

        footer = ttk.Frame(frame)
        footer.grid(row=6, column=0, columnspan=3, sticky="ew", pady=(12, 0))
        footer.columnconfigure(0, weight=1)

        ttk.Label(footer, textvariable=self.status_var).grid(row=0, column=0, sticky="w")
        self.run_button = ttk.Button(footer, text="Executar", command=self._start_run)
        self.run_button.grid(row=0, column=1, sticky="e")

    def _apply_automation_options(self) -> None:
        auto_input = os.getenv("SEPARADOR_INPUT")
        auto_output = os.getenv("SEPARADOR_OUTPUT")
        if auto_input:
            self.input_var.set(auto_input)
        if auto_output:
            self.output_var.set(auto_output)

        if os.getenv("SEPARADOR_OVERWRITE") == "1":
            self.overwrite_var.set(True)
        if os.getenv("SEPARADOR_DRY_RUN") == "1":
            self.dry_run_var.set(True)

        auto_close_ms = os.getenv("SEPARADOR_AUTO_CLOSE_MS")
        if auto_close_ms:
            try:
                self.root.after(int(auto_close_ms), self.root.destroy)
            except ValueError:
                pass

        if os.getenv("SEPARADOR_AUTORUN") == "1":
            self.root.after(300, self._start_run)

    def _browse_input(self) -> None:
        selected = filedialog.askopenfilename(
            title="Selecione o PDF de entrada",
            filetypes=[("PDF", "*.pdf"), ("Todos os arquivos", "*.*")],
        )
        if selected:
            self.input_var.set(selected)

    def _browse_output(self) -> None:
        selected = filedialog.askdirectory(title="Selecione a pasta de saída")
        if selected:
            self.output_var.set(selected)

    def _append_log(self, message: str) -> None:
        self.log.configure(state="normal")
        self.log.insert("end", message + "\n")
        self.log.see("end")
        self.log.configure(state="disabled")

    def _set_running(self, running: bool) -> None:
        self.run_button.configure(state="disabled" if running else "normal")

    def _start_run(self) -> None:
        if self.worker and self.worker.is_alive():
            return

        input_raw = self.input_var.get().strip()
        output_raw = self.output_var.get().strip()
        input_path = Path(input_raw) if input_raw else None
        output_dir = Path(output_raw) if output_raw else None

        if input_path is None:
            self._show_error("Informe o PDF de entrada.")
            return
        if not input_path.exists():
            self._show_error(f"O PDF informado não existe:\n{input_path}")
            return
        if input_path.suffix.lower() != ".pdf":
            self._show_error("O arquivo de entrada precisa ser um PDF.")
            return
        if output_dir is None:
            self._show_error("Informe a pasta de saída.")
            return

        self.status_var.set("Processando...")
        self._append_log("")
        self._append_log(f"Entrada: {input_path}")
        self._append_log(f"Saída: {output_dir}")
        self._append_log(
            f"Opções: overwrite={self.overwrite_var.get()} dry_run={self.dry_run_var.get()}"
        )
        self._set_running(True)

        self.worker = threading.Thread(
            target=self._run_split,
            args=(input_path, output_dir, self.overwrite_var.get(), self.dry_run_var.get()),
            daemon=True,
        )
        self.worker.start()

    def _run_split(self, input_path: Path, output_dir: Path, overwrite: bool, dry_run: bool) -> None:
        try:
            groups = split_pdf_by_company(
                source_pdf=input_path,
                output_dir=output_dir,
                overwrite=overwrite,
                dry_run=dry_run,
            )
            self.events.put(
                (
                    "success",
                    {
                        "groups": groups,
                        "output_dir": output_dir,
                        "dry_run": dry_run,
                    },
                )
            )
        except Exception as exc:  # pragma: no cover
            details = "".join(traceback.format_exception_only(type(exc), exc)).strip()
            self.events.put(("error", details))

    def _poll_events(self) -> None:
        try:
            while True:
                event_name, payload = self.events.get_nowait()
                if event_name == "success":
                    self._handle_success(payload)
                elif event_name == "error":
                    self._handle_error(str(payload))
        except Empty:
            pass
        finally:
            self.root.after(150, self._poll_events)

    def _handle_success(self, payload: object) -> None:
        self._set_running(False)
        data = payload
        groups = data["groups"]
        output_dir = data["output_dir"]
        dry_run = data["dry_run"]

        self.status_var.set(f"Concluído. {len(groups)} empresas processadas.")
        if dry_run:
            self._append_log(f"Simulação concluída. Seriam gerados {len(groups)} arquivos.")
            preview = [build_output_filename(group.codigo) for group in groups[:10]]
            for item in preview:
                self._append_log(f" - {item}")
            if len(groups) > len(preview):
                self._append_log(f" ... e mais {len(groups) - len(preview)} arquivos")
            if os.getenv("SEPARADOR_QUIET") != "1":
                messagebox.showinfo("Concluído", f"Simulação concluída com {len(groups)} empresas.")
            if os.getenv("SEPARADOR_AUTO_CLOSE_ON_SUCCESS") == "1":
                self.root.after(300, self.root.destroy)
            return

        self._append_log(f"Concluído. Foram gerados {len(groups)} arquivos.")
        self._append_log(f"Pasta de saída: {output_dir}")
        if os.getenv("SEPARADOR_QUIET") != "1":
            messagebox.showinfo("Concluído", f"Foram gerados {len(groups)} arquivos.")
        if os.getenv("SEPARADOR_AUTO_CLOSE_ON_SUCCESS") == "1":
            self.root.after(300, self.root.destroy)

    def _handle_error(self, message: str) -> None:
        self._set_running(False)
        self.status_var.set("Falha ao processar o relatório.")
        self._append_log(f"Erro: {message}")
        self._show_error(message)

    def _show_error(self, message: str) -> None:
        if os.getenv("SEPARADOR_QUIET") != "1":
            messagebox.showerror("Erro", message)
        else:
            self._append_log(f"Erro: {message}")


def main() -> int:
    root = tk.Tk()
    App(root)
    root.mainloop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
