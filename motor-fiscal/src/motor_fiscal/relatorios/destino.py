"""Resolve pasta de saida dos relatorios (dossie 09 ou ``_local/relatorios``)."""

from __future__ import annotations

import re
from pathlib import Path

PASTA_09_DOSSIE = "09 - Relatorio de conferencia"


def _cnpj(empresa: str) -> str:
    return re.sub(r"\D", "", empresa)


def _eh_pasta_09(path: Path) -> bool:
    nome = path.name.casefold()
    return nome.startswith("09") and "conferencia" in nome.replace("ê", "e").replace("é", "e")


def _pasta_09_em(dossie: Path) -> Path | None:
    if not dossie.is_dir():
        return None
    for filho in dossie.iterdir():
        if filho.is_dir() and _eh_pasta_09(filho):
            return filho
    candidato = dossie / PASTA_09_DOSSIE
    return candidato if candidato.is_dir() else None


def resolver_destino_relatorios(
    empresa_cnpj: str,
    competencia: str,
    *,
    dossie: str | Path | None = None,
    saida_dir: str | Path | None = None,
) -> Path:
    """Destino da pasta 09 (XLSX fiscal na raiz; JSON em ``tecnico/``).

    Prioridade:
    1. ``saida_dir`` explicito
    2. pasta ``09`` do dossie (``--dossie``)
    3. ``_local/relatorios/<cnpj>/<AAAA-MM>/``
    """
    if saida_dir:
        return Path(saida_dir)

    cnpj = _cnpj(empresa_cnpj)
    if dossie:
        base = Path(dossie)
        if _eh_pasta_09(base):
            return base
        pasta09 = _pasta_09_em(base)
        if pasta09 is not None:
            return pasta09
        # base pode ser raiz de dossies: <base>/<cnpj>/<comp>/09
        candidato = base / cnpj / competencia
        pasta09 = _pasta_09_em(candidato)
        if pasta09 is not None:
            return pasta09
        # cria pasta 09 sob o dossie da competencia (ou sob o path informado)
        if (base / cnpj).is_dir() or base.name == cnpj:
            alvo = candidato if base.name != cnpj else base / competencia
        elif re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", base.name or ""):
            alvo = base
        else:
            alvo = base / cnpj / competencia
        destino = alvo / PASTA_09_DOSSIE
        destino.mkdir(parents=True, exist_ok=True)
        return destino

    return Path.cwd() / "_local" / "relatorios" / cnpj / competencia
