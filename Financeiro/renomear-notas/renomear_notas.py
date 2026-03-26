# -*- coding: utf-8 -*-
"""
Módulo unificado para renomear PDFs de notas fiscais (serviço e produtos).
Extrai o campo Nome/Razão Social do texto do PDF e move para pasta RENOMEADOS.
"""
from __future__ import annotations

import argparse
import configparser
from collections.abc import Callable
import os
import re
import sys
import unicodedata
from datetime import datetime, timedelta
from pathlib import Path

from pypdf import PdfReader

# Tipos de nota suportados
TIPO_SERVICO = "servico"
TIPO_PRODUTOS = "produtos"
TIPOS = (TIPO_SERVICO, TIPO_PRODUTOS)

# Regex por tipo (Nome/Razão Social no PDF)
REGEX_SERVICO = r"Nome/R\s*azão\s*Social\s*\n\s*([^\n\r]+)"
REGEX_PRODUTOS = r"NOME\s*/\s*RAZÃO SOCIAL\s*[:\s]*([^\n\r]+)"


def extract_text_from_pdf(caminho: str | Path) -> str:
    """Extrai todo o texto das páginas do PDF."""
    reader = PdfReader(str(caminho))
    return "".join((page.extract_text() or "") for page in reader.pages)


def extract_razao_social(texto: str, tipo: str) -> str | None:
    """Extrai o Nome/Razão Social do texto conforme o tipo de nota."""
    if tipo == TIPO_SERVICO:
        pattern = REGEX_SERVICO
    else:
        pattern = REGEX_PRODUTOS
    match = re.search(pattern, texto, re.IGNORECASE)
    return match.group(1).strip() if match else None


def clean_name(nome: str, ascii_uppercase: bool) -> str:
    """Remove CNPJ/CPF do nome, caracteres inválidos para arquivo e opcionalmente normaliza para ASCII maiúsculo."""
    nome = re.split(r"\s*CNPJ|\s*CPF", nome, flags=re.IGNORECASE)[0].strip()
    nome = re.sub(r'[\\/:*?"<>|]', "", nome)
    if ascii_uppercase:
        nome = unicodedata.normalize("NFKD", nome).encode("ASCII", "ignore").decode("ASCII").upper()
    return nome


def nome_sem_colisao(pasta_destino: str | Path, nome_base: str) -> str:
    """Retorna um nome de arquivo que não colide com arquivos existentes (sufixo numérico)."""
    pasta_destino = Path(pasta_destino)
    base, ext = os.path.splitext(nome_base)
    candidato = nome_base
    n = 1
    while (pasta_destino / candidato).exists():
        n += 1
        candidato = f"{base} ({n}){ext}"
    return candidato


def build_prefix(tipo: str, competencia: str, prefixo_servico: str, prefixo_produtos: str) -> str:
    """Monta o prefixo do novo nome (ex.: 'NOTA FISCAL ... COMP 09-2025 ')."""
    base = prefixo_servico if tipo == TIPO_SERVICO else prefixo_produtos
    return f"{base} {competencia} " if competencia else f"{base} "


def load_config(pasta_base: str | Path) -> configparser.SectionProxy | None:
    """Carrega [renomear_notas] do config.ini na pasta base, se existir."""
    config_path = Path(pasta_base) / "config.ini"
    if not config_path.is_file():
        return None
    cfg = configparser.ConfigParser()
    cfg.read(config_path, encoding="utf-8")
    return cfg["renomear_notas"] if cfg.has_section("renomear_notas") else None


def run(
    pasta_origem: str | Path,
    pasta_destino: str | Path,
    tipo: str,
    prefixo: str,
    dry_run: bool = False,
    log_path: str | Path | None = None,
    log_callback: Callable[[str], None] | None = None,
) -> tuple[int, int, int]:
    """
    Processa os PDFs em pasta_origem e move para pasta_destino com novo nome.
    Retorna (renomeados, nao_encontrados, erros).
    """
    pasta_origem = Path(pasta_origem)
    pasta_destino = Path(pasta_destino)
    if not pasta_destino.is_absolute():
        pasta_destino = pasta_origem / pasta_destino
    pasta_destino = pasta_destino.resolve()
    pasta_destino.mkdir(parents=True, exist_ok=True)

    ascii_upper = tipo == TIPO_SERVICO
    renomeados = 0
    nao_encontrados = 0
    erros = 0

    def log(msg: str) -> None:
        if log_callback:
            log_callback(msg)
        else:
            print(msg)
        if log_path:
            with open(log_path, "a", encoding="utf-8") as f:
                f.write(f"{datetime.now().isoformat()} {msg}\n")

    if log_path:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"\n--- {datetime.now().isoformat()} tipo={tipo} dry_run={dry_run} ---\n")

    for entry in os.listdir(pasta_origem):
        nome_arquivo = unicodedata.normalize("NFC", entry)
        if not nome_arquivo.lower().endswith(".pdf"):
            continue
        caminho_pdf = pasta_origem / nome_arquivo
        if not caminho_pdf.is_file():
            continue
        try:
            texto = extract_text_from_pdf(caminho_pdf)
            razao = extract_razao_social(texto, tipo)
            if not razao:
                nao_encontrados += 1
                log(f"Nome/Razão Social não encontrado em: {nome_arquivo}")
                continue
            nome_limpo = clean_name(razao, ascii_upper)
            nome_final = nome_sem_colisao(pasta_destino, f"{prefixo}{nome_limpo}.pdf")
            novo_caminho = pasta_destino / nome_final
            if dry_run:
                log(f"[DRY-RUN] {nome_arquivo} -> {nome_final}")
            else:
                caminho_pdf.rename(novo_caminho)
                log(f"Renomeado: {nome_arquivo} -> {nome_final}")
            renomeados += 1
        except Exception as e:
            erros += 1
            log(f"Erro ao processar {nome_arquivo}: {type(e).__name__}: {e}")

    return renomeados, nao_encontrados, erros


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Renomear PDFs de notas fiscais extraindo Nome/Razão Social.",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    pasta_default = os.path.dirname(os.path.abspath(__file__))
    parser.add_argument(
        "--tipo",
        choices=TIPOS,
        required=True,
        help="Tipo de nota: servico ou produtos",
    )
    parser.add_argument(
        "--pasta-origem",
        default=pasta_default,
        help="Pasta onde estão os PDFs",
    )
    parser.add_argument(
        "--pasta-destino",
        default=None,
        metavar="PASTA",
        help="Pasta de destino (nome ou caminho). Se não informado, usa config.ini ou RENOMEADOS",
    )
    parser.add_argument(
        "--competencia",
        metavar="MM-AAAA",
        default="",
        help="Competência para o prefixo (ex.: 12-2025). Se vazio, usa o mês anterior à execução",
    )
    parser.add_argument(
        "--prefixo",
        default="",
        help="Override do prefixo completo (ignora competência e config)",
    )
    parser.add_argument(
        "--dry-run",
        "--simular",
        dest="dry_run",
        action="store_true",
        help="Apenas mostrar o que seria feito, sem mover arquivos",
    )
    parser.add_argument(
        "--log",
        dest="log_file",
        action="store_true",
        help="Registrar saída em arquivo renomear_notas_YYYYMMDD.log",
    )
    args = parser.parse_args()

    pasta_origem = Path(args.pasta_origem).resolve()
    if not pasta_origem.is_dir():
        print(f"Erro: pasta de origem não existe ou não é diretório: {pasta_origem}", file=sys.stderr)
        return 1
    config = load_config(pasta_origem)

    if args.prefixo:
        prefixo = args.prefixo if args.prefixo.endswith(" ") else args.prefixo + " "
    else:
        competencia = args.competencia
        if not competencia and config and config.get("competencia"):
            competencia = config.get("competencia", "").strip()
        if not competencia:
            # Competência padrão: mês anterior à execução
            hoje = datetime.now()
            primeiro_do_mes = hoje.replace(day=1)
            mes_anterior = primeiro_do_mes - timedelta(days=1)
            competencia = f"{mes_anterior.month:02d}-{mes_anterior.year}"
        prefixo_servico = (config.get("prefixo_servico") if config else None) or "NOTA FISCAL SERVIÇO CONTÁBIL 1-2 COMP"
        prefixo_produtos = (config.get("prefixo_produtos") if config else None) or "NOTA FISCAL SERVIÇO CONTÁBIL 2-2 COMP"
        prefixo = build_prefix(args.tipo, competencia, prefixo_servico, prefixo_produtos)

    pasta_destino = args.pasta_destino
    if pasta_destino is None and config:
        pasta_destino = config.get("pasta_destino")
    if pasta_destino is None or pasta_destino == "":
        pasta_destino = "RENOMEADOS"

    log_path = None
    if args.log_file:
        log_path = pasta_origem / f"renomear_notas_{datetime.now().strftime('%Y%m%d')}.log"

    renomeados, nao_encontrados, erros = run(
        pasta_origem,
        pasta_destino,
        args.tipo,
        prefixo,
        dry_run=args.dry_run,
        log_path=log_path,
    )
    print("Processo concluído.")
    if args.dry_run:
        print(f"[DRY-RUN] Seriam renomeados: {renomeados}; não encontrados: {nao_encontrados}; erros: {erros}.")
    else:
        print(f"Renomeados: {renomeados}; não encontrados: {nao_encontrados}; erros: {erros}.")
    return 0 if erros == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
