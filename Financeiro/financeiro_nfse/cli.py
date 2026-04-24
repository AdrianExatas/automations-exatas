from __future__ import annotations

import argparse
from pathlib import Path

from . import renaming, webiss, workflows

DEFAULT_SAMPLE_INPUT = Path(__file__).resolve().parent.parent / "samples" / "nfse_2026-03.json"


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m financeiro_nfse",
        description="Ferramentas para consultar, baixar e renomear NFS-e.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    consultar = subparsers.add_parser("consultar", help="Consulta a Omie e gera JSON.")
    consultar.add_argument("--competencia", default="", help="Competencia MM-AAAA.")
    consultar.add_argument("--output-dir", default=None, help="Diretorio base de saida.")
    consultar.add_argument("--env-file", default=None, help="Caminho do arquivo .env.")
    consultar.add_argument("--config", default=None, help="Caminho do arquivo financeiro.ini.")

    baixar = subparsers.add_parser("baixar", help="Baixa XML/PDF a partir de um JSON.")
    baixar.add_argument("--input", default=str(DEFAULT_SAMPLE_INPUT), help="Arquivo JSON de entrada.")
    baixar.add_argument("--competencia", default="", help="Competencia MM-AAAA.")
    baixar.add_argument("--output-dir", default=None, help="Diretorio base de saida.")
    baixar.add_argument("--config", default=None, help="Caminho do arquivo financeiro.ini.")
    baixar.add_argument("--env-file", default=None, help="Reservado para compatibilidade.")
    baixar.add_argument("--log-file", default=None, help="Reservado para compatibilidade.")
    baixar.add_argument("--format", choices=("xml", "pdf", "ambos"), default="ambos")
    baixar.add_argument("--headless", action=argparse.BooleanOptionalAction, default=True)
    baixar.add_argument("--limit", type=int, default=None)
    baixar.add_argument("--http-timeout", type=int, default=webiss.DEFAULT_HTTP_TIMEOUT)
    baixar.add_argument("--retries", type=int, default=webiss.DEFAULT_RETRIES)
    baixar.add_argument("--rename-pdfs", action=argparse.BooleanOptionalAction, default=True)
    baixar.add_argument("--rename-dest-dir", default=None)
    baixar.add_argument("--rename-prefix", default="")

    renomear_cmd = subparsers.add_parser("renomear", help="Renomeia PDFs existentes.")
    renomear_cmd.add_argument("--input", dest="pasta_origem", default=".", help="Pasta onde estao os PDFs.")
    renomear_cmd.add_argument("--competencia", default="", help="Competencia MM-AAAA.")
    renomear_cmd.add_argument("--output-dir", dest="pasta_destino", default=None, help="Pasta de destino.")
    renomear_cmd.add_argument("--config", default=None, help="Caminho do arquivo financeiro.ini.")
    renomear_cmd.add_argument("--env-file", default=None, help="Reservado para compatibilidade.")
    renomear_cmd.add_argument("--log-file", default=None, help="Caminho do log ou 'auto'.")
    renomear_cmd.add_argument("--tipo", choices=renaming.TIPOS, required=True)
    renomear_cmd.add_argument("--prefixo", default="")
    renomear_cmd.add_argument("--dry-run", "--simular", dest="dry_run", action="store_true")

    processar = subparsers.add_parser("processar", help="Consulta, baixa e renomeia em um unico fluxo.")
    processar.add_argument("--competencia", default="", help="Competencia MM-AAAA.")
    processar.add_argument("--output-dir", default=None, help="Diretorio base de saida.")
    processar.add_argument("--env-file", default=None, help="Caminho do arquivo .env.")
    processar.add_argument("--config", default=None, help="Caminho do arquivo financeiro.ini.")
    processar.add_argument("--log-file", default=None, help="Reservado para compatibilidade.")
    processar.add_argument("--format", choices=("xml", "pdf", "ambos"), default="ambos")
    processar.add_argument("--headless", action=argparse.BooleanOptionalAction, default=True)
    processar.add_argument("--limit", type=int, default=None)
    processar.add_argument("--http-timeout", type=int, default=webiss.DEFAULT_HTTP_TIMEOUT)
    processar.add_argument("--retries", type=int, default=webiss.DEFAULT_RETRIES)
    processar.add_argument("--rename-dest-dir", default=None)
    processar.add_argument("--rename-prefix", default="")

    gui = subparsers.add_parser("gui", help="Interfaces graficas.")
    gui_subparsers = gui.add_subparsers(dest="gui_command", required=True)
    gui_subparsers.add_parser("renomear", help="Abre a GUI de renomeacao.")

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "consultar":
        path = workflows.query_nfse_workflow(
            competencia=args.competencia,
            output_dir=args.output_dir,
            env_file=args.env_file,
            config_path=args.config,
        )
        print(f"JSON gerado em: {path}")
        return 0

    if args.command == "baixar":
        result = workflows.download_from_json_workflow(
            input_path=args.input,
            output_dir=args.output_dir,
            file_format=args.format,
            headless=args.headless,
            limit=args.limit,
            http_timeout=args.http_timeout,
            retries=args.retries,
            rename_pdfs=args.rename_pdfs,
            rename_dest_dir=args.rename_dest_dir,
            rename_prefix=args.rename_prefix,
            competencia=args.competencia,
            config_path=args.config,
        )
        print(
            f"Concluido. Sucessos: {result.successes} | Falhas: {result.failures} | Saida: {result.output_dir}"
        )
        return 0 if result.failures == 0 else 1

    if args.command == "renomear":
        result = workflows.rename_existing_pdfs_workflow(
            pasta_origem=args.pasta_origem,
            tipo=args.tipo,
            pasta_destino=args.pasta_destino,
            competencia=args.competencia,
            prefixo=args.prefixo,
            dry_run=args.dry_run,
            config_path=args.config,
            log_file=args.log_file,
        )
        print("Processo concluido.")
        if args.dry_run:
            print(
                f"[DRY-RUN] Seriam renomeados: {result.renomeados}; nao encontrados: {result.nao_encontrados}; erros: {result.erros}."
            )
        else:
            print(
                f"Renomeados: {result.renomeados}; nao encontrados: {result.nao_encontrados}; erros: {result.erros}."
            )
        return 0 if result.erros == 0 else 1

    if args.command == "processar":
        result = workflows.process_previous_month_workflow(
            competencia=args.competencia,
            output_dir=args.output_dir,
            env_file=args.env_file,
            config_path=args.config,
            file_format=args.format,
            headless=args.headless,
            limit=args.limit,
            http_timeout=args.http_timeout,
            retries=args.retries,
            rename_dest_dir=args.rename_dest_dir,
            rename_prefix=args.rename_prefix,
        )
        print(f"JSON gerado em: {result.json_path}")
        print(
            f"Concluido. Sucessos: {result.download.successes} | Falhas: {result.download.failures} | Saida: {result.download.output_dir}"
        )
        return 0 if result.download.failures == 0 else 1

    if args.command == "gui" and args.gui_command == "renomear":
        from .gui.renomear_window import main as gui_main

        return gui_main()

    parser.error("Comando invalido.")
    return 2
