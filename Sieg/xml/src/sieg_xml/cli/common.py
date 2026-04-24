"""Helpers compartilhados entre os subcomandos da CLI."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable

import pandas as pd

from ..core.xml_organizer import MODE_FLAT, MODE_YEAR, MODE_YEAR_MONTH
from ..core.xml_parser import extrair_chave_acesso
from ..utils.file_utils import buscar_xmls_recursivo


MODE_OPTION_TO_ORGANIZER = {
    "flat": MODE_FLAT,
    "year": MODE_YEAR,
    "year-month": MODE_YEAR_MONTH,
}


def print_header(title: str) -> None:
    print("=" * 60)
    print(title)
    print("=" * 60)


def load_lines(path: str) -> list[str]:
    with open(path, "r", encoding="utf-8") as handle:
        return [line.strip() for line in handle if line.strip()]


def save_chaves_output(chaves: list[str]) -> list[str]:
    arquivos_gerados: list[str] = []
    df_resultado = pd.DataFrame({"Chave XML": sorted(set(chaves))})
    arquivo_excel_saida = "chaves_xml_consolidadas.xlsx"
    df_resultado.to_excel(arquivo_excel_saida, index=False)
    arquivos_gerados.append(arquivo_excel_saida)

    arquivo_txt_saida = "chaves_xml_consolidadas.txt"
    with open(arquivo_txt_saida, "w", encoding="utf-8") as handle:
        for chave in df_resultado["Chave XML"]:
            handle.write(f"{chave}\n")
    arquivos_gerados.append(arquivo_txt_saida)
    return arquivos_gerados


def resolve_reprocess_paths_by_name(pasta: str, nomes_arquivos: Iterable[str]) -> list[str]:
    xmls_encontrados = buscar_xmls_recursivo(pasta)
    nomes_normalizados = {os.path.basename(nome).strip().lower() for nome in nomes_arquivos if nome.strip()}
    return [caminho for caminho in xmls_encontrados if os.path.basename(caminho).strip().lower() in nomes_normalizados]


def resolve_reprocess_paths_by_key(pasta: str, chaves: Iterable[str]) -> list[str]:
    xmls_encontrados = buscar_xmls_recursivo(pasta)
    chaves_set = {chave.strip() for chave in chaves if chave.strip()}
    caminhos: list[str] = []
    for caminho_xml in xmls_encontrados:
        try:
            chave = extrair_chave_acesso(Path(caminho_xml).read_text(encoding="utf-8"))
            if chave and chave in chaves_set:
                caminhos.append(caminho_xml)
        except Exception:
            continue
    return caminhos
