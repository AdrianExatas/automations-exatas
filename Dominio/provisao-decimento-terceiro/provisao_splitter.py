from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from pypdf import PdfReader, PdfWriter


REPORT_PAGE_PATTERN = re.compile(r"^\s*(\d+)\s*/\s*(\d+)\s*$")
COMPANY_PATTERN = re.compile(r"^\s*(\d+)\s*-\s*(.+?)\s*$")
CNPJ_PATTERN = re.compile(r"\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}")
OUTPUT_TEMPLATE = "{codigo}-Provisão de Décimo Terceiro Salário.pdf"


@dataclass(frozen=True)
class PageMeta:
    codigo: str
    empresa: str
    cnpj: str | None
    pdf_page_number: int
    report_page_current: int | None
    report_page_total: int | None


@dataclass(frozen=True)
class CompanyGroup:
    codigo: str
    empresa: str
    cnpj: str | None
    page_indexes: list[int]


def _normalize_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def _extract_report_page(lines: Iterable[str]) -> tuple[int | None, int | None]:
    for line in lines:
        match = REPORT_PAGE_PATTERN.match(line)
        if match:
            return int(match.group(1)), int(match.group(2))
    return None, None


def _extract_company_data(lines: Iterable[str]) -> tuple[str, str]:
    for line in lines:
        match = COMPANY_PATTERN.match(line)
        if match:
            return match.group(1), match.group(2).strip()
    raise ValueError("Nao foi possivel identificar a empresa na pagina.")


def _extract_cnpj(lines: Iterable[str]) -> str | None:
    for line in lines:
        match = CNPJ_PATTERN.search(line)
        if match:
            return match.group(0)
    return None


def extract_page_metadata(text: str, page_number: int) -> PageMeta:
    lines = _normalize_lines(text)
    codigo, empresa = _extract_company_data(lines)
    report_page_current, report_page_total = _extract_report_page(lines)
    cnpj = _extract_cnpj(lines)
    return PageMeta(
        codigo=codigo,
        empresa=empresa,
        cnpj=cnpj,
        pdf_page_number=page_number,
        report_page_current=report_page_current,
        report_page_total=report_page_total,
    )


def group_company_pages(pages: list[PageMeta]) -> list[CompanyGroup]:
    groups: list[CompanyGroup] = []
    current: CompanyGroup | None = None
    for page in pages:
        page_index = page.pdf_page_number - 1
        if current and current.codigo == page.codigo and current.empresa == page.empresa:
            current.page_indexes.append(page_index)
            continue
        current = CompanyGroup(
            codigo=page.codigo,
            empresa=page.empresa,
            cnpj=page.cnpj,
            page_indexes=[page_index],
        )
        groups.append(current)
    return groups


def build_output_filename(codigo: str) -> str:
    return OUTPUT_TEMPLATE.format(codigo=codigo)


def write_company_pdfs(
    reader: PdfReader,
    groups: list[CompanyGroup],
    output_dir: Path,
    overwrite: bool = False,
) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    written_files: list[Path] = []
    for group in groups:
        output_path = output_dir / build_output_filename(group.codigo)
        if output_path.exists() and not overwrite:
            raise FileExistsError(f"O arquivo '{output_path.name}' ja existe.")
        writer = PdfWriter()
        for page_index in group.page_indexes:
            writer.add_page(reader.pages[page_index])
        with output_path.open("wb") as handle:
            writer.write(handle)
        written_files.append(output_path)
    return written_files


def _load_page_metadata(reader: PdfReader) -> list[PageMeta]:
    metadata: list[PageMeta] = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if not text.strip():
            raise ValueError(f"A pagina {page_number} esta vazia ou sem texto extraivel.")
        try:
            metadata.append(extract_page_metadata(text, page_number=page_number))
        except ValueError as exc:
            raise ValueError(f"Falha ao identificar a empresa na pagina {page_number}.") from exc
    return metadata


def split_pdf_by_company(
    source_pdf: Path,
    output_dir: Path,
    overwrite: bool = False,
    dry_run: bool = False,
) -> list[CompanyGroup]:
    with source_pdf.open("rb") as handle:
        reader = PdfReader(handle)
        pages = _load_page_metadata(reader)
        groups = group_company_pages(pages)
        if not dry_run:
            write_company_pdfs(reader, groups, output_dir, overwrite=overwrite)
        return groups
