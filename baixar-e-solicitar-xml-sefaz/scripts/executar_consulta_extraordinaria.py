#!/usr/bin/env python3
"""
CLI para lote extraordinario de consultas SEFAZ.
"""
import argparse
import io
import sys
from pathlib import Path

if sys.platform == "win32":
    if sys.stdout.encoding != "utf-8":
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    if sys.stderr.encoding != "utf-8":
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.consulta.extraordinaria import ConsultaExtraordinariaService, parse_data_argumento


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Executa um lote extraordinario e isolado de consultas XML na SEFAZ.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--inscricao", required=True, help="Inscricao municipal da empresa.")
    parser.add_argument(
        "--nome-esperado",
        required=True,
        help="Nome esperado da empresa para validacao defensiva no portal.",
    )
    parser.add_argument(
        "--data-inicial",
        required=True,
        help="Data inicial no formato DD/MM/YYYY, DDMMYYYY ou YYYY-MM-DD.",
    )
    parser.add_argument(
        "--data-final",
        required=True,
        help="Data final no formato DD/MM/YYYY, DDMMYYYY ou YYYY-MM-DD.",
    )
    parser.add_argument("--lote-id", required=True, help="Identificador unico do lote.")
    parser.add_argument(
        "--segmentacao",
        choices=("mensal", "unico"),
        default="mensal",
        help="Forma de segmentar o periodo do lote.",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Mostra a auditoria do lote sem executar consultas.",
    )
    parser.add_argument(
        "--reiniciar",
        action="store_true",
        help="Recria a auditoria do lote do zero antes de mostrar status ou executar.",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        default=False,
        help="Executa o navegador em modo invisivel.",
    )
    parser.add_argument(
        "--visible",
        action="store_false",
        dest="headless",
        help="Executa o navegador em modo visivel (padrao).",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    try:
        data_inicial = parse_data_argumento(args.data_inicial)
        data_final = parse_data_argumento(args.data_final)
    except ValueError as exc:
        print(f"[ERRO] {exc}")
        return 1

    service = ConsultaExtraordinariaService(
        inscricao=args.inscricao,
        nome_esperado=args.nome_esperado,
        data_inicial=data_inicial,
        data_final=data_final,
        lote_id=args.lote_id,
        segmentacao=args.segmentacao,
        headless=args.headless,
    )

    try:
        if args.status:
            service.mostrar_status(reiniciar=args.reiniciar)
            return 0

        sucesso = service.executar(reiniciar=args.reiniciar)
        return 0 if sucesso else 1
    except KeyboardInterrupt:
        print("\n[INFO] Processo interrompido pelo usuario.")
        return 130
    except Exception as exc:
        print(f"[ERRO] Falha critica no lote extraordinario: {exc}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
