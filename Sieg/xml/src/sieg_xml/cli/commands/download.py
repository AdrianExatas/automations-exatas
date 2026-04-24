"""Subcomando de download de XMLs."""

from __future__ import annotations

import argparse

from ...config import NUM_THREADS_DOWNLOAD, validate_required_settings
from ...core.chave_extractor import processar_arquivo
from ...services.download_service import DownloadService
from ...utils.ui_utils import selecionar_planilha
from ..common import MODE_OPTION_TO_ORGANIZER, print_header


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("download", help="Baixar XMLs usando um arquivo com chaves.")
    parser.add_argument("--arquivo", "--planilha", dest="arquivo")
    parser.add_argument("--mode", choices=list(MODE_OPTION_TO_ORGANIZER.keys()), default="year")
    parser.add_argument("--threads", type=int, default=NUM_THREADS_DOWNLOAD)
    parser.add_argument("--sim", action="store_true")
    parser.set_defaults(func=handle)


def handle(args: argparse.Namespace) -> int:
    validate_required_settings()
    print_header("SIEG XML - Download")
    arquivo = args.arquivo or selecionar_planilha()
    if not arquivo:
        print("Nenhum arquivo informado.")
        return 1

    chaves = processar_arquivo(arquivo)
    if not chaves:
        print("Nenhuma chave valida encontrada.")
        return 1

    if not args.sim:
        resposta = input(f"Deseja baixar {len(chaves)} XML(s)? (s/n): ").strip().lower()
        if resposta != "s":
            print("Operacao cancelada.")
            return 0

    resultado = DownloadService().baixar_xmls(
        chaves,
        organization_mode=MODE_OPTION_TO_ORGANIZER[args.mode],
        num_threads=args.threads,
    )
    print(f"Sucesso: {resultado['sucesso']} | Falhas: {resultado['falhas']} | Total: {resultado['total']}")
    return 0 if resultado["falhas"] == 0 else 1
