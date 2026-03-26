# -*- coding: utf-8 -*-
# Script fino: delega para o módulo unificado com tipo "servico".
# Executar na raiz do projeto: python scripts/SERVICO_renomear_notas.py
import sys
from pathlib import Path

_raiz = Path(__file__).resolve().parent.parent
if str(_raiz) not in sys.path:
    sys.path.insert(0, str(_raiz))

from renomear_notas import main

if __name__ == "__main__":
    sys.argv = [sys.argv[0], "--tipo", "servico"] + sys.argv[1:]
    sys.exit(main())
