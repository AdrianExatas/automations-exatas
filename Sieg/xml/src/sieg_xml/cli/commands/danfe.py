"""Subcomando de geracao de DANFEs."""

from __future__ import annotations

import argparse

from ...config import DANFE_OUTPUT_DIR, PASTA_XMLS_BAIXADOS
from ...services.danfe_service import gerar_danfes
from ..common import print_header


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("danfe", help="Gerar DANFEs e consolidar PDFs.")
    parser.add_argument("--entrada", default=PASTA_XMLS_BAIXADOS)
    parser.add_argument("--saida", default=DANFE_OUTPUT_DIR)
    parser.add_argument("--sobrescrever", action="store_true")
    parser.add_argument("--anos")
    parser.set_defaults(func=handle)


def handle(args: argparse.Namespace) -> int:
    print_header("SIEG XML - Gerar DANFEs")
    try:
        resultado = gerar_danfes(
            entrada=args.entrada or PASTA_XMLS_BAIXADOS,
            saida=args.saida or DANFE_OUTPUT_DIR,
            sobrescrever=args.sobrescrever,
            anos=args.anos,
        )
    except Exception as exc:
        print(f"ERRO: {exc}")
        return 1
    print(resultado)
    return 0
