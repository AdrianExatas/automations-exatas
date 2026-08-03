#!/usr/bin/env python3
"""Corrige mojibake UTF-8 interpretado como Windows-1252 em arquivos DOCX."""

from __future__ import annotations

import argparse
import re
import zipfile
from pathlib import Path
from tempfile import NamedTemporaryFile


# Candidatos a 1º byte UTF-8 de 2 bytes (C2/C3) após misdecode cp1252.
MOJIBAKE_START = "\u00c2\u00c3"
# Sequência partida entre runs Word: Ã</w:t> ... <w:t>Š</w:t>
MOJIBAKE_SPLIT_WT_RE = re.compile(
    rf"([{re.escape(MOJIBAKE_START)}])(</w:t></w:r><w:r>(?:(?!</w:r>).)*?<w:t>)(.)(</w:t>)",
    re.DOTALL,
)
MOJIBAKE_SPACED_RE = re.compile(rf"([{re.escape(MOJIBAKE_START)}])\s+(.)")
MOJIBAKE_PAIR_RE = re.compile(rf"([{re.escape(MOJIBAKE_START)}]).")


def try_fix_pair(first: str, second: str) -> str | None:
    """Converte par mojibake via cp1252→UTF-8; None se for texto legítimo (ex.: ÃO)."""
    try:
        decoded = (first + second).encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None
    # Só aceita se realmente produziu um caractere "útil" distinto do par original.
    if decoded == first + second:
        return None
    return decoded


def repair_mojibake(text: str) -> str:
    def repl_pair(match: re.Match[str]) -> str:
        decoded = try_fix_pair(match.group(0)[0], match.group(0)[1])
        return decoded if decoded is not None else match.group(0)

    def repl_spaced(match: re.Match[str]) -> str:
        decoded = try_fix_pair(match.group(1), match.group(2))
        return decoded if decoded is not None else match.group(0)

    def repl_split_wt(match: re.Match[str]) -> str:
        decoded = try_fix_pair(match.group(1), match.group(3))
        if decoded is None:
            return match.group(0)
        # Mantém o segundo run vazio para não quebrar a estrutura OOXML.
        return decoded + match.group(2) + match.group(4)

    previous = None
    current = text
    for _ in range(5):
        previous = current
        current = MOJIBAKE_SPLIT_WT_RE.sub(repl_split_wt, current)
        current = MOJIBAKE_SPACED_RE.sub(repl_spaced, current)
        current = MOJIBAKE_PAIR_RE.sub(repl_pair, current)
        if current == previous:
            break
    return current


def find_unrepaired_mojibake(text: str) -> list[str]:
    """Lista pares ainda quebrados (úteis para validação)."""
    found: list[str] = []
    for match in MOJIBAKE_PAIR_RE.finditer(text):
        pair = match.group(0)
        if try_fix_pair(pair[0], pair[1]) is not None:
            found.append(pair)
    return found


def repair_docx(path: Path) -> int:
    fixed_parts = 0
    with zipfile.ZipFile(path, "r") as source:
        entries = {name: source.read(name) for name in source.namelist()}

    updated: dict[str, bytes] = {}
    for name, data in entries.items():
        if not (name.startswith("word/") and name.endswith(".xml")):
            continue
        try:
            text = data.decode("utf-8")
        except UnicodeDecodeError:
            continue
        repaired = repair_mojibake(text)
        if repaired != text:
            updated[name] = repaired.encode("utf-8")
            fixed_parts += 1

    if not updated:
        return 0

    with NamedTemporaryFile(delete=False, suffix=".docx") as tmp:
        tmp_path = Path(tmp.name)

    try:
        with zipfile.ZipFile(path, "r") as source, zipfile.ZipFile(
            tmp_path, "w", compression=zipfile.ZIP_DEFLATED
        ) as target:
            for info in source.infolist():
                data = updated.get(info.filename, source.read(info.filename))
                target.writestr(info, data)
        tmp_path.replace(path)
    finally:
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)

    return fixed_parts


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("paths", nargs="+", type=Path)
    args = parser.parse_args()

    for path in args.paths:
        parts = repair_docx(path)
        print(f"{path}: {parts} parte(s) XML corrigida(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
