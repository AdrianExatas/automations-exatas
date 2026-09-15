import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import Mock, patch

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.upload import sieg_api
from src.upload.uploader import enviar_automatico
from src.upload.utils import obter_tipo_completo_nota, obter_xml_type_sieg


XML_VALIDO = """<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe12345678901234567890123456789012345678901234">
    <ide>
      <mod>55</mod>
    </ide>
  </infNFe>
</NFe>
"""

XML_NFCE_VALIDO = """<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35260112345678000123650010000000011000000010">
    <ide>
      <mod>65</mod>
    </ide>
  </infNFe>
</NFe>
"""


class TestUploader(unittest.TestCase):
    def test_mapeia_xml_type_sieg_por_modelo_nfe_e_nfce(self):
        self.assertEqual(obter_tipo_completo_nota(XML_VALIDO), "NF-e")
        self.assertEqual(obter_xml_type_sieg(XML_VALIDO), 1)
        self.assertEqual(obter_tipo_completo_nota(XML_NFCE_VALIDO), "NFC-e")
        self.assertEqual(obter_xml_type_sieg(XML_NFCE_VALIDO), 4)

    def test_verificar_xml_existe_envia_chave_json_com_xml_type(self):
        chave = "35260112345678000123650010000000011000000010"
        response = Mock(status_code=200)
        session = Mock()
        session.post.return_value = response

        with (
            patch("src.upload.sieg_api.SIEG_API_KEY", "api-key-teste"),
            patch("src.upload.sieg_api._get_session", return_value=session),
        ):
            existe = sieg_api.verificar_xml_existe(chave, xml_type=4)

        self.assertTrue(existe)
        session.post.assert_called_once()
        url = session.post.call_args.args[0]
        kwargs = session.post.call_args.kwargs
        self.assertIn("xmlType=4", url)
        self.assertIn("api_key=api-key-teste", url)
        self.assertEqual(kwargs["json"], chave)
        self.assertNotIn("data", kwargs)

    def test_envia_xml_valido_sem_verificar_existencia_e_exclui_sucesso(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            xml_path = Path(temp_dir) / "nota.xml"
            xml_path.write_text(XML_VALIDO, encoding="utf-8")

            with (
                patch("src.upload.uploader.SIEG_API_KEY", "api-key-teste"),
                patch("src.upload.uploader.enviar_xml", return_value=(True, "ok", False)) as enviar_xml_mock,
                patch("src.upload.sieg_api.verificar_xml_existe") as verificar_mock,
                redirect_stdout(StringIO()),
            ):
                resultado = enviar_automatico(pasta=temp_dir, excluir_enviados=True, num_threads=1)

            enviar_xml_mock.assert_called_once()
            verificar_mock.assert_not_called()
            self.assertFalse(xml_path.exists())
            self.assertEqual(resultado["total"], 1)
            self.assertEqual(resultado["enviados"], 1)
            self.assertEqual(resultado["existentes"], 0)
            self.assertEqual(resultado["erros"], 0)

    def test_erro_no_envio_preserva_xml_local(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            xml_path = Path(temp_dir) / "nota.xml"
            xml_path.write_text(XML_VALIDO, encoding="utf-8")

            with (
                patch("src.upload.uploader.SIEG_API_KEY", "api-key-teste"),
                patch("src.upload.uploader.enviar_xml", return_value=(False, "falha", False)),
                patch("src.upload.sieg_api.verificar_xml_existe") as verificar_mock,
                redirect_stdout(StringIO()),
            ):
                resultado = enviar_automatico(pasta=temp_dir, excluir_enviados=True, num_threads=1)

            verificar_mock.assert_not_called()
            self.assertTrue(xml_path.exists())
            self.assertEqual(resultado["total"], 1)
            self.assertEqual(resultado["enviados"], 0)
            self.assertEqual(resultado["existentes"], 0)
            self.assertEqual(resultado["erros"], 1)


if __name__ == "__main__":
    unittest.main()
