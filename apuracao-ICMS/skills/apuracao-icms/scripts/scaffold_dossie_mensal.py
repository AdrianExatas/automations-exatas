#!/usr/bin/env python3
"""Cria a estrutura padrao do dossie mensal de apuracao de ICMS (15 pastas)."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

SUBPASTAS = [
    "01 - Documentos fiscais",
    "02 - Relatorios de entradas",
    "03 - Relatorios de saidas",
    "04 - Apuracao ICMS proprio",
    "05 - ICMS-ST",
    "06 - DIFAL-FCP",
    "07 - CIAP",
    "08 - Ajustes e beneficios",
    "09 - Relatorio de conferencia",
    "10 - EFD transmitida",
    "11 - Recibo",
    "12 - Obrigacoes estaduais",
    "13 - Guias",
    "14 - Comprovantes",
    "15 - Evidencias de revisao",
]

COMPETENCIA_RE = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
CNPJ_RE = re.compile(r"^\d{14}$")


def normalize_empresa(value: str) -> str:
    digits = re.sub(r"\D", "", value or "")
    if CNPJ_RE.match(digits):
        return digits
    cleaned = re.sub(r"[^\w\-]+", "_", (value or "").strip(), flags=re.UNICODE)
    cleaned = cleaned.strip("._-")
    if not cleaned:
        raise ValueError("Identificador da empresa vazio.")
    return cleaned


def resolve_base_dir(base: Path | None) -> Path:
    if base is not None:
        return base.resolve()
    # Padrao: apuracao-ICMS/_local/dossies
    skill_scripts = Path(__file__).resolve().parent
    project_root = skill_scripts.parents[2]
    return (project_root / "_local" / "dossies").resolve()


def scaffold(empresa: str, competencia: str, base_dir: Path | None = None) -> Path:
    if not COMPETENCIA_RE.match(competencia):
        raise ValueError("Competencia deve estar no formato AAAA-MM.")
    empresa_id = normalize_empresa(empresa)
    root = resolve_base_dir(base_dir) / empresa_id / competencia
    root.mkdir(parents=True, exist_ok=True)
    for nome in SUBPASTAS:
        (root / nome).mkdir(parents=True, exist_ok=True)
    readme = root / "README.txt"
    if not readme.exists():
        readme.write_text(
            "\n".join(
                [
                    f"Dossie mensal de ICMS - {empresa_id} - {competencia}",
                    "",
                    "Preencha as 15 subpastas com as evidencias da competencia.",
                    "A competencia so fica FECHADA com EFD, recibo, obrigacoes,",
                    "guias, pagamento e documentacao arquivados.",
                    "",
                ]
            ),
            encoding="utf-8",
        )
    return root


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Cria as 15 subpastas do dossie mensal de apuracao de ICMS."
    )
    parser.add_argument("--empresa", required=True, help="CNPJ (14 digitos) ou codigo interno")
    parser.add_argument("--competencia", required=True, help="Competencia no formato AAAA-MM")
    parser.add_argument(
        "--base-dir",
        default=None,
        help="Diretorio base (padrao: apuracao-ICMS/_local/dossies)",
    )
    args = parser.parse_args(argv)
    try:
        base = Path(args.base_dir) if args.base_dir else None
        path = scaffold(args.empresa, args.competencia, base)
    except ValueError as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 2
    print(path)
    for nome in SUBPASTAS:
        print(f"  - {nome}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
