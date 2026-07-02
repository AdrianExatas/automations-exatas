from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def runtime_root() -> Path:
    if getattr(sys, "frozen", False):
        return Path(sys.executable).resolve().parent
    return PROJECT_ROOT


load_dotenv(runtime_root() / ".env")
if runtime_root() != PROJECT_ROOT:
    load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class AppConfig:
    login: str = ""
    password: str = ""
    base_url: str = "https://agnfseprd.agapesistemas.com.br"
    downloads_dir: Path = Path.home() / "Downloads" / "XML AgapeNFS-e"

    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls(
            login=os.getenv("AGAPE_LOGIN", "").strip(),
            password=os.getenv("AGAPE_PASSWORD", "").strip(),
        )
