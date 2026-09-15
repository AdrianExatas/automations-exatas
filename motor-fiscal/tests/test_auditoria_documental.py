"""M1 — Auditoria documental: cenarios conforme e com falhas plantadas."""

from motor_fiscal.auditoria import auditar_documental
from motor_fiscal.auditoria.correlacao_produtos import correlacionar_produtos
from motor_fiscal.ingestao import efd_icms_ipi, xml_importador
from tests.conftest import COMPETENCIA, EMPRESA
from tests import helpers_db as H


def test_faltantes_xml_sem_efd_e_efd_sem_xml(con):
    H.doc(con, origem="xml", tipo="nfe", chave="A" * 44, numero="10", valor_total=50)
    H.doc(con, origem="efd_icms_ipi", tipo="nfe", chave="B" * 44, numero="11", valor_total=80)
    H.commit(con)

    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    codigos = {a["codigo"] for a in r["achados"]}
    assert "XML_SEM_EFD" in codigos
    assert "EFD_SEM_XML" in codigos
    assert r["faltantes"]["contagens"]["xml_sem_efd"] == 1
    assert r["faltantes"]["contagens"]["efd_sem_xml"] == 1
    assert r["ok"] is False


def test_cancelada_escriturada_e_duplicada(con):
    chave = "C" * 44
    H.doc(con, origem="xml", tipo="nfe", chave=chave, situacao="cancelada", numero="20")
    H.doc(con, origem="efd_icms_ipi", tipo="nfe", chave=chave, situacao="regular", numero="20")
    H.doc(con, origem="xml", tipo="nfe", chave="D" * 44, numero="21")
    H.doc(con, origem="xml", tipo="nfe", chave="D" * 44, numero="21")  # duplicada
    H.commit(con)

    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    codigos = {a["codigo"] for a in r["achados"]}
    assert "CANCELADA_ESCRITURADA" in codigos
    assert "DOCUMENTO_DUPLICADO" in codigos


def test_outra_competencia(con):
    H.doc(
        con, origem="xml", tipo="nfe", chave="E" * 44,
        data_emissao="2026-05-31", numero="30",
    )
    H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave="E" * 44,
        data_emissao="2026-05-31", numero="30",
    )
    H.commit(con)
    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    assert any(a["codigo"] == "OUTRA_COMPETENCIA" for a in r["achados"])


def test_quebra_sequencia(con):
    for n in (1, 2, 4, 5):  # falta o 3
        H.doc(
            con, origem="efd_icms_ipi", tipo="nfe",
            chave=f"{n:044d}", numero=str(n), modelo="55", serie="1",
        )
    H.commit(con)
    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    assert r["sequencia"]["contagens"]["quebras"] == 1
    assert 3 in r["sequencia"]["quebras"][0]["numeros_faltantes"]
    assert r["sequencia"]["quebras"][0]["total_faltantes"] == 1


def test_quebra_sequencia_gaps_multiplos(con):
    """Presentes {1,2,5} → faltam [3,4], total 2 (sem materializar range gigante)."""
    for n in (1, 2, 5):
        H.doc(
            con, origem="efd_icms_ipi", tipo="nfe",
            chave=f"{n:044d}", numero=str(n), modelo="55", serie="1",
        )
    H.commit(con)
    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    q = r["sequencia"]["quebras"][0]
    assert q["numeros_faltantes"] == [3, 4]
    assert q["total_faltantes"] == 2


def test_quebra_sequencia_span_gigante_sem_memory_error(con):
    """Span absurdo com poucos docs → anomalia; nao estoura memoria."""
    for n in (1, 10**9):
        H.doc(
            con, origem="efd_icms_ipi", tipo="nfe",
            chave=f"{n:044d}", numero=str(n), modelo="55", serie="9",
        )
    H.commit(con)
    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    q = r["sequencia"]["quebras"][0]
    assert q.get("anomalia_span") is True
    assert len(q["numeros_faltantes"]) == 0
    assert q["total_faltantes"] == 10**9 - 2  # (max-min+1) - presentes
    assert any(a["codigo"] == "QUEBRA_SEQUENCIA" for a in r["achados"])


def test_quebra_sequencia_gap_enorme_amostra_limitada(con):
    """Muitos presentes + um salto enorme: conta por aritmetica, amostra <= 100."""
    from motor_fiscal.auditoria.sequencia import _AMOSTRA_FALTANTES, auditar_sequencia

    # 60 docs consecutivos (acima do limiar de anomalia) + um numero distante
    for n in list(range(1, 61)) + [10**9]:
        H.doc(
            con, origem="efd_icms_ipi", tipo="nfe",
            chave=f"{n:044d}", numero=str(n), modelo="55", serie="2",
        )
    H.commit(con)
    r = auditar_sequencia(con)
    assert r["contagens"]["quebras"] == 1
    q = r["quebras"][0]
    assert q.get("anomalia_span") is not True
    assert len(q["numeros_faltantes"]) == _AMOSTRA_FALTANTES
    assert q["numeros_faltantes"][0] == 61
    assert q["total_faltantes"] == 10**9 - 60 - 1


def test_correlacao_cte_nfe(con):
    chave_nfe = "1" * 44
    chave_fantasma = "9" * 44
    H.doc(con, origem="efd_icms_ipi", tipo="nfe", chave=chave_nfe, numero="100")
    H.doc(
        con, origem="xml", tipo="cte", chave="2" * 44, modelo="57", numero="77",
        chaves_referenciadas=[chave_nfe, chave_fantasma],
    )
    H.commit(con)
    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    assert r["correlacao_cte_nfe"]["contagens"]["encontradas"] == 1
    assert r["correlacao_cte_nfe"]["contagens"]["nao_encontradas"] == 1
    assert any(a["codigo"] == "CTE_NFE_NAO_ENCONTRADA" for a in r["achados"])


def test_correlacao_produtos_exato_e_descricao(con):
    H.produto(con, origem="xml", codigo="G001", descricao="GASOLINA COMUM TIPO C")
    H.produto(con, origem="xml", codigo="P002", descricao="OLEO LUBRIFICANTE")
    H.produto(con, origem="efd_0200", codigo="P001", descricao="GASOLINA COMUM")
    H.produto(con, origem="efd_0200", codigo="P002", descricao="OLEO LUBRIFICANTE")
    H.commit(con)

    r = correlacionar_produtos(con, EMPRESA, persistir=True)
    assert r["contagens"]["exato"] == 1  # P002
    assert r["contagens"]["descricao"] == 1  # G001 -> P001
    mapa = {p["codigo_xml"]: p["codigo_efd"] for p in r["pares"]}
    assert mapa["G001"] == "P001"
    assert mapa["P002"] == "P002"

    salvos = con.execute("SELECT COUNT(*) FROM de_para_produtos").fetchone()[0]
    assert salvos == 2


def test_divergencia_nota_e_produto(con):
    chave = "F" * 44
    xml_id = H.doc(
        con, origem="xml", tipo="nfe", chave=chave, numero="50",
        valor_total=1000.0, vicms=180.0,
    )
    efd_id = H.doc(
        con, origem="efd_icms_ipi", tipo="nfe", chave=chave, numero="50",
        valor_total=999.0, vicms=180.0,  # diverge valor_total
    )
    H.item(con, xml_id, codigo_produto="P001", quantidade=10, valor_produto=1000, cfop="5102", vicms=180)
    H.item(con, efd_id, codigo_produto="P001", quantidade=9, valor_produto=999, cfop="5102", vicms=180)
    H.produto(con, origem="xml", codigo="P001", descricao="GASOLINA COMUM")
    H.produto(con, origem="efd_0200", codigo="P001", descricao="GASOLINA COMUM")
    H.commit(con)

    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    assert r["divergencias"]["contagens"]["notas_divergentes"] == 1
    assert r["divergencias"]["contagens"]["produtos_divergentes"] >= 1
    codigos = {a["codigo"] for a in r["achados"]}
    assert "DIVERGENCIA_NOTA" in codigos
    assert "DIVERGENCIA_PRODUTO" in codigos


def test_fixtures_m0_documental_roda(con, xml_dir, efd_icms_ipi_arquivo):
    """Smoke: fixtures M0 importadas passam pela auditoria sem crash."""
    xml_importador.importar_diretorio(con, xml_dir, EMPRESA, COMPETENCIA)
    efd_icms_ipi.importar(con, efd_icms_ipi_arquivo, EMPRESA, COMPETENCIA)
    r = auditar_documental(con, EMPRESA, COMPETENCIA)
    assert r["modulo"] == "documental"
    assert "resumo" in r
    # G001 (XML) x P001 (EFD) devem correlacionar por descricao
    assert r["correlacao_produtos"]["contagens"]["pares"] >= 1
    assert con.execute("SELECT COUNT(*) FROM de_para_produtos").fetchone()[0] >= 1
