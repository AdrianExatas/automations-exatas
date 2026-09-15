"""Caminhos usados pelo backend do portal.

Toda a resolucao de diretorios fica centralizada aqui para facilitar testes
(via variaveis de ambiente) e evitar caminhos relativos espalhados pelo codigo.

Layout do monorepo assumido (pode ser sobrescrito por env vars):

    automations-exatas/
    |-- apuracao-ICMS/
    |   |-- config/empresas.json
    |   |-- _local/dossies/<cnpj>/<AAAA-MM>/09 - Relatorio de conferencia/tecnico/*.json
    |   `-- portal/backend/  (este projeto)
    `-- motor-fiscal/
        `-- _local/auditorias/<cnpj>/<AAAA-MM>.json
"""

from __future__ import annotations

import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
PORTAL_DIR = BACKEND_DIR.parent

_env_apuracao_root = os.environ.get("APURACAO_ICMS_ROOT")
APURACAO_ROOT = Path(_env_apuracao_root) if _env_apuracao_root else PORTAL_DIR.parent

_env_motor_fiscal_root = os.environ.get("MOTOR_FISCAL_ROOT")
MOTOR_FISCAL_ROOT = (
    Path(_env_motor_fiscal_root) if _env_motor_fiscal_root else APURACAO_ROOT.parent / "motor-fiscal"
)

EMPRESAS_JSON = APURACAO_ROOT / "config" / "empresas.json"
EMPRESAS_DIR = APURACAO_ROOT / "empresas"
DOSSIES_DIR = APURACAO_ROOT / "_local" / "dossies"
AUDITORIAS_DIR = MOTOR_FISCAL_ROOT / "_local" / "auditorias"
MOTOR_DB_DIR = MOTOR_FISCAL_ROOT / "_local" / "db"

# Limite de upload por request (bytes).
UPLOAD_MAX_BYTES = int(os.environ.get("PORTAL_UPLOAD_MAX_BYTES", str(200 * 1024 * 1024)))

_env_operacional_db = os.environ.get("OPERACIONAL_DB_PATH")
OPERACIONAL_DB_PATH = (
    Path(_env_operacional_db) if _env_operacional_db else BACKEND_DIR / "_local" / "operacional.db"
)

CORS_ORIGINS = [
    origem.strip()
    for origem in os.environ.get("PORTAL_CORS_ORIGINS", "http://localhost:5173").split(",")
    if origem.strip()
]
