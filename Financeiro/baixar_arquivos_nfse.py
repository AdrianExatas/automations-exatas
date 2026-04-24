from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from financeiro_nfse.workflows import download_from_json_workflow


DEFAULT_SAMPLE_INPUT = ROOT_DIR / "samples" / "nfse_2026-03.json"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Baixa XML e PDF publicos das NFS-e listadas em um arquivo JSON."
    )
    parser.add_argument("--input", default=str(DEFAULT_SAMPLE_INPUT), help="Arquivo JSON com a lista de NFS-e.")
    parser.add_argument("--output-dir", default=None, help="Diretorio de saida para os arquivos baixados.")
    parser.add_argument("--format", choices=("xml", "pdf", "ambos"), default="ambos", help="Formato dos arquivos a baixar.")
    parser.add_argument("--headless", action=argparse.BooleanOptionalAction, default=True, help="Executa o Chrome em modo headless ao gerar PDF.")
    parser.add_argument("--limit", type=int, default=None, help="Limita a quantidade de NFS-e processadas.")
    parser.add_argument("--http-timeout", type=int, default=120, help="Timeout HTTP em segundos para buscar HTML, CSS e XML.")
    parser.add_argument("--retries", type=int, default=3, help="Quantidade de novas tentativas apos a primeira requisicao.")
    parser.add_argument("--rename-pdfs", action=argparse.BooleanOptionalAction, default=True, help="Renomeia os PDFs automaticamente apos o download.")
    parser.add_argument("--rename-dest-dir", default=None, help="Pasta de destino dos PDFs renomeados.")
    parser.add_argument("--rename-prefix", default="", help="Override do prefixo completo usado ao renomear os PDFs.")
    parser.add_argument("--competencia", default="", help="Competencia MM-AAAA usada no nome final.")
    parser.add_argument("--config", default=None, help="Caminho do arquivo financeiro.ini.")
    args = parser.parse_args()

    try:
        result = download_from_json_workflow(
            input_path=args.input,
            output_dir=args.output_dir,
            file_format=args.format,
            headless=args.headless,
            limit=args.limit,
            http_timeout=max(args.http_timeout, 1),
            retries=max(args.retries, 0),
            rename_pdfs=args.rename_pdfs,
            rename_dest_dir=args.rename_dest_dir,
            rename_prefix=args.rename_prefix,
            competencia=args.competencia,
            config_path=args.config,
        )
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Concluido. Sucessos: {result.successes} | Falhas: {result.failures} | Saida: {result.output_dir}")
    return 0 if result.failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
