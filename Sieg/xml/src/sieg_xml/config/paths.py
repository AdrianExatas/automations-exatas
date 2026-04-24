"""Paths do projeto e diretorios operacionais."""

from __future__ import annotations

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[3]
SRC_DIR = BASE_DIR / "src"
PACKAGE_DIR = SRC_DIR / "sieg_xml"
APP_NAME = "SIEG XML"


def _resolve_env_path(value: str | None, default: Path) -> Path:
    if not value:
        return default

    candidate = Path(value)
    if not candidate.is_absolute():
        candidate = BASE_DIR / candidate
    return candidate.resolve()


def _default_machine_root() -> Path:
    explicit = os.getenv("SIEG_XML_PROGRAMDATA_DIR")
    if explicit:
        return Path(explicit).resolve()

    program_data = os.getenv("PROGRAMDATA")
    if program_data:
        return (Path(program_data) / APP_NAME).resolve()

    return (BASE_DIR / "_local").resolve()


MACHINE_ROOT_DIR = _default_machine_root()
CONFIG_DIR = MACHINE_ROOT_DIR / "config"
MACHINE_ENV_FILE = CONFIG_DIR / ".env"

DATA_DIR = _resolve_env_path(os.getenv("SIEG_XML_DATA_DIR"), MACHINE_ROOT_DIR / "data")
REPORTS_DIR = DATA_DIR / "reports"
LOG_DIR = DATA_DIR / "logs"
UPLOAD_DIR = DATA_DIR / "uploads"
WORK_DIR = DATA_DIR / "work"
INPUTS_DIR = DATA_DIR / "inputs"
XML_DOWNLOAD_DIR = DATA_DIR / "xmls"
DANFE_OUTPUT_DIR = REPORTS_DIR / "danfes"
TEMPLATES_DIR = BASE_DIR / "planilhas"

PASTA_XMLS_BAIXADOS = str(XML_DOWNLOAD_DIR)
PASTA_PADRAO_XMLS = os.getenv("PASTA_PADRAO_XMLS", str(INPUTS_DIR / "xmls"))


def resolve_data_path(*parts: str) -> Path:
    return DATA_DIR.joinpath(*parts)


def ensure_runtime_dirs() -> None:
    for path in (
        MACHINE_ROOT_DIR,
        CONFIG_DIR,
        DATA_DIR,
        REPORTS_DIR,
        LOG_DIR,
        UPLOAD_DIR,
        WORK_DIR,
        INPUTS_DIR,
        XML_DOWNLOAD_DIR,
        DANFE_OUTPUT_DIR,
    ):
        path.mkdir(parents=True, exist_ok=True)
