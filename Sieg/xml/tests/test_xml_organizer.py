from pathlib import Path

from sieg_xml.core.xml_organizer import MODE_FLAT, MODE_YEAR, MODE_YEAR_MONTH, organizar_xmls, organizar_xmls_por_data


XML = """<?xml version="1.0" encoding="utf-8"?>
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


def test_organiza_xml_por_ano(tmp_path: Path):
    arquivo = tmp_path / "nota.xml"
    arquivo.write_text(XML, encoding="utf-8")
    resultado = organizar_xmls_por_data(str(tmp_path))
    assert resultado["organizados"] == 1
    assert (tmp_path / "2025" / "nota.xml").exists()


def test_organiza_xml_por_ano_mes(tmp_path: Path):
    arquivo = tmp_path / "nota.xml"
    arquivo.write_text(XML, encoding="utf-8")
    resultado = organizar_xmls(str(tmp_path), MODE_YEAR_MONTH)
    assert resultado["organizados"] == 1
    assert (tmp_path / "2025" / "01" / "nota.xml").exists()


def test_reorganiza_para_pasta_unica(tmp_path: Path):
    pasta = tmp_path / "2025" / "01"
    pasta.mkdir(parents=True)
    arquivo = pasta / "nota.xml"
    arquivo.write_text(XML, encoding="utf-8")
    resultado = organizar_xmls(str(tmp_path), MODE_FLAT)
    assert resultado["organizados"] == 1
    assert (tmp_path / "nota.xml").exists()
    assert not (tmp_path / "2025").exists()


def test_reorganiza_para_ano_a_partir_de_ano_mes(tmp_path: Path):
    pasta = tmp_path / "2025" / "01"
    pasta.mkdir(parents=True)
    arquivo = pasta / "nota.xml"
    arquivo.write_text(XML, encoding="utf-8")
    resultado = organizar_xmls(str(tmp_path), MODE_YEAR)
    assert resultado["organizados"] == 1
    assert (tmp_path / "2025" / "nota.xml").exists()
