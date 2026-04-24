"""Subcomando de extracao de chaves."""

from __future__ import annotations

import argparse

from ...core.chave_extractor import processar_arquivo
from ...utils.ui_utils import selecionar_planilha
from ..common import print_header, save_chaves_output


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("extract", help="Extrair chaves de um arquivo Excel/TXT.")
    parser.add_argument("--arquivo")
    parser.set_defaults(func=handle)


def handle(args: argparse.Namespace) -> int:
    print_header("SIEG XML - Extrair Chaves")
    arquivo = args.arquivo or selecionar_planilha()
    if not arquivo:
        print("Operacao cancelada.")
        return 1

    chaves = processar_arquivo(arquivo)
    if not chaves:
        print("Nenhuma chave encontrada.")
        return 1

    arquivos = save_chaves_output(chaves)
    print(f"Total de chaves unicas: {len(set(chaves))}")
    for arquivo_saida in arquivos:
        print(f"Arquivo gerado: {arquivo_saida}")
    return 0
