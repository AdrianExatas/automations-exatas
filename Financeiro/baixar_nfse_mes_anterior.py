from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from financeiro_nfse.workflows import query_nfse_workflow


def main() -> int:
    parser = argparse.ArgumentParser(description="Consulta NFS-e do mes anterior e gera JSON.")
    parser.add_argument("--competencia", default="", help="Competencia MM-AAAA. Vazio = mes anterior.")
    parser.add_argument("--output-dir", default=None, help="Diretorio base de saida.")
    parser.add_argument("--env-file", default=None, help="Caminho do arquivo .env.")
    parser.add_argument("--config", default=None, help="Caminho do arquivo financeiro.ini.")
    args = parser.parse_args()

    try:
        target_file = query_nfse_workflow(
            competencia=args.competencia,
            output_dir=args.output_dir,
            env_file=args.env_file,
            config_path=args.config,
        )
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(f"Arquivo gerado: {target_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
