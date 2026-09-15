"""M7 — Margens e oportunidades fiscais."""

from motor_fiscal.ingestao import efd_icms_ipi
from motor_fiscal.margens import auditar_margens
from tests.conftest import COMPETENCIA, EMPRESA
from tests import helpers_db as H


def test_margem_por_produto(con):
    ent = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="1" * 44,
        ind_operacao="0", numero="1", valor_total=1000,
    )
    H.item(con, ent, codigo_produto="P001", quantidade=100, valor_produto=1000, cfop="1102")
    sai = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="2" * 44,
        ind_operacao="1", numero="2", valor_total=1500,
    )
    H.item(con, sai, codigo_produto="P001", quantidade=100, valor_produto=1500, cfop="5102")
    H.commit(con)

    r = auditar_margens(con, EMPRESA, COMPETENCIA)
    p = r["margens"]["produtos"][0]
    assert p["custo_medio"] == 10.0
    assert p["preco_medio_venda"] == 15.0
    assert p["margem_unitaria"] == 5.0
    assert p["margem_percentual"] == 50.0


def test_oportunidades_plantadas(con):
    # Credito nao aproveitado: entrada CFOP 1102 CST 00 com BC e sem vICMS
    ent = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="3" * 44,
        ind_operacao="0", numero="3", valor_total=200,
    )
    H.item(
        con, ent, codigo_produto="P001", quantidade=10, valor_produto=200,
        cfop="1102", cst_icms="000", vbc_icms=200, vicms=0, aliq_icms=18,
    )
    # CST/CFOP incoerente: CFOP de saida em operacao de entrada
    ent2 = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="4" * 44,
        ind_operacao="0", numero="4", valor_total=50,
    )
    H.item(
        con, ent2, codigo_produto="P002", quantidade=1, valor_produto=50,
        cfop="5102", cst_icms="000",
    )
    # Beneficio potencial: saida 5102 aliq 18 CST 00
    sai = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="5" * 44,
        ind_operacao="1", numero="5", valor_total=100,
    )
    H.item(
        con, sai, codigo_produto="P001", quantidade=5, valor_produto=100,
        cfop="5102", cst_icms="000", aliq_icms=18, vicms=18,
    )
    # ST em duplicidade aparente: saida CST 00 com vICMS e vICMS_ST
    sai2 = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="6" * 44,
        ind_operacao="1", numero="6", valor_total=100,
    )
    H.item(
        con, sai2, codigo_produto="P001", quantidade=1, valor_produto=100,
        cfop="5102", cst_icms="000", vicms=18, vicms_st=10,
    )
    H.commit(con)

    r = auditar_margens(con, EMPRESA, COMPETENCIA)
    op = r["oportunidades"]
    assert op["contagens"]["credito_nao_aproveitado"] >= 1
    assert op["contagens"]["cst_cfop_incoerentes"] >= 1
    assert op["contagens"]["beneficios_nao_aplicados"] >= 1
    assert op["contagens"]["st_duplicidade"] >= 1
    codigos = {a["codigo"] for a in r["achados"]}
    assert "CREDITO_NAO_APROVEITADO" in codigos
    assert "CST_CFOP_INCOERENTE" in codigos
    assert "BENEFICIO_NAO_APLICADO" in codigos
    assert "ST_EM_DUPLICIDADE" in codigos
    assert r["ok"] is False


def test_fixtures_m0_margens_roda(con, efd_icms_ipi_arquivo):
    efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)
    r = auditar_margens(con, EMPRESA, COMPETENCIA)
    assert r["modulo"] == "margens"
    assert r["margens"]["contagens"]["produtos"] >= 1
    p001 = next(p for p in r["margens"]["produtos"] if p["codigo"] == "P001")
    assert p001["custo_medio"] == 5.0  # 1000/200
    assert p001["preco_medio_venda"] == 5.0  # 500/100
