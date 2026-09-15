"""Localizacao e leitura dos JSON/XLSX de relatorio gerados pelo motor fiscal.

Prioridade de busca para (cnpj, competencia):

1. Dossie mensal: ``_local/dossies/<cnpj>/<AAAA-MM>/09 - Relatorio de conferencia/``
   - ``tecnico/consolidado.json`` + ``tecnico/<modulo>.json`` (JSON)
   - XLSX na raiz da pasta 09 (entrega ao fiscal)
2. Fallback: ``motor-fiscal/_local/auditorias/<cnpj>/<AAAA-MM>.json`` (JSON unico,
   modulos dentro da chave ``modulos``).

O nome da pasta "09" pode variar (acentos, etc.) - ``_eh_pasta_09`` resolve isso
de forma tolerante, no mesmo espirito de
``motor_fiscal.relatorios.destino._eh_pasta_09``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.config import AUDITORIAS_DIR, DOSSIES_DIR
from app.util import competencia_valida, sem_acentos, somente_digitos


def _eh_pasta_09(nome: str) -> bool:
    limpo = sem_acentos(nome).casefold()
    return limpo.startswith("09") and "onferencia" in limpo


def localizar_pasta_09(cnpj: str, competencia: str) -> Path | None:
    """Acha a pasta "09 - Relatorio de conferencia" dentro do dossie da competencia."""
    base = DOSSIES_DIR / somente_digitos(cnpj) / competencia
    if not base.is_dir():
        return None
    for filho in sorted(base.iterdir()):
        if filho.is_dir() and _eh_pasta_09(filho.name):
            return filho
    return None


def localizar_pasta_tecnico(pasta_09: Path) -> Path | None:
    """Acha a subpasta com os JSON tecnicos dentro da pasta 09.

    Normalmente e literalmente ``tecnico``; tolera variacoes (ex.: fixtures
    de teste) procurando qualquer subpasta que contenha ``consolidado.json``.
    """
    candidato = pasta_09 / "tecnico"
    if candidato.is_dir() and (candidato / "consolidado.json").is_file():
        return candidato
    for filho in sorted(pasta_09.iterdir()):
        if filho.is_dir() and (filho / "consolidado.json").is_file():
            return filho
    return None


def caminho_auditoria_fallback(cnpj: str, competencia: str) -> Path:
    return AUDITORIAS_DIR / somente_digitos(cnpj) / f"{competencia}.json"


@dataclass
class FonteDados:
    """De onde os dados consolidados de uma competencia foram/seriam lidos."""

    origem: str  # "dossie" | "auditoria"
    consolidado_path: Path
    pasta_09: Path | None = None
    pasta_tecnico: Path | None = None


def resolver_fonte(cnpj: str, competencia: str) -> FonteDados | None:
    """Resolve de onde ler os dados da competencia, seguindo a prioridade do modulo."""
    if not competencia_valida(competencia):
        return None
    cnpj = somente_digitos(cnpj)

    pasta_09 = localizar_pasta_09(cnpj, competencia)
    if pasta_09 is not None:
        pasta_tecnico = localizar_pasta_tecnico(pasta_09)
        if pasta_tecnico is not None:
            consolidado = pasta_tecnico / "consolidado.json"
            if consolidado.is_file():
                return FonteDados("dossie", consolidado, pasta_09, pasta_tecnico)

    fallback = caminho_auditoria_fallback(cnpj, competencia)
    if fallback.is_file():
        return FonteDados("auditoria", fallback)

    return None


def carregar_consolidado(cnpj: str, competencia: str) -> tuple[FonteDados | None, dict[str, Any] | None]:
    """Carrega o JSON consolidado (todos os modulos) de uma competencia, se existir."""
    fonte = resolver_fonte(cnpj, competencia)
    if fonte is None:
        return None, None
    with open(fonte.consolidado_path, encoding="utf-8") as f:
        dados = json.load(f)
    return fonte, dados


def carregar_modulo(cnpj: str, competencia: str, modulo: str) -> dict[str, Any] | None:
    """Carrega o JSON de um modulo especifico.

    Prefere o arquivo dedicado ``<modulo>.json`` (dossie) quando existir;
    senao extrai de ``consolidado["modulos"][modulo]`` (cobre o fallback de
    auditorias, que so tem um JSON unico, e dossies sem arquivo separado
    daquele modulo).
    """
    fonte = resolver_fonte(cnpj, competencia)
    if fonte is None:
        return None

    if fonte.origem == "dossie" and fonte.pasta_tecnico is not None:
        arquivo_modulo = fonte.pasta_tecnico / f"{modulo}.json"
        if arquivo_modulo.is_file():
            with open(arquivo_modulo, encoding="utf-8") as f:
                return json.load(f)

    with open(fonte.consolidado_path, encoding="utf-8") as f:
        consolidado = json.load(f)
    return (consolidado.get("modulos") or {}).get(modulo)


def listar_competencias_disponiveis(cnpj: str) -> list[str]:
    """Uniao das competencias encontradas no dossie e no fallback de auditorias."""
    cnpj = somente_digitos(cnpj)
    competencias: set[str] = set()

    pasta_empresa = DOSSIES_DIR / cnpj
    if pasta_empresa.is_dir():
        for filho in pasta_empresa.iterdir():
            if filho.is_dir() and competencia_valida(filho.name):
                competencias.add(filho.name)

    pasta_auditorias = AUDITORIAS_DIR / cnpj
    if pasta_auditorias.is_dir():
        for arquivo in pasta_auditorias.glob("*.json"):
            if competencia_valida(arquivo.stem):
                competencias.add(arquivo.stem)

    return sorted(competencias, reverse=True)


def listar_arquivos_xlsx(cnpj: str, competencia: str) -> list[str]:
    """Lista os .xlsx na raiz da pasta 09 (entrega ao fiscal), se houver."""
    pasta_09 = localizar_pasta_09(somente_digitos(cnpj), competencia)
    if pasta_09 is None:
        return []
    return sorted(
        arquivo.name
        for arquivo in pasta_09.iterdir()
        if arquivo.is_file() and arquivo.suffix.lower() == ".xlsx"
    )


def resolver_arquivo_xlsx(cnpj: str, competencia: str, nome: str) -> Path | None:
    """Resolve o caminho de um xlsx, validando contra a whitelist (evita path traversal)."""
    permitidos = listar_arquivos_xlsx(cnpj, competencia)
    if nome not in permitidos:
        return None
    pasta_09 = localizar_pasta_09(somente_digitos(cnpj), competencia)
    if pasta_09 is None:
        return None
    pasta_09_resolvida = pasta_09.resolve()
    caminho = (pasta_09 / nome).resolve()
    if caminho.parent != pasta_09_resolvida:
        return None
    return caminho


def _primeiro_nao_nulo(*valores: Any) -> Any:
    for valor in valores:
        if valor is not None:
            return valor
    return None


def extrair_kpis(consolidado: dict[str, Any] | None) -> dict[str, Any]:
    """Extrai KPIs financeiros do modulo ICMS (com fallback None quando ausente).

    ``vl_fecoep_recolher``/``vl_fecoep_difal_recolher`` so existem para
    empresas em UF com FECOEP (ex.: AL) - tratados como opcionais. A geracao
    atual do motor grava esses valores em ``icms.resumo`` (e, quando presente,
    tambem no bloco ``icms.fecoep``); toleramos ambos os formatos.
    """
    modulos = (consolidado or {}).get("modulos") or {}
    icms = modulos.get("icms") or {}
    resumo_icms = icms.get("resumo") or {}
    fecoep = icms.get("fecoep") or {}
    e116_fecoep = icms.get("e116", {}).get("fecoep") if isinstance(icms.get("e116"), dict) else None
    e116_fecoep = e116_fecoep or {}

    return {
        "vl_icms_recolher": _primeiro_nao_nulo(resumo_icms.get("vl_icms_recolher")),
        "vl_sld_credor_transportar": _primeiro_nao_nulo(resumo_icms.get("vl_sld_credor_transportar")),
        "vl_fecoep_recolher": _primeiro_nao_nulo(
            resumo_icms.get("vl_fecoep_recolher"),
            fecoep.get("vl_fecoep_recolher"),
            e116_fecoep.get("vl_fecoep_recolher"),
        ),
        "vl_fecoep_difal_recolher": _primeiro_nao_nulo(
            resumo_icms.get("vl_fecoep_difal_recolher"),
            fecoep.get("vl_fecoep_difal_recolher"),
            e116_fecoep.get("vl_fecoep_difal_recolher"),
        ),
        "cruzamentos_ok": resumo_icms.get("cruzamentos_ok"),
        "cruzamentos_total": resumo_icms.get("cruzamentos_total"),
    }


def extrair_resumo_geral(consolidado: dict[str, Any] | None) -> dict[str, Any]:
    """Resumo geral do consolidado: {ok, erros, avisos} + resumo por modulo."""
    resumo = (consolidado or {}).get("resumo") or {}
    return {
        "ok": resumo.get("ok"),
        "erros": resumo.get("erros"),
        "avisos": resumo.get("avisos"),
        "modulos": resumo.get("modulos") or {},
    }
