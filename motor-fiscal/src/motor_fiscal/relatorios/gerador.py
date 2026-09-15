"""Gera pacote de relatorios (XLSX fiscal + JSON tecnico) da competencia."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from motor_fiscal.relatorios.destino import resolver_destino_relatorios
from motor_fiscal.relatorios.xlsx import (
    escrever_xlsx_consolidado,
    escrever_xlsx_modulo,
    nome_arquivo_modulo,
)

SUBPASTA_TECNICO = "tecnico"
NOME_RESUMO_XLSX = "Resumo_Conferencia.xlsx"

# Artefatos legados na raiz da pasta 09 (pre-entrega fiscal).
_LEGACY_RAIZ = (
    "consolidado.json",
    "consolidado.xlsx",
)


def _dir_tecnico(dir_destino: Path) -> Path:
    tecnico = dir_destino / SUBPASTA_TECNICO
    tecnico.mkdir(parents=True, exist_ok=True)
    return tecnico


def _limpar_legado_raiz(dir_destino: Path) -> None:
    """Remove JSON/XLSX antigos da raiz (agora so Excel fiscal + tecnico/)."""
    for nome in _LEGACY_RAIZ:
        path = dir_destino / nome
        if path.is_file():
            path.unlink()
    # JSONs de modulo na raiz (ex.: documental.json)
    for path in dir_destino.glob("*.json"):
        if path.is_file():
            path.unlink()
    # XLSX de modulo com nome tecnico antigo (minusculo)
    for path in dir_destino.glob("*.xlsx"):
        if path.name == NOME_RESUMO_XLSX:
            continue
        # remove so nomes tipicamente antigos (tudo minusculo / underscore)
        stem = path.stem
        if stem.islower() or stem == "consolidado":
            path.unlink()


def gerar_relatorios(
    resultado: dict[str, Any],
    destino: str | Path | None = None,
    *,
    empresa_cnpj: str | None = None,
    competencia: str | None = None,
    dossie: str | Path | None = None,
    saida_dir: str | Path | None = None,
    gerar_xlsx: bool = True,
) -> dict[str, Any]:
    """Grava XLSX fiscal na raiz e JSON em ``tecnico/``.

    Retorna mapa com caminhos gerados e o diretorio usado.
    """
    emp = empresa_cnpj or resultado.get("empresa_cnpj") or ""
    comp = competencia or resultado.get("competencia") or ""
    if destino is None:
        dir_destino = resolver_destino_relatorios(
            emp, comp, dossie=dossie, saida_dir=saida_dir
        )
    else:
        dir_destino = Path(destino)
    dir_destino.mkdir(parents=True, exist_ok=True)
    _limpar_legado_raiz(dir_destino)
    dir_tec = _dir_tecnico(dir_destino)

    caminhos: dict[str, str] = {}
    consolidado_json = dir_tec / "consolidado.json"
    consolidado_json.write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2, default=str) + "\n",
        encoding="utf-8",
    )
    caminhos["consolidado_json"] = str(consolidado_json)

    if gerar_xlsx:
        consolidado_xlsx = dir_destino / NOME_RESUMO_XLSX
        escrever_xlsx_consolidado(resultado, consolidado_xlsx)
        caminhos["consolidado_xlsx"] = str(consolidado_xlsx)

    for nome, payload in (resultado.get("modulos") or {}).items():
        path_json = dir_tec / f"{nome}.json"
        path_json.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2, default=str) + "\n",
            encoding="utf-8",
        )
        caminhos[f"{nome}_json"] = str(path_json)
        if gerar_xlsx:
            path_xlsx = dir_destino / nome_arquivo_modulo(nome)
            body = payload if isinstance(payload, dict) else {"dados": payload}
            if isinstance(body, dict) and "modulo" not in body:
                body = {**body, "modulo": nome}
            escrever_xlsx_modulo(body, path_xlsx)
            caminhos[f"{nome}_xlsx"] = str(path_xlsx)

    return {"destino": str(dir_destino), "arquivos": caminhos}
