from __future__ import annotations

from pathlib import Path

import pytest
from pypdf import PdfReader, PdfWriter

from provisao_splitter import (
    CompanyGroup,
    PageMeta,
    build_output_filename,
    extract_page_metadata,
    group_company_pages,
    split_pdf_by_company,
    write_company_pdfs,
)


PAGE_436 = """Horas:
Emissao:
Pagina:
14:48:16
17/04/2026
1/1
CNPJ:
Empresa:
PROVISÃO DE 13o. SALÁRIO MÊS: 03/2026
436 - BRUMAR BRASIL PRODUTOS NATURAIS LTDA
52.665.983/0001-89
EncargosCódigo Data ValorMédia eSalário 13ºAvosNome do empregado Valor
"""

PAGE_206_1 = """Horas:
Emissao:
Pagina:
14:48:15
17/04/2026
1/2
CNPJ:
Empresa:
PROVISÃO DE 13o. SALÁRIO MÊS: 03/2026
206 - INDUSTRIA ALAGOANA DE COLCHOES E ESPUMA
11.188.276/0001-61
"""

PAGE_206_2 = """Horas:
Emissao:
Pagina:
14:48:16
17/04/2026
2/2
CNPJ:
Empresa:
PROVISÃO DE 13o. SALÁRIO MÊS: 03/2026
206 - INDUSTRIA ALAGOANA DE COLCHOES E ESPUMA
11.188.276/0001-61
"""


def build_dummy_pdf(path: Path, pages: int) -> None:
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=200, height=200)
    with path.open("wb") as handle:
        writer.write(handle)


def normalize_extracted_text(text: str | None) -> str:
    if not text:
        return ""
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    filtered = [
        line
        for line in lines
        if line not in {"12:12:35", "14:48:15", "14:48:16"}
    ]
    return "\n".join(filtered)


def test_extract_page_metadata_parses_company_code_name_cnpj_and_report_pages() -> None:
    metadata = extract_page_metadata(PAGE_436, page_number=22)

    assert metadata == PageMeta(
        codigo="436",
        empresa="BRUMAR BRASIL PRODUTOS NATURAIS LTDA",
        cnpj="52.665.983/0001-89",
        pdf_page_number=22,
        report_page_current=1,
        report_page_total=1,
    )


@pytest.mark.parametrize(
    ("text", "expected_current", "expected_total"),
    [
        (PAGE_436, 1, 1),
        (PAGE_206_1, 1, 2),
        (PAGE_206_2, 2, 2),
    ],
)
def test_extract_page_metadata_parses_internal_page_counter(
    text: str,
    expected_current: int,
    expected_total: int,
) -> None:
    metadata = extract_page_metadata(text, page_number=1)

    assert metadata.report_page_current == expected_current
    assert metadata.report_page_total == expected_total


def test_extract_page_metadata_raises_when_company_identifier_is_missing() -> None:
    with pytest.raises(ValueError, match="empresa"):
        extract_page_metadata("Empresa:\nSEM IDENTIFICADOR", page_number=3)


def test_group_company_pages_merges_only_consecutive_pages() -> None:
    pages = [
        extract_page_metadata(PAGE_206_1, page_number=9),
        extract_page_metadata(PAGE_206_2, page_number=10),
        extract_page_metadata(PAGE_436, page_number=22),
        extract_page_metadata(PAGE_206_1.replace("1/2", "1/1"), page_number=30),
    ]

    groups = group_company_pages(pages)

    assert groups == [
        CompanyGroup(
            codigo="206",
            empresa="INDUSTRIA ALAGOANA DE COLCHOES E ESPUMA",
            cnpj="11.188.276/0001-61",
            page_indexes=[8, 9],
        ),
        CompanyGroup(
            codigo="436",
            empresa="BRUMAR BRASIL PRODUTOS NATURAIS LTDA",
            cnpj="52.665.983/0001-89",
            page_indexes=[21],
        ),
        CompanyGroup(
            codigo="206",
            empresa="INDUSTRIA ALAGOANA DE COLCHOES E ESPUMA",
            cnpj="11.188.276/0001-61",
            page_indexes=[29],
        ),
    ]


def test_build_output_filename_uses_expected_pattern() -> None:
    assert build_output_filename("436") == "436-Provisão de Décimo Terceiro Salário.pdf"


def test_write_company_pdfs_writes_single_and_multi_page_outputs(tmp_path: Path) -> None:
    input_pdf = tmp_path / "input.pdf"
    build_dummy_pdf(input_pdf, pages=3)

    reader = PdfReader(str(input_pdf))
    groups = [
        CompanyGroup(
            codigo="206",
            empresa="INDUSTRIA ALAGOANA DE COLCHOES E ESPUMA",
            cnpj="11.188.276/0001-61",
            page_indexes=[0, 1],
        ),
        CompanyGroup(
            codigo="436",
            empresa="BRUMAR BRASIL PRODUTOS NATURAIS LTDA",
            cnpj="52.665.983/0001-89",
            page_indexes=[2],
        ),
    ]

    write_company_pdfs(reader, groups, tmp_path / "out")

    first = PdfReader(str(tmp_path / "out" / "206-Provisão de Décimo Terceiro Salário.pdf"))
    second = PdfReader(str(tmp_path / "out" / "436-Provisão de Décimo Terceiro Salário.pdf"))

    assert len(first.pages) == 2
    assert len(second.pages) == 1


def test_write_company_pdfs_raises_on_existing_output_when_overwrite_is_false(tmp_path: Path) -> None:
    input_pdf = tmp_path / "input.pdf"
    build_dummy_pdf(input_pdf, pages=1)
    output_dir = tmp_path / "out"
    output_dir.mkdir()
    existing = output_dir / "436-Provisão de Décimo Terceiro Salário.pdf"
    existing.write_bytes(b"existing")

    reader = PdfReader(str(input_pdf))
    groups = [
        CompanyGroup(
            codigo="436",
            empresa="BRUMAR BRASIL PRODUTOS NATURAIS LTDA",
            cnpj="52.665.983/0001-89",
            page_indexes=[0],
        )
    ]

    with pytest.raises(FileExistsError, match="436-Provisão"):
        write_company_pdfs(reader, groups, output_dir, overwrite=False)


def test_split_pdf_by_company_with_real_pdf(tmp_path: Path) -> None:
    source_pdf = next(Path(".").glob("Provisão*.pdf"))

    groups = split_pdf_by_company(source_pdf, tmp_path)

    generated_files = sorted(tmp_path.glob("*.pdf"))
    generated_names = {path.name for path in generated_files}

    assert len(groups) == 79
    assert len(generated_files) == 79
    assert "206-Provisão de Décimo Terceiro Salário.pdf" in generated_names
    assert "625-Provisão de Décimo Terceiro Salário.pdf" in generated_names
    assert "690-Provisão de Décimo Terceiro Salário.pdf" in generated_names
    assert "436-Provisão de Décimo Terceiro Salário.pdf" in generated_names

    assert len(PdfReader(str(tmp_path / "206-Provisão de Décimo Terceiro Salário.pdf")).pages) == 2
    assert len(PdfReader(str(tmp_path / "625-Provisão de Décimo Terceiro Salário.pdf")).pages) == 2
    assert len(PdfReader(str(tmp_path / "690-Provisão de Décimo Terceiro Salário.pdf")).pages) == 2
    assert len(PdfReader(str(tmp_path / "436-Provisão de Décimo Terceiro Salário.pdf")).pages) == 1

    example_text = PdfReader(str(Path("436-Provisão de Décimo Terceiro Salário.pdf"))).pages[0].extract_text()
    generated_text = PdfReader(str(tmp_path / "436-Provisão de Décimo Terceiro Salário.pdf")).pages[0].extract_text()
    assert normalize_extracted_text(example_text) == normalize_extracted_text(generated_text)
