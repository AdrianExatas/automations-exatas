# -*- coding: utf-8 -*-
"""Refina transcripts .txt: glossário determinístico + revisão opcional por IA (texto só).

Uso:
  python refine_transcript.py --input "transcriptions/a fazer/spa-*.txt" --in-place
  python refine_transcript.py --input path.txt --llm
  python refine_transcript.py --input path.txt --glossary-only
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from stt_glossary import (
    apply_glossary,
    apply_glossary_to_segments,
    default_glossary_path,
    load_glossary,
    summarize_changes,
)

_MONTH_ABBR = (
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
)


def _project_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _buzz_style_stamp(now: datetime | None = None) -> str:
    now = now or datetime.now()
    return f"{now.day:02d}-{_MONTH_ABBR[now.month - 1]}-{now.year} {now.hour:02d}-{now.minute:02d}-{now.second:02d}"


def _media_stem_from_transcript(path: Path) -> str:
    m = re.match(r"^(.+) \(transcribed on .+\)\.txt$", path.name, re.IGNORECASE)
    if m:
        return m.group(1)
    m2 = re.match(r"^(.+) \(refined on .+\)\.txt$", path.name, re.IGNORECASE)
    if m2:
        return m2.group(1)
    return path.stem


def _segments_path_for(transcript: Path) -> Path:
    return transcript.parent / f"{_media_stem_from_transcript(transcript)}.segments.json"


def _collect_inputs(patterns: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in patterns:
        p = Path(raw).expanduser()
        if not p.is_absolute():
            p = (Path.cwd() / p).resolve()
        if p.is_file() and p.suffix.lower() == ".txt":
            files.append(p)
            continue
        # glob
        parent = p.parent if p.parent.exists() else Path.cwd()
        matches = sorted(parent.glob(p.name)) if "*" in p.name or "?" in p.name else []
        if not matches and p.exists() and p.is_dir():
            matches = sorted(p.glob("*.txt"))
        files.extend(m for m in matches if m.is_file() and m.suffix.lower() == ".txt")
    # unique
    seen: set[str] = set()
    out: list[Path] = []
    for f in files:
        key = str(f.resolve())
        if key in seen:
            continue
        seen.add(key)
        out.append(f.resolve())
    return out


def _build_llm_prompt(text: str, preferred_terms: list[str]) -> str:
    terms = ", ".join(preferred_terms[:40])
    return (
        "Você é um revisor de transcrições de treinamentos fiscais/contábeis da Exatas Contabilidade.\n"
        "Corrija apenas ortografia, acentuação e grafia de termos técnicos (ex.: CEFAZ→SEFAZ, ECAQ→ECAC, "
        "COFIN→COFINS, PES→PERSE quando for o benefício, Domínio, Simples Nacional, CSC, IRPJ, CSLL).\n"
        "NÃO invente passos, NÃO resuma, NÃO reordene o conteúdo de forma material.\n"
        "Preserve quebras de linha e o sentido falado.\n"
        f"Termos preferidos: {terms}.\n"
        "Responda SOMENTE com o texto revisado, sem markdown e sem comentários.\n\n"
        "---TRANSCRICAO---\n"
        f"{text}\n"
        "---FIM---\n"
    )


def _refine_with_cursor_agent(text: str, preferred_terms: list[str], *, model: str) -> str:
    api_key = os.environ.get("CURSOR_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("CURSOR_API_KEY nao definida")

    try:
        from cursor_sdk import Agent, AgentOptions, LocalAgentOptions, CursorAgentError
    except ImportError:
        try:
            from cursor_sdk import Agent, AgentOptions, LocalAgentOptions

            CursorAgentError = Exception  # type: ignore[misc, assignment]
        except ImportError as exc:
            raise RuntimeError("pacote cursor-sdk nao instalado (pip install cursor-sdk)") from exc

    prompt = _build_llm_prompt(text, preferred_terms)
    try:
        result = Agent.prompt(
            prompt,
            AgentOptions(
                api_key=api_key,
                model=model,
                local=LocalAgentOptions(cwd=str(_project_root())),
            ),
        )
    except CursorAgentError as exc:
        raise RuntimeError(getattr(exc, "message", None) or str(exc)) from exc

    out = getattr(result, "result", None) or getattr(result, "text", None) or str(result)
    out = str(out).strip()
    # Remove cercas markdown acidentais
    if out.startswith("```"):
        out = re.sub(r"^```(?:\w+)?\n?", "", out)
        out = re.sub(r"\n?```$", "", out).strip()
    if not out:
        raise RuntimeError("Resposta vazia do agente")
    return out


def refine_one(
    path: Path,
    *,
    glossary: dict[str, Any],
    in_place: bool,
    use_llm: bool,
    llm_model: str,
    dry_run: bool,
) -> dict[str, Any]:
    original = path.read_text(encoding="utf-8", errors="ignore")
    text, changes = apply_glossary(original, glossary)
    mode = "glossary"

    llm_applied = False
    if use_llm:
        try:
            terms = [str(t) for t in (glossary.get("preferred_terms") or [])]
            text = _refine_with_cursor_agent(text, terms, model=llm_model)
            # reaplicar glossário após LLM (garante pares conhecidos)
            text, extra = apply_glossary(text, glossary)
            changes.extend(extra)
            llm_applied = True
            mode = "glossary+llm"
        except Exception as exc:
            print(f"[aviso] LLM indisponível para {path.name}: {exc}", flush=True)
            mode = "glossary(llm-failed)"

    if not text.endswith("\n") and text:
        text += "\n"

    changed = text != original
    summary = summarize_changes(changes)

    if dry_run:
        return {
            "input": str(path),
            "changed": changed,
            "mode": mode,
            "llm": llm_applied,
            "changes": summary,
            "dry_run": True,
        }

    if in_place:
        out_path = path
    else:
        stem = _media_stem_from_transcript(path)
        out_path = path.parent / f"{stem} (refined on {_buzz_style_stamp()}).txt"

    if changed or not in_place:
        out_path.write_text(text, encoding="utf-8")

    # Atualiza sidecar de segments se existir
    seg_path = _segments_path_for(path)
    segments_updated = False
    if seg_path.is_file():
        try:
            payload = json.loads(seg_path.read_text(encoding="utf-8"))
            segs = payload.get("segments") or []
            if isinstance(segs, list):
                new_segs, _ = apply_glossary_to_segments(segs, glossary)
                payload["segments"] = new_segs
                payload["refined_at"] = datetime.now().isoformat(timespec="seconds")
                payload["refine_mode"] = mode
                seg_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
                segments_updated = True
        except Exception as exc:
            print(f"[aviso] Não atualizou segments {seg_path.name}: {exc}", flush=True)

    print(
        f"[ok] {out_path.name} mode={mode} changes={len(changes)} "
        f"segments={'yes' if segments_updated else 'no'}",
        flush=True,
    )
    if summary:
        top = ", ".join(f"{k}×{v}" for k, v in list(summary.items())[:10])
        print(f"      {top}", flush=True)

    return {
        "input": str(path),
        "output": str(out_path),
        "changed": changed,
        "mode": mode,
        "llm": llm_applied,
        "changes": summary,
        "segments_updated": segments_updated,
    }


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Refina transcripts com glossário Exatas e IA opcional")
    p.add_argument(
        "--input",
        "-i",
        nargs="+",
        required=True,
        help="Arquivo(s), pasta ou glob (ex.: transcriptions/a fazer/spa-*.txt)",
    )
    p.add_argument("--glossary", default="", help="Caminho do glossário JSON")
    p.add_argument("--in-place", action="store_true", help="Sobrescreve o .txt original")
    p.add_argument(
        "--glossary-only",
        action="store_true",
        help="Só glossário determinístico (não tenta LLM)",
    )
    p.add_argument(
        "--llm",
        action="store_true",
        help="Força tentativa de revisão por IA (requer CURSOR_API_KEY + cursor-sdk)",
    )
    p.add_argument("--model", default="composer-2", help="Modelo do Cursor Agent para --llm")
    p.add_argument("--dry-run", action="store_true", help="Mostra mudanças sem gravar")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_arg_parser().parse_args(argv)
    glossary_path = Path(args.glossary).expanduser() if args.glossary else default_glossary_path()
    glossary = load_glossary(glossary_path)

    files = _collect_inputs(args.input)
    if not files:
        print("ERRO: nenhum .txt encontrado.", file=sys.stderr)
        return 2

    # Default: glossário sempre; LLM se --llm OU (não --glossary-only e há CURSOR_API_KEY)
    use_llm = bool(args.llm)
    if not args.glossary_only and not args.llm:
        use_llm = bool(os.environ.get("CURSOR_API_KEY", "").strip())

    print(f"[refine] {len(files)} arquivo(s) | glossary={glossary_path.name} | llm={use_llm}")
    results = []
    for path in files:
        results.append(
            refine_one(
                path,
                glossary=glossary,
                in_place=args.in_place,
                use_llm=use_llm,
                llm_model=args.model,
                dry_run=args.dry_run,
            )
        )

    changed = sum(1 for r in results if r.get("changed"))
    print(f"=== Resumo: {changed}/{len(results)} alterados ===")
    print("REFINE_JSON:" + json.dumps({"results": results}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
