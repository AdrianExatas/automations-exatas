"""
Parsers HTML para o portal SEFAZ via HTTP.
"""
from __future__ import annotations

import html
import re
from dataclasses import dataclass, field
from typing import Any
from urllib.parse import parse_qs, urljoin, urlparse

from bs4 import BeautifulSoup
from bs4.element import Tag


@dataclass(slots=True)
class HtmlForm:
    """Representa um formulario HTML do portal."""

    url: str
    action_url: str
    method: str
    fields: dict[str, list[str]] = field(default_factory=dict)
    select_options: dict[str, dict[str, str]] = field(default_factory=dict)
    submit_buttons: dict[str, str] = field(default_factory=dict)
    title: str | None = None
    raw_html: str = ""

    def first_value(self, name: str, default: str = "") -> str:
        values = self.fields.get(name)
        if not values:
            return default
        return values[0]

    def as_payload(self) -> list[tuple[str, str]]:
        payload: list[tuple[str, str]] = []
        for name, values in self.fields.items():
            for value in values:
                payload.append((name, value))
        return payload


@dataclass(slots=True)
class DownloadInfo:
    """Metadados de um arquivo disponivel para download."""

    url: str
    nm_arquivo: str
    situacao: str
    tipo_download: str
    dt_solicitacao: str | None = None
    file_path: str | None = None
    row_text: str = ""


@dataclass(slots=True)
class DownloadListingPage:
    """Pagina de listagem de downloads."""

    url: str
    current_page: int | None
    downloads: list[DownloadInfo]
    page_links: dict[int, str] = field(default_factory=dict)
    next_page_url: str | None = None
    new_request_url: str | None = None


_REDIRECT_PATTERNS = (
    re.compile(r"location\.href\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE),
    re.compile(r"window\.location(?:\.href)?\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE),
    re.compile(r"document\.location(?:\.href)?\s*=\s*['\"]([^'\"]+)['\"]", re.IGNORECASE),
)


def parse_js_redirect(base_url: str, html_text: str) -> str | None:
    """Extrai um redirecionamento JavaScript simples da resposta."""
    for pattern in _REDIRECT_PATTERNS:
        match = pattern.search(html_text)
        if match:
            return urljoin(base_url, html.unescape(match.group(1)))
    return None


def parse_portal_menu_link(base_url: str, html_text: str, link_text: str) -> str | None:
    """Encontra um link pelo texto exibido no portal."""
    soup = BeautifulSoup(html_text, "html.parser")
    link = soup.find("a", string=lambda text: text and link_text.lower() in text.lower())
    if not link or not link.get("href"):
        return None
    return urljoin(base_url, link["href"])


def parse_link_by_predicate(base_url: str, html_text: str, predicate) -> str | None:
    """Encontra um link pelo predicado informado."""
    soup = BeautifulSoup(html_text, "html.parser")
    for link in soup.find_all("a", href=True):
        if predicate(link):
            return urljoin(base_url, link["href"])
    return None


def parse_form(base_url: str, page_url: str, html_text: str, form_name: str | None = None) -> HtmlForm:
    """Extrai o primeiro formulario util da pagina."""
    soup = BeautifulSoup(html_text, "html.parser")
    forms = soup.find_all("form")
    target_form: Tag | None = None

    if form_name:
        target_form = soup.find("form", attrs={"name": form_name})

    if target_form is None:
        for form in forms:
            if form.find(["input", "select", "textarea"]):
                target_form = form
                break

    if target_form is None:
        raise ValueError("Nenhum formulario encontrado na pagina")

    fields: dict[str, list[str]] = {}
    select_options: dict[str, dict[str, str]] = {}
    submit_buttons: dict[str, str] = {}

    for control in target_form.find_all(["input", "select", "textarea"]):
        if not isinstance(control, Tag):
            continue

        name = control.get("name") or control.get("id")
        if not name:
            continue

        tag_name = control.name.lower()
        input_type = (control.get("type") or "").lower()

        if tag_name == "select":
            options: dict[str, str] = {}
            selected_values: list[str] = []
            for option in control.find_all("option"):
                value = option.get("value", "")
                text = option.get_text(" ", strip=True)
                options[text] = value
                if option.has_attr("selected"):
                    selected_values.append(value)
            fields[name] = selected_values or [""]
            select_options[name] = options
            continue

        if tag_name == "textarea":
            fields[name] = [control.get_text()]
            continue

        if input_type in {"radio", "checkbox"}:
            if control.has_attr("checked"):
                fields.setdefault(name, []).append(control.get("value", "on"))
            continue

        value = control.get("value", "")
        if input_type == "submit":
            submit_buttons[name] = value
            continue

        fields.setdefault(name, []).append(value)

    title = None
    title_node = soup.find("p")
    if title_node:
        title = title_node.get_text(" ", strip=True) or None

    action = target_form.get("action") or page_url
    method = (target_form.get("method") or "GET").upper()

    return HtmlForm(
        url=page_url,
        action_url=urljoin(base_url, action),
        method=method,
        fields=fields,
        select_options=select_options,
        submit_buttons=submit_buttons,
        title=title,
        raw_html=html_text,
    )


def parse_error_message(html_text: str) -> str | None:
    """Extrai mensagens de erro/aviso exibidas pelo portal."""
    soup = BeautifulSoup(html_text, "html.parser")
    node = soup.select_one(".fontMessageError")
    if node:
        text = node.get_text(" ", strip=True)
        if text:
            return text

    text = soup.get_text(" ", strip=True)
    lowered = text.lower()
    markers = (
        "arquivo não foi localizado",
        "o arquivo não foi localizado",
        "nao foi localizado",
        "usuário ou senha inválidos",
        "usuario ou senha invalido",
    )
    for marker in markers:
        if marker in lowered:
            return text
    return None


def is_session_expired(html_text: str) -> bool:
    """Detecta respostas que voltaram para login/sessao expirada."""
    soup = BeautifulSoup(html_text, "html.parser")
    if soup.find("input", attrs={"name": "UserName"}) and soup.find("input", attrs={"name": "Password"}):
        return True
    text = soup.get_text(" ", strip=True).lower()
    return "atoacessocontabilista" in html_text.lower() or "acesso rápido" in text or "acesso rapido" in text


def parse_download_listing(base_url: str, page_url: str, html_text: str, ready_only: bool = False) -> DownloadListingPage:
    """Parseia a listagem de downloads da transacao T10461."""
    soup = BeautifulSoup(html_text, "html.parser")
    downloads: list[DownloadInfo] = []

    for link in soup.find_all("a", href=True):
        href = link.get("href", "")
        if "process.jsp" not in href or "nmArquivo=" not in href:
            continue

        absolute_url = urljoin(base_url, href)
        query = parse_qs(urlparse(absolute_url).query)
        nm_arquivo = _first_qs_value(query, "nmArquivo")
        tipo_download = _first_qs_value(query, "tdb_dsTipoDownload", "DESCONHECIDO")
        dt_solicitacao = _first_qs_value(query, "dtSolicitacao") or None
        file_path = _first_qs_value(query, "FilePath") or None
        situacao = _first_qs_value(query, "dsSituacao")

        row = link.find_parent("tr")
        row_text = row.get_text(" ", strip=True) if row else link.get_text(" ", strip=True)

        if not situacao and row:
            cells = [cell.get_text(" ", strip=True) for cell in row.find_all("td")]
            situacao = next(
                (cell for cell in cells if "PRONTO" in cell.upper() or "PROCESSANDO" in cell.upper() or "NENHUM" in cell.upper()),
                "",
            )

        if ready_only and "PRONTO" not in html.unescape(situacao or "").upper():
            continue

        downloads.append(
            DownloadInfo(
                url=absolute_url,
                nm_arquivo=html.unescape(nm_arquivo),
                situacao=html.unescape(situacao),
                tipo_download=html.unescape(tipo_download or "DESCONHECIDO"),
                dt_solicitacao=dt_solicitacao,
                file_path=file_path,
                row_text=row_text,
            )
        )

    page_links: dict[int, str] = {}
    current_page = None
    next_page_url = None
    new_request_url = None

    current_node = soup.select_one("td.pgAtualNav b, font.fontPgAtualNav b")
    if current_node:
        current_text = current_node.get_text(strip=True)
        if current_text.isdigit():
            current_page = int(current_text)

    for link in soup.find_all("a", href=True):
        text = link.get_text(" ", strip=True)
        absolute_url = urljoin(base_url, link["href"])
        if text.isdigit():
            page_links[int(text)] = absolute_url
        elif "Próximo" in text or "Prximo" in text or "Próximo" in absolute_url:
            next_page_url = absolute_url

        href = link.get("href", "")
        if "TransId=T10464" in href:
            new_request_url = absolute_url

    if new_request_url is None:
        new_request_url = parse_link_by_predicate(
            base_url,
            html_text,
            lambda link: "TransId=T10464" in (link.get("href") or "") or "novo" in link.get_text(" ", strip=True).lower(),
        )

    return DownloadListingPage(
        url=page_url,
        current_page=current_page,
        downloads=downloads,
        page_links=page_links,
        next_page_url=next_page_url,
        new_request_url=new_request_url,
    )


def _first_qs_value(query: dict[str, list[str]], key: str, default: str = "") -> str:
    values = query.get(key) or []
    if not values:
        return default
    return values[0]


def simplify_form_payload(form: HtmlForm, overrides: dict[str, Any], submit_name: str = "okButton") -> list[tuple[str, str]]:
    """Monta payload preservando a ordem e duplicidades do formulario original."""
    payload = form.as_payload()
    consumed_singletons: set[str] = set()
    result: list[tuple[str, str]] = []

    def next_override_value(name: str, original: str) -> str:
        value = overrides.get(name)
        if value is None:
            return original
        if isinstance(value, list):
            current = value.pop(0) if value else original
            return str(current)
        if name in consumed_singletons:
            return original
        consumed_singletons.add(name)
        return str(value)

    for name, value in payload:
        if name in form.submit_buttons:
            continue
        result.append((name, next_override_value(name, value)))

    submit_value = form.submit_buttons.get(submit_name)
    if submit_value is not None:
        result.append((submit_name, submit_value))
    elif submit_name in overrides:
        result.append((submit_name, str(overrides[submit_name])))

    for name, value in overrides.items():
        if name in form.fields or name in form.submit_buttons:
            continue
        if isinstance(value, list):
            for item in value:
                result.append((name, str(item)))
        else:
            result.append((name, str(value)))

    return result
