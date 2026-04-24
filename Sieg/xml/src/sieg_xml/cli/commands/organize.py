"""Subcomando de reorganizacao de XMLs."""

from __future__ import annotations

import argparse

from ...config import PASTA_XMLS_BAIXADOS
from ...core.xml_organizer import MODE_YEAR, reorganizar_xmls
from ..common import MODE_OPTION_TO_ORGANIZER, print_header


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("organize", help="Organizar XMLs em diferentes estruturas de pasta.")
    parser.add_argument("--pasta", default=PASTA_XMLS_BAIXADOS)
    parser.add_argument("--mode", choices=list(MODE_OPTION_TO_ORGANIZER.keys()), default="year")
    parser.add_argument("--flatten-year-month", action="store_true")
    parser.set_defaults(func=handle)


def handle(args: argparse.Namespace) -> int:
    print_header("SIEG XML - Organizar XMLs")
    pasta = args.pasta or PASTA_XMLS_BAIXADOS
    mode = MODE_YEAR if args.flatten_year_month else MODE_OPTION_TO_ORGANIZER[args.mode]
    resultado = reorganizar_xmls(pasta, mode)
    if "erro" in resultado:
        print(resultado["erro"])
        return 1
    print(resultado)
    return 0
