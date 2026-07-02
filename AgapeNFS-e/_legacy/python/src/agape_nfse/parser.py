from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass
from html import unescape

from bs4 import BeautifulSoup, Tag

from .payloads import FilterFields


@dataclass(frozen=True)
class NotaFiscal:
    codigo: str
    numero: str
    exercicio: str
    contribuinte: str
    destinatario: str
    emissao: str
    total: str
    xml_action_name: str

    @property
    def key(self) -> str:
        return f"{self.exercicio}-{self.numero}-{self.codigo}"


@dataclass(frozen=True)
class NotaPage:
    table_id: str
    current_page: int
    page_links: set[int]
    has_next: bool
    notas: list[NotaFiscal]
    view_state: str


def soup_from_html(html: str | bytes) -> BeautifulSoup:
    return BeautifulSoup(html, "html.parser")


def parse_view_state(html: str | bytes) -> str:
    soup = soup_from_html(html)
    field = soup.find("input", attrs={"name": "javax.faces.ViewState"})
    if not field:
        raise ValueError("Nao foi possivel localizar javax.faces.ViewState.")
    value = str(field.get("value") or "").strip()
    if not value:
        raise ValueError("javax.faces.ViewState encontrado sem valor.")
    return value


def parse_filter_fields(html: str | bytes, view_state: str | None = None) -> FilterFields:
    soup = soup_from_html(html)
    form = soup.find("form", id="form_conteudo") or soup.find("form", attrs={"name": "form_conteudo"})
    if not isinstance(form, Tag):
        raise ValueError("Formulario form_conteudo nao encontrado.")

    date_inputs = [
        inp
        for inp in form.find_all("input")
        if _attr(inp, "type") == "text" and "rich-calendar-input" in " ".join(inp.get("class", []))
    ]
    if len(date_inputs) < 2:
        raise ValueError("Campos de data do filtro nao encontrados.")

    pesquisa = _name_or_fail(form.find("input", attrs={"name": re.compile(r":pesquisa$")}), "campo pesquisa")
    start_date = _name_or_fail(date_inputs[0], "data inicial")
    end_date = _name_or_fail(date_inputs[1], "data final")
    start_current = _name_or_fail(form.find("input", attrs={"name": f"{start_date.replace('InputDate', 'InputCurrentDate')}"}), "mes atual inicial")
    end_current = _name_or_fail(form.find("input", attrs={"name": f"{end_date.replace('InputDate', 'InputCurrentDate')}"}), "mes atual final")

    text_inputs = [
        inp
        for inp in form.find_all("input")
        if _attr(inp, "type") == "text"
        and _name(inp) not in {pesquisa, start_date, end_date}
        and "rich-calendar-input" not in " ".join(inp.get("class", []))
    ]
    if not text_inputs:
        raise ValueError("Campo de exercicio nao encontrado.")
    exercise = _name_or_fail(text_inputs[0], "exercicio")

    status = _name_or_fail(form.find("input", attrs={"type": "radio", "value": "F"}), "status finalizada")
    form_marker = _name_or_fail(form.find("input", attrs={"name": "form_conteudo"}), "marcador do formulario")
    auto_scroll = _name_or_fail(form.find("input", attrs={"name": "autoScroll"}), "autoScroll")
    submit = form.find("a", id=re.compile(r":lupa$")) or form.find("a", attrs={"name": re.compile(r":lupa$")})
    submit_name = _name_or_fail(submit, "botao de pesquisa")

    return FilterFields(
        pesquisa=pesquisa,
        start_date=start_date,
        start_current_month=start_current,
        end_date=end_date,
        end_current_month=end_current,
        exercise=exercise,
        status=status,
        form_marker=form_marker,
        auto_scroll=auto_scroll,
        view_state=view_state or parse_view_state(html),
        submit_name=submit_name,
    )


def parse_nota_page(html: str | bytes, fallback_view_state: str = "") -> NotaPage:
    soup = soup_from_html(html)
    try:
        table = _find_notes_table(soup)
    except ValueError:
        view_state = fallback_view_state
        try:
            view_state = parse_view_state(html)
        except ValueError:
            pass
        return NotaPage(table_id="", current_page=1, page_links={1}, has_next=False, notas=[], view_state=view_state)
    table_id = str(table.get("id") or "")
    columns = _header_columns(table)

    required = {
        "codigo": _find_header(columns, "codigo"),
        "numero": _find_header(columns, "numero"),
        "exercicio": _find_header(columns, "exercicio"),
        "contribuinte": _find_header(columns, "contribuinte"),
        "destinatario": _find_header(columns, "destinatario"),
        "emissao": _find_header(columns, "data de emissao"),
        "total": _find_header(columns, "total"),
        "xml": _find_header(columns, "xml"),
    }

    tbody = table.find("tbody", id=re.compile(r":tb$")) or table.find("tbody")
    rows = tbody.find_all("tr", recursive=False) if isinstance(tbody, Tag) else []
    notas: list[NotaFiscal] = []
    for row in rows:
        xml_cell = _cell_by_suffix(row, required["xml"])
        action_name = _extract_xml_action_name(xml_cell)
        if not action_name:
            continue
        notas.append(
            NotaFiscal(
                codigo=_cell_text(row, required["codigo"]),
                numero=_cell_text(row, required["numero"]),
                exercicio=_cell_text(row, required["exercicio"]),
                contribuinte=_cell_text(row, required["contribuinte"]),
                destinatario=_cell_text(row, required["destinatario"]),
                emissao=_cell_text(row, required["emissao"]),
                total=_cell_text(row, required["total"]),
                xml_action_name=action_name,
            )
        )

    view_state = fallback_view_state
    try:
        view_state = parse_view_state(html)
    except ValueError:
        pass

    return NotaPage(
        table_id=table_id,
        current_page=_parse_current_page(table),
        page_links=_parse_page_links(table),
        has_next=_parse_has_next(table),
        notas=notas,
        view_state=view_state,
    )


def _find_notes_table(soup: BeautifulSoup) -> Tag:
    for table in soup.find_all("table"):
        headers = [_normalize_text(th.get_text(" ", strip=True)) for th in table.find_all("th")]
        if "numero" in headers and "xml" in headers and "data de emissao" in headers:
            return table
    raise ValueError("Tabela de notas nao encontrada.")


def _header_columns(table: Tag) -> dict[str, str]:
    columns: dict[str, str] = {}
    for th in table.find_all("th"):
        text = _normalize_text(th.get_text(" ", strip=True))
        th_id = str(th.get("id") or "")
        match = re.search(r":(j_id\d+)header$", th_id)
        if text and match:
            columns[text] = match.group(1)
    return columns


def _find_header(columns: dict[str, str], header: str) -> str:
    normalized = _normalize_text(header)
    if normalized in columns:
        return columns[normalized]
    raise ValueError(f"Coluna obrigatoria nao encontrada: {header}.")


def _cell_by_suffix(row: Tag, suffix: str) -> Tag | None:
    for cell in row.find_all("td", recursive=False):
        if str(cell.get("id") or "").endswith(f":{suffix}"):
            return cell
    return None


def _cell_text(row: Tag, suffix: str) -> str:
    cell = _cell_by_suffix(row, suffix)
    return cell.get_text(" ", strip=True) if isinstance(cell, Tag) else ""


def _extract_xml_action_name(cell: Tag | None) -> str:
    if not isinstance(cell, Tag):
        return ""
    link = cell.find("a", onclick=True)
    if not isinstance(link, Tag):
        return ""
    onclick = unescape(str(link.get("onclick") or ""))
    match = re.search(r"jsfcljs\(document\.forms\['form_conteudo'\],'([^,']+),\1'", onclick)
    return match.group(1) if match else ""


def _parse_current_page(table: Tag) -> int:
    active = table.find(class_=lambda value: value and "rich-datascr-act" in str(value))
    if not isinstance(active, Tag):
        return 1
    text = active.get_text(strip=True)
    return int(text) if text.isdigit() else 1


def _parse_page_links(table: Tag) -> set[int]:
    pages: set[int] = set()
    for cell in table.find_all(class_=lambda value: value and "rich-datascr" in str(value)):
        text = cell.get_text(strip=True)
        if text.isdigit():
            pages.add(int(text))
    active = _parse_current_page(table)
    pages.add(active)
    return pages


def _parse_has_next(table: Tag) -> bool:
    for cell in table.find_all(onclick=True):
        onclick = str(cell.get("onclick") or "")
        classes = " ".join(cell.get("class", []))
        if "'page': 'next'" in onclick and "rich-datascr-button-dsbld" not in classes:
            return True
    return False


def _normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", ascii_text).strip().lower()


def _name(tag: Tag | None) -> str:
    if not isinstance(tag, Tag):
        return ""
    return str(tag.get("name") or tag.get("id") or "")


def _name_or_fail(tag: Tag | None, label: str) -> str:
    name = _name(tag)
    if not name:
        raise ValueError(f"Nao foi possivel localizar {label}.")
    return name


def _attr(tag: Tag, name: str) -> str:
    return str(tag.get(name) or "").lower()
