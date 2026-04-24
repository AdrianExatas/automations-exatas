"""Utilitarios para reorganizacao de XMLs em diferentes formatos de pasta."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Callable

from .xml_parser import extrair_data_xml

MODE_FLAT = "flat"
MODE_YEAR = "year"
MODE_YEAR_MONTH = "year_month"
ORGANIZER_MODES = {MODE_FLAT, MODE_YEAR, MODE_YEAR_MONTH}


def organizar_xmls_por_data(pasta_xmls: str) -> dict[str, object]:
    """Mantem compatibilidade com a organizacao por ano."""
    return reorganizar_xmls(pasta_xmls, MODE_YEAR)


def reorganizar_por_ano(pasta_xmls: str) -> dict[str, object]:
    """Mantem compatibilidade com a reorganizacao para estrutura por ano."""
    return reorganizar_xmls(pasta_xmls, MODE_YEAR)


def organizar_xmls(
    pasta_xmls: str,
    mode: str,
    *,
    progress_callback: Callable[..., None] | None = None,
) -> dict[str, object]:
    """Alias publico para reorganizacao generica."""
    return reorganizar_xmls(pasta_xmls, mode, progress_callback=progress_callback)


def reorganizar_xmls(
    pasta_xmls: str,
    mode: str,
    *,
    progress_callback: Callable[..., None] | None = None,
) -> dict[str, object]:
    """Reorganiza todos os XMLs recursivamente para o formato alvo."""
    if mode not in ORGANIZER_MODES:
        raise ValueError(f"Modo de organizacao invalido: {mode}")

    raiz = Path(pasta_xmls)
    if not raiz.exists():
        return {"erro": "Pasta nao encontrada", "mode": mode}
    if not raiz.is_dir():
        return {"erro": "Caminho informado nao e uma pasta", "mode": mode}

    arquivos_xml = sorted([caminho for caminho in raiz.rglob("*.xml") if caminho.is_file()])
    if not arquivos_xml:
        return _resultado_base(mode, total=0)

    movidos = 0
    conflitos = 0
    erros = 0
    ja_organizados = 0
    sem_data = 0

    total = len(arquivos_xml)
    for idx, caminho_atual in enumerate(arquivos_xml, 1):
        nome_arquivo = caminho_atual.name

        try:
            xml_content = _ler_xml(caminho_atual)
            ano, mes = extrair_data_xml(xml_content)
        except Exception as exc:
            erros += 1
            _emit_progress(progress_callback, current=idx, total=total, path=str(caminho_atual), message=f"ERRO: {exc}")
            continue

        if ano is None:
            sem_data += 1

        caminho_destino = _build_target_path(raiz, nome_arquivo, mode, ano, mes)
        caminho_destino.parent.mkdir(parents=True, exist_ok=True)

        try:
            if caminho_destino.resolve() == caminho_atual.resolve():
                ja_organizados += 1
                _emit_progress(progress_callback, current=idx, total=total, path=str(caminho_atual), message="Ja organizado")
                continue
        except FileNotFoundError:
            pass

        if caminho_destino.exists():
            caminho_destino, houve_conflito = _resolver_conflito(caminho_destino)
            if houve_conflito:
                conflitos += 1

        try:
            caminho_atual.replace(caminho_destino)
            movidos += 1
            _emit_progress(progress_callback, current=idx, total=total, path=str(caminho_destino), message="Movido")
        except Exception as exc:
            erros += 1
            _emit_progress(progress_callback, current=idx, total=total, path=str(caminho_atual), message=f"ERRO: {exc}")

    _remover_pastas_vazias(raiz)
    return {
        "mode": mode,
        "total": total,
        "organizados": movidos,
        "movidos": movidos,
        "conflitos": conflitos,
        "sem_data": sem_data,
        "erros": erros,
        "ja_organizados": ja_organizados,
    }


def _resultado_base(mode: str, *, total: int) -> dict[str, object]:
    return {
        "mode": mode,
        "total": total,
        "organizados": 0,
        "movidos": 0,
        "conflitos": 0,
        "sem_data": 0,
        "erros": 0,
        "ja_organizados": 0,
    }


def _ler_xml(caminho: Path) -> str:
    try:
        return caminho.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return caminho.read_text(encoding="latin-1")


def _build_target_path(raiz: Path, nome_arquivo: str, mode: str, ano: int | None, mes: int | None) -> Path:
    if mode == MODE_FLAT or ano is None:
        return raiz / nome_arquivo
    if mode == MODE_YEAR_MONTH and mes is not None:
        return raiz / str(ano) / f"{mes:02d}" / nome_arquivo
    return raiz / str(ano) / nome_arquivo


def _resolver_conflito(caminho_destino: Path) -> tuple[Path, bool]:
    base = caminho_destino.stem
    ext = caminho_destino.suffix
    contador = 1
    novo_destino = caminho_destino

    while novo_destino.exists():
        novo_destino = caminho_destino.with_name(f"{base}_{contador}{ext}")
        contador += 1

    return novo_destino, True


def _remover_pastas_vazias(raiz: Path) -> None:
    for caminho in sorted([path for path in raiz.rglob("*") if path.is_dir()], key=lambda item: len(item.parts), reverse=True):
        try:
            if not any(caminho.iterdir()):
                caminho.rmdir()
        except OSError:
            continue


def _emit_progress(callback: Callable[..., None] | None, **payload) -> None:
    if callback is not None:
        callback(**payload)
