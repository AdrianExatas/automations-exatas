import os
import subprocess
import sys
from pathlib import Path

from sieg_xml.cli.parser import build_parser


PROJECT_ROOT = Path(__file__).resolve().parents[1]


def _run_cli(*args: str):
    env = os.environ.copy()
    env["PYTHONPATH"] = str(PROJECT_ROOT / "src")
    env["SIEG_XML_DISABLE_DOTENV"] = "1"
    return subprocess.run([sys.executable, "-m", "sieg_xml", *args], cwd=PROJECT_ROOT, env=env, capture_output=True, text=True)


def test_cli_help():
    result = _run_cli("--help")
    assert result.returncode == 0
    assert "sieg-xml" in result.stdout


def test_cli_download_help():
    result = _run_cli("download", "--help")
    assert result.returncode == 0
    assert "Baixar XMLs" in result.stdout or "download" in result.stdout.lower()


def test_cli_desktop_help():
    result = _run_cli("desktop", "--help")
    assert result.returncode == 0
    assert "interface desktop" in result.stdout.lower() or "desktop" in result.stdout.lower()


def test_build_parser_registra_subcomandos_esperados():
    parser = build_parser()
    subparsers_action = next(action for action in parser._actions if getattr(action, "choices", None))
    assert {"download", "upload", "extract", "organize", "danfe", "move-report", "desktop"} <= set(
        subparsers_action.choices
    )
