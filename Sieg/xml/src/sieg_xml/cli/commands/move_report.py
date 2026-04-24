"""Subcomando para separar XMLs por relatorio."""

from __future__ import annotations

import argparse
from pathlib import Path

from ...config import PASTA_XMLS_BAIXADOS
from ...services.report_move_service import gerar_destino_padrao, processar_relatorio_xmls
from ..common import print_header


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("move-report", help="Separar XMLs usando relatorio com chaves.")
    parser.add_argument("--planilha", required=True)
    parser.add_argument("--origem", default=PASTA_XMLS_BAIXADOS)
    parser.add_argument("--destino")
    parser.add_argument("--dry-run", action="store_true")
    parser.set_defaults(func=handle)


def handle(args: argparse.Namespace) -> int:
    print_header("SIEG XML - Separar XMLs por Relatorio")
    planilha = Path(args.planilha)
    origem = Path(args.origem or PASTA_XMLS_BAIXADOS)
    destino = Path(args.destino) if args.destino else Path(PASTA_XMLS_BAIXADOS).parent / "work" / gerar_destino_padrao(planilha)
    resultado = processar_relatorio_xmls(planilha, origem, destino, dry_run=args.dry_run)
    print(resultado)
    return 0
