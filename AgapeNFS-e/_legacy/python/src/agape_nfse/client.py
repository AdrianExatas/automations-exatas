from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Callable
from urllib.parse import urljoin

import requests

from .dates import parse_br_date
from .parser import NotaFiscal, parse_filter_fields, parse_nota_page, parse_view_state
from .payloads import (
    FilterFields,
    build_download_payload,
    build_list_payload,
    build_login_payload,
    build_login_poll_payload,
    build_page_payload,
)


LogCallback = Callable[[str], None]


@dataclass(frozen=True)
class DownloadResult:
    total_notas: int
    baixados: int
    pulados: int
    erros: int
    destino: Path


class AgapeNfseError(RuntimeError):
    pass


class AgapeNfseClient:
    def __init__(
        self,
        login: str,
        password: str,
        alias: str = "pmboquim",
        base_url: str = "https://agnfseprd.agapesistemas.com.br",
        timeout: int = 60,
        max_workers: int = 4,
    ) -> None:
        self.login = login.strip()
        self.password = password
        self.alias = alias.strip() or "pmboquim"
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.max_workers = max(1, min(int(max_workers), 8))
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/148.0 Safari/537.36",
                "Accept-Language": "pt-BR,pt;q=0.9",
            }
        )
        self.consult_url = urljoin(self.base_url, "/Admin/NotaFiscalAvulsaConsult.xhtml")
        self._filter_fields: FilterFields | None = None

    def close(self) -> None:
        self.session.close()

    def __enter__(self) -> "AgapeNfseClient":
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def login_site(self) -> None:
        if not self.login or not self.password:
            raise AgapeNfseError("Login e senha sao obrigatorios.")

        login_url = f"{self.base_url}/?alias={self.alias}"
        response = self.session.get(login_url, timeout=self.timeout)
        response.raise_for_status()
        view_state = parse_view_state(response.text)

        view_state = self._refresh_login_view_state(view_state, login_url)
        payload = build_login_payload(self.login, self.password, view_state)
        headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": self.base_url,
            "Referer": login_url,
            "Accept": "*/*",
        }
        response = self.session.post(
            urljoin(self.base_url, "/Principal.xhtml"),
            data=payload,
            headers=headers,
            timeout=self.timeout,
            allow_redirects=False,
        )
        response.raise_for_status()

        location = response.headers.get("location")
        ajax_response = response.headers.get("ajax-response", "")
        if location:
            final = self.session.get(urljoin(self.base_url, location), timeout=self.timeout)
            final.raise_for_status()
        elif "redirect" not in ajax_response.lower():
            body = response.text[:300]
            raise AgapeNfseError(f"Falha no login. Resposta inesperada: {body}")

    def preparar_consulta(self) -> None:
        response = self.session.get(self.consult_url, timeout=self.timeout)
        response.raise_for_status()
        view_state = parse_view_state(response.text)
        self._filter_fields = parse_filter_fields(response.text, view_state=view_state)

    def baixar_periodo(self, data_inicial: str, data_final: str, destino_base: Path, log: LogCallback | None = None) -> DownloadResult:
        start = parse_br_date(data_inicial)
        end = parse_br_date(data_final)
        if start > end:
            raise AgapeNfseError("Data inicial nao pode ser maior que a data final.")
        if start.year != end.year:
            raise AgapeNfseError("Informe um periodo dentro do mesmo exercicio/ano.")

        self.login_site()
        self.preparar_consulta()
        fields = self._require_filter_fields()

        destino_base.mkdir(parents=True, exist_ok=True)
        self._log(log, f"Listando notas de {data_inicial} ate {data_final}...")
        page = self._listar_primeira_pagina(fields, start, end)
        fields = self._update_view_state(fields, page.view_state)

        total_notas = 0
        baixados = 0
        pulados = 0
        erros = 0
        pagina_atual = page.current_page

        while True:
            self._log(log, f"Pagina {pagina_atual}: {len(page.notas)} nota(s)")
            pendentes: list[tuple[NotaFiscal, Path]] = []
            for nota in page.notas:
                total_notas += 1
                destino = self._destino_nota(destino_base, nota)
                if destino.exists():
                    pulados += 1
                    self._log(log, f"[SKIP] NFSe {nota.numero} codigo {nota.codigo} ja existe")
                    continue

                pendentes.append((nota, destino))

            novos, falhas = self._baixar_pendentes(fields, start, end, pendentes, log)
            baixados += novos
            erros += falhas

            proxima = pagina_atual + 1
            if proxima not in page.page_links and not page.has_next:
                break
            page = self._listar_pagina(fields, start, end, page.table_id, proxima)
            fields = self._update_view_state(fields, page.view_state)
            pagina_atual = page.current_page or proxima

        return DownloadResult(total_notas=total_notas, baixados=baixados, pulados=pulados, erros=erros, destino=destino_base)

    def _refresh_login_view_state(self, view_state: str, referer: str) -> str:
        headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": self.base_url,
            "Referer": referer,
            "Accept": "*/*",
        }
        try:
            response = self.session.post(
                urljoin(self.base_url, "/Principal.xhtml"),
                data=build_login_poll_payload(view_state),
                headers=headers,
                timeout=self.timeout,
            )
            response.raise_for_status()
            return parse_view_state(response.text)
        except Exception:
            return view_state

    def _listar_primeira_pagina(self, fields: FilterFields, start: date, end: date):
        headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": self.base_url,
            "Referer": self.consult_url,
            "Accept": "*/*",
        }
        response = self.session.post(self.consult_url, data=build_list_payload(fields, start, end), headers=headers, timeout=self.timeout)
        response.raise_for_status()
        return parse_nota_page(response.text, fallback_view_state=fields.view_state)

    def _listar_pagina(self, fields: FilterFields, start: date, end: date, table_id: str, page: int):
        headers = {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Origin": self.base_url,
            "Referer": self.consult_url,
            "Accept": "*/*",
        }
        response = self.session.post(
            self.consult_url,
            data=build_page_payload(fields, start, end, table_id, page),
            headers=headers,
            timeout=self.timeout,
        )
        response.raise_for_status()
        return parse_nota_page(response.text, fallback_view_state=fields.view_state)

    def _baixar_pendentes(
        self,
        fields: FilterFields,
        start: date,
        end: date,
        pendentes: list[tuple[NotaFiscal, Path]],
        log: LogCallback | None,
    ) -> tuple[int, int]:
        if not pendentes:
            return 0, 0

        workers = min(self.max_workers, len(pendentes))
        self._log(log, f"Baixando {len(pendentes)} XML(s) com {workers} conexao(oes)...")

        if workers == 1:
            return self._baixar_pendentes_sequencial(fields, start, end, pendentes, log)

        baixados = 0
        erros = 0
        with ThreadPoolExecutor(max_workers=workers) as executor:
            futures = {
                executor.submit(self._baixar_nota_isolada, fields, start, end, nota, destino): nota
                for nota, destino in pendentes
            }
            for future in as_completed(futures):
                nota = futures[future]
                try:
                    future.result()
                    baixados += 1
                    self._log(log, f"[OK] NFSe {nota.numero} codigo {nota.codigo}")
                except Exception as exc:  # noqa: BLE001 - GUI precisa continuar o lote.
                    erros += 1
                    self._log(log, f"[ERRO] NFSe {nota.numero} codigo {nota.codigo}: {exc}")
        return baixados, erros

    def _baixar_pendentes_sequencial(
        self,
        fields: FilterFields,
        start: date,
        end: date,
        pendentes: list[tuple[NotaFiscal, Path]],
        log: LogCallback | None,
    ) -> tuple[int, int]:
        baixados = 0
        erros = 0
        for nota, destino in pendentes:
            try:
                self._baixar_nota(fields, start, end, nota, destino)
                baixados += 1
                self._log(log, f"[OK] NFSe {nota.numero} codigo {nota.codigo}")
            except Exception as exc:  # noqa: BLE001 - GUI precisa continuar o lote.
                erros += 1
                self._log(log, f"[ERRO] NFSe {nota.numero} codigo {nota.codigo}: {exc}")
        return baixados, erros

    def _baixar_nota_isolada(self, fields: FilterFields, start: date, end: date, nota: NotaFiscal, destino: Path) -> None:
        session = self._clone_session()
        try:
            self._baixar_nota_com_session(session, fields, start, end, nota, destino)
        finally:
            session.close()

    def _baixar_nota(self, fields: FilterFields, start: date, end: date, nota: NotaFiscal, destino: Path) -> None:
        self._baixar_nota_com_session(self.session, fields, start, end, nota, destino)

    def _baixar_nota_com_session(
        self,
        session: requests.Session,
        fields: FilterFields,
        start: date,
        end: date,
        nota: NotaFiscal,
        destino: Path,
    ) -> None:
        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": self.base_url,
            "Referer": self.consult_url,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        }
        response = session.post(
            self.consult_url,
            data=build_download_payload(fields, start, end, nota.xml_action_name),
            headers=headers,
            timeout=self.timeout,
        )
        response.raise_for_status()
        content = response.content.strip()
        if not _looks_like_xml(content):
            content_type = response.headers.get("content-type", "")
            raise AgapeNfseError(f"Resposta nao parece XML (content-type={content_type})")
        destino.parent.mkdir(parents=True, exist_ok=True)
        destino.write_bytes(content)

    def _clone_session(self) -> requests.Session:
        session = requests.Session()
        session.headers.update(self.session.headers)
        session.cookies.update(self.session.cookies)
        return session

    def _destino_nota(self, destino_base: Path, nota: NotaFiscal) -> Path:
        year_month = _year_month_from_br_date(nota.emissao)
        name = f"nfse-{_safe_filename(nota.numero)}_codigo-{_safe_filename(nota.codigo)}.xml"
        return destino_base / year_month / name

    def _require_filter_fields(self) -> FilterFields:
        if not self._filter_fields:
            raise AgapeNfseError("Consulta ainda nao foi preparada.")
        return self._filter_fields

    def _update_view_state(self, fields: FilterFields, view_state: str) -> FilterFields:
        if not view_state or view_state == fields.view_state:
            return fields
        updated = FilterFields(
            pesquisa=fields.pesquisa,
            start_date=fields.start_date,
            start_current_month=fields.start_current_month,
            end_date=fields.end_date,
            end_current_month=fields.end_current_month,
            exercise=fields.exercise,
            status=fields.status,
            form_marker=fields.form_marker,
            auto_scroll=fields.auto_scroll,
            view_state=view_state,
            submit_name=fields.submit_name,
        )
        self._filter_fields = updated
        return updated

    def _log(self, log: LogCallback | None, message: str) -> None:
        if log:
            log(message)


def _safe_filename(value: str) -> str:
    value = re.sub(r"[^\w.-]+", "-", value.strip(), flags=re.ASCII)
    return value.strip("-") or "sem-identificacao"


def _year_month_from_br_date(value: str) -> str:
    match = re.match(r"(\d{2})/(\d{2})/(\d{4})$", value.strip())
    if not match:
        return "sem-data"
    return f"{match.group(3)}-{match.group(2)}"


def _looks_like_xml(content: bytes) -> bool:
    if not content:
        return False
    lowered = content[:200].lower()
    return lowered.startswith(b"<?xml") or b"<" in lowered and b"</" in lowered and b"<html" not in lowered
