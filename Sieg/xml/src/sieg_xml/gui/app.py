"""Entrypoint nativo da interface desktop."""

from __future__ import annotations

from sieg_xml.config import ensure_runtime_dirs
from sieg_xml.gui.main_window import MainWindow


def main() -> int:
    ensure_runtime_dirs()
    MainWindow().run()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
