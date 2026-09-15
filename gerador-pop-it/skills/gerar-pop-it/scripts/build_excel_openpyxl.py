#!/usr/bin/env python3
"""Gera FORM e MP com openpyxl (sem automação COM do Excel)."""

from __future__ import annotations

import argparse
import json
import math
import os
import posixpath
import re
import shutil
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape as xml_escape

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.worksheet.datavalidation import DataValidation


NS_SPREADSHEET = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
NS_PACKAGE_REL = "http://schemas.openxmlformats.org/package/2006/relationships"
NS_OFFICE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS_DRAWING_MAIN = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS_DRAWING_SHEET = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
DRAWING_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.drawing+xml"
# Alturas do bloco de mapa na referência MP.FIS.001 (pontos).
MAP_HEADER_HEIGHT = 120.0
MAP_ROW_HEIGHT = 119.25
MP_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "assets" / "templates" / "MP-template.xlsx"
FORM_TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "assets" / "templates" / "FORM-template.xlsx"
FORM_REFERENCE_PATH = next(
    (Path(__file__).resolve().parents[3] / "referencias").glob("FORM.QUA.002*.xlsx"),
    None,
)
MP_FIRST_RISK_ROW = 40
MP_LAST_RISK_SLOT = 65
MP_SIGNATURE_ROW = 85
MP_SIPOC_SUPPLIER_SLOTS = ("A10", "A11", "A12", "A13", "A14")
MP_SIPOC_INPUT_SLOTS = ("C10", "C12", "C14")
MP_SIPOC_CLIENT_SLOTS = ("E10", "E11", "E12", "E13", "E14")
MP_SIPOC_OUTPUT_SLOTS = ("H10", "H12", "H14")

# Slots institucionais do FORM.QUA.002 (capacidade fixa por bloco).
FORM_TEMPLATE_BLOCKS = (
    {
        "index": 1,
        "header": 14,
        "coef": 15,
        "items": tuple(range(16, 18)),
        "parecer": 18,
        "summary_title": "G9",
        "summary_value": "I9",
    },
    {
        "index": 2,
        "header": 19,
        "coef": 20,
        "items": tuple(range(21, 23)),
        "parecer": 23,
        "summary_title": "G10",
        "summary_value": "I10",
    },
    {
        "index": 3,
        "header": 24,
        "coef": 25,
        "items": tuple(range(26, 28)),
        "parecer": 28,
        "summary_title": "G11",
        "summary_value": "I11",
    },
    {
        "index": 4,
        "header": 29,
        "coef": 30,
        "items": tuple(range(31, 33)),
        "parecer": 33,
        "summary_title": "G12",
        "summary_value": "I12",
    },
    {
        "index": 5,
        "header": 34,
        "coef": 35,
        "items": tuple(range(36, 46)),
        "parecer": 46,
        "summary_title": "K9",
        "summary_value": "J9",
    },
    {
        "index": 6,
        "header": 47,
        "coef": 48,
        "items": tuple(range(49, 64)),
        "parecer": 64,
        "summary_title": "K10",
        "summary_value": "J10",
    },
    {
        "index": 7,
        "header": 65,
        "coef": 66,
        "items": tuple(range(67, 79)),
        "parecer": 79,
        "summary_title": "K11",
        "summary_value": "J11",
    },
)


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
FORM_SIGNATURE_FONT = Font(name="Arial Narrow", size=10, color="FFFF0000")
FORM_ITEM_MIN_HEIGHT = 18.0
FORM_SIGNATURE_ROW = 85


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


def _form_set(ws, address: str, value) -> None:
    from openpyxl.cell.cell import MergedCell

    cell = ws[address]
    if isinstance(cell, MergedCell):
        return
    cell.value = value


def _form_clear(ws, address: str) -> None:
    from openpyxl.cell.cell import MergedCell

    cell = ws[address]
    if isinstance(cell, MergedCell):
        return
    cell.value = None
    if cell.comment is not None:
        cell.comment = None


def _form_context_map(form: dict) -> dict[str, str]:
    mapping: dict[str, str] = {}
    for field in form.get("campos_contexto") or []:
        key = str(field.get("id") or "").strip().casefold()
        label = str(field.get("rotulo") or "").strip().casefold()
        value = str(field.get("valor_inicial") or "").strip()
        if key:
            mapping[key] = value
        if label:
            mapping[label] = value
    return mapping


def _form_sector_code(doc: dict) -> str:
    sigla = str(doc.get("sigla_setor") or "").strip()
    if sigla and sigla.upper() != "XXX":
        return sigla.upper()
    setor = str(doc.get("setor") or "").strip()
    if not setor or setor.casefold() in {"a definir", "pendente"}:
        return "XXX"
    tokens = [part for part in re.split(r"\s+", setor) if part]
    if len(tokens) == 1 and len(tokens[0]) <= 4:
        return tokens[0][:3].upper()
    initials = "".join(token[0] for token in tokens if token[:1].isalpha())
    return (initials[:3] or "XXX").upper()


def _form_block_title(index: int, title: str) -> str:
    clean = re.sub(r"\s+", " ", str(title or "XXX")).strip() or "XXX"
    return f"{index} | {clean.upper()}"


def _assign_form_blocks(content_blocks: list[dict]) -> list[tuple[dict, dict, int]]:
    """Associa blocos ao template: pequenos (≤2) em slots 1–4; grandes (>2) em 5–7."""
    used: set[int] = set()
    assignments: list[tuple[dict, dict, int]] = []
    small_slots = {1, 2, 3, 4}
    large_slots = {5, 6, 7}

    for display_index, block in enumerate(content_blocks, start=1):
        items = list(block.get("itens") or [])
        needed = max(len(items), 1)
        free = [slot for slot in FORM_TEMPLATE_BLOCKS if slot["index"] not in used]

        if needed <= 2:
            candidates = [
                slot
                for slot in free
                if slot["index"] in small_slots and len(slot["items"]) >= needed
            ]
            # Só queima slot grande se não houver pequeno livre.
            if not candidates:
                candidates = [slot for slot in free if len(slot["items"]) >= needed]
        else:
            candidates = [
                slot
                for slot in free
                if slot["index"] in large_slots and len(slot["items"]) >= needed
            ]

        if not candidates:
            capacities = ", ".join(
                f"{slot['index']}:{len(slot['items'])}" for slot in FORM_TEMPLATE_BLOCKS
            )
            raise SystemExit(
                f"O FORM institucional não tem slot para o bloco "
                f"'{block.get('titulo')}' com {needed} item(ns). Capacidades: {capacities}."
            )
        # Tightest-fit: menor capacidade suficiente; em empate, menor índice.
        candidates.sort(key=lambda slot: (len(slot["items"]), slot["index"]))
        slot = candidates[0]
        used.add(slot["index"])
        assignments.append((block, slot, display_index))
    return assignments


def _average_formula(cells: list[str]) -> str:
    if not cells:
        return ""
    if len(cells) == 1:
        return f"=AVERAGE({cells[0]})"
    return "=AVERAGE(" + ",".join(cells) + ")"


def _hide_form_rows(ws, start: int, end: int, hidden: bool = True) -> None:
    for row in range(start, end + 1):
        ws.row_dimensions[row].hidden = hidden


def _form_column_width(ws, letter: str) -> float:
    return float(ws.column_dimensions[letter].width or 10.0)


def _form_span_width(ws, start_col: int, end_col: int) -> float:
    total = 0.0
    for col in range(start_col, end_col + 1):
        total += _form_column_width(ws, get_column_letter(col))
    return total


def _form_apply_wrap_and_height(
    ws,
    address: str,
    text: str,
    start_col: int,
    end_col: int,
    font_size: float = 10.0,
    minimum: float = FORM_ITEM_MIN_HEIGHT,
) -> None:
    """Quebra o texto e alinha a altura da linha ao volume escrito."""
    from openpyxl.cell.cell import MergedCell

    cell = ws[address]
    if isinstance(cell, MergedCell):
        return
    current = cell.alignment
    cell.alignment = Alignment(
        horizontal=current.horizontal or "left",
        vertical=current.vertical or "center",
        wrap_text=True,
    )
    capacity = max(_form_span_width(ws, start_col, end_col) * 0.9, 10.0)
    height = _wrapped_height(text, capacity, minimum, font_size)
    existing = float(ws.row_dimensions[cell.row].height or 0)
    ws.row_dimensions[cell.row].height = max(existing, height)


def _form_set_signature(ws, address: str, value: str) -> None:
    from openpyxl.cell.cell import MergedCell

    cell = ws[address]
    if isinstance(cell, MergedCell):
        return
    cell.value = value
    if str(value or "").strip():
        cell.font = FORM_SIGNATURE_FONT


def build_form(content: dict, output_path: Path) -> None:
    """Preenche o FORM-template.xlsx (estrutura integral da referência FORM.QUA.002)."""
    if not FORM_TEMPLATE_PATH.is_file():
        raise SystemExit(
            f"Template FORM não encontrado: {FORM_TEMPLATE_PATH}. "
            "Execute scripts/sanitize_form_template.py."
        )

    doc = content["documento"]
    form = content.get("form") or {}
    content_blocks = list(form.get("blocos") or [])
    if not content_blocks:
        raise SystemExit("O conteúdo do FORM deve conter ao menos um item em form.blocos[].")
    if len(content_blocks) > len(FORM_TEMPLATE_BLOCKS):
        raise SystemExit(
            f"O FORM aceita no máximo {len(FORM_TEMPLATE_BLOCKS)} blocos no template "
            f"institucional; recebidos {len(content_blocks)}."
        )

    assignments = _assign_form_blocks(content_blocks)
    assigned_indexes = {slot["index"] for _, slot, _ in assignments}

    wb = load_workbook(FORM_TEMPLATE_PATH)
    ws = wb["FORM"] if "FORM" in wb.sheetnames else wb.worksheets[0]
    ws.title = "FORM"
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 85
    # Não usar freeze_panes=None via openpyxl — corrompe o pacote.
    # O freeze é removido em restore_form_drawing() via sheetViews.

    # --- Metadados (somente valores; estilos vêm do template) ---
    title = str(doc.get("titulo") or "").strip().upper()
    _form_set(ws, "F2", title or "MODELO CHECK LIST TAREFA")
    _form_set(ws, "C3", _form_sector_code(doc))
    _form_set(ws, "D3", doc.get("codigo_form") or "FORM.XXX.XXX")
    emissao = doc.get("emissao")
    if emissao not in (None, ""):
        _form_set(ws, "F4", emissao)
    else:
        _form_clear(ws, "F4")
    revisao = doc.get("revisao")
    _form_set(ws, "I4", revisao if revisao not in (None, "") else "XX/XX/XXXX")
    _form_set(ws, "J4", f"Versão: {doc.get('versao') or '00'}")

    context = _form_context_map(form)
    # Data de início (C9): contexto → emissão → =C8, para F8/E8 não quebrarem.
    inicio = (
        form.get("data_inicio")
        or form.get("inicio")
        or context.get("data_inicio")
        or context.get("inicio")
        or context.get("data inicio")
        or context.get("inicio da tarefa")
    )
    if inicio not in (None, ""):
        _form_set(ws, "C9", inicio)
    elif emissao not in (None, ""):
        _form_set(ws, "C9", emissao)
    else:
        _form_set(ws, "C9", "=C8")

    prazo_dias = form.get("prazo_dias")
    if prazo_dias not in (None, ""):
        try:
            days = int(prazo_dias)
            _form_set(ws, "C10", f"=C9+{max(days, 0)}")
            _form_set(ws, "C11", "=C10")
        except (TypeError, ValueError):
            # Mantém C10 do template; fim = início do prazo.
            _form_set(ws, "C11", "=C10")
    else:
        # Template traz C10=C9+25; alinhar C11 ao padrão FIS (sem +5 extra).
        _form_set(ws, "C11", "=C10")

    cnpj = context.get("cnpj") or context.get("cliente / cnpj") or "[CNPJ]"
    cliente = (
        context.get("cliente")
        or context.get("cliente / empresa")
        or context.get("nome cliente")
        or "[NOME CLIENTE]"
    )
    _form_set(ws, "C12", cnpj if cnpj else "[CNPJ]")
    _form_set(ws, "E12", cliente if cliente else "[NOME CLIENTE]")

    answer_rows: list[int] = []
    parecer_rows: list[int] = []
    coef_cells: list[str] = []
    summary_value_cells: list[str] = []

    # Limpa/oculta todos os slots antes de preencher os usados.
    for slot in FORM_TEMPLATE_BLOCKS:
        _form_set(ws, f"B{slot['header']}", f"{slot['index']} | XXX")
        _form_set(ws, f"G{slot['header']}", "SIM / NÃO")
        for row in slot["items"]:
            _form_clear(ws, f"B{row}")
            _form_clear(ws, f"G{row}")
            # Mantém fórmulas auxiliares L/M do template.
            ws.row_dimensions[row].hidden = True
        _form_set(ws, f"F{slot['parecer']}", "NÃO CONFORME")
        # Resumo lateral fixo por slot institucional (não remapear 1..N).
        _form_set(ws, slot["summary_title"], f"{slot['index']} | XXX")
        _form_set(ws, slot["summary_value"], f"=G{slot['coef']}")
        if slot["index"] not in assigned_indexes:
            _hide_form_rows(ws, slot["header"], slot["parecer"], hidden=True)
        else:
            _hide_form_rows(ws, slot["header"], slot["parecer"], hidden=False)

    for block, slot, display_index in assignments:
        items = list(block.get("itens") or [])
        item_rows = list(slot["items"][: len(items)])
        title_text = _form_block_title(display_index, block.get("titulo") or f"BLOCO {display_index}")
        _form_set(ws, f"B{slot['header']}", title_text)
        _form_set(ws, f"G{slot['header']}", "SIM / NÃO")
        ws.row_dimensions[slot["header"]].hidden = False
        ws.row_dimensions[slot["coef"]].hidden = False
        ws.row_dimensions[slot["parecer"]].hidden = False

        for offset, item in enumerate(items):
            row = item_rows[offset]
            question = str(item.get("pergunta") or "").strip()
            _form_set(ws, f"B{row}", question)
            _form_clear(ws, f"G{row}")
            ws.row_dimensions[row].hidden = False
            _form_apply_wrap_and_height(ws, f"B{row}", question, start_col=2, end_col=6)
            answer_rows.append(row)
            # Coeficiente por item (padrão institucional).
            _form_set(ws, f"L{row}", f'=IF(G{row}>="SIM","100%","0%")')
            _form_set(ws, f"M{row}", f'=AVERAGE(IF(G{row}>="SIM","100%","0%"))')

        for row in slot["items"][len(items) :]:
            _form_clear(ws, f"B{row}")
            _form_clear(ws, f"G{row}")
            ws.row_dimensions[row].hidden = True

        # Mantém faixa F{coef} institucional do template (não estreitar aos itens usados).
        _form_set(ws, f"G{slot['coef']}", f"=M{slot['parecer']}")
        _form_set(
            ws,
            f"M{slot['parecer']}",
            f'=AVERAGE(IF(F{slot["parecer"]}>="NÃO CONFORME","0%","100%"))',
        )
        _form_set(ws, f"F{slot['parecer']}", "NÃO CONFORME")
        _form_set(ws, slot["summary_title"], title_text)
        _form_set(ws, slot["summary_value"], f"=G{slot['coef']}")
        parecer_rows.append(slot["parecer"])
        coef_cells.append(f"F{slot['coef']}")
        summary_value_cells.append(slot["summary_value"])

    _form_set(ws, "F7", _average_formula(coef_cells) or "=AVERAGE(F15)")
    _form_set(ws, "K12", _average_formula(summary_value_cells) or "=AVERAGE(I9)")

    frequencia = str(doc.get("frequencia") or "Sob Demanda").strip() or "Sob Demanda"
    _form_set(ws, "B81", f"Frequência: {frequencia}")

    observacoes = [str(item).strip() for item in (form.get("observacoes") or []) if str(item).strip()]
    _form_set(ws, "B80", "OBSERVAÇÃO: \n")
    _form_set(ws, "B82", f"Obs1: {observacoes[0]}" if observacoes else "Obs1: ")
    _form_set(ws, "B83", f"Obs2: {observacoes[1]}" if len(observacoes) > 1 else "Obs2: ")

    elaborador = str(doc.get("elaborador") or "").strip()
    verificador = str(doc.get("verificador") or "").strip()
    aprovador = str(doc.get("aprovador") or "").strip()
    _form_set_signature(ws, "B85", elaborador)
    _form_set_signature(ws, "F85", verificador)
    _form_set_signature(ws, "I85", aprovador)
    _form_apply_wrap_and_height(ws, "B85", elaborador, start_col=2, end_col=5, minimum=15.75)
    _form_apply_wrap_and_height(ws, "F85", verificador, start_col=6, end_col=8, minimum=15.75)
    _form_apply_wrap_and_height(ws, "I85", aprovador, start_col=9, end_col=11, minimum=15.75)

    # Ranges nomeados operacionais (compatíveis com validação estrutural).
    for obsolete in ("FORM_RESPOSTAS", "FORM_PARECERES", "FORM_COEFICIENTES"):
        if obsolete in wb.defined_names:
            del wb.defined_names[obsolete]
    if answer_rows:
        first_answer, last_answer = min(answer_rows), max(answer_rows)
        wb.defined_names.add(
            DefinedName(name="FORM_RESPOSTAS", attr_text=f"'FORM'!$G${first_answer}:$G${last_answer}")
        )
        wb.defined_names.add(
            DefinedName(
                name="FORM_COEFICIENTES",
                attr_text=f"'FORM'!$M${first_answer}:$M${last_answer}",
            )
        )
    if parecer_rows:
        first_parecer, last_parecer = min(parecer_rows), max(parecer_rows)
        wb.defined_names.add(
            DefinedName(
                name="FORM_PARECERES",
                attr_text=f"'FORM'!$F${first_parecer}:$F${last_parecer}",
            )
        )

    ws.print_area = "B2:K85"
    ws.page_setup.orientation = "portrait"
    ws.page_setup.paperSize = 9
    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)
    restore_form_drawing(output_path)


def _flow_steps(content: dict) -> list[str]:
    steps: list[str] = []
    for step in (content.get("pop") or {}).get("etapas") or []:
        label = str(step.get("o_que") or step.get("titulo") or step.get("etapa") or "").strip()
        if label:
            steps.append(label)
    if steps:
        return steps
    seen: set[str] = set()
    for risk in (content.get("mp") or {}).get("riscos") or []:
        label = str(risk.get("etapa") or "").strip()
        if label and label not in seen:
            seen.add(label)
            steps.append(label)
    return steps


def _default_pg(risk: dict) -> tuple[int, int]:
    """P/G automáticos quando ausentes (pedido operacional)."""
    p = risk.get("probabilidade")
    g = risk.get("gravidade")
    if p is None:
        p = 3 if risk.get("sugerido") else 2
    if g is None:
        g = 3 if risk.get("sugerido") else 3
    return int(p), int(g)


def _classify_score(score: int) -> str:
    if score <= 4:
        return "TOLERÁVEL"
    if score <= 10:
        return "RAZOÁVEL (ALARP)"
    return "INACEITÁVEL"


def _escape_excel_text(text: str) -> str:
    return (text or "").replace('"', '""')


def _wrapped_height(text, char_capacity: float, minimum: float, font_size: float = 12.0) -> float:
    """Altura mínima para o texto caber com quebra automática (evita corte visual)."""
    value = str(text or "")
    capacity = max(char_capacity, 10.0)
    lines = max(
        value.count("\n") + 1,
        math.ceil(len(value) / capacity) if value else 1,
    )
    return max(minimum, round(lines * font_size * 1.35, 2))


def _pt_to_emu(points: float) -> int:
    return int(round(points * 12700))


def _row_top_emu(ws, row: int) -> int:
    """Deslocamento vertical acumulado até a linha (usado no xfrm em cache do desenho)."""
    default = float(ws.sheet_format.defaultRowHeight or 15.0)
    total = 0.0
    for index in range(1, row):
        dimension = ws.row_dimensions.get(index)
        total += float(dimension.height) if dimension and dimension.height else default
    return _pt_to_emu(total)


def _excel_width_to_emu(width: float) -> int:
    """Largura de coluna (caracteres) -> EMU, via pixels da fonte padrão (MDW = 7)."""
    pixels = int(round(width * 7)) + 5
    return pixels * 9525


def _step_anchor_xml(
    row_index: int,
    geometry: str,
    label: str,
    shape_id: int,
    name: str,
    col_off_start: int,
    col_off_end: int,
    row_off_start: int,
    row_off_end: int,
    absolute_y: int,
) -> str:
    """Forma vetorial no padrão DrawingML da referência MP.FIS.001."""
    text = xml_escape(label)
    width = max(col_off_end - col_off_start, 190500)
    height = max(row_off_end - row_off_start, 190500)
    return (
        f'<twoCellAnchor xmlns:a="{NS_DRAWING_MAIN}">'
        f"<from><col>0</col><colOff>{col_off_start}</colOff>"
        f"<row>{row_index}</row><rowOff>{row_off_start}</rowOff></from>"
        f"<to><col>0</col><colOff>{col_off_end}</colOff>"
        f"<row>{row_index}</row><rowOff>{row_off_end}</rowOff></to>"
        f'<sp macro="" textlink="">'
        f'<nvSpPr><cNvPr id="{shape_id}" name="{xml_escape(name)}"/><cNvSpPr/></nvSpPr>'
        f"<spPr>"
        f'<a:xfrm><a:off x="{col_off_start}" y="{absolute_y}"/>'
        f'<a:ext cx="{width}" cy="{height}"/></a:xfrm>'
        f'<a:prstGeom prst="{geometry}"><a:avLst/></a:prstGeom>'
        f'<a:ln><a:solidFill><a:srgbClr val="002060"/></a:solidFill></a:ln>'
        f"</spPr>"
        "<style>"
        '<a:lnRef idx="2"><a:schemeClr val="accent6"/></a:lnRef>'
        '<a:fillRef idx="1"><a:schemeClr val="lt1"/></a:fillRef>'
        '<a:effectRef idx="0"><a:schemeClr val="accent6"/></a:effectRef>'
        '<a:fontRef idx="minor"><a:schemeClr val="dk1"/></a:fontRef>'
        "</style>"
        "<txBody>"
        '<a:bodyPr vertOverflow="clip" rtlCol="0" anchor="ctr"/>'
        "<a:lstStyle/>"
        '<a:p><a:pPr algn="ctr"/><a:r>'
        '<a:rPr lang="pt-BR" sz="1000">'
        '<a:solidFill><a:sysClr val="windowText" lastClr="000000"/></a:solidFill>'
        '<a:latin typeface="Bahnschrift" pitchFamily="34" charset="0"/>'
        f"</a:rPr><a:t>{text}</a:t></a:r></a:p>"
        "</txBody>"
        "</sp>"
        "<clientData/>"
        "</twoCellAnchor>"
    )


def _connector_anchor_xml(
    row_index: int,
    shape_id: int,
    name: str,
    col_off: int,
    row_off_start: int,
    row_off_end: int,
    absolute_y: int,
) -> str:
    """Conector de seta reta no padrão da referência (tailEnd=arrow)."""
    height = max(row_off_end - row_off_start, 95250)
    return (
        f'<twoCellAnchor xmlns:a="{NS_DRAWING_MAIN}">'
        f"<from><col>0</col><colOff>{col_off}</colOff>"
        f"<row>{row_index}</row><rowOff>{row_off_start}</rowOff></from>"
        f"<to><col>0</col><colOff>{col_off + 4}</colOff>"
        f"<row>{row_index}</row><rowOff>{row_off_end}</rowOff></to>"
        f'<cxnSp macro="">'
        f'<nvCxnSpPr><cNvPr id="{shape_id}" name="{xml_escape(name)}"/><cNvCxnSpPr/></nvCxnSpPr>'
        f"<spPr>"
        f'<a:xfrm flipH="1"><a:off x="{col_off}" y="{absolute_y}"/>'
        f'<a:ext cx="4" cy="{height}"/></a:xfrm>'
        '<a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>'
        '<a:ln><a:solidFill><a:srgbClr val="002060"/></a:solidFill>'
        '<a:tailEnd type="arrow"/></a:ln>'
        "</spPr>"
        "<style>"
        '<a:lnRef idx="1"><a:schemeClr val="accent2"/></a:lnRef>'
        '<a:fillRef idx="0"><a:schemeClr val="accent2"/></a:fillRef>'
        '<a:effectRef idx="0"><a:schemeClr val="accent2"/></a:effectRef>'
        '<a:fontRef idx="minor"><a:schemeClr val="tx1"/></a:fontRef>'
        "</style>"
        "</cxnSp>"
        "<clientData/>"
        "</twoCellAnchor>"
    )


def _build_step_anchors(steps: list[dict], column_width: float, row_height_pt: float) -> str:
    """Monta anchors com offsets da referência MP.FIS.001."""
    # Offsets medidos no DrawingML da referência (coluna A, linhas de risco).
    ellipse = (76200, 1477016, 95250, 1118168)
    rect = (95250, 1493522, 133350, 987540)
    fragments: list[str] = []
    shape_id = 1000
    for position, step in enumerate(steps):
        row_index = int(step["row"]) - 1
        row_emu = _pt_to_emu(float(step.get("height") or row_height_pt))
        row_top_emu = int(step.get("top_emu") or 0)
        geometry = "ellipse" if step.get("kind") == "oval" else "rect"
        col_off_start, col_off_end, row_off_start, row_off_end = ellipse if geometry == "ellipse" else rect
        # Garante que a forma caiba na altura efetiva da linha.
        row_off_end = min(row_off_end, max(row_emu - 95250, row_off_start + 190500))
        shape_id += 1
        fragments.append(
            _step_anchor_xml(
                row_index=row_index,
                geometry=geometry,
                label=str(step.get("label") or ""),
                shape_id=shape_id,
                name=("Elipse" if geometry == "ellipse" else "Retângulo") + f" {position + 1}",
                col_off_start=col_off_start,
                col_off_end=col_off_end,
                row_off_start=row_off_start,
                row_off_end=row_off_end,
                absolute_y=row_top_emu + row_off_start,
            )
        )
        if position < len(steps) - 1:
            connector_top = row_off_end + 3000
            connector_bottom = min(row_emu - 95250, connector_top + 353775)
            if connector_bottom <= connector_top:
                connector_bottom = connector_top + 190500
            shape_id += 1
            col_mid = (col_off_start + col_off_end) // 2
            fragments.append(
                _connector_anchor_xml(
                    row_index=row_index,
                    shape_id=shape_id,
                    name=f"Conector de seta reta {position + 1}",
                    col_off=col_mid,
                    row_off_start=connector_top,
                    row_off_end=connector_bottom,
                    absolute_y=row_top_emu + connector_top,
                )
            )
    return "".join(fragments)


def _rewrite_xlsx(path: Path, entries: dict[str, bytes]) -> None:
    handle, temporary = tempfile.mkstemp(suffix=".xlsx", dir=str(path.parent))
    os.close(handle)
    try:
        with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, payload in entries.items():
                archive.writestr(name, payload)
        shutil.move(temporary, path)
    finally:
        if Path(temporary).exists():
            Path(temporary).unlink(missing_ok=True)


def restore_form_drawing(output_path: Path, reference: Path | None = None) -> None:
    """Restaura logo DrawingML + comentários/VML institucionais após o save do openpyxl."""
    source = reference or FORM_REFERENCE_PATH
    if source is None or not Path(source).is_file() or not output_path.is_file():
        return
    source = Path(source)

    with zipfile.ZipFile(source) as archive:
        ref_parts = {name: archive.read(name) for name in archive.namelist()}
    with zipfile.ZipFile(output_path) as archive:
        entries = {name: archive.read(name) for name in archive.namelist()}
        sheet_part = _resolve_sheet_part(archive, "FORM") or "xl/worksheets/sheet1.xml"

    for part in (
        "xl/drawings/drawing1.xml",
        "xl/drawings/_rels/drawing1.xml.rels",
        "xl/drawings/vmlDrawing1.vml",
        "xl/media/image1.png",
        "xl/comments1.xml",
    ):
        if part in ref_parts:
            entries[part] = ref_parts[part]

    for obsolete in list(entries):
        if obsolete.endswith("commentsDrawing1.vml") or obsolete.endswith("comment1.xml"):
            del entries[obsolete]

    sheet_dir = posixpath.dirname(sheet_part)
    sheet_rels_part = posixpath.join(sheet_dir, "_rels", posixpath.basename(sheet_part) + ".rels")
    rels_xml = entries.get(sheet_rels_part, b"").decode("utf-8")
    if not rels_xml:
        rels_xml = f'<Relationships xmlns="{NS_PACKAGE_REL}"></Relationships>'
    rels_root = ET.fromstring(rels_xml)

    kept: list[ET.Element] = []
    drawing_id = None
    vml_id = None
    comments_id = None
    used_ids: set[str] = set()
    for relationship in list(rels_root):
        rel_type = relationship.get("Type") or ""
        target = relationship.get("Target") or ""
        rel_id = relationship.get("Id") or ""
        if "hyperlink" in rel_type:
            continue
        if target.endswith("commentsDrawing1.vml") or target.endswith("/comment1.xml"):
            continue
        if rel_type.endswith("/drawing") or target.endswith("drawing1.xml"):
            relationship.set("Target", "../drawings/drawing1.xml")
            drawing_id = rel_id
        elif "vmlDrawing" in rel_type or target.endswith("vmlDrawing1.vml"):
            relationship.set("Target", "../drawings/vmlDrawing1.vml")
            vml_id = rel_id
        elif "comments" in rel_type or target.endswith("comments1.xml"):
            relationship.set("Target", "../comments1.xml")
            comments_id = rel_id
        else:
            # printerSettings etc.
            pass
        kept.append(relationship)
        if rel_id:
            used_ids.add(rel_id)

    def _new_rid() -> str:
        candidate = 1
        while f"rId{candidate}" in used_ids:
            candidate += 1
        value = f"rId{candidate}"
        used_ids.add(value)
        return value

    def _add_rel(rel_id: str, rel_type: str, target: str) -> None:
        node = ET.Element(f"{{{NS_PACKAGE_REL}}}Relationship")
        node.set("Id", rel_id)
        node.set("Type", rel_type)
        node.set("Target", target)
        kept.append(node)

    if not drawing_id:
        drawing_id = _new_rid()
        _add_rel(drawing_id, f"{NS_OFFICE_REL}/drawing", "../drawings/drawing1.xml")
    if "xl/drawings/vmlDrawing1.vml" in entries and not vml_id:
        vml_id = _new_rid()
        _add_rel(vml_id, f"{NS_OFFICE_REL}/vmlDrawing", "../drawings/vmlDrawing1.vml")
    if "xl/comments1.xml" in entries and not comments_id:
        comments_id = _new_rid()
        _add_rel(comments_id, f"{NS_OFFICE_REL}/comments", "../comments1.xml")

    # Deduplica por Id (evita rIds repetidos se o loop acima já tinha mantido).
    dedup: dict[str, ET.Element] = {}
    for node in kept:
        dedup[node.get("Id") or ""] = node
    kept = list(dedup.values())

    rel_parts = [
        f'<Relationship Id="{node.get("Id")}" Type="{node.get("Type")}" Target="{node.get("Target")}"/>'
        for node in kept
    ]
    entries[sheet_rels_part] = (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<Relationships xmlns="{NS_PACKAGE_REL}">'
        + "".join(rel_parts)
        + "</Relationships>"
    ).encode("utf-8")

    if sheet_part in entries:
        sheet_xml = entries[sheet_part].decode("utf-8")
        # Remover freeze sem corromper: substituir sheetViews inteiro (pane+selection).
        sheet_xml = re.sub(
            r"<sheetViews>.*?</sheetViews>",
            (
                "<sheetViews>"
                '<sheetView showGridLines="0" tabSelected="1" zoomScale="85" '
                'zoomScaleNormal="85" workbookViewId="0"/>'
                "</sheetViews>"
            ),
            sheet_xml,
            count=1,
            flags=re.DOTALL,
        )
        drawing_tag = f'<drawing xmlns:r="{NS_OFFICE_REL}" r:id="{drawing_id}"/>'
        if re.search(r"<drawing\b", sheet_xml):
            sheet_xml = re.sub(r"<drawing\b[^>]*/?>", drawing_tag, sheet_xml, count=1)
        else:
            sheet_xml = sheet_xml.replace("</worksheet>", drawing_tag + "</worksheet>")
        if vml_id:
            legacy_tag = f'<legacyDrawing xmlns:r="{NS_OFFICE_REL}" r:id="{vml_id}"/>'
            if re.search(r"<legacyDrawing\b", sheet_xml):
                sheet_xml = re.sub(r"<legacyDrawing\b[^>]*/?>", legacy_tag, sheet_xml, count=1)
            else:
                sheet_xml = sheet_xml.replace("</worksheet>", legacy_tag + "</worksheet>")
        else:
            sheet_xml = re.sub(r"<legacyDrawing\b[^>]*/?>", "", sheet_xml)
        sheet_xml = re.sub(r"<hyperlinks>.*?</hyperlinks>", "", sheet_xml, flags=re.DOTALL)
        entries[sheet_part] = sheet_xml.encode("utf-8")

    types_xml = entries["[Content_Types].xml"].decode("utf-8")
    types_xml = re.sub(
        r'<Override PartName="/xl/comments/comment1\.xml"[^>]*/?>',
        "",
        types_xml,
    )
    if 'Extension="png"' not in types_xml:
        types_xml = types_xml.replace(
            "</Types>",
            '<Default Extension="png" ContentType="image/png"/></Types>',
        )
    if 'Extension="vml"' not in types_xml:
        types_xml = types_xml.replace(
            "</Types>",
            '<Default Extension="vml" ContentType="application/vnd.openxmlformats-officedocument.vmlDrawing"/></Types>',
        )
    if 'PartName="/xl/drawings/drawing1.xml"' not in types_xml:
        types_xml = types_xml.replace(
            "</Types>",
            f'<Override PartName="/xl/drawings/drawing1.xml" ContentType="{DRAWING_CONTENT_TYPE}"/></Types>',
        )
    if "xl/comments1.xml" in entries and 'PartName="/xl/comments1.xml"' not in types_xml:
        types_xml = types_xml.replace(
            "</Types>",
            '<Override PartName="/xl/comments1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml"/></Types>',
        )
    entries["[Content_Types].xml"] = types_xml.encode("utf-8")

    wb_rels_part = "xl/_rels/workbook.xml.rels"
    if wb_rels_part in entries:
        wb_rels = entries[wb_rels_part].decode("utf-8")
        wb_rels = wb_rels.replace('Target="/xl/worksheets/', 'Target="worksheets/')
        wb_rels = wb_rels.replace('Target="/xl/', 'Target="')
        entries[wb_rels_part] = wb_rels.encode("utf-8")

    _rewrite_xlsx(output_path, entries)


def _resolve_sheet_part(archive: zipfile.ZipFile, sheet_name: str) -> str | None:
    workbook_root = ET.fromstring(archive.read("xl/workbook.xml").decode("utf-8"))
    relationship_id = None
    for sheet in workbook_root.findall(f"{{{NS_SPREADSHEET}}}sheets/{{{NS_SPREADSHEET}}}sheet"):
        if sheet.get("name") == sheet_name:
            relationship_id = sheet.get(f"{{{NS_OFFICE_REL}}}id")
            break
    if not relationship_id:
        return None
    rels_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels").decode("utf-8"))
    for relationship in rels_root.findall(f"{{{NS_PACKAGE_REL}}}Relationship"):
        if relationship.get("Id") == relationship_id:
            target = relationship.get("Target") or ""
            if target.startswith("/"):
                return target.lstrip("/")
            return posixpath.normpath(posixpath.join("xl", target))
    return None


def _next_relationship_id(rels_xml: str) -> str:
    used = {int(value) for value in re.findall(r'Id="rId(\d+)"', rels_xml)}
    candidate = 1
    while candidate in used:
        candidate += 1
    return f"rId{candidate}"


def _inject_mp_shapes(
    output_path: Path,
    sheet_name: str,
    steps: list[dict],
    column_width: float,
    row_height_pt: float,
) -> None:
    """Injeta formas vetoriais reais no pacote xlsx (openpyxl não escreve autoshapes)."""
    anchors = _build_step_anchors(steps, column_width, row_height_pt)
    if not anchors:
        return

    with zipfile.ZipFile(output_path) as archive:
        entries = {name: archive.read(name) for name in archive.namelist()}
        sheet_part = _resolve_sheet_part(archive, sheet_name)
    if not sheet_part or sheet_part not in entries:
        return

    sheet_dir = posixpath.dirname(sheet_part)
    sheet_rels_part = posixpath.join(sheet_dir, "_rels", posixpath.basename(sheet_part) + ".rels")
    drawing_part = None
    if sheet_rels_part in entries:
        rels_root = ET.fromstring(entries[sheet_rels_part].decode("utf-8"))
        for relationship in rels_root.findall(f"{{{NS_PACKAGE_REL}}}Relationship"):
            if (relationship.get("Type") or "").endswith("/drawing"):
                target = relationship.get("Target") or ""
                drawing_part = (
                    target.lstrip("/")
                    if target.startswith("/")
                    else posixpath.normpath(posixpath.join(sheet_dir, target))
                )
                break

    if drawing_part and drawing_part in entries:
        drawing_xml = entries[drawing_part].decode("utf-8")
        closing = drawing_xml.rindex("</")
        entries[drawing_part] = (drawing_xml[:closing] + anchors + drawing_xml[closing:]).encode("utf-8")
    else:
        numbers = [
            int(match.group(1))
            for name in entries
            for match in [re.fullmatch(r"xl/drawings/drawing(\d+)\.xml", name)]
            if match
        ]
        drawing_part = f"xl/drawings/drawing{max(numbers, default=0) + 1}.xml"
        entries[drawing_part] = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<wsDr xmlns="{NS_DRAWING_SHEET}">{anchors}</wsDr>'
        ).encode("utf-8")

        rels_xml = entries.get(sheet_rels_part, b"").decode("utf-8")
        if not rels_xml:
            rels_xml = f'<Relationships xmlns="{NS_PACKAGE_REL}"></Relationships>'
        relationship_id = _next_relationship_id(rels_xml)
        relationship = (
            f'<Relationship Id="{relationship_id}" '
            f'Type="{NS_OFFICE_REL}/drawing" Target="/{drawing_part}"/>'
        )
        closing = rels_xml.rindex("</Relationships>")
        entries[sheet_rels_part] = (
            rels_xml[:closing] + relationship + rels_xml[closing:]
        ).encode("utf-8")

        sheet_xml = entries[sheet_part].decode("utf-8")
        if "<drawing " not in sheet_xml:
            closing = sheet_xml.rindex("</worksheet>")
            drawing_tag = f'<drawing xmlns:r="{NS_OFFICE_REL}" r:id="{relationship_id}"/>'
            entries[sheet_part] = (
                sheet_xml[:closing] + drawing_tag + sheet_xml[closing:]
            ).encode("utf-8")

        content_types = entries["[Content_Types].xml"].decode("utf-8")
        if f'PartName="/{drawing_part}"' not in content_types:
            override = f'<Override PartName="/{drawing_part}" ContentType="{DRAWING_CONTENT_TYPE}"/>'
            closing = content_types.rindex("</Types>")
            entries["[Content_Types].xml"] = (
                content_types[:closing] + override + content_types[closing:]
            ).encode("utf-8")

    handle, temporary = tempfile.mkstemp(suffix=".xlsx", dir=str(output_path.parent))
    os.close(handle)
    try:
        with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as archive:
            for name, payload in entries.items():
                archive.writestr(name, payload)
        shutil.move(temporary, output_path)
    finally:
        if Path(temporary).exists():
            Path(temporary).unlink(missing_ok=True)


def _fill_sipoc_slots(ws, slots: tuple[str, ...], values: list) -> None:
    for index, address in enumerate(slots):
        ws[address] = values[index] if index < len(values) else ""


def _unmerge_if_present(ws, cell_range: str) -> None:
    if cell_range in {str(item) for item in ws.merged_cells.ranges}:
        ws.unmerge_cells(cell_range)


def _package_document_lines(content: dict) -> list[str]:
    """Linhas FORM/IN/PR do pacote para a BARREIRA no padrão da referência."""
    doc = content.get("documento") or {}
    saida = content.get("saida") or {}
    lines: list[str] = []

    def add_line(code_key: str, file_key: str, fallback_prefix: str) -> None:
        code = str(doc.get(code_key) or "").strip()
        filename = str(saida.get(file_key) or "").strip()
        title = ""
        if filename:
            stem = Path(filename).stem
            # "IN.XXX.XXX - Titulo" → usa o nome do arquivo sem extensão.
            title = stem
        if code and title and not title.upper().startswith(code.upper()):
            lines.append(f"{code} - {title}")
        elif title:
            lines.append(title)
        elif code:
            lines.append(code)
        elif filename:
            lines.append(filename)

    add_line("codigo_form", "arquivo_form", "FORM")
    add_line("codigo_it", "arquivo_it", "IN")
    add_line("codigo_pop", "arquivo_pop", "PR")
    return lines


def _compose_barrier(risk: dict, content: dict) -> str:
    """Compat: documentos do pacote; barreira de risco só se não houver FORM/IN/PR."""
    extras = _package_document_lines(content)
    if extras:
        return "\n\n".join(extras)
    base = str(risk.get("barreira") or "").strip()
    return base.rstrip(".") if base else ""


def _compose_shared_barrier(risks: list[dict], content: dict) -> str:
    """BARREIRA mesclada: só FORM + IN + PR do pacote (padrão MP.FIS.001)."""
    del risks  # blocos B01/B02 ficam no FORM; não entram na coluna E.
    return "\n\n".join(_package_document_lines(content))


def _consolidate_result_indicators(risks: list[dict]) -> str:
    """Consolida resultado_indicador em um único texto para a coluna RESULTADO mesclada."""
    parts: list[str] = []
    seen: set[str] = set()
    for risk in risks:
        value = str(risk.get("resultado_indicador") or "").strip()
        if not value:
            continue
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        parts.append(value)
    return "\n\n".join(parts)


def _center_wrap() -> Alignment:
    return Alignment(horizontal="center", vertical="center", wrap_text=True)


MP_DEPARTMENT_LIST = (
    "01 - Atendimento",
    "02 - Departamento Pessoal",
    "03 - Fiscal",
    "04 - Contábil",
    "05 - Paralegal",
    "06 - Financeiro",
    "07 - Comercial",
    "08 - Tecnologia da Informação",
    "09 - Processos e Qualidade",
    "10 - Sucesso do Cliente",
    "11 - Recursos Humanos",
    "12 - Marketing",
    "13 - Auditoria",
)


def _ensure_plan1_classification_list(wb) -> None:
    """Garante TOLERÁVEL / RAZOÁVEL (ALARP) / INACEITÁVEL em Plan1!C1:C3."""
    if "Plan1" not in wb.sheetnames:
        plan1 = wb.create_sheet("Plan1")
    else:
        plan1 = wb["Plan1"]
    expected = ["TOLERÁVEL", "RAZOÁVEL (ALARP)", "INACEITÁVEL"]
    for index, value in enumerate(expected, start=1):
        if not plan1.cell(row=index, column=3).value:
            plan1.cell(row=index, column=3).value = value


def _ensure_plan1_department_list(wb) -> None:
    """Garante departamentos numerados em Plan1!D1:D13."""
    if "Plan1" not in wb.sheetnames:
        plan1 = wb.create_sheet("Plan1")
    else:
        plan1 = wb["Plan1"]
    for index, value in enumerate(MP_DEPARTMENT_LIST, start=1):
        plan1.cell(row=index, column=4).value = value


def build_mp(content: dict, output_path: Path) -> None:
    """Preenche o MP-template.xlsx (estrutura integral da referência MP.FIS.001)."""
    from openpyxl.comments import Comment
    from openpyxl.worksheet.datavalidation import DataValidation

    if not MP_TEMPLATE_PATH.is_file():
        raise SystemExit(
            f"Template MP não encontrado: {MP_TEMPLATE_PATH}. "
            "Execute scripts/sanitize_mp_template.py."
        )

    doc = content["documento"]
    mp = content.get("mp") or {}
    chain = mp.get("cadeia") or {}
    risks = mp.get("riscos") or []
    if not risks:
        raise SystemExit("O conteudo do MP deve conter ao menos um item em mp.riscos[].")
    if len(risks) > (MP_LAST_RISK_SLOT - MP_FIRST_RISK_ROW + 1):
        raise SystemExit(
            f"O MP aceita no máximo {MP_LAST_RISK_SLOT - MP_FIRST_RISK_ROW + 1} riscos "
            f"no template institucional; recebidos {len(risks)}."
        )

    wb = load_workbook(MP_TEMPLATE_PATH)
    ws = wb["MP"] if "MP" in wb.sheetnames else wb.worksheets[0]
    ws.title = "MP"
    ws.sheet_view.showGridLines = False
    ws.sheet_view.zoomScale = 85
    ws.freeze_panes = "A7"

    # Corrige typo da legenda de gravidade herdado da referência.
    ws["E70"] = "MUITO GRAVE"

    # --- Metadados (somente valores; estilos vêm do template) ---
    ws["J1"] = doc.get("codigo_mp", "MP.XXX.XXX")
    ws["J2"] = doc.get("emissao", "")
    ws["J3"] = doc.get("versao", "00")
    ws["J4"] = doc.get("revisao", "")
    ws["C3"] = doc.get("setor", "A definir")
    ws["E3"] = doc.get("titulo", "")
    # INÍCIO: fórmula institucional ou emissão confirmada.
    emissao = doc.get("emissao")
    ws["B5"] = emissao if emissao not in (None, "") else "=TODAY()"
    ws["D5"] = doc.get("objetivo", "")
    resultado = doc.get("resultado_esperado") or ""
    ws["A6"] = f"Resultado Esperado do Processo: {resultado}"
    # Mantém a linha de resultado ocultável como na referência.
    if ws.row_dimensions[6].hidden is None:
        ws.row_dimensions[6].hidden = True

    # --- SIPOC nos slots fixos do template ---
    _fill_sipoc_slots(ws, MP_SIPOC_SUPPLIER_SLOTS, list(chain.get("fornecedores") or []))
    _fill_sipoc_slots(ws, MP_SIPOC_INPUT_SLOTS, list(chain.get("entradas") or []))
    _fill_sipoc_slots(ws, MP_SIPOC_CLIENT_SLOTS, list(chain.get("clientes") or []))
    _fill_sipoc_slots(ws, MP_SIPOC_OUTPUT_SLOTS, list(chain.get("saidas") or []))

    # --- Riscos nos slots 40–65 ---
    # Remove merges de processo da referência para remontar conforme N riscos.
    for merged in ("E40:E43", "J40:J65", "A42:A43", "I42:I43"):
        _unmerge_if_present(ws, merged)

    first_risk_row = MP_FIRST_RISK_ROW
    last_risk_row = first_risk_row + len(risks) - 1
    step_shapes: list[dict] = []
    risk_count = len(risks)
    shared_barrier = _compose_shared_barrier(risks, content)
    shared_result = _consolidate_result_indicators(risks)
    wrap = _center_wrap()

    # Coluna auxiliar oculta para o texto do risco (validador estrutural).
    ws.column_dimensions["L"].width = 24.29
    ws.column_dimensions["L"].hidden = True

    for offset, risk in enumerate(risks):
        row = first_risk_row + offset
        p_val, g_val = _default_pg(risk)
        score = p_val * g_val
        classification = _classify_score(score)
        risk_text = str(risk.get("risco") or "PENDENTE DE VALIDAÇÃO")
        stage = str(risk.get("etapa") or "PENDENTE DE VALIDAÇÃO")
        kind = "oval" if offset == 0 or offset == risk_count - 1 else "rect"

        ws.row_dimensions[row].hidden = False
        ws.row_dimensions[row].height = MAP_ROW_HEIGHT

        # ETAPAS vazia: o rótulo vive na forma vetorial.
        ws.cell(row=row, column=1).value = None
        cell_b = ws.cell(row=row, column=2, value=risk.get("quem_faz") or "")
        cell_b.alignment = wrap
        cell_c = ws.cell(row=row, column=3, value=risk.get("como_faz") or "")
        cell_c.alignment = wrap
        cell_d = ws.cell(row=row, column=4, value=classification)
        cell_d.comment = Comment(risk_text, "MP")
        cell_d.alignment = wrap
        # BARREIRA/RESULTADO: gravados uma vez só após o loop (bloco mesclado).
        if offset == 0:
            cell_e = ws.cell(row=row, column=5, value=shared_barrier)
            cell_e.font = Font(name="Bahnschrift", size=12, color="000000", underline=None)
            cell_e.alignment = wrap
            cell_j = ws.cell(row=row, column=10, value=shared_result)
            cell_j.alignment = wrap
            cell_j.font = Font(name="Bahnschrift", size=12)
        ws.cell(row=row, column=6).value = p_val
        ws.cell(row=row, column=7).value = g_val
        # Remove preenchimento bege residual; as cores vêm da formatação condicional.
        ws.cell(row=row, column=6).fill = PatternFill()
        ws.cell(row=row, column=7).fill = PatternFill()
        ws.cell(row=row, column=6).alignment = wrap
        ws.cell(row=row, column=7).alignment = wrap
        ws.cell(row=row, column=8).value = f"=F{row}*G{row}"
        ws.cell(row=row, column=8).alignment = wrap
        cell_i = ws.cell(row=row, column=9, value=risk.get("mitigacao") or "")
        cell_i.alignment = wrap
        cell_i.font = Font(name="Bahnschrift", size=12)
        ws.cell(row=row, column=12).value = risk_text

        step_shapes.append(
            {
                "row": row,
                "kind": kind,
                "label": stage,
                "height": MAP_ROW_HEIGHT,
            }
        )

    # Limpa células cobertas antes de mesclar (só o topo mantém valor).
    for row in range(first_risk_row + 1, last_risk_row + 1):
        ws.cell(row=row, column=5).value = None
        ws.cell(row=row, column=10).value = None
    for row in range(last_risk_row + 1, MP_LAST_RISK_SLOT + 1):
        ws.cell(row=row, column=10).value = None

    # BARREIRA e RESULTADO no padrão da referência: um bloco mesclado.
    if first_risk_row != last_risk_row:
        ws.merge_cells(f"E{first_risk_row}:E{last_risk_row}")
    ws.merge_cells(f"J{first_risk_row}:J{MP_LAST_RISK_SLOT}")
    ws.cell(row=first_risk_row, column=5).alignment = wrap
    ws.cell(row=first_risk_row, column=10).alignment = wrap

    # Oculta slots não usados e limpa resíduos (J permanece no merge até o slot 65).
    for row in range(last_risk_row + 1, MP_LAST_RISK_SLOT + 1):
        ws.row_dimensions[row].hidden = True
        for col in (1, 2, 3, 4, 5, 6, 7, 9, 12):
            cell = ws.cell(row=row, column=col)
            cell.value = None
            if cell.comment is not None:
                cell.comment = None
        ws.cell(row=row, column=8).value = f"=F{row}*G{row}"

    # Dropdowns no padrão da referência (listas em Plan1).
    _ensure_plan1_classification_list(wb)
    _ensure_plan1_department_list(wb)
    dv_class = DataValidation(
        type="list",
        formula1="Plan1!$C$1:$C$3",
        allow_blank=True,
        showDropDown=False,
        showErrorMessage=True,
        showInputMessage=True,
    )
    ws.add_data_validation(dv_class)
    dv_class.add(f"D{MP_FIRST_RISK_ROW}:D{MP_LAST_RISK_SLOT}")

    dv_dept = DataValidation(
        type="list",
        formula1="Plan1!$D$1:$D$13",
        allow_blank=True,
        showDropDown=False,
        showErrorMessage=True,
        showInputMessage=True,
        promptTitle="Departamento",
        prompt="Inserir Nome do Departamento, Através de Cadastro em Lista Suspensa",
    )
    ws.add_data_validation(dv_dept)
    dv_dept.add("C3")
    # SIPOC: setores fornecedor/cliente (mesma lista de departamentos).
    dv_dept.add("A10:A14")
    dv_dept.add("E10:E14")

    dv_who = DataValidation(
        type="list",
        formula1="Plan1!$B$1:$B$18",
        allow_blank=True,
        showDropDown=False,
        showErrorMessage=True,
        showInputMessage=True,
    )
    ws.add_data_validation(dv_who)
    dv_who.add(f"B{MP_FIRST_RISK_ROW}:B{MP_LAST_RISK_SLOT}")

    dv = DataValidation(type="whole", operator="between", formula1="1", formula2="5", allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"F{first_risk_row}:G{last_risk_row}")

    # Assinaturas
    ws[f"A{MP_SIGNATURE_ROW}"] = doc.get("elaborador", "")
    ws[f"D{MP_SIGNATURE_ROW}"] = doc.get("verificador", "")
    ws[f"G{MP_SIGNATURE_ROW}"] = doc.get("aprovador", "")

    # Abas auxiliares (já existem no template; garante presença).
    if "Plan1" not in wb.sheetnames:
        wb.create_sheet("Plan1")
        _ensure_plan1_classification_list(wb)
        _ensure_plan1_department_list(wb)
    if "EXEMPLO" not in wb.sheetnames:
        exemplo = wb.create_sheet("EXEMPLO")
        exemplo["A1"] = "Folha de exemplo institucional (referência de formatação)."
        exemplo["A2"] = "Use a aba principal do processo para o mapeamento operacional."

    ws.print_area = "A1:J86"
    ws.page_setup.orientation = "landscape"
    ws.page_setup.paperSize = 9
    ws.page_margins.left = 0.3937007874015748
    ws.page_margins.right = 0.3937007874015748
    ws.page_margins.top = 0.5905511811023623
    ws.page_margins.bottom = 0.5905511811023623

    # Nomes definidos operacionais.
    for obsolete in ("MP_PROBABILIDADE", "MP_GRAVIDADE", "MP_SCORE"):
        if obsolete in wb.defined_names:
            del wb.defined_names[obsolete]
    wb.defined_names.add(
        DefinedName(
            name="MP_PROBABILIDADE",
            attr_text=f"'{ws.title}'!$F${first_risk_row}:$F${last_risk_row}",
        )
    )
    wb.defined_names.add(
        DefinedName(
            name="MP_GRAVIDADE",
            attr_text=f"'{ws.title}'!$G${first_risk_row}:$G${last_risk_row}",
        )
    )
    wb.defined_names.add(
        DefinedName(
            name="MP_SCORE",
            attr_text=f"'{ws.title}'!$H${first_risk_row}:$H${last_risk_row}",
        )
    )

    for step in step_shapes:
        step["top_emu"] = _row_top_emu(ws, int(step["row"]))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)
    column_a_width = float(ws.column_dimensions["A"].width or 23.43)
    _inject_mp_shapes(output_path, ws.title, step_shapes, column_a_width, MAP_ROW_HEIGHT)



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
