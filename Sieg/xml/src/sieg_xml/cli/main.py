"""Casca fina da CLI principal do pacote SIEG XML."""

from __future__ import annotations

import sys

from .parser import build_parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return args.func(args)
    except RuntimeError as exc:
        print(f"ERRO: {exc}")
        return 1
    except KeyboardInterrupt:
        print("\nOperacao interrompida.")
        return 130


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
