"""
Cliente HTTP para o portal SEFAZ/SE.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

import requests
from requests import Response, Session
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.core.config import PATHS
from src.download import state
from src.download.downloader import _mover_arquivo_baixado, _verificar_zip_valido
from .parser import (
    DownloadInfo,
    DownloadListingPage,
    HtmlForm,
    is_session_expired,
    parse_download_listing,
    parse_error_message,
    parse_form,
    parse_js_redirect,
    parse_portal_menu_link,
    simplify_form_payload,
)


class SefazHttpError(RuntimeError):
    """Erro funcional do cliente HTTP."""


class SefazSessionExpiredError(SefazHttpError):
    """Sessao invalida ou expirada."""


@dataclass(slots=True)
class SolicitacaoResultado:
    """Resultado de uma solicitacao de XML."""

    sucesso: bool
    mensagem: str
    aviso: str | None = None
    page_url: str | None = None


class SefazHttpClient:
    """Cliente HTTP autenticado para o portal da SEFAZ."""

    PUBLIC_LOGIN_URL = "https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx"
    PORTAL_IFRAME_URL = "https://security.sefaz.se.gov.br/internet/portal/acesso.jsp"
    LOGIN_POST_URL = "https://security.sefaz.se.gov.br/internet/login/login.jsp"
    INTERNET_BASE_URL = "https://security.sefaz.se.gov.br/internet/"
    PORTAL_URL = "https://security.sefaz.se.gov.br/internet/portal.jsp"
    NAV_PAGE_STRIDE = 15

    def __init__(self, timeout: int = 30):
        self.timeout = timeout
        self.session = self._build_session()
        self.portal_html: str | None = None
        self.portal_url: str | None = None
        self._listing_url: str | None = None
        self._listing_page: DownloadListingPage | None = None
        self._solicitacao_form_cache: HtmlForm | None = None
        self._empresas_cache: list[dict[str, str]] | None = None

    def _build_session(self) -> Session:
        session = requests.Session()
        session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            }
        )
        retry = Retry(
            total=3,
            connect=3,
            read=3,
            status=3,
            backoff_factor=0.5,
            status_forcelist=(500, 502, 503, 504),
            allowed_methods=("GET", "POST"),
            raise_on_status=False,
        )
        adapter = HTTPAdapter(max_retries=retry)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def login(self, usuario: str, senha: str) -> bool:
        """Autentica no portal."""
        self._request("GET", self.PUBLIC_LOGIN_URL, check_session=False)
        self._request("GET", self.PORTAL_IFRAME_URL, check_session=False)

        response = self._request(
            "POST",
            self.LOGIN_POST_URL,
            data={
                "UserName": usuario,
                "Password": senha,
                "aba": "contabilista",
                "Op": "1",
                "Login": "Contabilista",
            },
            headers={
                "Origin": "https://security.sefaz.se.gov.br",
                "Referer": self.PORTAL_IFRAME_URL,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            check_session=False,
        )

        if "portal.jsp" not in response.url.lower():
            message = parse_error_message(response.text) or "Falha no login HTTP"
            raise SefazHttpError(message)

        self.portal_url = response.url
        self.portal_html = response.text
        return True

    def abrir_formulario_solicitacao(self, force_refresh: bool = False) -> HtmlForm:
        """Abre o formulario inicial da solicitacao (T10464)."""
        if not force_refresh and self._solicitacao_form_cache is not None:
            return self._solicitacao_form_cache

        listing = self.abrir_listagem_downloads()
        if not listing.new_request_url:
            raise SefazHttpError("Nao foi possivel localizar o link 'Novo' na listagem")

        response = self._request("GET", listing.new_request_url, referer=listing.url)
        self._solicitacao_form_cache = parse_form(self.INTERNET_BASE_URL, response.url, response.text)
        return self._solicitacao_form_cache

    def listar_empresas(self) -> list[dict[str, str]]:
        """Lista empresas disponiveis no formulario inicial."""
        if self._empresas_cache is not None:
            return list(self._empresas_cache)

        form = self.abrir_formulario_solicitacao()
        empresas = []
        for texto, valor in form.select_options.get("cdPessoaContribuinte", {}).items():
            valor = (valor or "").strip()
            texto = (texto or "").strip()
            if not valor or not texto or texto.lower().startswith("selecione"):
                continue
            empresas.append({"inscricao": valor, "nome": texto})
        self._empresas_cache = list(empresas)
        return list(empresas)

    def preflight_solicitacao(self, inscricao_municipal: str) -> bool:
        """
        Valida o primeiro passo do wizard HTTP sem enviar a solicitacao final.
        """
        self._abrir_form_tipo_arquivo(str(inscricao_municipal), force_refresh=False)
        return True

    def solicitar_xml(self, params: dict[str, Any]) -> SolicitacaoResultado:
        """
        Tenta processar a solicitacao por HTTP.

        Observacao: a primeira transicao T10464 -> T10582 ainda pode variar por sessao.
        Quando o portal nao aceita essa transicao, este metodo levanta erro funcional para permitir fallback.
        """
        form_tipo = self._abrir_form_tipo_arquivo(str(params["inscricao_municipal"]), force_refresh=False)
        tipo_map = {"NFE": "0", "CTE": "1", "NFC": "2"}
        tipo_arquivo = str(params["tipo_arquivo"]).strip().upper()
        tipo_value = tipo_map.get(tipo_arquivo)
        if tipo_value is None:
            raise SefazHttpError(f"Tipo de arquivo desconhecido: {tipo_arquivo}")

        response_criterio = self._submit_form(
            form_tipo,
            overrides={
                "cdPessoaContribuinte": form_tipo.first_value("cdPessoaContribuinte", ""),
                "tipoArquivo": tipo_value,
            },
            referer=form_tipo.url,
        )
        redirected_criterio = self._follow_js_redirect(response_criterio, referer=form_tipo.action_url)

        form_criterio = parse_form(self.INTERNET_BASE_URL, redirected_criterio.url, redirected_criterio.text)
        criterio_payload = self._build_criterio_payload(form_criterio, params)
        response_final = self._submit_form(form_criterio, overrides=criterio_payload, referer=form_criterio.url)
        final_page = self._follow_js_redirect(response_final, referer=form_criterio.action_url)

        mensagem = parse_error_message(final_page.text)
        return SolicitacaoResultado(
            sucesso=True,
            mensagem="Solicitacao concluida com sucesso" if not mensagem else "Solicitacao enviada com aviso",
            aviso=mensagem,
            page_url=final_page.url,
        )

    def abrir_listagem_downloads(self, ready_only: bool = False) -> DownloadListingPage:
        """Abre a listagem T10461."""
        if not ready_only and self._listing_page is not None:
            return self._listing_page

        portal = self._ensure_portal()
        solicitar_xml_url = parse_portal_menu_link(portal.url, portal.text, "Solicitar Arquivos XML")
        if not solicitar_xml_url:
            raise SefazHttpError("Nao foi possivel localizar o menu 'Solicitar Arquivos XML'")

        response = self._request("GET", solicitar_xml_url, referer=portal.url)
        response = self._follow_js_redirect(response, referer=solicitar_xml_url)
        listing = parse_download_listing(self.INTERNET_BASE_URL, response.url, response.text, ready_only=ready_only)
        self._listing_url = response.url
        if not ready_only:
            self._listing_page = listing
        return listing

    def listar_downloads(self, pagina: int = 1, ready_only: bool = False) -> DownloadListingPage:
        """Lista downloads de uma pagina especifica."""
        if pagina < 1:
            raise ValueError("pagina deve ser >= 1")

        current = self.abrir_listagem_downloads(ready_only=ready_only)
        if current.current_page is None or current.current_page > pagina:
            response = self._request("GET", self._listing_url or current.url, referer=self.PORTAL_URL)
            current = parse_download_listing(self.INTERNET_BASE_URL, response.url, response.text, ready_only=ready_only)
            if not ready_only:
                self._listing_page = current

        if pagina == 1 and current.current_page == 1:
            return current

        if pagina > 1:
            direct_url = self._build_listing_page_url(current.url, pagina)
            response = self._request("GET", direct_url, referer=current.url)
            direct_page = parse_download_listing(self.INTERNET_BASE_URL, response.url, response.text, ready_only=ready_only)
            if direct_page.current_page == pagina:
                if not ready_only:
                    self._listing_page = direct_page
                return direct_page

        while current.current_page is None or current.current_page < pagina:
            next_url = current.page_links.get((current.current_page or 1) + 1) or current.next_page_url
            if not next_url:
                raise SefazHttpError(f"Pagina {pagina} nao disponivel")
            response = self._request("GET", next_url, referer=current.url)
            current = parse_download_listing(self.INTERNET_BASE_URL, response.url, response.text, ready_only=ready_only)
            if not ready_only:
                self._listing_page = current
        return current

    def baixar_arquivo(self, info_download: DownloadInfo | dict[str, Any] | str, destino: Path | None = None) -> Path:
        """Baixa um ZIP por streaming e organiza no layout atual."""
        info = self._coerce_download_info(info_download)
        destino = destino or PATHS.downloads_dir
        destino.mkdir(parents=True, exist_ok=True)

        temp_file = destino / f"{info.nm_arquivo or info.dt_solicitacao or 'arquivo_tmp'}.zip"
        if temp_file.exists():
            temp_file.unlink()

        with self.session.get(
            info.url,
            headers={"Referer": self._listing_url or self.PORTAL_URL},
            stream=True,
            timeout=self.timeout,
            allow_redirects=True,
        ) as response:
            if response.status_code >= 400:
                raise SefazHttpError(f"Falha no download HTTP: status {response.status_code}")

            content_type = response.headers.get("Content-Type", "").lower()
            if "text/html" in content_type:
                text = response.text
                message = parse_error_message(text)
                if message:
                    raise SefazHttpError(message)
                raise SefazHttpError("O portal retornou HTML em vez do ZIP solicitado")

            with open(temp_file, "wb") as fh:
                for chunk in response.iter_content(chunk_size=1024 * 128):
                    if chunk:
                        fh.write(chunk)

        if not _verificar_zip_valido(temp_file):
            raise SefazHttpError(f"ZIP baixado esta corrompido: {temp_file.name}")

        _mover_arquivo_baixado(
            info.nm_arquivo,
            info.dt_solicitacao,
            extrair=state.extrair_zips,
            tipo_download=info.tipo_download,
        )

        empresa, ano, mes = self._parse_output_path(info)
        nome_final = info.nm_arquivo
        if info.tipo_download and info.tipo_download != "DESCONHECIDO" and not nome_final.startswith(f"{info.tipo_download}_"):
            nome_final = f"{info.tipo_download}_{nome_final}"
        final_path = PATHS.downloads_dir / ano / mes / empresa / "zips" / f"{nome_final}.zip"
        if temp_file.exists() and temp_file != final_path:
            try:
                temp_file.unlink()
            except OSError:
                pass
        return final_path

    def close(self) -> None:
        self.session.close()

    def __enter__(self) -> "SefazHttpClient":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    def _ensure_portal(self) -> Response:
        if self.portal_html and self.portal_url:
            response = Response()
            response.status_code = 200
            response._content = self.portal_html.encode("latin-1", errors="ignore")
            response.url = self.portal_url
            response.encoding = "ISO-8859-1"
            return response
        response = self._request("GET", self.PORTAL_URL)
        self.portal_html = response.text
        self.portal_url = response.url
        return response

    def _request(
        self,
        method: str,
        url: str,
        *,
        data: Any | None = None,
        params: Any | None = None,
        headers: dict[str, str] | None = None,
        referer: str | None = None,
        check_session: bool = True,
    ) -> Response:
        request_headers = dict(headers or {})
        if referer:
            request_headers["Referer"] = referer

        response = self.session.request(
            method=method,
            url=url,
            data=data,
            params=params,
            headers=request_headers,
            timeout=self.timeout,
            allow_redirects=True,
        )

        if response.encoding is None:
            response.encoding = response.apparent_encoding or "ISO-8859-1"

        if check_session and is_session_expired(response.text):
            raise SefazSessionExpiredError("Sessao expirada ou redirecionada para login")

        return response

    def _follow_js_redirect(self, response: Response, *, referer: str | None = None) -> Response:
        redirect_url = parse_js_redirect(response.url, response.text)
        if not redirect_url:
            return response
        return self._request("GET", redirect_url, referer=referer or response.url)

    def _submit_form(self, form: HtmlForm, *, overrides: dict[str, Any], referer: str | None = None) -> Response:
        payload = simplify_form_payload(form, overrides=overrides)
        if form.method == "POST":
            return self._request(
                "POST",
                form.action_url,
                data=payload,
                headers={
                    "Origin": "https://security.sefaz.se.gov.br",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                referer=referer or form.url,
            )
        return self._request("GET", form.action_url, params=payload, referer=referer or form.url)

    def _abrir_form_tipo_arquivo(self, inscricao_municipal: str, force_refresh: bool = False) -> HtmlForm:
        tentativas = 2 if not force_refresh else 1

        for tentativa in range(tentativas):
            form_inicial = self.abrir_formulario_solicitacao(force_refresh=force_refresh or tentativa > 0)
            response_tipo = self._submit_form(
                form_inicial,
                overrides={"cdPessoaContribuinte": inscricao_municipal},
                referer=form_inicial.url,
            )
            response_tipo = self._follow_js_redirect(response_tipo, referer=form_inicial.action_url)
            form_tipo = parse_form(self.INTERNET_BASE_URL, response_tipo.url, response_tipo.text)

            if form_tipo.first_value("tipoArquivo") is not None:
                return form_tipo

            self._solicitacao_form_cache = None

        raise SefazHttpError(
            "O portal nao retornou o formulario de tipo de arquivo para a inscricao selecionada"
        )

    def _build_criterio_payload(self, form: HtmlForm, params: dict[str, Any]) -> dict[str, Any]:
        tipo_arquivo = str(params["tipo_arquivo"]).strip().upper()
        overrides: dict[str, Any] = {
            "dtInicio": str(params["data_inicial"]).strip(),
            "dtFinal": str(params["data_final"]).strip(),
        }

        if tipo_arquivo in {"NFE", "NFC"}:
            pesquisar_por = str(params["pesquisar_por"]).strip()
            options = form.select_options.get("tipoPesquisa", {})
            if pesquisar_por not in options:
                raise SefazHttpError(f"Tipo de pesquisa invalido para {tipo_arquivo}: {pesquisar_por}")
            overrides["tipoPesquisa"] = options[pesquisar_por]
            return overrides

        if tipo_arquivo == "CTE":
            pesquisar_por = str(params["pesquisar_por"]).strip()
            checkbox_map = {
                "Remetente": "Remetente",
                "Expedidor": "Expedidor",
                "Recebedor": "Recebedor",
                "Destinatário": "Destinatario",
                "Destinatario": "Destinatario",
                "Emitente": "Emitente",
                "Outros": "Outros",
            }
            checkbox_name = checkbox_map.get(pesquisar_por)
            if not checkbox_name:
                raise SefazHttpError(f"Tipo de pesquisa invalido para CTE: {pesquisar_por}")
            overrides[checkbox_name] = "on"
            return overrides

        raise SefazHttpError(f"Tipo de arquivo desconhecido: {tipo_arquivo}")

    def _coerce_download_info(self, info_download: DownloadInfo | dict[str, Any] | str) -> DownloadInfo:
        if isinstance(info_download, DownloadInfo):
            return info_download
        if isinstance(info_download, str):
            return DownloadInfo(
                url=info_download,
                nm_arquivo="arquivo",
                situacao="PRONTO PARA DOWNLOAD",
                tipo_download="DESCONHECIDO",
            )
        return DownloadInfo(
            url=str(info_download["url"]),
            nm_arquivo=str(info_download.get("nm_arquivo") or info_download.get("nome") or "arquivo"),
            situacao=str(info_download.get("situacao") or "PRONTO PARA DOWNLOAD"),
            tipo_download=str(info_download.get("tipo_download") or "DESCONHECIDO"),
            dt_solicitacao=info_download.get("dt_solicitacao"),
            file_path=info_download.get("file_path"),
            row_text=str(info_download.get("row_text") or ""),
        )

    def _parse_output_path(self, info: DownloadInfo) -> tuple[str, str, str]:
        from src.download.downloader import _parse_nome_empresa_e_ano_mes

        return _parse_nome_empresa_e_ano_mes(info.nm_arquivo, info.dt_solicitacao)

    def _build_listing_page_url(self, base_url: str, pagina: int) -> str:
        parsed = urlparse(base_url)
        query = parse_qs(parsed.query)
        query["navInicio"] = [str(((pagina - 1) * self.NAV_PAGE_STRIDE) + 1)]
        encoded_query = urlencode(query, doseq=True)
        return urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, encoded_query, parsed.fragment))


def limpar_downloads_temporarios() -> None:
    """Remove ZIPs temporarios soltos na pasta base, se existirem."""
    try:
        for arquivo in PATHS.downloads_dir.glob("*.zip"):
            try:
                arquivo.unlink()
            except OSError:
                pass
        for arquivo in PATHS.downloads_dir.glob("*.crdownload"):
            try:
                arquivo.unlink()
            except OSError:
                pass
    except OSError:
        pass
