from __future__ import annotations

from io import BytesIO
import re

from pypdf import PdfReader

from src.models import ParseResult, RegistroNormalizado
from src.parsers.common import normalize_whitespace, parse_date_br, parse_decimal_br

CLIENTE_DATE_RE = re.compile(r"\d{2}/\d{2}/\d{4}")
CLIENTE_VALUE_RE = re.compile(r"^\d{1,3}(?:\.\d{3})*,\d{2}$|^\d+,\d{2}$")
CLIENTE_DOC_RE = re.compile(r"^\d{11,14}$")


def parse_cliente_pdf_bytes(pdf_bytes: bytes) -> ParseResult:
    reader = PdfReader(BytesIO(pdf_bytes))
    raw_lines: list[str] = []
    for page in reader.pages:
        raw_lines.extend((page.extract_text() or "").splitlines())
    return parse_cliente_lines(raw_lines)


def parse_cliente_lines(lines: list[str]) -> ParseResult:
    registros: list[RegistroNormalizado] = []
    diagnosticos: list[str] = []
    clean_lines = [line.strip() for line in lines if _is_data_line(line)]

    block_size = 8
    for offset in range(0, len(clean_lines), block_size):
        block = clean_lines[offset : offset + block_size]
        if len(block) < block_size:
            diagnosticos.append(f"Bloco incompleto ignorado ao final: {block!r}")
            continue
        if not _looks_like_record_block(block):
            diagnosticos.append(f"Bloco invalido ignorado: {block!r}")
            continue

        cliente_nome, documento, numero_nota, modelo, serie, emissao, valor, status = block
        registros.append(
            RegistroNormalizado(
                origem="cliente",
                numero_nota=numero_nota,
                data_emissao=parse_date_br(emissao),
                valor=parse_decimal_br(valor),
                status=normalize_whitespace(status),
                cliente_nome=normalize_whitespace(cliente_nome),
                cliente_documento=documento,
                campos_brutos={
                    "modelo": modelo,
                    "serie": serie,
                    "bloco_original": block,
                },
            )
        )

    return ParseResult(registros=registros, diagnosticos=diagnosticos)


def _is_data_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return False

    ignored_prefixes = (
        "Relatorio Notas Fiscais",
        "Relatório Notas Fiscais",
        "Cliente",
        "CPF/CNPJ",
        "N. Nota",
        "Mod",
        "Serie",
        "Série",
        "Emissao",
        "Emissão",
        "Valor",
        "Status",
        "Filtro Consulta:",
        "ambiente:",
        "Total Emitido:",
        "Pagina ",
        "Página ",
    )
    return not stripped.startswith(ignored_prefixes)


def _looks_like_record_block(block: list[str]) -> bool:
    return (
        bool(CLIENTE_DOC_RE.match(block[1]))
        and block[2].isdigit()
        and block[3].isdigit()
        and block[4].isdigit()
        and bool(CLIENTE_DATE_RE.match(block[5]))
        and bool(CLIENTE_VALUE_RE.match(block[6]))
    )

