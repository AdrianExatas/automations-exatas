#!/usr/bin/env python3
"""
Separa PDFs com porcentagem negativa e gera relatorios XLSX e TXT.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
import re
import shutil
import sys
from pathlib import Path
from typing import Optional

try:
    from PyPDF2 import PdfReader
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "PyPDF2 nao encontrado. Instale com: pip install PyPDF2"
    ) from exc

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font
except ImportError as exc:  # pragma: no cover
    raise SystemExit(
        "openpyxl nao encontrado. Instale com: pip install openpyxl"
    ) from exc


PERCENTAGE_PATTERN = re.compile(r"Porcentagem:\s*([-+]?\d+(?:[.,]\d+)?)%")
CNPJ_PATTERN = re.compile(r"(\d{2}\.\d{3}\.\d{3})/(\d{4})-(\d{2})")
ENTRADAS_PATTERN = re.compile(r"Total de Entradas:\s*([-+]?\d[\d.,]*)", re.IGNORECASE)
SAIDAS_PATTERN = re.compile(r"Total de Sa\S*das:\s*([-+]?\d[\d.,]*)", re.IGNORECASE)
FILENAME_PATTERN = re.compile(r"Empresa\s+(\d+)\s*-\s*(.+)\.pdf", re.IGNORECASE)


@dataclass(frozen=True)
class PdfData:
    file_path: Path
    arquivo: str
    cnpj: Optional[str]
    cnpj_base: Optional[str]
    entradas: Optional[float]
    saidas: Optional[float]
    porcentagem_individual: Optional[float]
    codigo: Optional[str]
    empresa: Optional[str]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Le PDFs, identifica porcentagens negativas e move/copia os arquivos."
        )
    )
    parser.add_argument(
        "--input",
        default="Planilhas",
        help="Pasta de entrada dos PDFs (padrao: Planilhas).",
    )
    parser.add_argument(
        "--output",
        default="Planilhas/negativas",
        help="Pasta de destino para PDFs classificados (padrao: Planilhas/negativas).",
    )
    parser.add_argument(
        "--mode",
        default="move",
        choices=("move", "copy", "none"),
        help="Acao para PDFs negativos: move, copy ou none (padrao: move).",
    )
    parser.add_argument(
        "--group-mode",
        default="company",
        choices=("company", "file"),
        help=(
            "Modo de agrupamento: company (por CNPJ base) ou file (por arquivo). "
            "Padrao: company."
        ),
    )
    parser.add_argument(
        "--xlsx",
        default="Planilhas/relatorio_negativas.xlsx",
        help="Arquivo XLSX de saida (padrao: Planilhas/relatorio_negativas.xlsx).",
    )
    parser.add_argument(
        "--txt",
        default="Planilhas/resumo_negativas.txt",
        help="Arquivo TXT de resumo (padrao: Planilhas/resumo_negativas.txt).",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.0,
        help="Limite para classificacao (padrao: 0).",
    )
    parser.add_argument(
        "--comparison",
        default="lt",
        choices=("lt", "le"),
        help="Comparacao: lt (<) ou le (<=). Padrao: lt.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simula as acoes sem mover/copiar arquivos.",
    )
    return parser.parse_args()


def extract_text_from_pdf(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join((page.extract_text() or "") for page in reader.pages)


def normalize_number(raw_value: str) -> float:
    value = raw_value.strip()
    if "." in value and "," in value:
        value = value.replace(".", "").replace(",", ".")
    elif "," in value:
        value = value.replace(",", ".")
    return float(value)


def extract_cnpj(text: str) -> tuple[Optional[str], Optional[str]]:
    match = CNPJ_PATTERN.search(text)
    if not match:
        return None, None
    cnpj_base = match.group(1)
    cnpj = f"{cnpj_base}/{match.group(2)}-{match.group(3)}"
    return cnpj, cnpj_base


def extract_float(text: str, pattern: re.Pattern[str]) -> Optional[float]:
    match = pattern.search(text)
    if not match:
        return None
    return normalize_number(match.group(1))


def extract_percentage(text: str) -> Optional[float]:
    match = PERCENTAGE_PATTERN.search(text)
    if not match:
        return None
    return normalize_number(match.group(1))


def extract_filename_parts(file_name: str) -> tuple[Optional[str], Optional[str]]:
    match = FILENAME_PATTERN.match(file_name)
    if not match:
        return None, None
    codigo = match.group(1).strip()
    empresa = match.group(2).strip()
    return codigo, empresa


def extract_pdf_data(pdf_path: Path) -> PdfData:
    try:
        text = extract_text_from_pdf(pdf_path)
    except Exception:
        return PdfData(
            file_path=pdf_path,
            arquivo=pdf_path.name,
            cnpj=None,
            cnpj_base=None,
            entradas=None,
            saidas=None,
            porcentagem_individual=None,
        )

    cnpj, cnpj_base = extract_cnpj(text)
    entradas = extract_float(text, ENTRADAS_PATTERN)
    saidas = extract_float(text, SAIDAS_PATTERN)
    porcentagem_individual = extract_percentage(text)

    codigo, empresa = extract_filename_parts(pdf_path.name)

    return PdfData(
        file_path=pdf_path,
        arquivo=pdf_path.name,
        cnpj=cnpj,
        cnpj_base=cnpj_base,
        entradas=entradas,
        saidas=saidas,
        porcentagem_individual=porcentagem_individual,
        codigo=codigo,
        empresa=empresa,
    )


def classify(value: float, threshold: float, comparison: str) -> bool:
    if comparison == "lt":
        return value < threshold
    return value <= threshold


def unique_destination(destination: Path) -> Path:
    if not destination.exists():
        return destination

    stem = destination.stem
    suffix = destination.suffix
    parent = destination.parent
    index = 1
    while True:
        candidate = parent / f"{stem} ({index}){suffix}"
        if not candidate.exists():
            return candidate
        index += 1


def build_groups(pdf_entries: list[PdfData], group_mode: str) -> list[list[PdfData]]:
    grouped: dict[str, list[PdfData]] = defaultdict(list)
    for entry in sorted(pdf_entries, key=lambda item: item.arquivo):
        if group_mode == "company":
            group_key = entry.cnpj_base if entry.cnpj_base else f"sem_cnpj::{entry.arquivo}"
        else:
            group_key = entry.arquivo
        grouped[group_key].append(entry)

    return [sorted(grouped[key], key=lambda item: item.arquivo) for key in sorted(grouped)]


def calculate_percentage_from_totals(entries: list[PdfData]) -> Optional[float]:
    if any(item.entradas is None or item.saidas is None for item in entries):
        return None

    total_entradas = sum(item.entradas for item in entries if item.entradas is not None)
    total_saidas = sum(item.saidas for item in entries if item.saidas is not None)
    if total_entradas == 0:
        return None
    return ((total_saidas - total_entradas) / total_entradas) * 100


def calculate_weighted_percentage(entries: list[PdfData]) -> Optional[float]:
    if any(item.entradas is None or item.porcentagem_individual is None for item in entries):
        return None

    total_entradas = sum(item.entradas for item in entries if item.entradas is not None)
    if total_entradas == 0:
        return None

    weighted_sum = sum(
        item.porcentagem_individual * item.entradas
        for item in entries
        if item.porcentagem_individual is not None and item.entradas is not None
    )
    return weighted_sum / total_entradas


def calculate_group_percentage(entries: list[PdfData], group_mode: str) -> Optional[float]:
    if group_mode == "file":
        return entries[0].porcentagem_individual

    # Para grupo unitario em modo company, mantem o comportamento historico.
    if len(entries) == 1:
        return entries[0].porcentagem_individual

    if any(item.cnpj_base is None for item in entries):
        return None

    grouped_percentage = calculate_percentage_from_totals(entries)
    if grouped_percentage is not None:
        return grouped_percentage

    return calculate_weighted_percentage(entries)


def apply_action_to_group(
    entries: list[PdfData],
    output_dir: Path,
    mode: str,
    dry_run: bool,
) -> str:
    if mode == "none":
        return "classificado"

    if dry_run:
        return f"simulacao_{mode}"

    output_dir.mkdir(parents=True, exist_ok=True)
    for entry in entries:
        destination = unique_destination(output_dir / entry.arquivo)
        if mode == "move":
            shutil.move(str(entry.file_path), str(destination))
        elif mode == "copy":
            shutil.copy2(str(entry.file_path), str(destination))

    return mode


def write_xlsx(xlsx_path: Path, rows: list[dict[str, object]]) -> None:
    xlsx_path.parent.mkdir(parents=True, exist_ok=True)

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Relatorio"

    headers = [
        "cnpj",
        "codigo",
        "empresa",
        "grupo",
        "cnpj_base",
        "qtd_arquivos",
        "arquivos",
        "porcentagem",
        "acao",
    ]
    worksheet.append(headers)

    for cell in worksheet[1]:
        cell.font = Font(bold=True)

    for row in rows:
        worksheet.append(
            [
                row["cnpj"],
                row["codigo"],
                row["empresa"],
                row["grupo"],
                row["cnpj_base"],
                row["qtd_arquivos"],
                row["arquivos"],
                row["porcentagem"],
                row["acao"],
            ]
        )

    worksheet.freeze_panes = "A2"
    worksheet.auto_filter.ref = f"A1:I{max(worksheet.max_row, 1)}"
    worksheet.column_dimensions["A"].width = 18
    worksheet.column_dimensions["B"].width = 14
    worksheet.column_dimensions["C"].width = 32
    worksheet.column_dimensions["D"].width = 18
    worksheet.column_dimensions["E"].width = 16
    worksheet.column_dimensions["F"].width = 14
    worksheet.column_dimensions["G"].width = 82
    worksheet.column_dimensions["H"].width = 14
    worksheet.column_dimensions["I"].width = 22

    workbook.save(xlsx_path)


def write_txt_summary(
    txt_path: Path,
    input_dir: Path,
    output_dir: Path,
    mode: str,
    group_mode: str,
    dry_run: bool,
    total_pdfs: int,
    total_groups: int,
    negative_count: int,
    non_negative_count: int,
    unprocessed_count: int,
    negative_entries: list[tuple[str, Optional[str], int, str, float, str]],
) -> None:
    txt_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "Resumo da execucao",
        f"Data/hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"Pasta de entrada: {input_dir}",
        f"Pasta de saida: {output_dir}",
        f"Modo: {mode}",
        f"Group-mode: {group_mode}",
        f"Dry-run: {'sim' if dry_run else 'nao'}",
        "",
        f"Total de PDFs: {total_pdfs}",
        f"Total de grupos: {total_groups}",
        f"Negativos (grupos): {negative_count}",
        f"Nao negativos (grupos): {non_negative_count}",
        f"Nao processados (grupos): {unprocessed_count}",
        "",
        "Lista de grupos negativos:",
    ]

    if negative_entries:
        for group_label, cnpj_base, file_count, file_list, percentage, action in negative_entries:
            cnpj_info = cnpj_base if cnpj_base else "sem_cnpj"
            lines.append(
                f"- {group_label} [{cnpj_info}] ({file_count} arquivo(s)): "
                f"{percentage:.2f}% ({action}) -> {file_list}"
            )
    else:
        lines.append("- Nenhum grupo negativo.")

    txt_path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()

    input_dir = Path(args.input)
    output_dir = Path(args.output)
    xlsx_path = Path(args.xlsx)
    txt_path = Path(args.txt)

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"Erro: pasta de entrada nao encontrada: {input_dir}")
        return 1

    pdf_files = sorted(input_dir.glob("*.pdf"))
    pdf_entries = [extract_pdf_data(pdf_path) for pdf_path in pdf_files]
    groups = build_groups(pdf_entries, args.group_mode)

    rows: list[dict[str, object]] = []
    negative_entries: list[tuple[str, Optional[str], int, str, float, str]] = []
    non_negative_count = 0
    unprocessed_count = 0

    for entries in groups:
        cnpj_base = entries[0].cnpj_base if len({item.cnpj_base for item in entries}) == 1 else None
        group_label = cnpj_base if args.group_mode == "company" and cnpj_base else entries[0].arquivo
        files_joined = "; ".join(item.arquivo for item in entries)
        percentage = calculate_group_percentage(entries, args.group_mode)
        first_entry = entries[0]
        primary_cnpj = first_entry.cnpj
        primary_codigo = first_entry.codigo
        primary_empresa = first_entry.empresa

        if percentage is None:
            action = "nao_processado"
            unprocessed_count += 1
        else:
            is_negative = classify(percentage, args.threshold, args.comparison)
            if is_negative:
                action = apply_action_to_group(entries, output_dir, args.mode, args.dry_run)
                negative_entries.append(
                    (
                        group_label,
                        cnpj_base,
                        len(entries),
                        files_joined,
                        percentage,
                        action,
                    )
                )
            else:
                action = "nao_negativo"
                non_negative_count += 1

        rows.append(
            {
                "cnpj": primary_cnpj,
                "codigo": primary_codigo,
                "empresa": primary_empresa,
                "grupo": group_label,
                "cnpj_base": cnpj_base,
                "qtd_arquivos": len(entries),
                "arquivos": files_joined,
                "porcentagem": percentage,
                "acao": action,
            }
        )

    negative_count = len(negative_entries)
    total_pdfs = len(pdf_files)
    total_groups = len(groups)
    if not pdf_files:
        print(f"Nenhum PDF encontrado em: {input_dir}")

    write_xlsx(xlsx_path, rows)
    write_txt_summary(
        txt_path=txt_path,
        input_dir=input_dir,
        output_dir=output_dir,
        mode=args.mode,
        group_mode=args.group_mode,
        dry_run=args.dry_run,
        total_pdfs=total_pdfs,
        total_groups=total_groups,
        negative_count=negative_count,
        non_negative_count=non_negative_count,
        unprocessed_count=unprocessed_count,
        negative_entries=negative_entries,
    )

    print("Resumo da execucao")
    print(f"Total de PDFs: {total_pdfs}")
    print(f"Total de grupos: {total_groups}")
    print(f"Negativos (grupos): {negative_count}")
    print(f"Nao negativos (grupos): {non_negative_count}")
    print(f"Nao processados (grupos): {unprocessed_count}")
    print(f"XLSX gerado: {xlsx_path}")
    print(f"TXT gerado: {txt_path}")

    if negative_entries:
        print("\nLista de grupos negativos:")
        for group_label, cnpj_base, file_count, file_list, percentage, action in negative_entries:
            cnpj_info = cnpj_base if cnpj_base else "sem_cnpj"
            print(
                f"- {group_label} [{cnpj_info}] ({file_count} arquivo(s)): "
                f"{percentage:.2f}% ({action}) -> {file_list}"
            )

    return 0


if __name__ == "__main__":
    sys.exit(main())
