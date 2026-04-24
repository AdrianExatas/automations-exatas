from pathlib import Path

from src.parsers.cliente import parse_cliente_pdf_bytes
from src.parsers.dominio import parse_dominio_pdf_bytes


def test_parse_real_pdfs_smoke():
    repo_root = Path(__file__).resolve().parents[1]
    cliente_pdf = repo_root / "relatorios" / "relatorio-nfcom-2026033115253462.pdf"
    dominio_pdf = next((repo_root / "relatorios").glob("Sa*.pdf"))

    cliente_result = parse_cliente_pdf_bytes(cliente_pdf.read_bytes())
    dominio_result = parse_dominio_pdf_bytes(dominio_pdf.read_bytes())

    assert len(cliente_result.registros) > 1000
    assert len(dominio_result.registros) > 1000
