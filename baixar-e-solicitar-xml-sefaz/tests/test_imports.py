"""
Testes de importacao para verificar a estrutura do projeto.
"""
import importlib.util
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))


class TestImports(unittest.TestCase):
    """Testes para verificar que os modulos suportados podem ser importados."""

    def test_import_core_config(self):
        from src.core.config import PATHS, validar_configuracoes

        self.assertIsNotNone(PATHS)
        self.assertTrue(callable(validar_configuracoes))

    def test_import_core_constants(self):
        from src.core.constants import SIMBOLOS, Timeouts

        self.assertIsNotNone(SIMBOLOS)
        self.assertIsNotNone(Timeouts.DEFAULT_TIMEOUT)

    def test_import_core_browser(self):
        from src.core.browser import SefazBrowser, obter_versao_chrome

        self.assertIsNotNone(SefazBrowser)
        self.assertTrue(callable(obter_versao_chrome))

    def test_import_utils(self):
        from src.utils import configurar_logging, retry_com_backoff

        self.assertTrue(callable(configurar_logging))
        self.assertTrue(callable(retry_com_backoff))

    def test_import_consulta_actions(self):
        from src.consulta.actions import SefazActions

        self.assertIsNotNone(SefazActions)

    def test_import_consulta_historico(self):
        from src.consulta.historico import carregar_historico

        self.assertTrue(callable(carregar_historico))

    def test_import_download_checkpoint(self):
        from src.download.checkpoint import salvar_checkpoint

        self.assertTrue(callable(salvar_checkpoint))

    def test_import_download_state(self):
        from src.download import state

        self.assertIsNotNone(state.executando)

    def test_import_sefaz_http_client(self):
        from src.sefaz_http.client import SefazHttpClient

        self.assertIsNotNone(SefazHttpClient)

    def test_import_download_http_runner(self):
        from src.download.http_runner import executar_download_http

        self.assertTrue(callable(executar_download_http))

    def test_import_upload_package(self):
        from src.upload import enviar_automatico

        self.assertTrue(callable(enviar_automatico))

    def test_smoke_import_supported_entrypoints(self):
        entrypoints = [
            "apps/consulta_gui.py",
            "apps/download_gui.py",
            "scripts/executar_consulta.py",
            "scripts/executar_download.py",
            "scripts/executar_upload.py",
            "scripts/processar_xmls_presos.py",
            "scripts/extrair_zips_aninhados.py",
            "scripts/limpar_pasta_base.py",
            "scripts/reorganizar_downloads.py",
            "scripts/diagnostico/diagnostico_chromedriver.py",
            "scripts/diagnostico/limpar_cache.py",
        ]

        for relative_path in entrypoints:
            with self.subTest(path=relative_path):
                module_path = PROJECT_ROOT / relative_path
                spec = importlib.util.spec_from_file_location(
                    f"smoke_{relative_path.replace('/', '_').replace('.', '_')}",
                    module_path,
                )
                self.assertIsNotNone(spec)
                self.assertIsNotNone(spec.loader)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)


if __name__ == "__main__":
    unittest.main()
