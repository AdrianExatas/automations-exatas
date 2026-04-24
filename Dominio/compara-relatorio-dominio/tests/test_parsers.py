from decimal import Decimal

from src.parsers.cliente import parse_cliente_lines
from src.parsers.common import parse_date_br, parse_decimal_br
from src.parsers.dominio import parse_dominio_lines


def test_parse_decimal_br():
    assert parse_decimal_br("2.345,67") == Decimal("2345.67")


def test_parse_date_br():
    assert parse_date_br("31/03/2026").isoformat() == "2026-03-31"


def test_parse_cliente_lines_real_snippet():
    lines = [
        "Relatorio Notas Fiscais",
        "Cliente",
        "CPF/CNPJ",
        "N. Nota",
        "Mod",
        "Serie",
        "Emissao",
        "Valor",
        "Status",
        "MARIA DE LOURDES PEREIRA",
        "03964628557",
        "24557",
        "62",
        "1",
        "31/03/2026",
        "53,00",
        "Autorizada",
    ]

    result = parse_cliente_lines(lines)

    assert len(result.registros) == 1
    registro = result.registros[0]
    assert registro.numero_nota == "24557"
    assert registro.valor == 53
    assert registro.cliente_documento == "03964628557"
    assert registro.status == "Autorizada"


def test_parse_dominio_lines_real_snippet():
    lines = [
        "      38560  16/03/2026                                                                                                                                                                                                                                                                                                           32,0092292                                  585836MARIA APARECIDA BARROS DOS SANTOS5-102500SE32,00ICMS    0,000,000,000,00",
        "1    58430  30/03/2026                                                                                                                                                                                                                                                                                                           22,10244871                                  605343GLEDISTON TELES DOS SANTOS5-307910SE22,10ICMS    0,000,000,000,00",
    ]

    result = parse_dominio_lines(lines)

    assert len(result.registros) == 2
    assert result.registros[0].numero_nota == "9229"
    assert result.registros[0].valor == 32
    assert result.registros[0].campos_brutos["serie"] == "2"
    assert result.registros[1].numero_nota == "24487"
    assert result.registros[1].cliente_nome == "GLEDISTON TELES DOS SANTOS"


def test_parse_dominio_lines_handles_thousands_and_short_customer_code():
    lines = [
        "      53407  03/03/2026                                                                                                                                                                                                                                                                                                      2.000,00194571                                    20243LATICINIOS REZENDE LTDA5-303909SE2.000,00ICMS    0,000,000,000,00",
        "      40954  26/03/2026                                                                                                                                                                                                                                                                                                           32,00116412                                        836JOYCE CARLA SOUZA MELO5-102500SE32,00ICMS    0,000,000,000,00",
    ]

    result = parse_dominio_lines(lines)

    assert len(result.registros) == 2
    assert result.registros[0].valor == 2000
    assert result.registros[0].campos_brutos["codigo_cliente"] == "20243"
    assert result.registros[1].campos_brutos["codigo_cliente"] == "836"
