from __future__ import annotations

import argparse
import os
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from typing import Any

import pyodbc


DEFAULT_DSN = os.getenv("DOMINIO_DSN", "Contabil Oficial")
DEFAULT_USER = os.getenv("DOMINIO_DB_USER", "EXTERNO")
DEFAULT_PASSWORD = os.getenv("DOMINIO_DB_PASSWORD", "externo")
DEFAULT_EMPRESA = 45
DEFAULT_FILIAL = 1
DEFAULT_COMPETENCIA = "2025-07"
ZERO = Decimal("0.00")


@dataclass
class PaymentSummary:
    valor_pago: Decimal = ZERO
    multa: Decimal = ZERO
    juros: Decimal = ZERO
    valor_pago_a_maior: Decimal = ZERO
    parcelado: Decimal = ZERO
    datas_pagamento: set[date] = field(default_factory=set)

    @property
    def data_pagamento(self) -> date | None:
        if not self.datas_pagamento:
            return None
        return max(self.datas_pagamento)


@dataclass
class ScreenRow:
    filial: int | None
    tipo_encargo: str
    parcela: str | None
    vencimento: date | None
    saldo_devedor: Decimal
    em_aberto: Decimal
    valor_pago: Decimal
    parcelado: Decimal
    multa: Decimal
    juros: Decimal
    valor_pago_a_maior: Decimal
    data_pagamento: date | None
    status: str
    fontes: list[str] = field(default_factory=list)


def decimal_value(value: Any) -> Decimal:
    if value is None:
        return ZERO
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def parse_competencia(value: str) -> date:
    if len(value) == 7:
        return datetime.strptime(value, "%Y-%m").date().replace(day=1)
    return datetime.strptime(value, "%Y-%m-%d").date().replace(day=1)


def format_decimal(value: Decimal | None) -> str:
    if value is None:
        return ""
    return f"{value.quantize(Decimal('0.01'))}"


def format_date(value: date | None) -> str:
    if value is None:
        return ""
    return value.strftime("%d/%m/%Y")


def connect(dsn: str, user: str, password: str) -> pyodbc.Connection:
    return pyodbc.connect(f"DSN={dsn};UID={user};PWD={password}")


def fetch_payment_summaries(cursor: pyodbc.Cursor, i_pagtos: set[int]) -> dict[int, PaymentSummary]:
    if not i_pagtos:
        return {}

    summaries = {i_pagto: PaymentSummary() for i_pagto in i_pagtos}
    placeholders = ", ".join("?" for _ in i_pagtos)
    params = list(sorted(i_pagtos))

    cursor.execute(
        f"""
        SELECT i_pagto, data_pagto, valor, multa, juros, valor_pago_maior
        FROM bethadba.fopagtoparcial
        WHERE i_pagto IN ({placeholders})
        """,
        params,
    )
    for i_pagto, data_pagto, valor, multa, juros, valor_pago_maior in cursor.fetchall():
        summary = summaries[i_pagto]
        summary.valor_pago += decimal_value(valor)
        summary.multa += decimal_value(multa)
        summary.juros += decimal_value(juros)
        summary.valor_pago_a_maior += decimal_value(valor_pago_maior)
        if data_pagto is not None:
            summary.datas_pagamento.add(data_pagto)

    cursor.execute(
        f"""
        SELECT i_pagto, valor_parcela
        FROM bethadba.foparcelamento_encargos_pagamentos_itens_parcelas
        WHERE i_pagto IN ({placeholders})
        """,
        params,
    )
    for i_pagto, valor_parcela in cursor.fetchall():
        summaries[i_pagto].parcelado += decimal_value(valor_parcela)

    return summaries


def fetch_gedctf_payment_summary(
    cursor: pyodbc.Cursor,
    empresa: int,
    competencia: date,
    tipo_guia: int,
) -> PaymentSummary:
    summary = PaymentSummary()
    cursor.execute(
        """
        SELECT data_pagamento, valor_pago, valor_multa, valor_juros, valor_pago_a_maior
        FROM bethadba.gedctf_web_pagamento
        WHERE codi_emp = ? AND competencia = ? AND tipo_guia = ?
        """,
        empresa,
        competencia,
        tipo_guia,
    )
    for data_pagamento, valor_pago, valor_multa, valor_juros, valor_pago_a_maior in cursor.fetchall():
        summary.valor_pago += decimal_value(valor_pago)
        summary.multa += decimal_value(valor_multa)
        summary.juros += decimal_value(valor_juros)
        summary.valor_pago_a_maior += decimal_value(valor_pago_a_maior)
        if data_pagamento is not None:
            summary.datas_pagamento.add(data_pagamento)
    return summary


def determine_status(row: ScreenRow) -> str:
    if row.parcelado > ZERO:
        return "parcelado"
    if row.valor_pago > ZERO and row.em_aberto > ZERO:
        return "pago_parcial"
    if row.valor_pago > ZERO and row.em_aberto == ZERO:
        return "pago"
    if row.em_aberto > ZERO:
        return "aberto"
    return "todos"


def build_screen_row(
    filial: int | None,
    tipo_encargo: str,
    parcela: str | None,
    vencimento: date | None,
    saldo_devedor: Decimal,
    payment_summary: PaymentSummary,
    fontes: list[str],
) -> ScreenRow:
    em_aberto = saldo_devedor - payment_summary.valor_pago
    if em_aberto < ZERO:
        em_aberto = ZERO
    row = ScreenRow(
        filial=filial,
        tipo_encargo=tipo_encargo,
        parcela=parcela,
        vencimento=vencimento,
        saldo_devedor=saldo_devedor,
        em_aberto=em_aberto,
        valor_pago=payment_summary.valor_pago,
        parcelado=payment_summary.parcelado,
        multa=payment_summary.multa,
        juros=payment_summary.juros,
        valor_pago_a_maior=payment_summary.valor_pago_a_maior,
        data_pagamento=payment_summary.data_pagamento,
        status="todos",
        fontes=fontes,
    )
    row.status = determine_status(row)
    return row


def resolve_tributos_federais(
    cursor: pyodbc.Cursor,
    empresa: int,
    filial: int | None,
    competencia: date,
) -> list[ScreenRow]:
    cursor.execute(
        """
        SELECT tipo_guia, data_vencimento, valor_recolher, saldo_devedor
        FROM bethadba.geguia_contribuicao_previdenciaria
        WHERE codi_emp = ? AND competencia = ?
        ORDER BY CASE WHEN tipo_guia = 3 THEN 0 ELSE 1 END, data_vencimento DESC, tipo_guia
        """,
        empresa,
        competencia,
    )
    guide_rows = cursor.fetchall()
    if not guide_rows:
        return []

    selected_tipo_guia = 3 if any(row[0] == 3 for row in guide_rows) else guide_rows[0][0]
    selected = [row for row in guide_rows if row[0] == selected_tipo_guia]
    saldo_devedor = sum((decimal_value(row[3] or row[2]) for row in selected), ZERO)
    due_date = max((row[1] for row in selected if row[1] is not None), default=None)

    payment_summary = fetch_gedctf_payment_summary(cursor, empresa, competencia, selected_tipo_guia)

    cursor.execute(
        """
        SELECT tipo_saldo_recolher, valor_devido, valor_compensado, saldo_recolher
        FROM bethadba.geguia_contribuicao_previdenciaria_saldos_recolher
        WHERE codi_emp = ? AND competencia = ? AND tipo_guia = ? AND saldo_recolher > 0
        ORDER BY tipo_saldo_recolher
        """,
        empresa,
        competencia,
        selected_tipo_guia,
    )
    breakdown_rows = cursor.fetchall()
    fontes = [
        (
            "GEGUIA_CONTRIBUICAO_PREVIDENCIARIA "
            f"| tipo_guia={selected_tipo_guia} | valor_recolher={format_decimal(decimal_value(row[2] or row[3]))} "
            f"| saldo_devedor={format_decimal(decimal_value(row[3] or row[2]))} | vencimento={format_date(row[1])}"
        )
        for row in selected
    ]
    for tipo_saldo_recolher, valor_devido, valor_compensado, saldo_recolher in breakdown_rows:
        fontes.append(
            "GEGUIA_CONTRIBUICAO_PREVIDENCIARIA_SALDOS_RECOLHER "
            f"| tipo_saldo_recolher={tipo_saldo_recolher} | valor_devido={format_decimal(valor_devido)} "
            f"| valor_compensado={format_decimal(valor_compensado)} | saldo_recolher={format_decimal(saldo_recolher)}"
        )
    if payment_summary.valor_pago > ZERO:
        fontes.append(
            "GEDCTF_WEB_PAGAMENTO "
            f"| valor_pago={format_decimal(payment_summary.valor_pago)} | multa={format_decimal(payment_summary.multa)} "
            f"| juros={format_decimal(payment_summary.juros)} | data_pagamento={format_date(payment_summary.data_pagamento)}"
        )

    row = build_screen_row(
        filial=filial,
        tipo_encargo="Tributos federais",
        parcela=None,
        vencimento=due_date,
        saldo_devedor=saldo_devedor,
        payment_summary=payment_summary,
        fontes=fontes,
    )
    return [row]


def apply_situacao_filter(rows: list[ScreenRow], situacao: str) -> list[ScreenRow]:
    if situacao == "todos":
        return rows
    if situacao == "pagos":
        return [row for row in rows if row.valor_pago > ZERO and row.em_aberto == ZERO]
    if situacao == "abertos":
        return [row for row in rows if row.valor_pago == ZERO and row.em_aberto > ZERO]
    if situacao == "pago_parcial":
        return [row for row in rows if row.valor_pago > ZERO and row.em_aberto > ZERO]
    if situacao == "parcelados":
        return [row for row in rows if row.parcelado > ZERO]
    if situacao == "pendentes":
        return [row for row in rows if row.em_aberto > ZERO]
    return rows


def render_table(rows: list[ScreenRow]) -> None:
    headers = [
        ("Filial", 6),
        ("Tipo de encargo", 24),
        ("Parcela", 8),
        ("Vencimento", 12),
        ("Saldo devedor", 14),
        ("Em aberto", 12),
        ("Valor pago", 12),
        ("Parcelado", 12),
        ("Multa", 10),
        ("Juros", 10),
        ("Valor pago a maior", 20),
        ("Data pagamento", 14),
    ]
    print(" ".join(title.ljust(width) for title, width in headers))
    print(" ".join("-" * width for _, width in headers))
    for row in rows:
        values = [
            str(row.filial or ""),
            row.tipo_encargo,
            row.parcela or "",
            format_date(row.vencimento),
            format_decimal(row.saldo_devedor),
            format_decimal(row.em_aberto),
            format_decimal(row.valor_pago),
            format_decimal(row.parcelado),
            format_decimal(row.multa),
            format_decimal(row.juros),
            format_decimal(row.valor_pago_a_maior),
            format_date(row.data_pagamento),
        ]
        print(" ".join(value.ljust(width) for value, (_, width) in zip(values, headers)))


def print_sources(rows: list[ScreenRow]) -> None:
    for row in rows:
        print()
        print(f"=== {row.tipo_encargo} ===")
        for fonte in row.fontes:
            print(f"  {fonte}")


def collect_rows(
    cursor: pyodbc.Cursor,
    empresa: int,
    filial: int | None,
    competencia: date,
) -> list[ScreenRow]:
    rows: list[ScreenRow] = []
    rows.extend(resolve_tributos_federais(cursor, empresa, filial, competencia))
    return rows


def validate_scenarios(cursor: pyodbc.Cursor) -> list[str]:
    checks: list[tuple[str, bool]] = []

    january_rows = collect_rows(cursor, 45, 1, date(2026, 1, 1))
    january_by_name = {row.tipo_encargo: row for row in january_rows}
    checks.append(
        ("Jan/2026 Tributos federais = 8240.23", january_by_name["Tributos federais"].saldo_devedor == Decimal("8240.23"))
    )
    checks.append(
        ("Jan/2026 Tributos federais data_pagamento = 13/02/2026", january_by_name["Tributos federais"].data_pagamento == date(2026, 2, 13))
    )
    february_rows = collect_rows(cursor, 45, 1, date(2026, 2, 1))
    february_by_name = {row.tipo_encargo: row for row in february_rows}
    checks.append(
        ("Fev/2026 Tributos federais = 8407.81", february_by_name["Tributos federais"].saldo_devedor == Decimal("8407.81"))
    )
    checks.append(
        ("Dez/2025 Tributos federais = 9029.46",
         collect_rows(cursor, 45, 1, date(2025, 12, 1))[0].saldo_devedor == Decimal("9029.46"))
    )

    messages: list[str] = []
    failed = False
    for label, passed in checks:
        status = "OK" if passed else "FALHA"
        messages.append(f"[{status}] {label}")
        if not passed:
            failed = True

    if failed:
        raise SystemExit("\n".join(messages))
    return messages


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reproduz a tela Folha > Processos > Pagamentos > Encargos."
    )
    parser.add_argument("--dsn", default=DEFAULT_DSN, help="Nome do DSN ODBC.")
    parser.add_argument("--user", default=DEFAULT_USER, help="Usuario do banco.")
    parser.add_argument("--password", default=DEFAULT_PASSWORD, help="Senha do banco.")
    parser.add_argument("--empresa", type=int, default=DEFAULT_EMPRESA, help="Codigo da empresa.")
    parser.add_argument("--filial", type=int, default=DEFAULT_FILIAL, help="Codigo da filial.")
    parser.add_argument(
        "--competencia",
        default=DEFAULT_COMPETENCIA,
        help="Competencia no formato YYYY-MM ou YYYY-MM-DD. Usa o primeiro dia do mes.",
    )
    parser.add_argument(
        "--situacao",
        choices=["todos", "pagos", "abertos", "pago_parcial", "parcelados", "pendentes"],
        default="todos",
        help="Filtro de situacao da tela.",
    )
    parser.add_argument(
        "--no-fontes",
        action="store_true",
        help="Nao imprime o detalhamento das fontes.",
    )
    parser.add_argument(
        "--validate-reference-case",
        action="store_true",
        help="Executa cenarios de validacao conhecidos.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    competencia = parse_competencia(args.competencia)

    conn = connect(args.dsn, args.user, args.password)
    cursor = conn.cursor()
    try:
        rows = collect_rows(cursor, args.empresa, args.filial, competencia)
        filtered_rows = apply_situacao_filter(rows, args.situacao)

        print("Tela: Folha > Processos > Pagamentos > Encargos")
        print(
            f"Empresa={args.empresa} | Filial={args.filial if args.filial is not None else ''} | "
            f"Competencia={format_date(competencia)} | Situacao={args.situacao}"
        )
        print()
        render_table(filtered_rows)

        if not args.no_fontes:
            print()
            print_sources(filtered_rows)

        if args.validate_reference_case:
            print()
            print("=== Cenarios de validacao ===")
            for message in validate_scenarios(cursor):
                print(message)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
