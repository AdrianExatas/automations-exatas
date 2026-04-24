import runpy
import sys
from pathlib import Path
from types import ModuleType

import pytest
from sieg_xml.gui import app


def test_desktop_entrypoint_inicializa_runtime_e_janela(monkeypatch):
    chamadas = []

    class DummyWindow:
        def run(self):
            chamadas.append("run")

    monkeypatch.setattr(app, "ensure_runtime_dirs", lambda: chamadas.append("dirs"))
    monkeypatch.setattr(app, "MainWindow", DummyWindow)

    assert app.main() == 0
    assert chamadas == ["dirs", "run"]


def test_app_py_como_main_executa_entrypoint(monkeypatch):
    chamadas = []

    config_module = ModuleType("sieg_xml.config")
    config_module.ensure_runtime_dirs = lambda: chamadas.append("dirs")

    main_window_module = ModuleType("sieg_xml.gui.main_window")

    class DummyWindow:
        def run(self):
            chamadas.append("run")

    main_window_module.MainWindow = DummyWindow

    monkeypatch.setitem(sys.modules, "sieg_xml.config", config_module)
    monkeypatch.setitem(sys.modules, "sieg_xml.gui.main_window", main_window_module)

    app_path = Path(__file__).resolve().parents[1] / "src" / "sieg_xml" / "gui" / "app.py"

    with pytest.raises(SystemExit) as exc:
        runpy.run_path(str(app_path), run_name="__main__")

    assert exc.value.code == 0
    assert chamadas == ["dirs", "run"]
