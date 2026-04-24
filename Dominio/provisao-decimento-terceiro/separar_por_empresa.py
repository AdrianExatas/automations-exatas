from __future__ import annotations

import argparse
from pathlib import Path

from provisao_splitter import build_output_filename, split_pdf_by_company


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Separa o relatorio de provisao de decimo terceiro em um PDF por empresa."
    )
    parser.add_argument(
        "--input",
        default="Provisão de Décimo Terceiro Salário.pdf",
        help="PDF de entrada. Padrao: Provisão de Décimo Terceiro Salário.pdf",
    )
    parser.add_argument(
        "--output",
        default="output/pdf/empresas",
        help="Pasta de saida. Padrao: output/pdf/empresas",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Sobrescreve arquivos ja existentes na pasta de saida.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Mostra o que seria gerado sem escrever os arquivos.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_pdf = Path(args.input)
    output_dir = Path(args.output)

    groups = split_pdf_by_company(
        source_pdf=source_pdf,
        output_dir=output_dir,
        overwrite=args.overwrite,
        dry_run=args.dry_run,
    )

    if args.dry_run:
        print(f"Seriam gerados {len(groups)} arquivos em {output_dir}.")
        for group in groups:
            print(build_output_filename(group.codigo))
    else:
        print(f"Foram gerados {len(groups)} arquivos em {output_dir}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
