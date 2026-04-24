# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from financeiro_nfse import renaming as _renaming
from financeiro_nfse.config import default_competencia, load_ini
from financeiro_nfse.workflows import rename_existing_pdfs_workflow


TIPO_PRODUTOS = _renaming.TIPO_PRODUTOS
TIPO_SERVICO = _renaming.TIPO_SERVICO
TIPOS = _renaming.TIPOS
RESULTADO_RENOMEADO = _renaming.RESULTADO_RENOMEADO
RESULTADO_NAO_ENCONTRADO = _renaming.RESULTADO_NAO_ENCONTRADO
RESULTADO_ERRO = _renaming.RESULTADO_ERRO
DEFAULT_PREFIXO_SERVICO = "NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP"
DEFAULT_PREFIXO_PRODUTOS = "NOTA FISCAL SERVIÇO CONTÁBIL 2-2 COMP"

extract_text_from_pdf = _renaming.extract_text_from_pdf
extract_razao_social = _renaming.extract_razao_social
clean_name = _renaming.clean_name
nome_sem_colisao = _renaming.nome_sem_colisao
build_prefix = _renaming.build_prefix


def _legacy_config_path(pasta_origem: Path) -> Path | None:
    legacy_path = pasta_origem / "config.ini"
    return legacy_path if legacy_path.is_file() else None


def load_config(pasta_base: str | Path) -> dict[str, str] | None:
    config_path = _legacy_config_path(Path(pasta_base))
    if config_path is None:
        return None
    cfg = load_ini(config_path)
    if cfg.has_section("renomear_notas"):
        return {key: value for key, value in cfg.items("renomear_notas")}
    return None


def resolve_processing_options(
    *,
    config_base: str | Path,
    tipo: str,
    pasta_destino: str | Path | None = None,
    competencia: str = "",
    prefixo: str = "",
) -> tuple[str, str | Path]:
    config = load_config(config_base)

    if prefixo:
        prefixo_resolvido = prefixo if prefixo.endswith(" ") else prefixo + " "
    else:
        competencia_resolvida = competencia
        if not competencia_resolvida and config and config.get("competencia"):
            competencia_resolvida = config.get("competencia", "").strip()
        if not competencia_resolvida:
            competencia_resolvida = default_competencia()
        prefixo_servico = (config.get("prefixo_servico") if config else None) or DEFAULT_PREFIXO_SERVICO
        prefixo_produtos = (config.get("prefixo_produtos") if config else None) or DEFAULT_PREFIXO_PRODUTOS
        prefixo_resolvido = build_prefix(
            tipo,
            competencia_resolvida,
            prefixo_servico,
            prefixo_produtos,
        )

    pasta_destino_resolvida = pasta_destino
    if pasta_destino_resolvida is None and config:
        pasta_destino_resolvida = config.get("pasta_destino")
    if pasta_destino_resolvida in (None, ""):
        pasta_destino_resolvida = "RENOMEADOS"

    return prefixo_resolvido, pasta_destino_resolvida


def rename_pdf_file(
    caminho_pdf: str | Path,
    pasta_destino: str | Path,
    tipo: str,
    prefixo: str,
    *,
    dry_run: bool = False,
    log_path: str | Path | None = None,
    log_callback=None,
) -> tuple[str, Path | None]:
    caminho_pdf = Path(caminho_pdf)
    pasta_destino_resolvida = _renaming.resolve_destination_dir(caminho_pdf.parent, pasta_destino)
    nome_arquivo = unicodedata.normalize("NFC", caminho_pdf.name)
    ascii_upper = tipo == TIPO_SERVICO

    try:
        texto = extract_text_from_pdf(caminho_pdf)
        razao = extract_razao_social(texto, tipo)
        if not razao:
            _renaming.log_message(
                f"Nome/Razao Social nao encontrado em: {nome_arquivo}",
                log_path=log_path,
                log_callback=log_callback,
            )
            return RESULTADO_NAO_ENCONTRADO, None

        nome_limpo = clean_name(razao, ascii_upper)
        nome_final = nome_sem_colisao(pasta_destino_resolvida, f"{prefixo}{nome_limpo}.pdf")
        novo_caminho = pasta_destino_resolvida / nome_final

        if dry_run:
            _renaming.log_message(
                f"[DRY-RUN] {nome_arquivo} -> {nome_final}",
                log_path=log_path,
                log_callback=log_callback,
            )
        else:
            caminho_pdf.rename(novo_caminho)
            _renaming.log_message(
                f"Renomeado: {nome_arquivo} -> {nome_final}",
                log_path=log_path,
                log_callback=log_callback,
            )
        return RESULTADO_RENOMEADO, novo_caminho
    except Exception as exc:
        _renaming.log_message(
            f"Erro ao processar {nome_arquivo}: {type(exc).__name__}: {exc}",
            log_path=log_path,
            log_callback=log_callback,
        )
        return RESULTADO_ERRO, None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Renomear PDFs de notas fiscais extraindo Nome/Razao Social.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    pasta_default = Path.cwd()
    parser.add_argument("--tipo", choices=TIPOS, required=True, help="Tipo de nota: servico ou produtos")
    parser.add_argument("--pasta-origem", default=str(pasta_default), help="Pasta onde estao os PDFs")
    parser.add_argument("--pasta-destino", default=None, metavar="PASTA", help="Pasta de destino.")
    parser.add_argument("--competencia", metavar="MM-AAAA", default="", help="Competencia para o prefixo.")
    parser.add_argument("--prefixo", default="", help="Override do prefixo completo.")
    parser.add_argument("--dry-run", "--simular", dest="dry_run", action="store_true", help="Apenas mostrar o que seria feito.")
    parser.add_argument("--log", dest="log_file", action="store_true", help="Registrar saida em arquivo.")
    args = parser.parse_args()

    pasta_origem = Path(args.pasta_origem).resolve()
    if not pasta_origem.is_dir():
        print(f"Erro: pasta de origem nao existe ou nao e diretorio: {pasta_origem}", file=sys.stderr)
        return 1

    log_path = None
    if args.log_file:
        log_path = pasta_origem / f"renomear_notas_{datetime.now().strftime('%Y%m%d')}.log"

    result = rename_existing_pdfs_workflow(
        pasta_origem=pasta_origem,
        tipo=args.tipo,
        pasta_destino=args.pasta_destino,
        competencia=args.competencia,
        prefixo=args.prefixo,
        dry_run=args.dry_run,
        config_path=_legacy_config_path(pasta_origem),
        log_file=log_path,
    )
    print("Processo concluido.")
    if args.dry_run:
        print(f"[DRY-RUN] Seriam renomeados: {result.renomeados}; nao encontrados: {result.nao_encontrados}; erros: {result.erros}.")
    else:
        print(f"Renomeados: {result.renomeados}; nao encontrados: {result.nao_encontrados}; erros: {result.erros}.")
    return 0 if result.erros == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
