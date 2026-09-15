"""Testes do M4 — PIS/COFINS, cruzamento e exclusao do ICMS da base (RE 574.706)."""

from __future__ import annotations

import json

import pytest

from motor_fiscal import orquestracao, registro_modulos
from motor_fiscal.db import caminho_banco, conectar
from motor_fiscal.ingestao import efd_contribuicoes, gravacao, xml_importador
from motor_fiscal.pis_cofins import apuracao_m, auditoria, cruzamento, exclusao_icms, mapa
from motor_fiscal.pis_cofins._util import arred2, garantir_coluna_vicms_difal
from tests.conftest import CHAVE_NFE_501, COMPETENCIA, EMPRESA


@pytest.fixture
def con_m4(con, efd_contribuicoes_arquivo, xml_dir):
    """Banco com EFD-Contribuicoes + XMLs (cenario padrao das fixtures M0)."""
    efd_contribuicoes.importar(con, efd_contribuicoes_arquivo, EMPRESA, COMPETENCIA)
    xml_importador.importar_diretorio(con, xml_dir, EMPRESA, COMPETENCIA)
    return con


def test_modulo_auto_registrado():
    registro_modulos.descobrir()
    assert "pis_cofins" in registro_modulos.handlers_registrados()
    assert "pis_cofins" in orquestracao.MODULOS_DISPONIVEIS


def test_apuracao_recomputa_e_detecta_divergencia_credito(con_m4):
    """A170 tem credito PIS 33,00 / base 2000; M100 declara 16,50 / 1000."""
    rel = apuracao_m.apurar(con_m4)
    pis = rel["pis"]
    assert pis["debitos"]["recomputado"]["valor"] == 8.25
    assert pis["debitos"]["declarado"]["valor"] == 8.25
    assert pis["creditos"]["recomputado"]["valor"] == 33.0
    assert pis["creditos"]["declarado"]["valor"] == 16.5
    campos = {d["campo"] for d in pis["divergencias"]}
    assert "valor_credito" in campos
    assert pis["conforme"] is False

    cof = rel["cofins"]
    assert cof["debitos"]["recomputado"]["valor"] == 38.0
    assert cof["creditos"]["recomputado"]["valor"] == 152.0
    assert cof["creditos"]["declarado"]["valor"] == 76.0


def test_cruzamento_par_xml_efd_501(con_m4):
    cruz = cruzamento.cruzar(con_m4)
    assert CHAVE_NFE_501 not in cruz["documentos"]["somente_xml"]
    assert CHAVE_NFE_501 not in cruz["documentos"]["somente_efd_contribuicoes"]
    chaves_div = {d["chave"] for d in cruz["documentos"]["divergencias"]}
    assert CHAVE_NFE_501 not in chaves_div
    assert cruz["documentos"]["pares_ok"] >= 1
    assert cruz["f100"]["registros"] == 1


def test_exclusao_icms_normal_com_oportunidade(con_m4):
    """NF 501: base PIS 500 com ICMS 90 → base ajustada 410; diferenca de contribuicao."""
    rel = exclusao_icms.calcular(con_m4)
    normal = rel["variantes"]["normal"]
    assert normal["ha_oportunidade"] is True
    assert normal["totais"]["oportunidade_pis"] > 0
    assert normal["totais"]["oportunidade_cofins"] > 0

    itens_90 = [i for i in normal["itens"] if i["icms_excluido"] == 90.0]
    assert itens_90, "esperado pelo menos um item com ICMS 90 a excluir"
    item = itens_90[0]
    assert item["pis"]["base_ajustada"] == 410.0
    assert item["pis"]["valor_ajustado"] == arred2(410.0 * 1.65 / 100)
    assert item["pis"]["diferenca"] == arred2(
        item["pis"]["valor_original"] - item["pis"]["valor_ajustado"]
    )
    assert rel["oportunidade_competencia"]["total"] > 0
    assert rel["tese"] == "RE 574.706"


def test_exclusao_icms_st_e_difal(con):
    """Cenario sintetico com diferenca plantada em ST e DIFAL."""
    garantir_coluna_vicms_difal(con)
    doc_id = gravacao.inserir_documento(con, {
        "empresa_cnpj": EMPRESA,
        "competencia": COMPETENCIA,
        "origem": "xml",
        "tipo": "nfe",
        "chave": "28260612345678000199550010000009991000009999",
        "modelo": "55",
        "serie": "1",
        "numero": "999",
        "ind_operacao": "1",
        "situacao": "autorizada",
        "valor_total": 1000.0,
        "vicms": 0.0,
        "vicms_st": 150.0,
        "vpis": 16.5,
        "vcofins": 76.0,
    })
    gravacao.inserir_item(con, {
        "documento_id": doc_id,
        "n_item": 1,
        "codigo_produto": "ST01",
        "cfop": "5405",
        "valor_produto": 1000.0,
        "cst_pis": "01",
        "vbc_pis": 1000.0,
        "aliq_pis": 1.65,
        "vpis": 16.5,
        "cst_cofins": "01",
        "vbc_cofins": 1000.0,
        "aliq_cofins": 7.60,
        "vcofins": 76.0,
        "vicms": 0.0,
        "vicms_st": 150.0,
        "vicms_difal": 80.0,
    })
    con.commit()

    rel = exclusao_icms.calcular(con)
    st = rel["variantes"]["st"]
    difal = rel["variantes"]["difal"]
    assert st["ha_oportunidade"] is True
    assert st["totais"]["icms_excluido"] == 150.0
    assert st["itens"][0]["pis"]["base_ajustada"] == 850.0
    assert difal["ha_oportunidade"] is True
    assert difal["totais"]["icms_excluido"] == 80.0
    assert difal["itens"][0]["pis"]["base_ajustada"] == 920.0
    assert rel["variantes"]["normal"]["totais"]["itens_com_efeito"] == 0


def test_mapa_tributario(con_m4):
    m = mapa.montar(con_m4)
    assert m["total_combinacoes"] >= 1
    assert m["total_itens"] >= 1
    cst01 = [l for l in m["linhas"] if l["cst_pis"] == "01"]
    assert cst01


def test_auditoria_contrato_json_m8(con_m4, tmp_path):
    rel = auditoria.auditar(con_m4, EMPRESA, COMPETENCIA)
    assert rel["modulo"] == "pis_cofins"
    assert rel["empresa_cnpj"] == EMPRESA
    assert rel["competencia"] == COMPETENCIA
    assert "apuracao" in rel and "pis" in rel["apuracao"] and "cofins" in rel["apuracao"]
    assert "cruzamento" in rel
    assert "exclusao_icms" in rel
    assert set(rel["exclusao_icms"]["variantes"]) == {"normal", "st", "difal"}
    assert "mapa_tributario" in rel
    assert "resumo" in rel
    assert "erros" in rel["resumo"] and "total" in rel["resumo"]
    assert "oportunidade_exclusao_icms" in rel["resumo"]
    assert any(a["codigo"] == "PISCOFINS_EXCLUSAO_ICMS" for a in rel["achados"])

    path = auditoria.gravar_json(rel, tmp_path / "pis_cofins.json")
    carregado = json.loads(path.read_text(encoding="utf-8"))
    assert carregado["modulo"] == "pis_cofins"
    assert carregado["exclusao_icms"]["oportunidade_competencia"]["total"] > 0


def test_cli_auditar_pis_cofins(tmp_path, efd_contribuicoes_arquivo, xml_dir):
    db_dir = tmp_path / "db"
    saida_consolidada = tmp_path / "_local" / "auditorias" / EMPRESA / f"{COMPETENCIA}.json"
    banco = caminho_banco(EMPRESA, COMPETENCIA, db_dir)
    con = conectar(banco)
    try:
        efd_contribuicoes.importar(con, efd_contribuicoes_arquivo, EMPRESA, COMPETENCIA)
        xml_importador.importar_diretorio(con, xml_dir, EMPRESA, COMPETENCIA)
    finally:
        con.close()

    from motor_fiscal.__main__ import main

    # Divergencias de credito geram erros → exit 1, mas JSON e gerado.
    rc = main([
        "auditar",
        "--empresa", EMPRESA,
        "--competencia", COMPETENCIA,
        "--modulos", "pis_cofins",
        "--db-dir", str(db_dir),
        "--saida", str(saida_consolidada),
    ])
    assert rc in (0, 1)
    assert saida_consolidada.is_file()
    consolidado = json.loads(saida_consolidada.read_text(encoding="utf-8"))
    assert "pis_cofins" in consolidado["modulos"]
    assert consolidado["modulos"]["pis_cofins"]["exclusao_icms"]["tese"] == "RE 574.706"

    json_mod = tmp_path / "_local" / "relatorios" / EMPRESA / COMPETENCIA / "pis_cofins.json"
    assert json_mod.is_file()
    dados = json.loads(json_mod.read_text(encoding="utf-8"))
    assert dados["modulo"] == "pis_cofins"
    assert dados["exclusao_icms"]["oportunidade_competencia"]["total"] > 0
