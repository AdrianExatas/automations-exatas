# -*- coding: utf-8 -*-
from __future__ import annotations

import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from financeiro_nfse.gui.renomear_window import MainWindow, Worker, main


if __name__ == "__main__":
    sys.exit(main())
