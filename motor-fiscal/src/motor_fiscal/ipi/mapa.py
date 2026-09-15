"""Mapa tributario IPI: CFOP x CST IPI x aliquota."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from motor_fiscal.util import arred, eh_igual, n

_ROOT = Path(__file__).resolve().parents[3]
_CONFIG_DIR = _ROOT / "config"


def carregar_config_ipi(uf: str = "default", config_dir: str | Path | None = None) -> dict:
    base = Path(config_dir) if config_dir else _CONFIG_DIR
    for nome in (f"ipi_{uf.lower()}.json", "ipi_default.json"):
        caminho = base / nome
        if caminho.is_file():
            with open(caminho, encoding="utf-8") as f:
                data = json.load(f)
            data["_arquivo"] = str(caminho)
            return data
    return {"regras": [], "_arquivo": None}


def montar_mapa_ipi(
    con: sqlite3.Connection,
    *,
    uf: str = "default",
    config_dir: str | Path | None = None,
) -> dict:
    config = carregar_config_ipi(uf, config_dir)
    regras = {
        (str(r.get("cfop", "")).strip(), str(r.get("cst_ipi", "")).strip()): r
        for r in config.get("regras", [])
    }
    linhas_raw = con.execute(
        """
        SELECT i.cfop, i.cst_ipi, i.aliq_ipi, i.vipi, i.vbc_ipi
        FROM itens i
        JOIN documentos d ON d.id = i.documento_id
        WHERE d.origem = 'efd_icms_ipi'
          AND (d.situacao IS NULL OR d.situacao NOT IN ('cancelada', 'denegada', 'inutilizada'))
        """
    ).fetchall()

    from collections import defaultdict
    buckets: dict[tuple, dict] = defaultdict(lambda: {
        "vl_ipi": 0.0, "vl_bc_ipi": 0.0, "aliq_sum": 0.0, "qtd": 0,
    })
    for r in linhas_raw:
        chave = ((r["cfop"] or "").strip(), (r["cst_ipi"] or "").strip(), arred(n(r["aliq_ipi"])))
        b = buckets[chave]
        b["vl_ipi"] = arred(b["vl_ipi"] + n(r["vipi"]))
        b["vl_bc_ipi"] = arred(b["vl_bc_ipi"] + n(r["vbc_ipi"]))
        b["aliq_sum"] += n(r["aliq_ipi"])
        b["qtd"] += 1

    linhas = []
    for (cfop, cst, aliq), b in sorted(buckets.items()):
        regra = regras.get((cfop, cst))
        aliq_esp = arred(n(regra.get("aliq_esperada"))) if regra else None
        status = "sem_regra"
        ok = True
        if regra is not None:
            if aliq_esp is None:
                status = "regra_sem_aliquota"
            elif eh_igual(aliq, aliq_esp):
                status = "conforme"
            else:
                status = "divergente"
                ok = False
        linhas.append({
            "cfop": cfop,
            "cst_ipi": cst,
            "aliq_observada": aliq,
            "aliq_esperada": aliq_esp,
            "vl_bc_ipi": b["vl_bc_ipi"],
            "vl_ipi": b["vl_ipi"],
            "status": status,
            "ok": ok if regra is not None else True,
        })

    divergencias = [l for l in linhas if not l["ok"]]
    return {
        "uf": uf,
        "config": config.get("_arquivo"),
        "linhas": linhas,
        "divergencias": divergencias,
        "ok": not divergencias,
        "resumo": {
            "total": len(linhas),
            "conforme": sum(1 for l in linhas if l["status"] == "conforme"),
            "sem_regra": sum(1 for l in linhas if l["status"] == "sem_regra"),
            "divergente": len(divergencias),
        },
    }
