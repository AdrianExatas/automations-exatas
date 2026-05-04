import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import zipfile
from pathlib import Path


APP_NAME = "Financeiro NFSe"
APP_EXE = "Financeiro NFSe.exe"
SETUP_TITLE = "Financeiro NFSe Setup"
PAYLOAD_NAME = "payload.zip"


def resource_path(name: str) -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / name


def default_install_dir() -> Path:
    local_app_data = os.environ.get("LOCALAPPDATA")
    if local_app_data:
        return Path(local_app_data) / "Programs" / APP_NAME
    return Path.home() / "AppData" / "Local" / "Programs" / APP_NAME


def desktop_dir() -> Path:
    return Path.home() / "Desktop"


def start_menu_dir() -> Path:
    appdata = os.environ.get("APPDATA")
    if appdata:
        return Path(appdata) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / APP_NAME
    return Path.home() / "AppData" / "Roaming" / "Microsoft" / "Windows" / "Start Menu" / "Programs" / APP_NAME


def copy_payload(source: Path, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)

    internal_target = target / "_internal"
    if internal_target.exists():
        shutil.rmtree(internal_target)

    for item in source.iterdir():
        destination = target / item.name

        if item.name == "var":
            destination.mkdir(parents=True, exist_ok=True)
            continue

        if item.name == "config":
            destination.mkdir(parents=True, exist_ok=True)
            for config_item in item.iterdir():
                config_destination = destination / config_item.name
                if not config_destination.exists():
                    if config_item.is_dir():
                        shutil.copytree(config_item, config_destination)
                    else:
                        shutil.copy2(config_item, config_destination)
            continue

        if item.is_dir():
            shutil.copytree(item, destination, dirs_exist_ok=True)
        else:
            shutil.copy2(item, destination)


def create_shortcut(link_path: Path, target_path: Path, working_dir: Path) -> None:
    link_path.parent.mkdir(parents=True, exist_ok=True)
    script = """
param(
    [string]$LinkPath,
    [string]$TargetPath,
    [string]$WorkingDirectory
)
$Shell = New-Object -ComObject WScript.Shell
$Shortcut = $Shell.CreateShortcut($LinkPath)
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDirectory
$Shortcut.IconLocation = "$TargetPath,0"
$Shortcut.Save()
"""
    with tempfile.NamedTemporaryFile("w", suffix=".ps1", delete=False, encoding="utf-8") as handle:
        handle.write(script)
        script_path = Path(handle.name)
    try:
        subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(script_path),
                str(link_path),
                str(target_path),
                str(working_dir),
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )
    finally:
        script_path.unlink(missing_ok=True)


def ps_quote(value: Path) -> str:
    return str(value).replace("'", "''")


def write_uninstaller(install_dir: Path, desktop_shortcut: bool, start_menu_shortcut: bool) -> Path:
    uninstall_path = install_dir / f"Uninstall {APP_NAME}.cmd"
    desktop_link = desktop_dir() / f"{APP_NAME}.lnk"
    start_dir = start_menu_dir()
    start_link = start_dir / f"{APP_NAME}.lnk"
    uninstall_link = start_dir / f"Uninstall {APP_NAME}.lnk"

    cleanup_commands = [
        f"Remove-Item -LiteralPath '{ps_quote(desktop_link)}' -Force -ErrorAction SilentlyContinue",
        f"Remove-Item -LiteralPath '{ps_quote(start_link)}' -Force -ErrorAction SilentlyContinue",
        f"Remove-Item -LiteralPath '{ps_quote(uninstall_link)}' -Force -ErrorAction SilentlyContinue",
        f"Remove-Item -LiteralPath '{ps_quote(start_dir)}' -Force -Recurse -ErrorAction SilentlyContinue",
        "Start-Sleep -Seconds 1",
        f"Remove-Item -LiteralPath '{ps_quote(install_dir)}' -Force -Recurse -ErrorAction SilentlyContinue",
    ]
    command = "; ".join(cleanup_commands)
    uninstall_path.write_text(
        "@echo off\r\n"
        f"echo Removendo {APP_NAME}...\r\n"
        f'powershell -NoProfile -ExecutionPolicy Bypass -Command "{command}"\r\n',
        encoding="utf-8",
    )
    return uninstall_path


def install_app(
    install_dir: Path,
    create_desktop_shortcut: bool,
    create_start_menu_shortcut: bool,
    status=None,
) -> Path:
    payload = resource_path(PAYLOAD_NAME)
    if not payload.exists():
        raise FileNotFoundError(f"Payload nao encontrado: {payload}")

    def set_status(message: str) -> None:
        if status:
            status(message)

    set_status("Extraindo arquivos...")
    with tempfile.TemporaryDirectory(prefix="financeiro-nfse-") as temp_dir:
        temp_path = Path(temp_dir)
        with zipfile.ZipFile(payload, "r") as archive:
            archive.extractall(temp_path)

        source = temp_path / APP_NAME
        if not source.exists():
            raise FileNotFoundError(f"Pasta do aplicativo nao encontrada no payload: {source}")

        set_status("Copiando aplicacao...")
        copy_payload(source, install_dir)

    app_exe = install_dir / APP_EXE
    if not app_exe.exists():
        raise FileNotFoundError(f"Executavel instalado nao encontrado: {app_exe}")

    set_status("Criando desinstalador...")
    uninstaller = write_uninstaller(install_dir, create_desktop_shortcut, create_start_menu_shortcut)

    if create_desktop_shortcut:
        set_status("Criando atalho na area de trabalho...")
        create_shortcut(desktop_dir() / f"{APP_NAME}.lnk", app_exe, install_dir)

    if create_start_menu_shortcut:
        set_status("Criando atalhos no menu iniciar...")
        menu_dir = start_menu_dir()
        create_shortcut(menu_dir / f"{APP_NAME}.lnk", app_exe, install_dir)
        create_shortcut(menu_dir / f"Uninstall {APP_NAME}.lnk", uninstaller, install_dir)

    set_status("Instalacao concluida.")
    return app_exe


def self_test() -> int:
    payload = resource_path(PAYLOAD_NAME)
    if not payload.exists():
        print(f"ERRO: payload nao encontrado: {payload}")
        return 1
    with zipfile.ZipFile(payload, "r") as archive:
        names = set(archive.namelist())
        exe_name = f"{APP_NAME}/{APP_EXE}"
        if exe_name not in names:
            print(f"ERRO: executavel nao encontrado no payload: {exe_name}")
            return 1
        bad_file = archive.testzip()
        if bad_file:
            print(f"ERRO: arquivo corrompido no payload: {bad_file}")
            return 1
    print("OK: instalador valido.")
    return 0


def run_silent(args) -> int:
    install_dir = Path(args.install_dir).expanduser() if args.install_dir else default_install_dir()
    try:
        app_exe = install_app(
            install_dir,
            create_desktop_shortcut=not args.no_desktop_shortcut,
            create_start_menu_shortcut=not args.no_start_menu_shortcut,
            status=print,
        )
        if args.launch:
            subprocess.Popen([str(app_exe)], cwd=str(app_exe.parent))
        return 0
    except Exception as exc:
        print(f"ERRO: {exc}")
        return 1


def run_gui(args) -> int:
    try:
        import tkinter as tk
        from tkinter import filedialog, messagebox, ttk
    except Exception:
        args.silent = True
        return run_silent(args)

    root = tk.Tk()
    root.title(SETUP_TITLE)
    root.resizable(False, False)

    install_dir_var = tk.StringVar(value=str(default_install_dir()))
    desktop_var = tk.BooleanVar(value=not args.no_desktop_shortcut)
    start_menu_var = tk.BooleanVar(value=not args.no_start_menu_shortcut)
    status_var = tk.StringVar(value="Pronto para instalar.")

    frame = ttk.Frame(root, padding=18)
    frame.grid(row=0, column=0, sticky="nsew")

    ttk.Label(frame, text=APP_NAME, font=("Segoe UI", 16, "bold")).grid(row=0, column=0, columnspan=3, sticky="w")
    ttk.Label(frame, text="Escolha a pasta de instalacao e clique em Instalar.").grid(
        row=1, column=0, columnspan=3, sticky="w", pady=(4, 16)
    )

    ttk.Label(frame, text="Pasta:").grid(row=2, column=0, sticky="w")
    path_entry = ttk.Entry(frame, width=54, textvariable=install_dir_var)
    path_entry.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(4, 10))

    def choose_dir() -> None:
        selected = filedialog.askdirectory(initialdir=install_dir_var.get() or str(default_install_dir()))
        if selected:
            install_dir_var.set(selected)

    browse_button = ttk.Button(frame, text="Procurar", command=choose_dir)
    browse_button.grid(row=3, column=2, sticky="ew", padx=(8, 0), pady=(4, 10))

    ttk.Checkbutton(frame, text="Criar atalho na area de trabalho", variable=desktop_var).grid(
        row=4, column=0, columnspan=3, sticky="w"
    )
    ttk.Checkbutton(frame, text="Criar atalhos no menu iniciar", variable=start_menu_var).grid(
        row=5, column=0, columnspan=3, sticky="w", pady=(2, 14)
    )

    status_label = ttk.Label(frame, textvariable=status_var)
    status_label.grid(row=6, column=0, columnspan=3, sticky="w", pady=(0, 14))

    button_frame = ttk.Frame(frame)
    button_frame.grid(row=7, column=0, columnspan=3, sticky="e")

    install_button = ttk.Button(button_frame, text="Instalar")
    cancel_button = ttk.Button(button_frame, text="Cancelar", command=root.destroy)
    install_button.grid(row=0, column=0, padx=(0, 8))
    cancel_button.grid(row=0, column=1)

    def set_busy(enabled: bool) -> None:
        state = "disabled" if enabled else "normal"
        install_button.configure(state=state)
        cancel_button.configure(state=state)
        browse_button.configure(state=state)
        path_entry.configure(state=state)

    def set_status(message: str) -> None:
        root.after(0, status_var.set, message)

    def do_install() -> None:
        set_busy(True)

        def worker() -> None:
            try:
                app_exe = install_app(
                    Path(install_dir_var.get()).expanduser(),
                    create_desktop_shortcut=desktop_var.get(),
                    create_start_menu_shortcut=start_menu_var.get(),
                    status=set_status,
                )
            except Exception as exc:
                error_message = str(exc)
                root.after(0, lambda: messagebox.showerror(SETUP_TITLE, error_message))
                root.after(0, lambda: set_busy(False))
                return

            def done() -> None:
                messagebox.showinfo(SETUP_TITLE, f"{APP_NAME} foi instalado com sucesso.")
                if args.launch:
                    subprocess.Popen([str(app_exe)], cwd=str(app_exe.parent))
                root.destroy()

            root.after(0, done)

        threading.Thread(target=worker, daemon=True).start()

    install_button.configure(command=do_install)

    root.mainloop()
    return 0


def parse_args():
    parser = argparse.ArgumentParser(description=SETUP_TITLE)
    parser.add_argument("--self-test", action="store_true", help="valida o payload embutido e sai")
    parser.add_argument("--silent", action="store_true", help="instala sem interface grafica")
    parser.add_argument("--install-dir", help="pasta de instalacao")
    parser.add_argument("--no-desktop-shortcut", action="store_true", help="nao cria atalho na area de trabalho")
    parser.add_argument("--no-start-menu-shortcut", action="store_true", help="nao cria atalhos no menu iniciar")
    parser.add_argument("--launch", action="store_true", help="abre a aplicacao depois da instalacao")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.self_test:
        return self_test()
    if args.silent:
        return run_silent(args)
    return run_gui(args)


if __name__ == "__main__":
    raise SystemExit(main())
