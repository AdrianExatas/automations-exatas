# -*- coding: utf-8 -*-
"""Glossário Exatas para Whisper (prompt) e pós-correção determinística de transcripts."""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

_SCRIPTS_DIR = Path(__file__).resolve().parent
_DEFAULT_GLOSSARY = _SCRIPTS_DIR.parent / "config" / "stt_glossary_exatas.json"

_compiled_cache: dict[str, list[tuple[re.Pattern[str], str]]] = {}


def default_glossary_path() -> Path:
    return _DEFAULT_GLOSSARY


def load_glossary(path: Path | str | None = None) -> dict[str, Any]:
    glossary_path = Path(path) if path else _DEFAULT_GLOSSARY
    if not glossary_path.is_file():
        raise FileNotFoundError(f"Glossário não encontrado: {glossary_path}")
    data = json.loads(glossary_path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"Glossário inválido (esperado objeto JSON): {glossary_path}")
    try:
        mtime = glossary_path.stat().st_mtime_ns
    except OSError:
        mtime = 0
    data["_cache_key"] = f"{glossary_path.resolve()}::{mtime}"
    return data


def _compiled_replacements(glossary: dict[str, Any], *, cache_key: str) -> list[tuple[re.Pattern[str], str]]:
    key = str(glossary.get("_cache_key") or cache_key)
    if key in _compiled_cache:
        return _compiled_cache[key]
    compiled: list[tuple[re.Pattern[str], str]] = []
    for item in glossary.get("replacements") or []:
        if not isinstance(item, dict):
            continue
        pattern = str(item.get("pattern") or "").strip()
        replacement = str(item.get("replacement") or "")
        if not pattern:
            continue
        compiled.append((re.compile(pattern), replacement))
    _compiled_cache[key] = compiled
    return compiled


def build_whisper_prompt(
    glossary: dict[str, Any] | None = None,
    *,
    extra_prompt: str = "",
) -> str:
    """Monta initial_prompt do Whisper com termos preferidos + prompt extra do usuário."""
    data = glossary if glossary is not None else load_glossary()
    prefix = str(data.get("whisper_prompt_prefix") or "").strip()
    terms = [str(t).strip() for t in (data.get("preferred_terms") or []) if str(t).strip()]
    parts: list[str] = []
    if prefix and terms:
        parts.append(f"{prefix} {', '.join(terms)}.")
    elif terms:
        parts.append(
            "Transcrição em português do Brasil. Use as grafias: " + ", ".join(terms) + "."
        )
    elif prefix:
        parts.append(prefix if prefix.endswith(".") else prefix + ".")
    extra = (extra_prompt or "").strip()
    if extra:
        parts.append(extra)
    joined = " ".join(parts).strip()
    if len(joined) > 800:
        joined = joined[:797].rsplit(" ", 1)[0] + "..."
    return joined


def apply_glossary(
    text: str,
    glossary: dict[str, Any] | None = None,
    *,
    glossary_path: Path | str | None = None,
) -> tuple[str, list[dict[str, str]]]:
    """Aplica replacements do glossário. Retorna (texto, lista de mudanças)."""
    data = glossary if glossary is not None else load_glossary(glossary_path)
    key = str(data.get("_cache_key") or glossary_path or data.get("version") or "default")
    compiled = _compiled_replacements(data, cache_key=key)
    out = text or ""
    changes: list[dict[str, str]] = []
    for pattern, replacement in compiled:

        def _sub(
            match: re.Match[str],
            *,
            _repl: str = replacement,
            _pat: str = pattern.pattern,
        ) -> str:
            old = match.group(0)
            if old != _repl:
                changes.append({"from": old, "to": _repl, "pattern": _pat})
            return _repl

        out = pattern.sub(_sub, out)
    return out, changes


def apply_glossary_to_segments(
    segments: list[dict[str, Any]],
    glossary: dict[str, Any] | None = None,
    *,
    glossary_path: Path | str | None = None,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    data = glossary if glossary is not None else load_glossary(glossary_path)
    all_changes: list[dict[str, str]] = []
    updated: list[dict[str, Any]] = []
    for seg in segments:
        row = dict(seg)
        text = str(row.get("text") or "")
        new_text, changes = apply_glossary(text, data)
        row["text"] = new_text
        updated.append(row)
        all_changes.extend(changes)
    return updated, all_changes


def summarize_changes(changes: list[dict[str, str]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for item in changes:
        key = f"{item.get('from')}->{item.get('to')}"
        counts[key] = counts.get(key, 0) + 1
    return counts
