"""Settings gerais e validacao de configuracao obrigatoria."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from .paths import BASE_DIR, MACHINE_ENV_FILE, ensure_runtime_dirs


LOCAL_ENV_FILE = BASE_DIR / ".env"


def _load_environment() -> Path | None:
    if os.getenv("SIEG_XML_DISABLE_DOTENV", "").lower() in {"1", "true", "yes"}:
        return None

    loaded_from: Path | None = None

    if MACHINE_ENV_FILE.exists():
        load_dotenv(MACHINE_ENV_FILE, override=False)
        loaded_from = MACHINE_ENV_FILE

    if LOCAL_ENV_FILE.exists():
        load_dotenv(LOCAL_ENV_FILE, override=False)
        if loaded_from is None:
            loaded_from = LOCAL_ENV_FILE

    return loaded_from


ACTIVE_ENV_FILE = _load_environment()


API_URL_BASE = os.getenv("SIEG_UPLOAD_URL", "https://up.sieg.com/EnviarXml")
API_URL_BAIXAR_BASE = os.getenv("SIEG_DOWNLOAD_URL", "https://api.sieg.com/BaixarXml")
XML_TYPE_NFE = int(os.getenv("SIEG_XML_TYPE_NFE", "1"))
XML_TYPE_CTE = int(os.getenv("SIEG_XML_TYPE_CTE", "2"))
XML_TYPE_NFCE = int(os.getenv("SIEG_XML_TYPE_NFCE", "4"))
API_URL_BAIXAR = f"{API_URL_BAIXAR_BASE}?xmlType={XML_TYPE_NFE}"

SIEG_API_KEY = os.getenv("SIEG_API_KEY")

NUM_THREADS_DOWNLOAD = int(os.getenv("NUM_THREADS_DOWNLOAD", "6"))
NUM_THREADS_PADRAO = int(os.getenv("NUM_THREADS_PADRAO", "20"))
NUM_THREADS_VERIFICACAO = int(os.getenv("NUM_THREADS_VERIFICACAO", "20"))

DOWNLOAD_WARM_UP_FASE1_QTD = int(os.getenv("DOWNLOAD_WARM_UP_FASE1_QTD", "1"))
DOWNLOAD_WARM_UP_FASE1_THREADS = int(os.getenv("DOWNLOAD_WARM_UP_FASE1_THREADS", "1"))
DOWNLOAD_WARM_UP_FASE2_QTD = int(os.getenv("DOWNLOAD_WARM_UP_FASE2_QTD", "5"))
DOWNLOAD_WARM_UP_FASE2_THREADS = int(os.getenv("DOWNLOAD_WARM_UP_FASE2_THREADS", "3"))
DOWNLOAD_WARM_UP_FASE3_QTD = int(os.getenv("DOWNLOAD_WARM_UP_FASE3_QTD", "15"))
DOWNLOAD_WARM_UP_FASE3_THREADS = int(os.getenv("DOWNLOAD_WARM_UP_FASE3_THREADS", "6"))
DOWNLOAD_WARM_UP_DELAY = float(os.getenv("DOWNLOAD_WARM_UP_DELAY", "0.1"))

WARM_UP_FASE1_QTD = int(os.getenv("WARM_UP_FASE1_QTD", "5"))
WARM_UP_FASE1_THREADS = int(os.getenv("WARM_UP_FASE1_THREADS", "1"))
WARM_UP_FASE2_QTD = int(os.getenv("WARM_UP_FASE2_QTD", "15"))
WARM_UP_FASE2_THREADS = int(os.getenv("WARM_UP_FASE2_THREADS", "5"))
WARM_UP_FASE3_QTD = int(os.getenv("WARM_UP_FASE3_QTD", "30"))
WARM_UP_FASE3_THREADS = int(os.getenv("WARM_UP_FASE3_THREADS", "10"))
WARM_UP_DELAY = float(os.getenv("WARM_UP_DELAY", "0.2"))

RETRY_MAX_TENTATIVAS = int(os.getenv("RETRY_MAX_TENTATIVAS", "3"))
RETRY_ERROS_RECUPERAVEIS = [500, 502, 503, 504, 429]

RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "2000"))
RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW", "60"))

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json",
}

_MODELO_TO_XML_TYPE = {
    55: XML_TYPE_NFE,
    57: XML_TYPE_CTE,
    65: XML_TYPE_NFCE,
}


def inferir_tipo_documento_chave(chave_acesso: str | None) -> str | None:
    if not chave_acesso or len(chave_acesso) != 44 or not chave_acesso.isdigit():
        return None
    modelo = int(chave_acesso[20:22])
    if modelo == 55:
        return "NFe"
    if modelo == 57:
        return "CTe"
    if modelo == 65:
        return "NFCe"
    return None


def xml_type_from_chave(chave_acesso: str | None) -> int:
    if not chave_acesso or len(chave_acesso) != 44 or not chave_acesso.isdigit():
        return XML_TYPE_NFE
    modelo = int(chave_acesso[20:22])
    return _MODELO_TO_XML_TYPE.get(modelo, XML_TYPE_NFE)


def get_sieg_api_key(api_key: str | None = None) -> str:
    resolved = api_key or SIEG_API_KEY
    if not resolved:
        env_hint = MACHINE_ENV_FILE if MACHINE_ENV_FILE.exists() else LOCAL_ENV_FILE
        raise RuntimeError(f"SIEG_API_KEY nao configurada. Defina a variavel em {env_hint}.")
    return str(resolved)


def validate_required_settings() -> None:
    get_sieg_api_key()
    ensure_runtime_dirs()
