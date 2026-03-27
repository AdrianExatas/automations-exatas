"""
Testes dos parsers HTTP da SEFAZ.
"""
import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.sefaz_http.parser import parse_download_listing, parse_error_message, parse_form, parse_js_redirect


class TestSefazHttpParser(unittest.TestCase):
    def test_parse_js_redirect(self):
        html = "<html><script>location.href='process.jsp?AppName=SPED&TransId=T10461&token=abc';</script></html>"
        redirect = parse_js_redirect("https://security.sefaz.se.gov.br/internet/process.jsp", html)
        self.assertEqual(
            redirect,
            "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&token=abc",
        )

    def test_parse_form_extracts_hidden_select_and_submit(self):
        html = """
        <html>
          <body>
            <form name="form" method="POST" action="process.jsp">
              <input type="hidden" name="TransId" value="T10582">
              <select id="tipoArquivo" name="tipoArquivo">
                <option value=""></option>
                <option value="0" selected>NFE</option>
                <option value="1">CTE</option>
              </select>
              <input type="submit" id="okButton" name="okButton" value="  Ok  ">
            </form>
          </body>
        </html>
        """
        form = parse_form(
            "https://security.sefaz.se.gov.br/internet/",
            "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10582",
            html,
        )
        self.assertEqual(form.action_url, "https://security.sefaz.se.gov.br/internet/process.jsp")
        self.assertEqual(form.first_value("TransId"), "T10582")
        self.assertEqual(form.first_value("tipoArquivo"), "0")
        self.assertEqual(form.submit_buttons["okButton"], "  Ok  ")
        self.assertEqual(form.select_options["tipoArquivo"]["CTE"], "1")

    def test_parse_download_listing_extracts_downloads_and_pagination(self):
        html = """
        <html>
          <body>
            <table>
              <tr class="trTableContent">
                <td>09/01/2026 09:19:26</td>
                <td>NFE</td>
                <td>ARQUIVO_TESTE</td>
                <td>PRONTO PARA DOWNLOAD</td>
                <td>
                  <a href="process.jsp?AppName=SPED&TransId=T2664&dtSolicitacao=09012026091926&tdb_dsTipoDownload=NFE&nmArquivo=ARQUIVO_TESTE&dsSituacao=PRONTO%20PARA%20DOWNLOAD&token=abc">Baixar</a>
                </td>
              </tr>
            </table>
            <a href="process.jsp?AppName=SPED&TransId=T10464&token=novo">Novo</a>
            <td class="pgAtualNav"><b>2</b></td>
            <a href="process.jsp?AppName=SPED&TransId=T10461&page=3&token=page3">3</a>
            <a href="process.jsp?AppName=SPED&TransId=T10461&page=3&token=next">Próximo</a>
          </body>
        </html>
        """
        listing = parse_download_listing(
            "https://security.sefaz.se.gov.br/internet/",
            "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&page=2",
            html,
        )
        self.assertEqual(listing.current_page, 2)
        self.assertEqual(listing.new_request_url, "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10464&token=novo")
        self.assertEqual(listing.next_page_url, "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&page=3&token=next")
        self.assertEqual(listing.page_links[3], "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&page=3&token=page3")
        self.assertEqual(len(listing.downloads), 1)
        self.assertEqual(listing.downloads[0].tipo_download, "NFE")
        self.assertEqual(listing.downloads[0].dt_solicitacao, "09012026091926")

    def test_parse_download_listing_ready_only_ignora_itens_nao_prontos(self):
        html = """
        <html>
          <body>
            <table>
              <tr class="trTableContent">
                <td>09/01/2026 09:19:26</td>
                <td>NFE</td>
                <td>ARQUIVO_OK</td>
                <td>PRONTO PARA DOWNLOAD</td>
                <td>
                  <a href="process.jsp?AppName=SPED&TransId=T2664&dtSolicitacao=09012026091926&tdb_dsTipoDownload=NFE&nmArquivo=ARQUIVO_OK&dsSituacao=PRONTO%20PARA%20DOWNLOAD&token=abc">Baixar</a>
                </td>
              </tr>
              <tr class="trTableContent">
                <td>09/01/2026 09:19:27</td>
                <td>NFE</td>
                <td>ARQUIVO_PENDENTE</td>
                <td>EM PROCESSAMENTO</td>
                <td>
                  <a href="process.jsp?AppName=SPED&TransId=T2664&dtSolicitacao=09012026091927&tdb_dsTipoDownload=NFE&nmArquivo=ARQUIVO_PENDENTE&dsSituacao=EM%20PROCESSAMENTO&token=def">Baixar</a>
                </td>
              </tr>
            </table>
          </body>
        </html>
        """
        listing = parse_download_listing(
            "https://security.sefaz.se.gov.br/internet/",
            "https://security.sefaz.se.gov.br/internet/process.jsp?AppName=SPED&TransId=T10461&page=1",
            html,
            ready_only=True,
        )
        self.assertEqual(len(listing.downloads), 1)
        self.assertEqual(listing.downloads[0].nm_arquivo, "ARQUIVO_OK")

    def test_parse_error_message_ignores_required_message(self):
        html = """
        <html>
          <body>
            <font class="fontRequiredMsg">Os campos com ( * ) são obrigatórios.</font>
          </body>
        </html>
        """
        self.assertIsNone(parse_error_message(html))


if __name__ == "__main__":
    unittest.main()
