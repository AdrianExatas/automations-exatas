"""M5 — Estoque/Inventario: movimentacao, saldos, auditoria e H010 proposto."""

from motor_fiscal.estoque import auditar_estoque
from motor_fiscal.ingestao import efd_icms_ipi
from tests.conftest import COMPETENCIA, EMPRESA
from tests import helpers_db as H


def _cenario_conforme(con):
    """Entrada 100 + saida 40 = saldo 60; H010=60; K200=60."""
    H.produto(con, origem="efd_0200", codigo="P001", descricao="GASOLINA", unidade="LT")
    ent = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="1" * 44,
        ind_operacao="0", numero="1", valor_total=500,
    )
    H.item(con, ent, codigo_produto="P001", quantidade=100, valor_produto=500, unidade="LT", cfop="1656")
    sai = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="2" * 44,
        ind_operacao="1", numero="2", valor_total=240,
    )
    H.item(con, sai, codigo_produto="P001", quantidade=40, valor_produto=240, unidade="LT", cfop="5656")
    H.reg_efd(con, "H005", {"DT_INV": "30062026", "VL_INV": "300,00", "MOT_INV": "01"}, 1)
    H.reg_efd(con, "H010", {
        "COD_ITEM": "P001", "UNID": "LT", "QTD": "60,00", "VL_UNIT": "5,00",
        "VL_ITEM": "300,00", "IND_PROP": "0", "COD_PART": "", "TXT_COMPL": "",
        "COD_CTA": "", "VL_ITEM_IR": "300,00",
    }, 2)
    H.reg_efd(con, "K200", {
        "DT_EST": "30062026", "COD_ITEM": "P001", "QTD": "60,00", "IND_EST": "0", "COD_PART": "",
    }, 3)
    H.commit(con)


def test_estoque_conforme(con):
    _cenario_conforme(con)
    r = auditar_estoque(con, EMPRESA, COMPETENCIA)
    assert r["ok"] is True
    p = r["movimentacao"]["produtos"][0]
    assert p["codigo"] == "P001"
    assert p["qtd_entrada"] == 100
    assert p["qtd_saida"] == 40
    assert p["saldo_teorico_qtd"] == 60
    assert p["custo_medio"] == 5.0
    assert r["saldos"]["contagens"]["divergencias_teorico_h010"] == 0
    assert r["inventario_proposto"]["contagens"]["linhas"] == 1
    assert r["inventario_proposto"]["h010_proposto"][0]["QTD"] == 60


def test_estoque_saldo_negativo_e_divergencias(con):
    H.produto(con, origem="efd_0200", codigo="P001", descricao="GASOLINA", unidade="LT")
    H.produto(con, origem="efd_0200", codigo="P002", descricao="OLEO", unidade="UN")
    sai = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="3" * 44,
        ind_operacao="1", numero="3", valor_total=100,
    )
    H.item(con, sai, codigo_produto="P001", quantidade=50, valor_produto=100, cfop="5656")
    # H010 e K200 divergentes entre si e do teorico (teorico = -50)
    H.reg_efd(con, "H005", {"DT_INV": "30062026", "VL_INV": "100,00", "MOT_INV": "01"}, 1)
    H.reg_efd(con, "H010", {
        "COD_ITEM": "P001", "UNID": "LT", "QTD": "10,00", "VL_UNIT": "5,00",
        "VL_ITEM": "50,00", "IND_PROP": "0", "COD_PART": "", "TXT_COMPL": "",
        "COD_CTA": "", "VL_ITEM_IR": "",
    }, 2)
    H.reg_efd(con, "H010", {
        "COD_ITEM": "P002", "UNID": "UN", "QTD": "20,00", "VL_UNIT": "2,50",
        "VL_ITEM": "50,00", "IND_PROP": "0", "COD_PART": "", "TXT_COMPL": "",
        "COD_CTA": "", "VL_ITEM_IR": "",
    }, 3)
    H.reg_efd(con, "K200", {
        "DT_EST": "30062026", "COD_ITEM": "P001", "QTD": "5,00", "IND_EST": "0", "COD_PART": "",
    }, 4)
    H.reg_efd(con, "K220", {
        "DT_MOV": "15062026", "COD_ITEM_ORI": "P001", "COD_ITEM_DEST": "P002", "QTD": "1,00",
    }, 5)
    H.commit(con)

    r = auditar_estoque(con, EMPRESA, COMPETENCIA)
    codigos = {a["codigo"] for a in r["achados"]}
    assert "ESTOQUE_SALDO_NEGATIVO" in codigos
    assert "ESTOQUE_GIRO_INCOERENTE" in codigos
    assert "ESTOQUE_DIVERGENCIA_H010" in codigos
    assert "ESTOQUE_DIVERGENCIA_K200" in codigos
    assert "ESTOQUE_SEM_MOVIMENTACAO" in codigos  # P002
    assert r["saldos"]["k220"]
    assert r["ok"] is False


def test_fixtures_m0_estoque_roda(con, efd_icms_ipi_arquivo):
    efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)
    r = auditar_estoque(con, EMPRESA, COMPETENCIA)
    assert r["modulo"] == "estoque"
    # P001: entrada 200 - saida 100 = 100; H010/K200 = 100 -> alinhado
    p001 = next(p for p in r["movimentacao"]["produtos"] if p["codigo"] == "P001")
    assert p001["saldo_teorico_qtd"] == 100
    assert r["inventario_proposto"]["vl_inv_proposto"] is not None
