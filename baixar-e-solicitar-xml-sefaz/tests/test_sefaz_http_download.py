"""
Testes do fluxo de download HTTP da SEFAZ.
"""
from __future__ import annotations

import io
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
import sys

from requests import Response

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import src.sefaz_http.client as client_module
from src.download import state
from src.download.http_runner import _processar_pagina_http
from src.sefaz_http import DownloadInfo, DownloadListingPage, SefazHttpClient, SefazHttpError, SefazSessionExpiredError
from src.sefaz_http.parser import parse_error_message


class _ResponseContext:
    def __init__(self, response: Response):
        self.response = response

    def __enter__(self) -> Response:
        return self.response

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False


class _FakeSession:
    def __init__(self, response: Response):
        self.response = response
        self.urls = []

    def get(self, *args, **kwargs) -> _ResponseContext:
        self.urls.append(args[0])
        return _ResponseContext(self.response)


class _SequentialFakeSession:
    def __init__(self, responses: list[Response]):
        self.responses = list(responses)
        self.urls = []

    def get(self, *args, **kwargs) -> _ResponseContext:
        self.urls.append(args[0])
        return _ResponseContext(self.responses.pop(0))


class _FailingDownloadClient:
    def __init__(self):
        self.calls = 0

    def baixar_arquivo(self, info, destino):
        self.calls += 1
        raise SefazHttpError("O portal retornou HTML em vez do ZIP solicitado")


def _html_response(html_text: str) -> Response:
    response = Response()
    response.status_code = 200
    response.headers["Content-Type"] = "text/html; charset=ISO-8859-1"
    response._content = html_text.encode("utf-8")
    response.encoding = "utf-8"
    response.url = "https://security.sefaz.se.gov.br/internet/process.jsp"
    return response


def _zip_response(content: bytes = b"PK\x03\x04teste") -> Response:
    response = Response()
    response.status_code = 200
    response.headers["Content-Type"] = "application/zip"
    response._content = content
    response._content_consumed = True
    response.url = "https://security.sefaz.se.gov.br/iBusinessPortal/jsp/templates/FileTransfer/Downloader.jsp"
    return response


class TestSefazHttpDownload(unittest.TestCase):
    def test_parse_error_message_reconhece_arquivo_nao_localizado(self):
        html = "<html><body>O arquivo não foi localizado no servidor.</body></html>"
        self.assertIn("arquivo não foi localizado", parse_error_message(html).lower())

    def test_baixar_arquivo_salva_html_inesperado(self):
        original_project_root = client_module.PATHS.project_root
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                client_module.PATHS.project_root = Path(tmpdir)
                client = SefazHttpClient()
                client.session = _FakeSession(_html_response("<html><body>Pagina inesperada</body></html>"))
                info = DownloadInfo(
                    url="https://security.sefaz.se.gov.br/internet/process.jsp?arquivo=1",
                    nm_arquivo="271419776_MAX_INDUSTRIA",
                    situacao="PRONTO PARA DOWNLOAD",
                    tipo_download="NFE",
                    dt_solicitacao="25032026111729",
                )

                with self.assertRaisesRegex(SefazHttpError, "amostra salva em"):
                    client.baixar_arquivo(info, Path(tmpdir))

                debug_files = list((Path(tmpdir) / "_local" / "debug" / "sefaz_download_html").glob("*.html"))
                self.assertEqual(len(debug_files), 1)
                self.assertIn("Pagina inesperada", debug_files[0].read_text(encoding="utf-8"))
        finally:
            client_module.PATHS.project_root = original_project_root

    def test_baixar_arquivo_segue_redirect_javascript_para_downloader(self):
        original_verificar_zip = client_module._verificar_zip_valido
        original_mover_arquivo = client_module._mover_arquivo_baixado
        try:
            client_module._verificar_zip_valido = lambda _path: True
            client_module._mover_arquivo_baixado = lambda *args, **kwargs: None
            with tempfile.TemporaryDirectory() as tmpdir:
                html = """
                <html><body>
                  <script>
                    window.location='/iBusinessPortal/jsp/templates/FileTransfer/Downloader.jsp?Arquivo=//SEDENFE01/SPED/Download/SE007829/arquivo.zip';
                  </script>
                </body></html>
                """
                fake_session = _SequentialFakeSession([_html_response(html), _zip_response()])
                client = SefazHttpClient()
                client.session = fake_session
                client._parse_output_path = lambda _info: ("EMPRESA", "2026", "03")
                info = DownloadInfo(
                    url="https://security.sefaz.se.gov.br/internet/process.jsp?arquivo=1",
                    nm_arquivo="arquivo",
                    situacao="PRONTO PARA DOWNLOAD",
                    tipo_download="NFE",
                )

                client.baixar_arquivo(info, Path(tmpdir))

                self.assertEqual(len(fake_session.urls), 2)
                self.assertIn("/iBusinessPortal/jsp/templates/FileTransfer/Downloader.jsp", fake_session.urls[1])
        finally:
            client_module._verificar_zip_valido = original_verificar_zip
            client_module._mover_arquivo_baixado = original_mover_arquivo

    def test_baixar_arquivo_detecta_sessao_expirada(self):
        original_project_root = client_module.PATHS.project_root
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                client_module.PATHS.project_root = Path(tmpdir)
                client = SefazHttpClient()
                client.session = _FakeSession(
                    _html_response(
                        """
                        <html><body>
                          <input name="UserName">
                          <input name="Password">
                        </body></html>
                        """
                    )
                )
                info = DownloadInfo(
                    url="https://security.sefaz.se.gov.br/internet/process.jsp?arquivo=1",
                    nm_arquivo="arquivo_login",
                    situacao="PRONTO PARA DOWNLOAD",
                    tipo_download="NFE",
                )

                with self.assertRaisesRegex(SefazSessionExpiredError, "Sessao expirada"):
                    client.baixar_arquivo(info, Path(tmpdir))
        finally:
            client_module.PATHS.project_root = original_project_root

    def test_runner_nao_repete_download_com_mesma_falha(self):
        original_executando = state.executando
        original_data_solicitacao = state.data_solicitacao
        state.executando = True
        state.data_solicitacao = None
        info = DownloadInfo(
            url="https://security.sefaz.se.gov.br/internet/process.jsp?arquivo=1",
            nm_arquivo="271419776_MAX_INDUSTRIA",
            situacao="PRONTO PARA DOWNLOAD",
            tipo_download="NFE",
            dt_solicitacao="25032026111729",
        )
        pagina = DownloadListingPage(
            url="https://security.sefaz.se.gov.br/internet/process.jsp",
            current_page=1,
            downloads=[info, info],
        )
        client = _FailingDownloadClient()

        try:
            with redirect_stdout(io.StringIO()):
                novos, erros = _processar_pagina_http(
                    client=client,
                    pagina_info=pagina,
                    arquivos_baixados=set(),
                    downloads_com_erro=set(),
                    on_download=lambda pagina_checkpoint: None,
                )

            self.assertEqual(novos, 0)
            self.assertEqual(erros, 1)
            self.assertEqual(client.calls, 1)
        finally:
            state.executando = original_executando
            state.data_solicitacao = original_data_solicitacao


if __name__ == "__main__":
    unittest.main()
