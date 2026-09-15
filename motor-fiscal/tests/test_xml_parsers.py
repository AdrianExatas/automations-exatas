"""Testes dos parsers de XML (NF-e/NFC-e, evento, CT-e, CF-e)."""

from motor_fiscal.ingestao import xml_cfe, xml_cte, xml_nfe
from tests.conftest import (
    CHAVE_CFE_42,
    CHAVE_CTE_77,
    CHAVE_NFCE_900,
    CHAVE_NFE_501,
    CHAVE_NFE_503,
    CHAVE_NFE_ENTRADA,
)


def test_nfe_autorizada(xml_dir):
    nota = xml_nfe.parse(xml_dir / "nfe_saida_501.xml")
    assert nota.chave == CHAVE_NFE_501
    assert nota.modelo == "55"
    assert nota.serie == "1"
    assert nota.numero == "501"
    assert nota.situacao == "autorizada"
    assert nota.data_emissao == "2026-06-10"
    assert nota.emitente_cnpj == "12345678000199"
    assert nota.emitente_uf == "SE"
    assert nota.destinatario_cnpj == "11222333000144"
    assert nota.destinatario_uf == "BA"
    assert nota.valor_total == 500.0
    assert nota.vicms == 90.0
    assert nota.vpis == 8.25
    assert nota.vcofins == 38.0


def test_nfe_itens(xml_dir):
    nota = xml_nfe.parse(xml_dir / "nfe_entrada_123.xml")
    assert nota.chave == CHAVE_NFE_ENTRADA
    assert len(nota.itens) == 1
    item = nota.itens[0]
    assert item.n_item == 1
    assert item.cprod == "G001"
    assert item.xprod == "GASOLINA COMUM TIPO C"
    assert item.ncm == "27101259"
    assert item.cfop == "5656"
    assert item.cst_icms == "000"     # orig + CST
    assert item.vbc_icms == 1000.0
    assert item.p_icms == 18.0
    assert item.vicms == 180.0
    assert item.vipi == 0.0
    assert item.cst_pis == "01"
    assert item.vpis == 16.5
    assert item.vcofins == 76.0


def test_nfe_item_icms_st_sem_valores(xml_dir):
    nota = xml_nfe.parse(xml_dir / "nfe_saida_503_cancelada.xml")
    item = nota.itens[0]
    assert item.cst_icms == "060"
    assert item.vicms is None
    assert item.cst_pis == "06"


def test_nfce_modelo_65(xml_dir):
    nota = xml_nfe.parse(xml_dir / "nfce_900.xml")
    assert nota.chave == CHAVE_NFCE_900
    assert nota.modelo == "65"
    assert nota.numero == "900"
    assert nota.valor_total == 25.0


def test_evento_cancelamento(xml_dir):
    evento = xml_nfe.parse_evento(xml_dir / "evento_cancelamento_503.xml")
    assert evento.chave == CHAVE_NFE_503
    assert evento.tipo_evento == xml_nfe.TP_EVENTO_CANCELAMENTO
    assert evento.sequencia == 1
    assert evento.descricao == "Cancelamento"
    assert evento.protocolo == "128260000000099"
    assert evento.data_evento == "2026-06-12"


def test_cte(xml_dir):
    cte = xml_cte.parse(xml_dir / "cte_77.xml")
    assert cte.chave == CHAVE_CTE_77
    assert cte.modelo == "57"
    assert cte.numero == "77"
    assert cte.tomador == "3"
    assert cte.emitente_cnpj == "11222333000144"
    assert cte.destinatario_cnpj == "12345678000199"
    assert cte.valor_prestacao == 250.0
    assert cte.vicms == 30.0
    assert cte.chaves_nfe == [CHAVE_NFE_ENTRADA, CHAVE_NFE_501]


def test_cfe(xml_dir):
    cfe = xml_cfe.parse(xml_dir / "cfe_42.xml")
    assert cfe.chave == CHAVE_CFE_42
    assert cfe.modelo == "59"
    assert cfe.numero == "000042"
    assert cfe.serie_sat == "000123456"
    assert cfe.data_emissao == "2026-06-15"
    assert cfe.situacao == "autorizada"
    assert cfe.emitente_cnpj == "12345678000199"
    assert cfe.valor_total == 50.0
    assert len(cfe.itens) == 1
    item = cfe.itens[0]
    assert item.cprod == "P002"
    assert item.cfop == "5405"
    assert item.quantidade == 2.0
    assert item.cst_icms == "60"
