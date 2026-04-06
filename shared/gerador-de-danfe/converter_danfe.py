from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable

from brazilfiscalreport.danfe import Danfe, DanfeConfig


ROOT_DIR = Path(__file__).resolve().parent
XML_DIR = ROOT_DIR / "xml"
DANFE_DIR = ROOT_DIR / "danfe"
FAILURE_LOG_PATTERN = "chaves_falha_{timestamp}.txt"
PROGRESS_EVERY = 100


@dataclass(slots=True)
class ConversionResult:
    source: Path
    output: Path
    error: str | None = None

    @property
    def success(self) -> bool:
        return self.error is None


def iter_xml_files(directory: Path) -> Iterable[Path]:
    yield from directory.glob("*.xml")


def convert_xml_to_pdf(xml_path: Path, output_dir: Path, config: DanfeConfig) -> ConversionResult:
    output_path = output_dir / f"{xml_path.stem}.pdf"
    try:
        xml_content = xml_path.read_text(encoding="utf-8", errors="replace")
        danfe = Danfe(xml_content, config)
        danfe.output(output_path)
        return ConversionResult(source=xml_path, output=output_path)
    except Exception as exc:  # noqa: BLE001
        return ConversionResult(source=xml_path, output=output_path, error=str(exc).strip() or exc.__class__.__name__)


def log_progress(processed: int, total: int, converted: int, failures: int, current_file: Path) -> None:
    percent = (processed / total * 100) if total else 0
    print(
        f"[{processed}/{total}] {percent:6.2f}% | convertidos={converted} | falhas={failures} | arquivo={current_file.name}"
    )


def write_failure_log(xml_dir: Path, failures: list[ConversionResult]) -> Path:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_path = xml_dir / FAILURE_LOG_PATTERN.format(timestamp=timestamp)
    lines = [f"{result.source.name}: {result.error}" for result in failures]
    log_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return log_path


def main() -> int:
    if not XML_DIR.exists():
        print(f"Pasta de entrada nao encontrada: {XML_DIR}")
        return 1

    DANFE_DIR.mkdir(parents=True, exist_ok=True)
    config = DanfeConfig()
    total = sum(1 for _ in iter_xml_files(XML_DIR))

    if total == 0:
        print(f"Nenhum XML encontrado em: {XML_DIR}")
        return 0

    print(f"Iniciando conversao de {total} XML(s)...")

    processed = 0
    converted = 0
    failures: list[ConversionResult] = []

    for xml_path in iter_xml_files(XML_DIR):
        result = convert_xml_to_pdf(xml_path, DANFE_DIR, config)
        processed += 1
        if result.success:
            converted += 1
        else:
            failures.append(result)
            print(f"Falha ao converter {xml_path.name}: {result.error}")

        if processed == 1 or processed % PROGRESS_EVERY == 0 or processed == total:
            log_progress(processed, total, converted, len(failures), xml_path)

    print(f"Total encontrado: {total}")
    print(f"Total convertido: {converted}")
    print(f"Total com falha: {len(failures)}")

    if failures:
        log_path = write_failure_log(XML_DIR, failures)
        print(f"Log de falhas: {log_path}")

    return 0 if not failures else 2


if __name__ == "__main__":
    raise SystemExit(main())
