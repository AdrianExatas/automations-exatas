"""Orquestra auditoria ICMS/IPI/PIS-COFINS e grava JSON estruturado em ``_local/``.

Modulos conhecidos aqui: ``icms``, ``ipi``, ``pis_cofins``.
Handlers adicionais podem ser descobertos via ``registro_modulos`` (auto-registro).
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

from motor_fiscal import registro_modulos
from motor_fiscal.db import caminho_banco, conectar
from motor_fiscal.icms import auditar_icms
from motor_fiscal.ipi import auditar_ipi

MODULOS_NATIVOS = frozenset({"icms", "ipi", "pis_cofins"})


def _cnpj_digitos(empresa: str) -> str:
    return re.sub(r"\D", "", empresa)


def diretorio_saida(saida: str | Path | None, empresa: str, competencia: str,
                    db_dir: str | Path | None = None) -> Path:
    if saida:
        return Path(saida)
    # Espelha a arvore do DB: _local/auditoria/<cnpj>/<AAAA-MM>.json
    if db_dir:
        raiz = Path(db_dir).parent
    else:
        raiz = Path.cwd() / "_local"
    return raiz / "auditoria" / _cnpj_digitos(empresa) / f"{competencia}.json"


def _dir_relatorios_modulo(
    empresa: str, competencia: str, db_dir: str | Path | None = None
) -> Path:
    if db_dir:
        raiz = Path(db_dir).parent
    else:
        raiz = Path.cwd() / "_local"
    return raiz / "relatorios" / _cnpj_digitos(empresa) / competencia


def auditar(
    *,
    empresa: str,
    competencia: str,
    modulos: list[str],
    db_dir: str | Path | None = None,
    guias: str | Path | None = None,
    saida: str | Path | None = None,
    config_dir: str | Path | None = None,
) -> dict:
    """Abre o DB importado, roda os modulos pedidos e persiste o JSON."""
    banco = caminho_banco(empresa, competencia, db_dir)
    if not banco.exists():
        raise FileNotFoundError(
            f"banco nao encontrado: {banco} (rode 'importar' antes)"
        )
    con = conectar(banco)
    try:
        resultado: dict = {
            "empresa_cnpj": _cnpj_digitos(empresa),
            "competencia": competencia,
            "gerado_em": datetime.now(timezone.utc).isoformat(),
            "banco": str(banco),
            "modulos": {},
            "ok": True,
        }
        mods = [m.strip().lower() for m in modulos if m.strip()]
        if not mods:
            raise ValueError(
                "informe ao menos um modulo (icms, ipi, pis_cofins)"
            )

        desconhecidos = [m for m in mods if m not in MODULOS_NATIVOS]
        # Tenta descobrir handlers registrados (ex.: futuros modulos)
        if desconhecidos:
            registro_modulos.descobrir()
            ainda = [m for m in desconhecidos if m not in registro_modulos.handlers_registrados()]
            if ainda:
                raise ValueError(
                    f"modulos invalidos: {ainda!r} "
                    f"(use icms, ipi e/ou pis_cofins)"
                )

        cnpj = _cnpj_digitos(empresa)
        dir_mods = _dir_relatorios_modulo(empresa, competencia, db_dir)

        if "icms" in mods:
            resultado["modulos"]["icms"] = auditar_icms(
                con,
                empresa=cnpj,
                competencia=competencia,
                guias_path=guias,
                db_dir=db_dir,
                config_dir=config_dir,
            )
            resultado["ok"] = resultado["ok"] and resultado["modulos"]["icms"]["ok"]

        if "ipi" in mods:
            resultado["modulos"]["ipi"] = auditar_ipi(
                con,
                empresa=cnpj,
                competencia=competencia,
                config_dir=config_dir,
            )
            resultado["ok"] = resultado["ok"] and resultado["modulos"]["ipi"]["ok"]

        if "pis_cofins" in mods:
            # Prefer auto-registro; fallback import direto
            registro_modulos.descobrir()
            handlers = registro_modulos.handlers_registrados()
            if "pis_cofins" in handlers:
                rel = handlers["pis_cofins"](con, empresa, competencia)
            else:
                from motor_fiscal.pis_cofins import auditar as auditar_pis

                rel = auditar_pis(con, empresa, competencia)
            resultado["modulos"]["pis_cofins"] = rel
            resultado["ok"] = resultado["ok"] and bool(rel.get("ok", True))
            # JSON dedicado do modulo (contrato M8)
            path_mod = dir_mods / "pis_cofins.json"
            path_mod.parent.mkdir(parents=True, exist_ok=True)
            path_mod.write_text(
                json.dumps(rel, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            rel["arquivo_saida"] = str(path_mod)

        # Handlers registrados que nao sao nativos (forward-compat)
        for nome in mods:
            if nome in MODULOS_NATIVOS:
                continue
            handler = registro_modulos.handlers_registrados()[nome]
            rel = handler(con, empresa, competencia)
            resultado["modulos"][nome] = rel
            resultado["ok"] = resultado["ok"] and bool(rel.get("ok", True))

        destino = diretorio_saida(saida, empresa, competencia, db_dir)
        destino.parent.mkdir(parents=True, exist_ok=True)
        with open(destino, "w", encoding="utf-8") as f:
            json.dump(resultado, f, ensure_ascii=False, indent=2)
        resultado["arquivo_saida"] = str(destino)
        return resultado
    finally:
        con.close()
