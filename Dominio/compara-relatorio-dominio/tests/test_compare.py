from datetime import date
from decimal import Decimal

from src.models import RegistroNormalizado
from src.services.compare import compare_registros


def make_record(
    origem: str,
    numero_nota: str,
    data_emissao: date,
    valor: str,
    status: str | None,
    cliente_nome: str,
) -> RegistroNormalizado:
    return RegistroNormalizado(
        origem=origem,
        numero_nota=numero_nota,
        data_emissao=data_emissao,
        valor=Decimal(valor),
        status=status,
        cliente_nome=cliente_nome,
        campos_brutos={},
    )


def test_compare_classifies_missing_and_value_divergence():
    cliente = [
        make_record("cliente", "100", date(2026, 3, 10), "32.00", "Autorizada", "A"),
        make_record("cliente", "101", date(2026, 3, 10), "50.00", "Autorizada", "B"),
    ]
    dominio = [
        make_record("dominio", "100", date(2026, 3, 10), "35.00", None, "A"),
        make_record("dominio", "102", date(2026, 3, 10), "20.00", None, "C"),
    ]

    result = compare_registros(cliente, dominio)

    assert len(result.valor_divergente) == 1
    assert len(result.somente_no_cliente) == 1
    assert len(result.somente_no_dominio) == 1


def test_compare_highlights_cancelled_note_as_reason():
    cliente = [
        make_record("cliente", "200", date(2026, 3, 11), "99.00", "Autorizada", "A"),
        make_record("cliente", "201", date(2026, 3, 11), "200.00", "Cancelada", "B"),
    ]
    dominio = [
        make_record("dominio", "200", date(2026, 3, 11), "99.00", None, "A"),
        make_record("dominio", "201", date(2026, 3, 11), "200.00", None, "B"),
    ]

    result = compare_registros(cliente, dominio)

    resumo = {item["tipo"]: item["valor_total"] for item in result.resumo}
    assert resumo["total_cliente_autorizado"] == 99.0
    assert resumo["total_cliente_cancelado"] == 200.0
    assert resumo["diferenca_dominio_menos_cliente_autorizado"] == 200.0
    assert len(result.notas_canceladas_cliente) == 1


def test_compare_handles_empty_side_without_crashing():
    cliente = [
        make_record("cliente", "300", date(2026, 3, 12), "25.00", "Autorizada", "A"),
    ]

    result = compare_registros(cliente, [])

    assert len(result.somente_no_cliente) == 1
    assert len(result.somente_no_dominio) == 0
    assert result.analise_textual
