from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://api-publica.datajud.cnj.jus.br"

load_dotenv(ROOT / ".env")


def api_key() -> str:
    key = (os.getenv("API_KEY") or "").strip()
    if not key:
        raise RuntimeError("API_KEY ausente no .env")
    return key


def headers() -> dict[str, str]:
    return {
        "Authorization": f"APIKey {api_key()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def search_url(alias: str) -> str:
    return f"{BASE_URL}/api_publica_{alias}/_search"


def mapping_url(alias: str) -> str:
    return f"{BASE_URL}/api_publica_{alias}/_mapping"


def post_search(
    alias: str,
    body: dict[str, Any],
    *,
    timeout: float = 20.0,
) -> httpx.Response:
    return httpx.post(search_url(alias), headers=headers(), json=body, timeout=timeout)


def get_mapping(alias: str, *, timeout: float = 30.0) -> httpx.Response:
    return httpx.get(mapping_url(alias), headers=headers(), timeout=timeout)


def collect_keys(value: Any, prefix: str = "", depth: int = 0) -> list[str]:
    if depth > 4 or value is None:
        return [prefix] if prefix else []
    if isinstance(value, dict):
        keys: list[str] = []
        for key, child in value.items():
            path = f"{prefix}.{key}" if prefix else str(key)
            keys.append(path)
            keys.extend(collect_keys(child, path, depth + 1))
        return keys
    if isinstance(value, list) and value:
        return collect_keys(value[0], prefix, depth + 1)
    return [prefix] if prefix else []


def flatten_interesting_keys(keys: list[str]) -> list[str]:
    needles = ("parte", "polo", "documento", "cnpj", "cpf", "pessoa")
    unique: list[str] = []
    seen: set[str] = set()
    for key in keys:
        lowered = key.lower()
        if any(n in lowered for n in needles) and key not in seen:
            seen.add(key)
            unique.append(key)
    return unique
