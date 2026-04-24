from pathlib import Path

import pandas as pd

from sieg_xml.core.chave_extractor import processar_arquivo, processar_arquivos, processar_texto_digitado


CHAVE = "35250112345678000123550010000000011000000010"
CHAVE2 = "35250112345678000123550010000000011000000011"


def test_processa_arquivo_texto(tmp_path: Path):
    arquivo = tmp_path / "entrada.txt"
    arquivo.write_text(f"foo {CHAVE} bar\n{CHAVE}\n", encoding="utf-8")
    assert processar_arquivo(arquivo) == [CHAVE]


def test_processa_planilha_excel(tmp_path: Path):
    arquivo = tmp_path / "entrada.xlsx"
    pd.DataFrame({"a": [CHAVE]}).to_excel(arquivo, index=False)
    assert processar_arquivo(arquivo) == [CHAVE]


def test_processa_csv_virgula(tmp_path: Path):
    arquivo = tmp_path / "chaves.csv"
    arquivo.write_text(f"coluna,{CHAVE}\n", encoding="utf-8")
    assert processar_arquivo(arquivo) == [CHAVE]


def test_processa_csv_ponto_virgula(tmp_path: Path):
    arquivo = tmp_path / "chaves_br.csv"
    arquivo.write_text(f"coluna;{CHAVE2}\n", encoding="utf-8")
    assert processar_arquivo(arquivo) == [CHAVE2]


def test_processa_arquivos_ordem_e_dedup(tmp_path: Path):
    t1 = tmp_path / "a.txt"
    t2 = tmp_path / "b.txt"
    t1.write_text(CHAVE + "\n", encoding="utf-8")
    t2.write_text("\n".join([CHAVE2, CHAVE]) + "\n", encoding="utf-8")
    assert processar_arquivos([t1, t2]) == [CHAVE, CHAVE2]


def test_processa_texto_digitado_remove_duplicadas_e_reporta_invalidas():
    texto = "\n".join(
        [
            CHAVE,
            f"{CHAVE}  ",
            "123456",
            "texto sem chave",
            "foo 35250112345678000123550010000000011000000011 bar",
        ]
    )
    chaves, invalidas = processar_texto_digitado(texto)
    assert chaves == [CHAVE, "35250112345678000123550010000000011000000011"]
    assert invalidas == ["123456"]
