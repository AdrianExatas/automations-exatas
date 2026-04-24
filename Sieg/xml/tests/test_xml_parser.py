from sieg_xml.core.xml_parser import extrair_chave_acesso, extrair_data_xml, identificar_tipo_xml, validar_xml


SAMPLE_XML = """<?xml version="1.0" encoding="utf-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35250112345678000123550010000000011000000010">
      <ide>
        <dhEmi>2025-01-15T10:30:00-03:00</dhEmi>
      </ide>
    </infNFe>
  </NFe>
</nfeProc>
"""


def test_valida_e_extrai_campos_principais():
    assert validar_xml(SAMPLE_XML) is True
    assert extrair_chave_acesso(SAMPLE_XML) == "35250112345678000123550010000000011000000010"
    assert extrair_data_xml(SAMPLE_XML) == (2025, 1)
    assert identificar_tipo_xml(SAMPLE_XML) == "NFe"
