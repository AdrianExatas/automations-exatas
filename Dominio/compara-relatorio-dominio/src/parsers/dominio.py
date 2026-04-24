from __future__ import annotations

from io import BytesIO
import re

from pypdf import PdfReader

from src.models import ParseResult, RegistroNormalizado
from src.parsers.common import normalize_whitespace, parse_date_br, parse_decimal_br

DOMINIO_LINE_RE = re.compile(
    r"^\s*(?:(?P<flag>\d)\s+)?(?P<codigo_saida>\d{5})\s+(?P<data>\d{2}/\d{2}/\d{4})(?P<resto>.+)$"
)
DOMINIO_TAIL_RE = re.compile(
    r"(?P<outras>\d{1,3}(?:\.\d{3})*,\d{2})(?P<numero_nota>\d+)(?P<serie>\d)\s+"
    r"(?P<codigo_cliente>\d{3,6})(?P<cliente_nome>.+?)"
    r"(?P<cfop>\d-\d{3})(?P<ac>\d{3})(?P<uf>[A-Z]{2})"
    r"(?P<valor_contabil>\d{1,3}(?:\.\d{3})*,\d{2})ICMS\s+(?P<tributos>[\d,]+)\s*$"
)


def parse_dominio_pdf_bytes(pdf_bytes: bytes) -> ParseResult:
    reader = PdfReader(BytesIO(pdf_bytes))
    raw_lines: list[str] = []
    for page in reader.pages:
        page_text = page.extract_text(extraction_mode="layout") or ""
        raw_lines.extend(page_text.splitlines())
    return parse_dominio_lines(raw_lines)


def parse_dominio_lines(lines: list[str]) -> ParseResult:
    registros: list[RegistroNormalizado] = []
    diagnosticos: list[str] = []

    for line in lines:
        if not _is_candidate_line(line):
            continue

        parsed = _parse_line(line)
        if parsed is None:
            diagnosticos.append(f"Linha nao parseada: {line.strip()}")
            continue

        registros.append(parsed)

    return ParseResult(registros=registros, diagnosticos=diagnosticos)


def _is_candidate_line(line: str) -> bool:
    stripped = line.strip()
    return "/" in stripped and "ICMS" in stripped and stripped[0:1].isdigit()


def _parse_line(line: str) -> RegistroNormalizado | None:
    header_match = DOMINIO_LINE_RE.match(line)
    if not header_match:
        return None

    tail = header_match.group("resto").rstrip()
    tail_match = DOMINIO_TAIL_RE.search(tail)
    if not tail_match:
        return None

    numero_nota = tail_match.group("numero_nota").lstrip("0") or "0"
    cliente_nome = normalize_whitespace(tail_match.group("cliente_nome"))

    return RegistroNormalizado(
        origem="dominio",
        numero_nota=numero_nota,
        data_emissao=parse_date_br(header_match.group("data")),
        valor=parse_decimal_br(tail_match.group("valor_contabil")),
        status=None,
        cliente_nome=cliente_nome,
        cliente_documento=None,
        campos_brutos={
            "codigo_saida": header_match.group("codigo_saida"),
            "serie": tail_match.group("serie"),
            "codigo_cliente": tail_match.group("codigo_cliente"),
            "cfop": tail_match.group("cfop"),
            "ac": tail_match.group("ac"),
            "uf": tail_match.group("uf"),
            "outras": tail_match.group("outras"),
            "tributos": tail_match.group("tributos"),
            "linha_original": line.rstrip(),
        },
    )
