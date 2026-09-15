"""Testes do parser generico SPED (formato |REG|...|, bloco 9, tolerancia)."""

from motor_fiscal.ingestao import sped


def test_parse_arquivo_completo_sem_avisos(efd_icms_ipi_arquivo):
    resultado = sped.parse_arquivo(efd_icms_ipi_arquivo)
    assert resultado.total_linhas == 105
    assert resultado.contagem["0000"] == 1
    assert resultado.contagem["C100"] == 2
    assert resultado.contagem["9900"] == 49
    # bloco 9 consistente com o conteudo -> nenhum aviso
    assert resultado.avisos == []


def test_registros_desconhecidos_sao_contabilizados(tmp_path):
    arquivo = tmp_path / "efd.txt"
    arquivo.write_text(
        "|0000|017|0|\n|Z999|x|y|\n|Z999|a|b|\n|9999|4|\n",
        encoding="latin-1",
    )
    resultado = sped.parse_arquivo(arquivo, registros_conhecidos={"0000", "9999"})
    assert resultado.desconhecidos == {"Z999": 2}
    # desconhecidos continuam disponiveis crus
    assert sum(1 for r in resultado.registros if r.registro == "Z999") == 2


def test_divergencia_bloco_9_gera_aviso(tmp_path):
    arquivo = tmp_path / "efd.txt"
    arquivo.write_text(
        "|0000|017|0|\n|C100|0|1|\n|9900|0000|1|\n|9900|C100|5|\n|9900|9900|4|\n|9900|9999|1|\n|9999|7|\n",
        encoding="latin-1",
    )
    resultado = sped.parse_arquivo(arquivo)
    assert any("C100" in aviso for aviso in resultado.avisos)


def test_total_9999_divergente_gera_aviso(tmp_path):
    arquivo = tmp_path / "efd.txt"
    arquivo.write_text(
        "|0000|017|0|\n|9900|0000|1|\n|9900|9900|3|\n|9900|9999|1|\n|9999|99|\n",
        encoding="latin-1",
    )
    resultado = sped.parse_arquivo(arquivo)
    assert any("9999" in aviso for aviso in resultado.avisos)


def test_linha_malformada_tolerada(tmp_path):
    arquivo = tmp_path / "efd.txt"
    arquivo.write_text(
        "|0000|017|0|\nlinha sem pipe\n|9999|3|\n",
        encoding="latin-1",
    )
    resultado = sped.parse_arquivo(arquivo)
    assert len(resultado.registros) == 2
    assert any("formato invalido" in aviso for aviso in resultado.avisos)


def test_encoding_latin1(tmp_path):
    arquivo = tmp_path / "efd.txt"
    arquivo.write_bytes("|0150|P1|JOSÉ AÇÚCAR|\n".encode("latin-1"))
    resultado = sped.parse_arquivo(arquivo)
    assert resultado.registros[0].campos[1] == "JOSÉ AÇÚCAR"


def test_conversores():
    assert sped.numero("1234,56") == 1234.56
    assert sped.numero("0,00") == 0.0
    assert sped.numero("") is None
    assert sped.numero(None) is None
    assert sped.data_iso("05062026") == "2026-06-05"
    assert sped.data_iso("") is None


def test_tipificar_campos_faltantes_e_excedentes():
    reg = sped.RegistroSped("X001", ["a", "b", "c"], 1)
    dados = sped.tipificar(reg, ["CAMPO1", "CAMPO2"])
    assert dados == {"CAMPO1": "a", "CAMPO2": "b", "_extra_3": "c"}
    dados = sped.tipificar(reg, ["C1", "C2", "C3", "C4"])
    assert dados["C4"] == ""
