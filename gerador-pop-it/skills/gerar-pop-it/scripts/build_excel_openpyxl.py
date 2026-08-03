#!/usr/bin/env python3
"""Gera FORM e MP com openpyxl (sem automação COM do Excel)."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation


THIN = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)
HEADER = PatternFill("solid", fgColor="1F4E79")
SECTION = PatternFill("solid", fgColor="2E75B6")
INPUT = PatternFill("solid", fgColor="FFF2CC")
PENDING = PatternFill("solid", fgColor="FCE4D6")
WHITE_FONT = Font(name="Arial Narrow", bold=True, color="FFFFFF", size=11)
BASE_FONT = Font(name="Arial Narrow", size=10)
BOLD = Font(name="Arial Narrow", bold=True, size=10)


def load_content(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def style_range(ws, cell_range: str, fill=None, font=None, align=None):
    for row in ws[cell_range]:
        for cell in row:
            if fill is not None:
                cell.fill = fill
            if font is not None:
                cell.font = font
            if align is not None:
                cell.alignment = align
            cell.border = THIN


def build_form(content: dict, output_path: Path) -> None:
    doc = content["documento"]
    form = content.get("form") or {}
    wb = Workbook()
    ws = wb.active
    ws.title = "FORM"

    for idx, width in enumerate([12, 22, 14, 14, 16, 14, 18, 14], start=1):
        ws.column_dimensions[get_column_letter(idx)].width = width

    ws.merge_cells("A1:H1")
    ws["A1"] = "FORMULÁRIO DE VERIFICAÇÃO"
    style_range(ws, "A1:H1", fill=HEADER, font=WHITE_FONT, align=Alignment(horizontal="center"))

    ws["A3"] = "SETOR"
    ws["B3"] = doc.get("setor", "")
    ws["D3"] = "CÓDIGO"
    ws["E3"] = doc.get("codigo_form", "")
    ws["G3"] = "VERSÃO"
    ws["H3"] = doc.get("versao", "00")
    style_range(ws, "A3:H3", font=BOLD)

    ws.merge_cells("A4:H4")
    ws["A4"] = f"TÍTULO: {doc.get('titulo', '')}"
    ws["A4"].font = BOLD

    context_fields = form.get("campos_contexto") or []
    context_text = " | ".join(
        f"{field.get('rotulo', field.get('id', ''))}: {field.get('valor_inicial', '')}".strip()
        for field in context_fields
    )
    ws.merge_cells("A5:H5")
    ws["A5"] = f"CONTEXTO: {context_text}"
    ws["A5"].fill = INPUT

    # Colunas auxiliares contíguas (L/M/N): Excel rejeita intervalos nomeados
    # multiárea malformados (ex.: FORM!$F$9,$F$16) e COUNTIF exige intervalo único.
    ws["J1"] = "ITEM_ID"
    ws["K1"] = "RESPOSTA_CONFORME"
    ws["L1"] = "RESPOSTA"
    ws["M1"] = "PARECER"
    ws["N1"] = "COEFICIENTE"
    for col in ("J", "K", "L", "M", "N"):
        ws.column_dimensions[col].hidden = True

    row = 7
    helper_row = 2
    dv = DataValidation(type="list", formula1='"SIM,NÃO"', allow_blank=True)
    ws.add_data_validation(dv)

    for block in form.get("blocos") or []:
        ws.merge_cells(f"A{row}:H{row}")
        ws[f"A{row}"] = str(block.get("titulo", "BLOCO"))
        style_range(ws, f"A{row}:H{row}", fill=SECTION, font=WHITE_FONT)
        row += 1

        ws[f"A{row}"] = "ID"
        ws[f"B{row}"] = "ITEM DE VERIFICAÇÃO"
        ws.merge_cells(f"B{row}:E{row}")
        ws[f"F{row}"] = "RESPOSTA"
        ws[f"G{row}"] = "PARECER"
        ws[f"H{row}"] = "COEF."
        style_range(ws, f"A{row}:H{row}", font=BOLD)
        row += 1

        block_item_rows: list[int] = []
        for item in block.get("itens") or []:
            ws[f"A{row}"] = item.get("id", "")
            ws.merge_cells(f"B{row}:E{row}")
            ws[f"B{row}"] = item.get("pergunta", "")
            ws[f"B{row}"].alignment = Alignment(wrap_text=True)
            ws[f"F{row}"] = ""
            ws[f"F{row}"].fill = INPUT
            ws[f"F{row}"].border = THIN
            dv.add(ws[f"F{row}"])
            conforme = str(item.get("resposta_conforme", "SIM")).replace("NAO", "NÃO")
            ws[f"G{row}"] = (
                f'=IF(F{row}="","PENDENTE",IF(F{row}="{conforme}","CONFORME","NÃO CONFORME"))'
            )
            ws[f"H{row}"] = f'=IF(G{row}="PENDENTE","",IF(G{row}="CONFORME",1,0))'
            ws[f"J{helper_row}"] = item.get("id", "")
            ws[f"K{helper_row}"] = conforme
            ws[f"L{helper_row}"] = f"=F{row}"
            ws[f"M{helper_row}"] = f"=G{row}"
            ws[f"N{helper_row}"] = (
                f'=IF(G{row}="CONFORME",1,IF(G{row}="NÃO CONFORME",0,""))'
            )
            helper_row += 1
            block_item_rows.append(row)
            ws.row_dimensions[row].height = 30
            row += 1

        if block_item_rows:
            first, last = block_item_rows[0], block_item_rows[-1]
            ws[f"A{row}"] = "PARECER DO BLOCO"
            ws.merge_cells(f"B{row}:E{row}")
            ws[f"F{row}"] = (
                f'=IF(COUNTIF(G{first}:G{last},"PENDENTE")>0,"PENDENTE",'
                f'IF(COUNTIF(G{first}:G{last},"NÃO CONFORME")>0,"NÃO CONFORME","CONFORME"))'
            )
            ws[f"F{row}"].fill = PENDING
            row += 1

        if block.get("campo_evidencia", True):
            ws.merge_cells(f"A{row}:H{row}")
            ws[f"A{row}"] = "EVIDÊNCIA/PRINT — INSERÇÃO MANUAL"
            style_range(ws, f"A{row}:H{row}", font=BOLD)
            row += 1
            ws.merge_cells(f"A{row}:H{row}")
            ws[f"A{row}"] = "Insira ou cole aqui a evidência visual. Nenhuma imagem é anexada automaticamente."
            ws[f"A{row}"].fill = INPUT
            ws.row_dimensions[row].height = 45
            row += 1

        row += 1

    ws["A6"] = "PARECER GERAL"
    ws.merge_cells("B6:F6")
    ws["G6"] = "COEFICIENTE"
    ws["B6"].fill = PENDING
    ws["H6"].number_format = "0%"

    helper_last = helper_row - 1
    if helper_last >= 2:
        # Intervalos contíguos válidos no workbook.xml (evita reparo do Excel).
        wb.defined_names.add(
            DefinedName(name="FORM_RESPOSTAS", attr_text=f"'FORM'!$L$2:$L${helper_last}")
        )
        wb.defined_names.add(
            DefinedName(name="FORM_PARECERES", attr_text=f"'FORM'!$M$2:$M${helper_last}")
        )
        wb.defined_names.add(
            DefinedName(name="FORM_COEFICIENTES", attr_text=f"'FORM'!$N$2:$N${helper_last}")
        )
        ws["B6"] = (
            '=IF(COUNTIF(FORM_PARECERES,"PENDENTE")>0,"PENDENTE",'
            'IF(COUNTIF(FORM_PARECERES,"NÃO CONFORME")>0,"NÃO CONFORME","CONFORME"))'
        )
        ws["H6"] = '=IF(COUNTIF(FORM_PARECERES,"PENDENTE")>0,"",AVERAGE(FORM_COEFICIENTES))'
    else:
        ws["B6"] = "PENDENTE"
        ws["H6"] = ""

    ws.print_area = f"A1:H{max(row, 10)}"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)


def build_mp(content: dict, output_path: Path) -> None:
    doc = content["documento"]
    mp = content.get("mp") or {}
    chain = mp.get("cadeia") or {}
    wb = Workbook()
    ws = wb.active
    ws.title = "MP"

    for idx, width in enumerate([18, 28, 18, 28, 18, 28, 14, 14], start=1):
        ws.column_dimensions[get_column_letter(idx)].width = width

    ws.merge_cells("A1:H1")
    ws["A1"] = "MAPEAMENTO DE PROCESSO"
    style_range(ws, "A1:H1", fill=HEADER, font=WHITE_FONT, align=Alignment(horizontal="center"))

    ws["A3"] = "CÓDIGO"
    ws["B3"] = doc.get("codigo_mp", "")
    ws["C3"] = "TÍTULO"
    ws.merge_cells("D3:H3")
    ws["D3"] = doc.get("titulo", "")
    style_range(ws, "A3:H3", font=BOLD)

    ws.merge_cells("A5:H5")
    ws["A5"] = "CADEIA DE VALOR"
    style_range(ws, "A5:H5", fill=SECTION, font=WHITE_FONT)

    labels = [
        ("FORNECEDORES", chain.get("fornecedores") or []),
        ("ENTRADAS", chain.get("entradas") or []),
        ("CLIENTES", chain.get("clientes") or []),
        ("SAÍDAS", chain.get("saidas") or []),
    ]
    row = 6
    for label, values in labels:
        ws[f"A{row}"] = label
        ws.merge_cells(f"B{row}:H{row}")
        ws[f"B{row}"] = "; ".join(str(v) for v in values)
        ws[f"A{row}"].font = BOLD
        row += 1

    row += 1
    ws.merge_cells(f"A{row}:H{row}")
    ws[f"A{row}"] = "RISCOS"
    style_range(ws, f"A{row}:H{row}", fill=SECTION, font=WHITE_FONT)
    row += 1

    headers = ["ID", "ETAPA", "QUEM FAZ", "COMO FAZ", "RISCO", "BARREIRA", "P", "G"]
    for col, header in enumerate(headers, start=1):
        cell = ws.cell(row=row, column=col, value=header)
        cell.font = BOLD
        cell.border = THIN
    row += 1

    for risk in mp.get("riscos") or []:
        values = [
            risk.get("id", ""),
            risk.get("etapa", ""),
            risk.get("quem_faz", ""),
            risk.get("como_faz", ""),
            risk.get("risco", ""),
            risk.get("barreira", ""),
            risk.get("probabilidade", ""),
            risk.get("gravidade", ""),
        ]
        for col, value in enumerate(values, start=1):
            cell = ws.cell(row=row, column=col, value=("" if value is None else value))
            cell.font = BASE_FONT
            cell.alignment = Alignment(wrap_text=True, vertical="top")
            cell.border = THIN
            if col in (7, 8):
                cell.fill = INPUT
        if risk.get("sugerido"):
            ws.cell(row=row, column=5).fill = PENDING
        ws.row_dimensions[row].height = 45
        row += 1

    ws.print_area = f"A1:H{max(row, 10)}"
    ws.page_setup.fitToPage = True
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-json", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--document-types", default="form,mp")
    args = parser.parse_args()

    content = load_content(Path(args.content_json))
    output_dir = Path(args.output_dir)
    types = [part.strip().lower() for part in args.document_types.split(",") if part.strip()]
    saida = content.get("saida") or {}

    if "form" in types:
        path = output_dir / saida.get(
            "arquivo_form", "FORM.XXX.XXX - Formulario.xlsx"
        )
        build_form(content, path)
        print(f"FORM={path}")
    if "mp" in types:
        path = output_dir / saida.get("arquivo_mp", "MP.XXX.XXX - Mapeamento.xlsx")
        build_mp(content, path)
        print(f"MP={path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
