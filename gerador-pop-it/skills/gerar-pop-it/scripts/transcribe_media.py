#!/usr/bin/env python3
"""Transcreve audio/video com faster-whisper (large-v3-turbo) sem Buzz.

Requisitos:
  pip install -r skills/gerar-pop-it/scripts/requirements-transcribe.txt
  ffmpeg no PATH (necessario para mp4/mkv/etc.)

Saida: TXT em portugues no padrao
  {titulo} (transcribed on DD-Mon-YYYY HH-MM-SS).txt
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

MEDIA_EXTENSIONS = {
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".webm",
    ".mp3",
    ".wav",
    ".m4a",
    ".flac",
    ".ogg",
    ".wma",
}

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


def _transcript_filename(stem: str, now: datetime | None = None) -> str:
    return f"{stem} (transcribed on {_buzz_style_stamp(now)}).txt"


def _segments_filename(stem: str) -> str:
    return f"{stem}.segments.json"


def _segments_path_for_transcript(transcript_path: Path) -> Path:
    """Sidecar ao lado do .txt: stem do media sem o sufixo Buzz."""
    name = transcript_path.name
    m = re.match(r"^(.+) \(transcribed on .+\)\.txt$", name, re.IGNORECASE)
    stem = m.group(1) if m else transcript_path.stem
    return transcript_path.parent / _segments_filename(stem)


def _find_existing_transcript(stem: str, out_dir: Path) -> Path | None:
    exact = out_dir / f"{stem}.txt"
    if exact.is_file():
        return exact

    pattern = re.compile(re.escape(stem) + r" \(transcribed on .+\)\.txt$", re.IGNORECASE)
    matches = sorted(
        (p for p in out_dir.glob("*.txt") if pattern.match(p.name)),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return matches[0] if matches else None


def _write_segments_sidecar(
    out_path: Path,
    media: Path,
    segment_rows: list[dict],
    *,
    language: str | None,
    duration: float | None,
) -> Path:
    sidecar = _segments_path_for_transcript(out_path)
    payload = {
        "media": str(media),
        "transcript_path": str(out_path),
        "language": language,
        "duration_sec": duration,
        "segments": segment_rows,
    }
    sidecar.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return sidecar


def _collect_media(path: Path) -> list[Path]:
    if not path.exists():
        raise FileNotFoundError(f"MediaPath nao encontrado: {path}")
    if path.is_file():
        if path.suffix.lower() not in MEDIA_EXTENSIONS:
            raise ValueError(
                f"Extensao nao suportada: {path.suffix}. Aceitas: {', '.join(sorted(MEDIA_EXTENSIONS))}"
            )
        return [path]
    files: list[Path] = []
    for ext in MEDIA_EXTENSIONS:
        files.extend(path.glob(f"*{ext}"))
        files.extend(path.glob(f"*{ext.upper()}"))
    return sorted({p.resolve() for p in files if p.is_file()}, key=lambda p: p.name.lower())


def _resolve_device(device: str) -> tuple[str, str]:
    """Retorna (device, compute_type)."""
    if device == "auto":
        try:
            import ctranslate2

            if ctranslate2.get_cuda_device_count() > 0:
                return "cuda", "float16"
        except Exception:
            pass
        return "cpu", "int8"
    if device == "cuda":
        return "cuda", "float16"
    return "cpu", "int8"


def _load_model(model_name: str, device: str, compute_type: str | None):
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise SystemExit(
            "Pacote faster-whisper nao instalado. Execute:\n"
            "  pip install -r skills/gerar-pop-it/scripts/requirements-transcribe.txt"
        ) from exc

    resolved_device, default_compute = _resolve_device(device)
    ctype = compute_type or default_compute
    print(f"[whisper] model={model_name} device={resolved_device} compute_type={ctype}", flush=True)
    try:
        return WhisperModel(model_name, device=resolved_device, compute_type=ctype)
    except Exception as exc:
        if resolved_device == "cuda":
            print(f"[whisper] GPU falhou ({exc}); tentando CPU int8...", flush=True)
            return WhisperModel(model_name, device="cpu", compute_type="int8")
        raise


def _transcribe_file(
    model,
    media: Path,
    out_dir: Path,
    *,
    language: str,
    beam_size: int,
    vad_filter: bool,
    initial_prompt: str,
    force: bool,
    glossary: dict | None = None,
    use_glossary: bool = True,
) -> dict:
    stem = media.stem
    if not force:
        existing = _find_existing_transcript(stem, out_dir)
        if existing is not None:
            sidecar = _segments_path_for_transcript(existing)
            print(f"[skip] Transcricao ja existe: {existing}", flush=True)
            return {
                "media_path": str(media),
                "transcript_path": str(existing),
                "segments_path": str(sidecar) if sidecar.is_file() else None,
                "skipped": True,
            }

    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"[whisper] Transcrevendo: {media}", flush=True)

    glossary_data = None
    whisper_prompt = (initial_prompt or "").strip()
    if use_glossary:
        try:
            from stt_glossary import build_whisper_prompt, load_glossary

            glossary_data = glossary if glossary is not None else load_glossary()
            whisper_prompt = build_whisper_prompt(glossary_data, extra_prompt=initial_prompt)
        except Exception as exc:
            print(f"[aviso] Glossário indisponível ({exc}); seguindo sem ele.", flush=True)
            use_glossary = False

    kwargs: dict = {
        "beam_size": beam_size,
        "vad_filter": vad_filter,
        "task": "transcribe",
    }
    if language:
        kwargs["language"] = language
    if whisper_prompt:
        kwargs["initial_prompt"] = whisper_prompt
        print(f"[whisper] initial_prompt ({len(whisper_prompt)} chars)", flush=True)

    segments, info = model.transcribe(str(media), **kwargs)
    parts: list[str] = []
    segment_rows: list[dict] = []
    for seg in segments:
        text = (seg.text or "").strip()
        if not text:
            continue
        parts.append(text)
        segment_rows.append(
            {
                "start": round(float(seg.start), 3),
                "end": round(float(seg.end), 3),
                "text": text,
            }
        )

    body = "\n".join(parts).strip() + ("\n" if parts else "")
    if not body.strip():
        raise RuntimeError(f"Transcricao vazia para: {media}")

    glossary_changes = 0
    if use_glossary and glossary_data is not None:
        from stt_glossary import apply_glossary, apply_glossary_to_segments, summarize_changes

        body, body_changes = apply_glossary(body, glossary_data)
        if not body.endswith("\n"):
            body += "\n"
        segment_rows, seg_changes = apply_glossary_to_segments(segment_rows, glossary_data)
        glossary_changes = len(body_changes)
        summary = summarize_changes(body_changes)
        if summary:
            top = ", ".join(f"{k}×{v}" for k, v in list(summary.items())[:8])
            print(f"[glossary] {len(body_changes)} correções: {top}", flush=True)

    out_path = out_dir / _transcript_filename(stem)
    out_path.write_text(body, encoding="utf-8")
    lang = getattr(info, "language", None)
    duration = getattr(info, "duration", None)
    sidecar = _write_segments_sidecar(
        out_path,
        media,
        segment_rows,
        language=lang,
        duration=float(duration) if duration is not None else None,
    )
    print(
        f"[ok] {out_path} (lang={lang or '?'}, "
        f"dur={duration or 0:.1f}s, segments={len(segment_rows)})",
        flush=True,
    )
    print(f"[ok] sidecar={sidecar}", flush=True)
    return {
        "media_path": str(media),
        "transcript_path": str(out_path),
        "segments_path": str(sidecar),
        "skipped": False,
        "language": lang,
        "duration": duration,
        "glossary_changes": glossary_changes,
    }


def _watch_loop(args, model, media_root: Path, out_dir: Path) -> None:
    try:
        from watchdog.observers import Observer
        from watchdog.events import FileSystemEventHandler
    except ImportError as exc:
        raise SystemExit(
            "Modo --watch requer watchdog. Execute:\n"
            "  pip install -r skills/gerar-pop-it/scripts/requirements-transcribe.txt"
        ) from exc

    import threading
    import time

    class Handler(FileSystemEventHandler):
        def __init__(self) -> None:
            self._lock = threading.Lock()
            self._pending: dict[str, float] = {}

        def on_created(self, event) -> None:  # type: ignore[no-untyped-def]
            if event.is_directory:
                return
            path = Path(event.src_path)
            if path.suffix.lower() not in MEDIA_EXTENSIONS:
                return
            with self._lock:
                self._pending[str(path.resolve())] = time.time()

        def on_modified(self, event) -> None:  # type: ignore[no-untyped-def]
            self.on_created(event)

        def drain_ready(self) -> list[Path]:
            now = time.time()
            ready: list[Path] = []
            with self._lock:
                for key, ts in list(self._pending.items()):
                    if now - ts < 2.0:
                        continue
                    path = Path(key)
                    if path.is_file():
                        ready.append(path)
                    del self._pending[key]
            return ready

    print(f"[watch] Monitorando {media_root} -> {out_dir} (Ctrl+C para sair)", flush=True)
    use_glossary = not getattr(args, "no_glossary", False)
    glossary_path = getattr(args, "glossary", "") or ""
    glossary_data = None
    if use_glossary:
        try:
            from stt_glossary import load_glossary

            glossary_data = load_glossary(glossary_path or None)
        except Exception as exc:
            print(f"[aviso] Glossário: {exc}", flush=True)
            use_glossary = False

    def _run_one(media: Path) -> None:
        _transcribe_file(
            model,
            media,
            out_dir,
            language=args.language,
            beam_size=args.beam_size,
            vad_filter=not args.no_vad,
            initial_prompt=args.prompt,
            force=args.force,
            glossary=glossary_data,
            use_glossary=use_glossary,
        )

    for media in _collect_media(media_root):
        try:
            _run_one(media)
        except Exception as exc:
            print(f"[erro] {exc}", file=sys.stderr, flush=True)

    handler = Handler()
    observer = Observer()
    observer.schedule(handler, str(media_root), recursive=False)
    observer.start()
    try:
        while True:
            time.sleep(1.0)
            for media in handler.drain_ready():
                try:
                    _run_one(media)
                except Exception as exc:
                    print(f"[erro] {exc}", file=sys.stderr, flush=True)
    except KeyboardInterrupt:
        print("[watch] Encerrado.", flush=True)
    finally:
        observer.stop()
        observer.join()


def main() -> int:
    root = _project_root()
    parser = argparse.ArgumentParser(description="Transcreve midia com faster-whisper (large-v3-turbo)")
    parser.add_argument("--media", default="", help="Arquivo ou pasta (padrao: videos/)")
    parser.add_argument(
        "--output-dir",
        default="",
        help="Destino dos .txt (padrao: transcriptions/a fazer)",
    )
    parser.add_argument("--model", default="large-v3-turbo", help="Nome do modelo faster-whisper")
    parser.add_argument(
        "--device",
        default="auto",
        choices=("auto", "cpu", "cuda"),
        help="Dispositivo de inferencia",
    )
    parser.add_argument(
        "--compute-type",
        default="",
        help="Override compute_type (ex.: int8, float16, int8_float16)",
    )
    parser.add_argument("--language", default="pt", help="Codigo de idioma (vazio = detectar)")
    parser.add_argument("--beam-size", type=int, default=5)
    parser.add_argument("--prompt", default="", help="Initial prompt extra (alem do glossario)")
    parser.add_argument(
        "--glossary",
        default="",
        help="Caminho do glossario JSON (padrao: skills/gerar-pop-it/config/stt_glossary_exatas.json)",
    )
    parser.add_argument(
        "--no-glossary",
        action="store_true",
        help="Desliga prompt e pos-correcao do glossario Exatas",
    )
    parser.add_argument("--no-vad", action="store_true", help="Desliga filtro VAD")
    parser.add_argument("--force", action="store_true", help="Retranscreve mesmo se .txt existir")
    parser.add_argument("--watch", action="store_true", help="Monitora pasta de midia")
    args = parser.parse_args()

    media_path = Path(args.media).expanduser() if args.media else (root / "videos")
    if not media_path.is_absolute():
        media_path = (Path.cwd() / media_path).resolve()
    else:
        media_path = media_path.resolve()

    out_dir = (
        Path(args.output_dir).expanduser().resolve()
        if args.output_dir
        else (root / "transcriptions" / "a fazer")
    )

    compute = args.compute_type.strip() or None
    model = _load_model(args.model, args.device, compute)

    use_glossary = not args.no_glossary
    glossary_data = None
    if use_glossary:
        try:
            from stt_glossary import load_glossary

            glossary_data = load_glossary(args.glossary or None)
        except Exception as exc:
            print(f"[aviso] Glossário: {exc}", flush=True)
            use_glossary = False

    if args.watch:
        if not media_path.exists():
            media_path.mkdir(parents=True, exist_ok=True)
        if not media_path.is_dir():
            print("ERRO: --watch exige que --media seja uma pasta.", file=sys.stderr)
            return 2
        _watch_loop(args, model, media_path, out_dir)
        return 0

    files = _collect_media(media_path)
    if not files:
        print(f"ERRO: nenhum arquivo de midia em: {media_path}", file=sys.stderr)
        return 2

    results = []
    for media in files:
        results.append(
            _transcribe_file(
                model,
                media,
                out_dir,
                language=args.language,
                beam_size=args.beam_size,
                vad_filter=not args.no_vad,
                initial_prompt=args.prompt,
                force=args.force,
                glossary=glossary_data,
                use_glossary=use_glossary,
            )
        )

    print("", flush=True)
    print(f"=== Resumo ({len(results)}) ===", flush=True)
    for item in results:
        flag = "skip" if item.get("skipped") else "new"
        print(f"[{flag}] {item['transcript_path']}", flush=True)

    payload = {"transcripts": results}
    print("TRANSCRIBE_JSON:" + json.dumps(payload, ensure_ascii=False), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
