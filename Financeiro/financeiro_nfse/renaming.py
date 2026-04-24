from __future__ import annotations

import os
import re
import unicodedata
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

from pypdf import PdfReader

from .config import default_competencia, get_rename_setting, load_ini
from .models import RenameResult


TIPO_SERVICO = "servico"
TIPO_PRODUTOS = "produtos"
TIPOS = (TIPO_SERVICO, TIPO_PRODUTOS)
DEFAULT_PREFIXO_SERVICO = "NOTA FISCAL SERVICO CONTABIL 1-2 COMP"
DEFAULT_PREFIXO_PRODUTOS = "NOTA FISCAL SERVICO CONTABIL 2-2 COMP"
RESULTADO_RENOMEADO = "renomeado"
RESULTADO_NAO_ENCONTRADO = "nao_encontrado"
RESULTADO_ERRO = "erro"
REGEX_SERVICO = r"Nome/R\s*az[aã]o\s*Social\s*\n\s*([^\n\r]+)"
REGEX_PRODUTOS = r"NOME\s*/\s*RAZ[AÃ]O SOCIAL\s*[:\s]*([^\n\r]+)"

# CNAE no PDF (WebISS / layouts comuns): rótulo + código com dígitos, pontos, hífen e barra.
_REGEX_CNAE = re.compile(
    r"(?:C[oó]digo\s*)?CNAE\s*[:\s.]+([\d.\-/]+)|CNAE\s*/\s*([\d.\-/]+)",
    re.IGNORECASE,
)
# Descrição dos serviços / discriminação (NFS-e).
_REGEX_LABEL_DESCRICAO = re.compile(
    r"Descri[cç][aã]o\s+dos?\s+Servi[cç]os|Discrimina[cç][aã]o\s+do\s+Servi[cç]o",
    re.IGNORECASE,
)
_REGEX_PREFIXO_NUMERADO = re.compile(r"^\d+\.\s*")
_REGEX_ITEM_DESCRICAO_NUMERADO = re.compile(r"^\d+\.\s*(.+)$")
# Prefixo padrão: NOTA FISCAL … 1-2 COMP MM-AAAA (para remontar nome quando CNAE não contábil).
_REGEX_PREFIXO_NOTA_12_COMP = re.compile(
    r"^NOTA FISCAL\s+(.+?)\s+1-2 COMP\s+(\d{2}-\d{4})\s*$",
    re.IGNORECASE,
)
# Seção "OUTRAS INFORMAÇÕES" do WebISS: contém a descrição real do serviço após boilerplate.
_REGEX_LABEL_OUTRAS_INFO = re.compile(r"OUTRAS\s+INFORMA[CÇ][OÕ]ES", re.IGNORECASE)
# Linhas de boilerplate dentro de "OUTRAS INFORMAÇÕES" que devem ser ignoradas.
_REGEX_OUTRAS_INFO_PULAR = re.compile(
    r"^(Optante\s+do\s+Simples|Chave\s+de\s+Acesso|CST\s*:)",
    re.IGNORECASE,
)
# Linhas de encerramento após a descrição (info de contrato / validação).
_REGEX_OUTRAS_INFO_FIM = re.compile(
    r"^(Contrato\s+N\.|Ref\.\s+|Vencto\.|Visualizado\s+em:|Para\s+valid|Esta\s+NFS)",
    re.IGNORECASE,
)


def extract_descricao_de_outras_informacoes(texto: str) -> str | None:
    """Descrição real do serviço na seção 'OUTRAS INFORMAÇÕES' do formato WebISS.

    No layout WebISS o texto extraído coloca primeiro a tabela de retenções logo
    após o rótulo 'DESCRIÇÃO DOS SERVIÇOS', e a descrição real do serviço (ex.:
    'BPO FINANCEIRO', 'SISTEMA DE DASHBOARDS…') aparece na seção 'OUTRAS
    INFORMAÇÕES', após linhas de boilerplate (Optante, Chave de Acesso, CST:).
    """
    m = _REGEX_LABEL_OUTRAS_INFO.search(texto)
    if not m:
        return None
    resto = texto[m.end() :].lstrip(" \t:\n\r")
    for raw_line in resto.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if _REGEX_OUTRAS_INFO_PULAR.match(line):
            continue
        if _REGEX_OUTRAS_INFO_FIM.match(line):
            break
        return line if line else None
    return None


def extract_cnae_digits(texto: str) -> str | None:
    """Retorna apenas os dígitos do código CNAE encontrado no texto, ou None."""
    match = _REGEX_CNAE.search(texto)
    if not match:
        return None
    trecho = next((g for g in match.groups() if g), None)
    if not trecho:
        return None
    digitos = "".join(ch for ch in trecho if ch.isdigit())
    return digitos or None


def extract_descricao_servicos_primeira_linha(texto: str) -> str | None:
    """Primeira linha útil após o rótulo de descrição dos serviços; remove prefixo tipo '1. '."""
    m = _REGEX_LABEL_DESCRICAO.search(texto)
    if not m:
        return None
    resto = texto[m.end() :].lstrip(" \t:.\n\r")
    for raw_line in resto.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = _REGEX_PREFIXO_NUMERADO.sub("", line, count=1).strip()
        return line if line else None
    return None


def extract_descricao_servicos_itens_numerados(texto: str) -> str | None:
    """
    Itens 1. / 2. / … após o rótulo da discriminação, ignorando linhas soltas (ex.: RETENCOES FEDERAIS).
    Junta com ' e '. Retorna None se não houver nenhum item numerado.
    """
    m = _REGEX_LABEL_DESCRICAO.search(texto)
    if not m:
        return None
    resto = texto[m.end() :].lstrip(" \t:.\n\r")
    itens: list[str] = []
    iniciado = False
    for raw_line in resto.splitlines():
        line = raw_line.strip()
        if not line:
            if iniciado:
                break
            continue
        mm = _REGEX_ITEM_DESCRICAO_NUMERADO.match(line)
        if mm:
            pedaco = mm.group(1).strip()
            if pedaco:
                itens.append(pedaco)
            iniciado = True
        elif iniciado:
            break
    return " e ".join(itens) if itens else None


def parse_competencia_prefixo_servico_1_2(prefixo: str) -> str | None:
    """Extrai MM-AAAA do prefixo tipo 'NOTA FISCAL … 1-2 COMP MM-AAAA'; None se o formato não bater."""
    m = _REGEX_PREFIXO_NOTA_12_COMP.match(prefixo.strip())
    return m.group(2) if m else None


def extract_text_from_pdf(caminho: str | Path) -> str:
    reader = PdfReader(str(caminho))
    return "".join((page.extract_text() or "") for page in reader.pages)


def extract_razao_social(texto: str, tipo: str) -> str | None:
    pattern = REGEX_SERVICO if tipo == TIPO_SERVICO else REGEX_PRODUTOS
    match = re.search(pattern, texto, re.IGNORECASE)
    return match.group(1).strip() if match else None


def clean_name(nome: str, ascii_uppercase: bool) -> str:
    nome = re.split(r"\s*CNPJ|\s*CPF", nome, flags=re.IGNORECASE)[0].strip()
    nome = re.sub(r'[\\/:*?"<>|]', "", nome)
    if ascii_uppercase:
        nome = unicodedata.normalize("NFKD", nome).encode("ASCII", "ignore").decode("ASCII").upper()
    return nome


def nome_sem_colisao(pasta_destino: str | Path, nome_base: str) -> str:
    pasta_destino = Path(pasta_destino)
    base, ext = os.path.splitext(nome_base)
    candidato = nome_base
    n = 1
    while (pasta_destino / candidato).exists():
        n += 1
        candidato = f"{base} ({n}){ext}"
    return candidato


def build_prefix(tipo: str, competencia: str, prefixo_servico: str, prefixo_produtos: str) -> str:
    base = prefixo_servico if tipo == TIPO_SERVICO else prefixo_produtos
    return f"{base} {competencia} " if competencia else f"{base} "


def load_config(base_path: str | Path | None = None, config_path: str | Path | None = None) -> dict[str, str] | None:
    if config_path is None and base_path is not None:
        legacy_path = Path(base_path) / "config.ini"
        if legacy_path.is_file():
            config_path = legacy_path

    cfg = load_ini(config_path)
    if cfg.has_section("renomeacao"):
        return {key: value for key, value in cfg.items("renomeacao")}
    if cfg.has_section("renomear_notas"):
        return {key: value for key, value in cfg.items("renomear_notas")}
    return None


def resolve_destination_dir(pasta_origem: str | Path, pasta_destino: str | Path) -> Path:
    pasta_origem = Path(pasta_origem)
    pasta_destino = Path(pasta_destino)
    if not pasta_destino.is_absolute():
        pasta_destino = pasta_origem / pasta_destino
    pasta_destino = pasta_destino.resolve()
    pasta_destino.mkdir(parents=True, exist_ok=True)
    return pasta_destino


def resolve_processing_options(
    *,
    tipo: str,
    config_path: str | Path | None = None,
    pasta_destino: str | Path | None = None,
    competencia: str = "",
    prefixo: str = "",
) -> tuple[str, str | Path]:
    cfg = load_ini(config_path)

    if prefixo:
        prefixo_resolvido = prefixo if prefixo.endswith(" ") else prefixo + " "
    else:
        competencia_resolvida = competencia or get_rename_setting(cfg, "competencia") or default_competencia()
        prefixo_servico = get_rename_setting(cfg, "prefixo_servico") or DEFAULT_PREFIXO_SERVICO
        prefixo_produtos = get_rename_setting(cfg, "prefixo_produtos") or DEFAULT_PREFIXO_PRODUTOS
        prefixo_resolvido = build_prefix(
            tipo,
            competencia_resolvida,
            prefixo_servico,
            prefixo_produtos,
        )

    pasta_destino_resolvida = pasta_destino
    if pasta_destino_resolvida is None:
        pasta_destino_resolvida = get_rename_setting(cfg, "pasta_destino")
    if pasta_destino_resolvida in (None, ""):
        pasta_destino_resolvida = "RENOMEADOS"

    return prefixo_resolvido, pasta_destino_resolvida


def log_message(
    msg: str,
    *,
    log_path: str | Path | None = None,
    log_callback: Callable[[str], None] | None = None,
) -> None:
    if log_callback:
        log_callback(msg)
    else:
        print(msg)
    if log_path:
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(f"{datetime.now().isoformat()} {msg}\n")


def rename_pdf_file(
    caminho_pdf: str | Path,
    pasta_destino: str | Path,
    tipo: str,
    prefixo: str,
    *,
    dry_run: bool = False,
    log_path: str | Path | None = None,
    log_callback: Callable[[str], None] | None = None,
) -> tuple[str, Path | None]:
    caminho_pdf = Path(caminho_pdf)
    pasta_destino_resolvida = resolve_destination_dir(caminho_pdf.parent, pasta_destino)
    nome_arquivo = unicodedata.normalize("NFC", caminho_pdf.name)
    ascii_upper = tipo == TIPO_SERVICO

    try:
        texto = extract_text_from_pdf(caminho_pdf)
        razao = extract_razao_social(texto, tipo)

        nome_final: str
        if tipo == TIPO_SERVICO:
            digitos_cnae = extract_cnae_digits(texto)
            if digitos_cnae and digitos_cnae[-1] == "0":
                desc_servicos = (
                    extract_descricao_de_outras_informacoes(texto)
                    or extract_descricao_servicos_primeira_linha(texto)
                )
                competencia_parsed = parse_competencia_prefixo_servico_1_2(prefixo)

                if desc_servicos and not razao:
                    log_message(
                        f"CNAE termina em 0 e descricao encontrada, mas "
                        f"Nome/Razao Social nao encontrado em: {nome_arquivo}",
                        log_path=log_path,
                        log_callback=log_callback,
                    )
                    return RESULTADO_NAO_ENCONTRADO, None

                if desc_servicos and razao and competencia_parsed:
                    desc_limpa = clean_name(desc_servicos, ascii_upper)
                    razao_limpa = clean_name(razao, ascii_upper)
                    nome_final = nome_sem_colisao(
                        pasta_destino_resolvida,
                        f"NOTA FISCAL {desc_limpa} {competencia_parsed} {razao_limpa}.pdf",
                    )
                elif desc_servicos and razao and not competencia_parsed:
                    nome_limpo = clean_name(desc_servicos, ascii_upper)
                    nome_final = nome_sem_colisao(
                        pasta_destino_resolvida,
                        f"{prefixo}{nome_limpo}.pdf",
                    )
                elif razao and not desc_servicos:
                    log_message(
                        f"CNAE termina em 0 mas descricao dos servicos nao encontrada; "
                        f"usando razao social: {nome_arquivo}",
                        log_path=log_path,
                        log_callback=log_callback,
                    )
                    nome_limpo = clean_name(razao, ascii_upper)
                    nome_final = nome_sem_colisao(
                        pasta_destino_resolvida,
                        f"{prefixo}{nome_limpo}.pdf",
                    )
                else:
                    log_message(
                        f"Nome/Razao Social nao encontrado em: {nome_arquivo}",
                        log_path=log_path,
                        log_callback=log_callback,
                    )
                    return RESULTADO_NAO_ENCONTRADO, None
            else:
                if not razao:
                    log_message(
                        f"Nome/Razao Social nao encontrado em: {nome_arquivo}",
                        log_path=log_path,
                        log_callback=log_callback,
                    )
                    return RESULTADO_NAO_ENCONTRADO, None
                nome_limpo = clean_name(razao, ascii_upper)
                nome_final = nome_sem_colisao(
                    pasta_destino_resolvida,
                    f"{prefixo}{nome_limpo}.pdf",
                )
        else:
            if not razao:
                log_message(
                    f"Nome/Razao Social nao encontrado em: {nome_arquivo}",
                    log_path=log_path,
                    log_callback=log_callback,
                )
                return RESULTADO_NAO_ENCONTRADO, None
            nome_limpo = clean_name(razao, ascii_upper)
            nome_final = nome_sem_colisao(
                pasta_destino_resolvida,
                f"{prefixo}{nome_limpo}.pdf",
            )

        novo_caminho = pasta_destino_resolvida / nome_final

        if dry_run:
            log_message(
                f"[DRY-RUN] {nome_arquivo} -> {nome_final}",
                log_path=log_path,
                log_callback=log_callback,
            )
        else:
            caminho_pdf.rename(novo_caminho)
            log_message(
                f"Renomeado: {nome_arquivo} -> {nome_final}",
                log_path=log_path,
                log_callback=log_callback,
            )

        return RESULTADO_RENOMEADO, novo_caminho
    except Exception as exc:
        log_message(
            f"Erro ao processar {nome_arquivo}: {type(exc).__name__}: {exc}",
            log_path=log_path,
            log_callback=log_callback,
        )
        return RESULTADO_ERRO, None


def run(
    pasta_origem: str | Path,
    pasta_destino: str | Path,
    tipo: str,
    prefixo: str,
    dry_run: bool = False,
    log_path: str | Path | None = None,
    log_callback: Callable[[str], None] | None = None,
) -> tuple[int, int, int]:
    pasta_origem = Path(pasta_origem)
    pasta_destino_resolvida = resolve_destination_dir(pasta_origem, pasta_destino)
    renomeados = 0
    nao_encontrados = 0
    erros = 0

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

        resultado, _ = rename_pdf_file(
            caminho_pdf,
            pasta_destino_resolvida,
            tipo,
            prefixo,
            dry_run=dry_run,
            log_path=log_path,
            log_callback=log_callback,
        )
        if resultado == RESULTADO_RENOMEADO:
            renomeados += 1
        elif resultado == RESULTADO_NAO_ENCONTRADO:
            nao_encontrados += 1
        else:
            erros += 1

    return renomeados, nao_encontrados, erros


def rename_directory(
    pasta_origem: str | Path,
    *,
    tipo: str,
    config_path: str | Path | None = None,
    pasta_destino: str | Path | None = None,
    competencia: str = "",
    prefixo: str = "",
    dry_run: bool = False,
    log_path: str | Path | None = None,
    log_callback: Callable[[str], None] | None = None,
) -> RenameResult:
    prefixo_resolvido, pasta_destino_resolvida = resolve_processing_options(
        tipo=tipo,
        config_path=config_path,
        pasta_destino=pasta_destino,
        competencia=competencia,
        prefixo=prefixo,
    )
    renomeados, nao_encontrados, erros = run(
        pasta_origem,
        pasta_destino_resolvida,
        tipo,
        prefixo_resolvido,
        dry_run=dry_run,
        log_path=log_path,
        log_callback=log_callback,
    )
    return RenameResult(
        renomeados=renomeados,
        nao_encontrados=nao_encontrados,
        erros=erros,
    )
