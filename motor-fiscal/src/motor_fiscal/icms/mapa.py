"""Mapa tributario ICMS: matriz CFOP x CST x aliquota observada x esperada."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from motor_fiscal.icms.livro import montar_livro
from motor_fiscal.util import arred, eh_igual, n

# Raiz do projeto motor-fiscal/ (src/motor_fiscal/icms/mapa.py -> ../../../../)
_ROOT = Path(__file__).resolve().parents[3]
_CONFIG_DIR = _ROOT / "config"


def carregar_config_uf(uf: str, config_dir: str | Path | None = None) -> dict:
    """Carrega ``config/icms_<uf>.json`` (ou icms_default.json)."""
    base = Path(config_dir) if config_dir else _CONFIG_DIR
    candidatos = [
        base / f"icms_{uf.lower()}.json",
        base / "icms_default.json",
    ]
    for caminho in candidatos:
        if caminho.is_file():
            with open(caminho, encoding="utf-8") as f:
                data = json.load(f)
            data["_arquivo"] = str(caminho)
            return data
    return {"uf": uf, "regras": [], "_arquivo": None}


def uf_empresa(con: sqlite3.Connection) -> str:
    rows = con.execute(
        """
        SELECT dados FROM registros_efd
        WHERE arquivo = 'efd_icms_ipi' AND registro = '0000'
        ORDER BY numero_linha LIMIT 1
        """
    ).fetchall()
    if rows and rows[0]["dados"]:
        return (json.loads(rows[0]["dados"]).get("UF") or "").upper()
    return ""


def _indice_regras(config: dict) -> dict[tuple[str, str], dict]:
    idx = {}
    for regra in config.get("regras", []):
        cfop = str(regra.get("cfop", "")).strip()
        cst = str(regra.get("cst", "")).strip()
        idx[(cfop, cst)] = regra
    return idx


def montar_mapa(
    con: sqlite3.Connection,
    *,
    uf: str | None = None,
    config_dir: str | Path | None = None,
) -> dict:
    """Compara aliquotas observadas no livro com a tabela parametrizavel por UF."""
    uf_res = (uf or uf_empresa(con) or "default").upper()
    config = carregar_config_uf(uf_res, config_dir)
    regras = _indice_regras(config)
    livro = montar_livro(con)

    linhas = []
    for bloco, sentido in (("entradas", "entrada"), ("saidas", "saida")):
        for item in livro[bloco]:
            chave = (item["cfop"], item["cst_icms"])
            regra = regras.get(chave)
            aliq_obs = arred(item["aliq_icms"])
            aliq_esp = arred(n(regra.get("aliq_esperada"))) if regra else None
            ok = True
            status = "sem_regra"
            if regra is not None:
                if aliq_esp is None:
                    status = "regra_sem_aliquota"
                elif eh_igual(aliq_obs, aliq_esp):
                    status = "conforme"
                    ok = True
                else:
                    status = "divergente"
                    ok = False
            linhas.append({
                "sentido": sentido,
                "cfop": item["cfop"],
                "cst_icms": item["cst_icms"],
                "aliq_observada": aliq_obs,
                "aliq_esperada": aliq_esp,
                "vl_opr": item["vl_opr"],
                "vl_bc_icms": item["vl_bc_icms"],
                "vl_icms": item["vl_icms"],
                "natureza": regra.get("natureza") if regra else None,
                "status": status,
                "ok": ok if regra is not None else True,
            })

    divergencias = [l for l in linhas if not l["ok"]]
    return {
        "uf": uf_res,
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
