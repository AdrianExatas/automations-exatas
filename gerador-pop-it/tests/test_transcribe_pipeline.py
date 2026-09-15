#!/usr/bin/env python3
"""Smoke tests do pipeline de transcricão e orquestração (sem Buzz / sem agente pago)."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
import wave
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skills" / "gerar-pop-it" / "scripts"
sys.path.insert(0, str(SCRIPTS))

import transcribe_media as tm  # noqa: E402


def _ok(msg: str) -> None:
    print(f"OK: {msg}")


def _fail(msg: str) -> None:
    raise AssertionError(f"FALHA: {msg}")


def test_naming_helpers() -> None:
    stamp = tm._buzz_style_stamp(datetime(2026, 9, 9, 18, 5, 7))
    assert stamp == "09-Sep-2026 18-05-07", stamp
    name = tm._transcript_filename("Meu Processo", datetime(2026, 9, 9, 18, 5, 7))
    assert name == "Meu Processo (transcribed on 09-Sep-2026 18-05-07).txt", name
    _ok("helpers de nomeacao (padrao Buzz)")


def test_find_existing(tmp_path: Path) -> None:
    stem = "Processo Teste"
    exact = tmp_path / f"{stem}.txt"
    exact.write_text("hello", encoding="utf-8")
    found = tm._find_existing_transcript(stem, tmp_path)
    assert found == exact, found

    exact.unlink()
    styled = tmp_path / f"{stem} (transcribed on 01-Jan-2026 10-00-00).txt"
    styled.write_text("hello", encoding="utf-8")
    found2 = tm._find_existing_transcript(stem, tmp_path)
    assert found2 == styled, found2
    _ok("busca de transcricão existente")


def test_collect_media(tmp_path: Path) -> None:
    wav = tmp_path / "a.wav"
    mp4 = tmp_path / "b.mp4"
    txt = tmp_path / "c.txt"
    wav.write_bytes(b"RIFF")
    mp4.write_bytes(b"ftyp")
    txt.write_text("x", encoding="utf-8")
    files = tm._collect_media(tmp_path)
    names = {p.name for p in files}
    assert names == {"a.wav", "b.mp4"}, names
    _ok("coleta de midia por extensao")


def _make_silent_wav(path: Path, seconds: float = 1.0, rate: int = 16000) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    n = int(rate * seconds)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(rate)
        wf.writeframes(b"\x00\x00" * n)


def _make_tts_wav(path: Path, text: str) -> bool:
    """Gera WAV via SAPI (Windows). Retorna False se indisponivel."""
    path.parent.mkdir(parents=True, exist_ok=True)
    # Evitar apostrofos no Speak; path Windows nativo para SAPI.
    safe_text = text.replace("'", " ")
    wav = str(path.resolve())
    ps = (
        "Add-Type -AssemblyName System.Speech; "
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        "$synth.Rate = -2; "
        f"$synth.SetOutputToWaveFile('{wav}'); "
        f"$synth.Speak('{safe_text}'); "
        "$synth.Dispose()"
    )
    r = subprocess.run(
        ["powershell.exe", "-NoLogo", "-NoProfile", "-Command", ps],
        capture_output=True,
        text=True,
    )
    return r.returncode == 0 and path.is_file() and path.stat().st_size > 1000


def test_stt_smoke(tmp_path: Path) -> None:
    media = tmp_path / "smoke-processo-teste.wav"
    phrase = "Neste video vamos aplicar uma advertencia ao colaborador no sistema Domínio."
    if not _make_tts_wav(media, phrase):
        _make_silent_wav(media, seconds=2.0)
        print("AVISO: SAPI indisponivel; usando WAV silencioso (pode gerar transcricão vazia).")

    out_dir = tmp_path / "out"
    # Modelo pequeno so para validar o pipeline local (download rapido).
    model = tm._load_model("tiny", "cpu", "int8")
    result = tm._transcribe_file(
        model,
        media,
        out_dir,
        language="pt",
        beam_size=1,
        vad_filter=False,
        initial_prompt="",
        force=True,
    )
    assert result["skipped"] is False
    path = Path(result["transcript_path"])
    assert path.is_file(), path
    assert re.search(r"\(transcribed on .+\)\.txt$", path.name), path.name
    body = path.read_text(encoding="utf-8").strip()
    if not body:
        # Silencio puro: o script deve falhar; se chegou aqui com silent wav, falhou o contrato.
        # Com TTS, body deve ter texto.
        _fail("transcricão vazia — verifique TTS/SAPI ou o modelo")
    _ok(f"STT smoke (tiny): '{body[:80]}...' -> {path.name}")

    # Idempotencia
    again = tm._transcribe_file(
        model,
        media,
        out_dir,
        language="pt",
        beam_size=1,
        vad_filter=False,
        initial_prompt="",
        force=False,
    )
    assert again["skipped"] is True
    _ok("idempotencia (skip se .txt existe)")


def test_cli_json_line(tmp_path: Path) -> None:
    tmp_path.mkdir(parents=True, exist_ok=True)
    media = tmp_path / "cli-teste.wav"
    if not _make_tts_wav(media, "Teste de transcricao automatizada."):
        _make_silent_wav(media, 1.5)
    out_dir = tmp_path / "cli-out"
    out_dir.mkdir(parents=True, exist_ok=True)
    proc = subprocess.run(
        [
            sys.executable,
            str(SCRIPTS / "transcribe_media.py"),
            "--media",
            str(media),
            "--output-dir",
            str(out_dir),
            "--model",
            "tiny",
            "--device",
            "cpu",
            "--compute-type",
            "int8",
            "--language",
            "pt",
            "--beam-size",
            "1",
            "--no-vad",
            "--force",
        ],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr)
        _fail(f"CLI exit {proc.returncode}")
    lines = [ln for ln in proc.stdout.splitlines() if ln.startswith("TRANSCRIBE_JSON:")]
    assert lines, proc.stdout
    payload = json.loads(lines[-1].removeprefix("TRANSCRIBE_JSON:"))
    assert payload["transcripts"], payload
    assert Path(payload["transcripts"][0]["transcript_path"]).is_file()
    _ok("CLI emite TRANSCRIBE_JSON")


def test_orchestrator_skip_agent() -> None:
    sample = next((ROOT / "transcriptions" / "a fazer").glob("*.txt"), None)
    if sample is None:
        sample = next((ROOT / "transcriptions" / "feitos").glob("*.txt"), None)
    if sample is None:
        _fail("nenhuma transcricão de exemplo em transcriptions/")

    proc = subprocess.run(
        [
            "powershell.exe",
            "-NoLogo",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(SCRIPTS / "gerar_de_midia.ps1"),
            "-TranscriptionPath",
            str(sample),
            "-SkipAgent",
            "-Slug",
            "smoke-validacao-pipeline",
            "-DocumentTypes",
            "pop",
            "it",
        ],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr)
        _fail(f"gerar_de_midia -SkipAgent exit {proc.returncode}")
    assert "SkipAgent" in proc.stdout or "transcric" in proc.stdout.lower()
    _ok("gerar_de_midia.ps1 -SkipAgent com transcricão existente")


def test_agent_print_prompt() -> None:
    sample = next((ROOT / "transcriptions" / "feitos").glob("*.txt"), None)
    if sample is None:
        sample = next((ROOT / "transcriptions" / "a fazer").glob("*.txt"), None)
    assert sample is not None
    proc = subprocess.run(
        [
            sys.executable,
            str(SCRIPTS / "run_agent_gerar.py"),
            "--transcript",
            str(sample),
            "--slug",
            "smoke-prompt",
            "--docs",
            "pop,it",
            "--print-prompt-only",
        ],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    if proc.returncode != 0:
        print(proc.stdout)
        print(proc.stderr)
        _fail(f"run_agent_gerar --print-prompt-only exit {proc.returncode}")
    assert "modo NAO INTERATIVO" in proc.stdout
    assert "SKILL.md" in proc.stdout
    assert "build_documents.ps1" in proc.stdout
    _ok("run_agent_gerar.py --print-prompt-only")


def test_contract_suite() -> None:
    proc = subprocess.run(
        [
            "powershell.exe",
            "-NoLogo",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(ROOT / "tests" / "run_contract_tests.ps1"),
            "-SkipOffice",
        ],
        capture_output=True,
        text=True,
        cwd=str(ROOT),
    )
    print(proc.stdout[-2000:] if proc.stdout else "")
    if proc.returncode != 0:
        print(proc.stderr)
        _fail(f"run_contract_tests -SkipOffice exit {proc.returncode}")
    _ok("testes de contrato existentes (-SkipOffice)")


def main() -> int:
    print("=== Smoke: helpers ===")
    test_naming_helpers()
    with tempfile.TemporaryDirectory() as td:
        test_find_existing(Path(td))
        test_collect_media(Path(td))

    print("\n=== Smoke: STT (modelo tiny) ===")
    with tempfile.TemporaryDirectory() as td:
        test_stt_smoke(Path(td))
    with tempfile.TemporaryDirectory() as td:
        test_cli_json_line(Path(td))

    print("\n=== Smoke: orquestrador / prompt ===")
    test_orchestrator_skip_agent()
    test_agent_print_prompt()

    print("\n=== Suite de contrato ===")
    test_contract_suite()

    print("\nTodos os smokes passaram.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except AssertionError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
