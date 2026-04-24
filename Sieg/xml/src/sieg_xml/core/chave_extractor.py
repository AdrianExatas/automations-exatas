"""Extracao de chaves de XML a partir de planilhas, textos e entrada manual."""

from __future__ import annotations

import re
import traceback
from pathlib import Path
from typing import List, Sequence

import pandas as pd


CHAVE_REGEX = re.compile(r"(?<!\d)\d{44}(?!\d)")


def extrair_chaves_xml(texto: str) -> List[str]:
    """Extrai chaves de XML de um texto."""
    if not texto or pd.isna(texto):
        return []

    texto_str = str(texto).strip()
    texto_str = texto_str.replace(" ", "").replace("-", "").replace(".", "")

    chaves = CHAVE_REGEX.findall(texto_str)
    return [chave for chave in chaves if chave.isdigit() and len(chave) == 44]


def _converter_valor_para_texto(valor) -> str:
    """Converte um valor para texto, tratando notacao cientifica e floats grandes."""
    if pd.isna(valor) or valor == "nan" or str(valor).strip().lower() == "nan":
        return ""

    valor_str = str(valor).strip()
    if not valor_str:
        return ""

    if isinstance(valor, (int, float)):
        if isinstance(valor, float):
            if "e" in valor_str.lower():
                return ""
            if valor.is_integer():
                try:
                    valor_str = str(int(valor))
                except (ValueError, OverflowError):
                    if len(valor_str.replace(".", "").replace("-", "")) > 15:
                        return ""
                    valor_str = str(valor)
            else:
                return ""
        else:
            valor_str = str(valor)

    return valor_str


def _chaves_unicas_de_dataframe(df: pd.DataFrame | None) -> tuple[list[str], int, int]:
    """Extrai chaves de todas as celulas; retorna (chaves_unicas, total_celulas, celulas_com_chaves)."""
    if df is None or df.empty:
        return [], 0, 0

    chaves_encontradas: list[str] = []
    total_celulas = 0
    celulas_com_chaves = 0

    for coluna in df.columns:
        for valor in df[coluna]:
            total_celulas += 1
            if pd.notna(valor):
                valor_texto = _converter_valor_para_texto(valor)
                if not valor_texto:
                    continue
                chaves = extrair_chaves_xml(valor_texto)
                if chaves:
                    celulas_com_chaves += 1
                    chaves_encontradas.extend(chaves)

    chaves_unicas: list[str] = []
    for chave in chaves_encontradas:
        if chave.isdigit() and len(chave) == 44 and chave not in chaves_unicas:
            chaves_unicas.append(chave)

    return chaves_unicas, total_celulas, celulas_com_chaves


def processar_arquivo_texto(caminho_arquivo: str) -> List[str]:
    """Processa um arquivo de texto e extrai todas as chaves encontradas."""
    print(f"Processando arquivo de texto: {caminho_arquivo}")
    chaves_encontradas: list[str] = []

    try:
        encodings = ["cp1252", "latin-1", "iso-8859-1", "utf-8"]
        conteudo = None
        encoding_usado = None

        for encoding in encodings:
            try:
                with open(caminho_arquivo, "r", encoding=encoding) as file_handle:
                    conteudo = file_handle.read()
                encoding_usado = encoding
                break
            except UnicodeDecodeError:
                continue

        if conteudo is None:
            try:
                with open(caminho_arquivo, "r", encoding="utf-8", errors="replace") as file_handle:
                    conteudo = file_handle.read()
                encoding_usado = "utf-8 (substituindo erros)"
            except Exception as exc:
                print(f"  Erro: Nao foi possivel ler o arquivo: {exc}")
                return []

        if encoding_usado:
            print(f"  Codificacao usada: {encoding_usado}")

        chaves_encontradas.extend(extrair_chaves_xml(conteudo))
        linhas_processadas = len(conteudo.splitlines())

        chaves_unicas: list[str] = []
        for chave in chaves_encontradas:
            if chave.isdigit() and len(chave) == 44 and chave not in chaves_unicas:
                chaves_unicas.append(chave)

        print(f"  Linhas processadas: {linhas_processadas}")
        print(f"  Encontradas {len(chaves_unicas)} chaves unicas")
        return chaves_unicas
    except Exception as exc:
        print(f"  Erro ao processar arquivo de texto {caminho_arquivo}: {exc}")
        print("  Detalhes do erro:")
        traceback.print_exc()
        return []


def processar_planilha(caminho_arquivo: str) -> List[str]:
    """Processa uma planilha Excel e extrai todas as chaves encontradas."""
    print(f"Processando: {caminho_arquivo}")

    try:
        df = None

        try:
            df = pd.read_excel(caminho_arquivo, header=None, dtype=str, engine="openpyxl")
        except Exception as exc_openpyxl_str:
            try:
                df = pd.read_excel(caminho_arquivo, header=None, engine="openpyxl")
                for col in df.columns:
                    df[col] = df[col].astype(str)
            except Exception as exc_openpyxl:
                try:
                    df = pd.read_excel(caminho_arquivo, header=None, engine="xlrd")
                    for col in df.columns:
                        df[col] = df[col].astype(str)
                except Exception as exc_xlrd:
                    print("  Erro ao ler planilha:")
                    print(f"    Tentativa 1 (openpyxl + dtype=str): {exc_openpyxl_str}")
                    print(f"    Tentativa 2 (openpyxl): {exc_openpyxl}")
                    print(f"    Tentativa 3 (xlrd): {exc_xlrd}")
                    raise

        if df is None or df.empty:
            print("  Aviso: Planilha vazia ou nao pode ser lida")
            return []

        chaves_unicas, total_celulas, celulas_com_chaves = _chaves_unicas_de_dataframe(df)

        print(f"  Celulas processadas: {total_celulas}")
        print(f"  Celulas com chaves: {celulas_com_chaves}")
        print(f"  Encontradas {len(chaves_unicas)} chaves unicas")
        return chaves_unicas
    except Exception as exc:
        print(f"  Erro ao processar {caminho_arquivo}: {exc}")
        print("  Detalhes do erro:")
        traceback.print_exc()
        return []


def processar_csv(caminho_arquivo: str) -> List[str]:
    """Le CSV com deteccao de separador (pandas) e extrai chaves como na planilha."""
    print(f"Processando CSV: {caminho_arquivo}")
    encodings = ["utf-8-sig", "utf-8", "cp1252", "latin-1", "iso-8859-1"]

    for encoding in encodings:
        try:
            df = pd.read_csv(
                caminho_arquivo,
                header=None,
                dtype=str,
                sep=None,
                engine="python",
                encoding=encoding,
            )
        except UnicodeDecodeError:
            continue
        except Exception as exc:
            print(f"  Aviso ao ler CSV com encoding {encoding}: {exc}")
            continue

        chaves_unicas, total_celulas, celulas_com_chaves = _chaves_unicas_de_dataframe(df)
        print(f"  Codificacao CSV: {encoding}")
        print(f"  Celulas processadas: {total_celulas}")
        print(f"  Celulas com chaves: {celulas_com_chaves}")
        print(f"  Encontradas {len(chaves_unicas)} chaves unicas")
        return chaves_unicas

    print("  Nao foi possivel ler o CSV com encodings conhecidos.")
    return []


def processar_arquivo(caminho_arquivo: str | Path) -> List[str]:
    """Processa um arquivo Excel ou texto e extrai chaves unicas."""
    caminho = Path(caminho_arquivo) if not isinstance(caminho_arquivo, Path) else caminho_arquivo
    extensao = caminho.suffix.lower()

    if extensao == ".csv":
        chaves = processar_csv(str(caminho))
        if not chaves:
            print("  CSV sem chaves via pandas; tentando como texto...")
            return processar_arquivo_texto(str(caminho))
        return chaves
    if extensao in [".txt", ".text"]:
        return processar_arquivo_texto(str(caminho))
    if extensao in [".xlsx", ".xls"]:
        return processar_planilha(str(caminho))

    print(f"  Extensao desconhecida ({extensao}), tentando como arquivo de texto...")
    chaves = processar_arquivo_texto(str(caminho))
    if not chaves:
        print("  Nenhuma chave encontrada como texto, tentando como planilha Excel...")
        chaves = processar_planilha(str(caminho))
    return chaves


def processar_arquivos(caminhos: Sequence[str | Path]) -> List[str]:
    """Processa varios arquivos e retorna chaves unicas na ordem do primeiro aparecimento global."""
    ordenadas: list[str] = []
    for item in caminhos:
        for chave in processar_arquivo(item):
            if chave not in ordenadas:
                ordenadas.append(chave)
    return ordenadas


def processar_texto_digitado(texto: str) -> tuple[List[str], List[str]]:
    """Processa texto colado manualmente na interface."""
    chaves_unicas: List[str] = []
    invalidas: List[str] = []

    for linha in texto.splitlines():
        linha_limpa = linha.strip()
        if not linha_limpa:
            continue

        chaves_linha = extrair_chaves_xml(linha_limpa)
        if chaves_linha:
            for chave in chaves_linha:
                if chave not in chaves_unicas:
                    chaves_unicas.append(chave)
            continue

        if any(char.isdigit() for char in linha_limpa):
            invalidas.append(linha_limpa)

    return chaves_unicas, invalidas
