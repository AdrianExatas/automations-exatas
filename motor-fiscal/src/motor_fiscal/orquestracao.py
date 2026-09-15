"""Orquestracao das auditorias (CLI ``auditar``), lote multi-empresa e saida JSON/XLSX."""

from __future__ import annotations

import inspect
import json
import re
import sqlite3
import traceback
from pathlib import Path
from typing import Any, Callable

from motor_fiscal.auditoria import auditar_documental
from motor_fiscal.db.schema import diretorio_padrao
from motor_fiscal.estoque import auditar_estoque
from motor_fiscal.icms import auditar as auditar_icms
from motor_fiscal.ipi import auditar as auditar_ipi
from motor_fiscal.lmc import auditar_lmc
from motor_fiscal.margens import auditar_margens
from motor_fiscal.pis_cofins import auditar as auditar_pis_cofins
from motor_fiscal.relatorios import gerar_relatorios
from motor_fiscal.util import agora_iso

MODULOS_DISPONIVEIS: dict[str, Callable] = {
    "documental": auditar_documental,
    "icms": auditar_icms,
    "ipi": auditar_ipi,
    "pis_cofins": auditar_pis_cofins,
    "estoque": auditar_estoque,
    "lmc": auditar_lmc,
    "margens": auditar_margens,
}

MODULOS_PADRAO = ("documental", "estoque", "lmc", "margens")


def parse_modulos(texto: str | None) -> list[str]:
    if not texto or texto.strip().lower() in {"todos", "all", "*"}:
        return list(MODULOS_PADRAO)
    if texto.strip().lower() in {"completo", "full"}:
        return list(MODULOS_DISPONIVEIS)
    pedidos = [m.strip().lower() for m in texto.split(",") if m.strip()]
    desconhecidos = [m for m in pedidos if m not in MODULOS_DISPONIVEIS]
    if desconhecidos:
        disponiveis = ", ".join(sorted(MODULOS_DISPONIVEIS))
        raise ValueError(
            f"Modulos desconhecidos: {', '.join(desconhecidos)}. "
            f"Disponiveis: {disponiveis}"
        )
    return pedidos


def caminho_saida_padrao(
    empresa_cnpj: str,
    competencia: str,
    raiz: str | Path | None = None,
) -> Path:
    cnpj = re.sub(r"\D", "", empresa_cnpj)
    base = Path(raiz) if raiz else Path.cwd() / "_local" / "auditorias"
    return base / cnpj / f"{competencia}.json"


def listar_empresas_banco(
    competencia: str,
    db_dir: str | Path | None = None,
) -> list[str]:
    """Varre ``_local/db/<cnpj>/<AAAA-MM>.db`` e devolve CNPJs com banco na competencia."""
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", competencia):
        raise ValueError(f"Competencia invalida (esperado AAAA-MM): {competencia!r}")
    raiz = diretorio_padrao(db_dir)
    if not raiz.is_dir():
        return []
    empresas: list[str] = []
    for pasta in sorted(raiz.iterdir()):
        if not pasta.is_dir():
            continue
        banco = pasta / f"{competencia}.db"
        if banco.is_file():
            empresas.append(pasta.name)
    return empresas


def _empresa_no_banco(con: sqlite3.Connection, empresa_cnpj: str) -> str:
    """Usa o CNPJ exatamente como gravado no DB (pode ter mascara da importacao)."""
    pedido = re.sub(r"\D", "", empresa_cnpj)
    for tabela in ("documentos", "produtos", "registros_efd"):
        rows = con.execute(f"SELECT DISTINCT empresa_cnpj FROM {tabela}").fetchall()
        for r in rows:
            if re.sub(r"\D", "", r["empresa_cnpj"] or "") == pedido:
                return r["empresa_cnpj"]
    return pedido


def _chamar_modulo(
    fn: Callable,
    con: sqlite3.Connection,
    empresa: str,
    competencia: str,
    kwargs: dict[str, Any],
) -> dict:
    """Chama o handler; repassa kwargs so se o callable aceitar **kwargs."""
    kwargs = {k: v for k, v in kwargs.items() if v is not None}
    try:
        sig = inspect.signature(fn)
    except (TypeError, ValueError):
        return fn(con, empresa, competencia)
    if any(p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()):
        return fn(con, empresa, competencia, **kwargs)
    return fn(con, empresa, competencia)


def auditar(
    con: sqlite3.Connection,
    empresa_cnpj: str,
    competencia: str,
    modulos: list[str] | None = None,
    **kwargs: Any,
) -> dict:
    """Roda os modulos pedidos e devolve o pacote JSON consolidado."""
    lista = modulos or list(MODULOS_PADRAO)
    cnpj_digits = re.sub(r"\D", "", empresa_cnpj)
    empresa_db = _empresa_no_banco(con, empresa_cnpj)
    resultado: dict = {
        "empresa_cnpj": cnpj_digits,
        "competencia": competencia,
        "gerado_em": agora_iso(),
        "modulos": {},
        "resumo": {"modulos": {}, "erros": 0, "avisos": 0, "ok": True},
    }
    erros_total = 0
    avisos_total = 0
    for nome in lista:
        fn = MODULOS_DISPONIVEIS[nome]
        saida = _chamar_modulo(fn, con, empresa_db, competencia, kwargs)
        resultado["modulos"][nome] = saida
        resumo_mod = saida.get("resumo", {})
        # Aceita tanto contagem de achados (M1) quanto erros de apuracao (M2/M3)
        erros_mod = resumo_mod.get("erros", 0)
        if erros_mod == 0 and saida.get("ok") is False:
            erros_mod = 1
        avisos_mod = resumo_mod.get("avisos", 0)
        erros_total += erros_mod
        avisos_total += avisos_mod
        resultado["resumo"]["modulos"][nome] = {
            "ok": saida.get("ok", True),
            "erros": erros_mod,
            "avisos": avisos_mod,
            "total_achados": resumo_mod.get("total", resumo_mod.get("achados", 0)),
        }
    resultado["resumo"]["erros"] = erros_total
    resultado["resumo"]["avisos"] = avisos_total
    resultado["resumo"]["ok"] = erros_total == 0
    return resultado


def escrever_json(resultado: dict, caminho: str | Path) -> Path:
    caminho = Path(caminho)
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2, default=str),
        encoding="utf-8",
    )
    return caminho


def _inferir_dir_relatorios(
    resultado: dict,
    caminho_auditoria: Path | None,
) -> Path | None:
    """Quando nao ha --dossie/--saida-relatorios, espelha a arvore da auditoria."""
    cnpj = resultado.get("empresa_cnpj") or ""
    competencia = resultado.get("competencia") or ""
    if not cnpj or not competencia:
        return None
    if caminho_auditoria is None:
        return None
    # tipico: <raiz>/auditorias/<cnpj>/<comp>.json  → <raiz>/relatorios/<cnpj>/<comp>
    parent = caminho_auditoria.parent  # .../<cnpj>
    raiz = parent.parent  # .../auditorias
    if raiz.name in {"auditorias", "auditoria"}:
        return raiz.parent / "relatorios" / cnpj / competencia
    # saida avulsa: <dir>/arquivo.json → <dir>/relatorios/<cnpj>/<comp>
    return parent / "relatorios" / cnpj / competencia


def persistir_saidas(
    resultado: dict,
    *,
    caminho_auditoria: str | Path | None = None,
    dossie: str | Path | None = None,
    saida_relatorios: str | Path | None = None,
    gerar_xlsx: bool = True,
) -> dict[str, Any]:
    """Grava JSON de auditoria + pacote de relatorios (JSON/XLSX por modulo)."""
    meta: dict[str, Any] = {}
    caminho = Path(caminho_auditoria) if caminho_auditoria else None
    if caminho is not None:
        meta["auditoria_json"] = str(escrever_json(resultado, caminho))
    dir_rel = saida_relatorios
    if dir_rel is None and dossie is None:
        dir_rel = _inferir_dir_relatorios(resultado, caminho)
    pacote = gerar_relatorios(
        resultado,
        dossie=dossie,
        saida_dir=dir_rel,
        gerar_xlsx=gerar_xlsx,
    )
    meta["relatorios"] = pacote
    return meta


def auditar_lote(
    competencia: str,
    modulos: list[str] | None = None,
    *,
    db_dir: str | Path | None = None,
    guias: str | Path | None = None,
    config_dir: str | Path | None = None,
    saida_dir: str | Path | None = None,
    dossie: str | Path | None = None,
    saida_relatorios: str | Path | None = None,
    gerar_xlsx: bool = True,
    conectar_fn: Callable | None = None,
    caminho_banco_fn: Callable | None = None,
) -> dict[str, Any]:
    """Fila sequencial: audita todas as empresas com banco na competencia."""
    from motor_fiscal.db import caminho_banco, conectar

    conectar_fn = conectar_fn or conectar
    caminho_banco_fn = caminho_banco_fn or caminho_banco

    empresas = listar_empresas_banco(competencia, db_dir)
    lote: dict[str, Any] = {
        "competencia": competencia,
        "gerado_em": agora_iso(),
        "empresas": empresas,
        "total": len(empresas),
        "ok": True,
        "resultados": [],
        "falhas": [],
    }
    kwargs = {"guias": guias, "db_dir": db_dir, "config_dir": config_dir}
    for cnpj in empresas:
        try:
            banco = caminho_banco_fn(cnpj, competencia, db_dir)
            con = conectar_fn(banco)
            try:
                resultado = auditar(con, cnpj, competencia, modulos, **kwargs)
            finally:
                con.close()
            caminho_json = caminho_saida_padrao(cnpj, competencia, saida_dir)
            meta = persistir_saidas(
                resultado,
                caminho_auditoria=caminho_json,
                dossie=dossie,
                saida_relatorios=(
                    Path(saida_relatorios) / cnpj / competencia
                    if saida_relatorios
                    else None
                ),
                gerar_xlsx=gerar_xlsx,
            )
            lote["resultados"].append({
                "empresa_cnpj": cnpj,
                "ok": resultado["resumo"]["ok"],
                "resumo": resultado["resumo"],
                "saidas": meta,
            })
            if not resultado["resumo"]["ok"]:
                lote["ok"] = False
        except Exception as exc:  # noqa: BLE001 — lote deve continuar
            lote["ok"] = False
            lote["falhas"].append({
                "empresa_cnpj": cnpj,
                "erro": str(exc),
                "traceback": traceback.format_exc(limit=5),
            })
    return lote
