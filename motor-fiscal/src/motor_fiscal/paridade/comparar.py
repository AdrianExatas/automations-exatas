"""Compara indicadores modulo a modulo entre motor e export ControlDocs."""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from motor_fiscal.util import agora_iso, quase_igual


def _load(path: str | Path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8-sig"))


def _cnpj(valor: Any) -> str:
    return re.sub(r"\D", "", str(valor or ""))


def extrair_indicadores(pacote: dict) -> dict[str, dict[str, Any]]:
    """Normaliza JSON do motor ou do ControlDocs para indicadores comparaveis.

    Formato esperado do ControlDocs (export sintetico ou real)::

        {
          "fonte": "controldocs",
          "empresa_cnpj": "...",
          "competencia": "AAAA-MM",
          "modulos": {
            "documental": {"ok": true, "erros": 0, "avisos": 1, "total_achados": 3},
            "icms": {"ok": true, "vl_icms_recolher": 10.5, "cruzamentos_ok": 13}
          }
        }

    O JSON do motor usa ``resumo.modulos`` + payloads ricos; este extrator
    deriva os mesmos campos-chave.
    """
    saida: dict[str, dict[str, Any]] = {}
    mods = pacote.get("modulos") or {}
    resumo_mods = (pacote.get("resumo") or {}).get("modulos") or {}

    for nome, payload in mods.items():
        ind: dict[str, Any] = {}
        if isinstance(payload, dict):
            # Formato ja "achatado" (ControlDocs sintetico)
            for chave in ("ok", "erros", "avisos", "total_achados", "vl_icms_recolher",
                          "vl_ipi_recolher", "cruzamentos_ok"):
                if chave in payload and isinstance(payload[chave], (bool, int, float, str)):
                    ind[chave] = payload[chave]
            # Formato rico do motor
            if "resumo" in payload and isinstance(payload["resumo"], dict):
                r = payload["resumo"]
                ind.setdefault("erros", r.get("erros", 0))
                ind.setdefault("avisos", r.get("avisos", 0))
                ind.setdefault("total_achados", r.get("total", r.get("achados", 0)))
            if "ok" in payload:
                ind["ok"] = payload["ok"]
            if nome == "icms":
                e110 = payload.get("e110") or {}
                recom = e110.get("recomputado") or {}
                if "VL_ICMS_RECOLHER" in recom:
                    ind.setdefault("vl_icms_recolher", recom.get("VL_ICMS_RECOLHER"))
                cruz = payload.get("cruzamentos") or []
                if cruz:
                    ind.setdefault(
                        "cruzamentos_ok",
                        sum(1 for c in cruz if c.get("fecha") is True or c.get("ok") is True),
                    )
            if nome == "ipi":
                e520 = payload.get("e520") or payload.get("apuracao") or {}
                if isinstance(e520, dict):
                    recom = e520.get("recomputado") or e520
                    for k in ("VL_IPI_RECOLHER", "vl_ipi_recolher"):
                        if k in recom:
                            ind.setdefault("vl_ipi_recolher", recom[k])
        # Fallback do resumo consolidado do motor
        if nome in resumo_mods:
            rm = resumo_mods[nome]
            ind.setdefault("ok", rm.get("ok"))
            ind.setdefault("erros", rm.get("erros", 0))
            ind.setdefault("avisos", rm.get("avisos", 0))
            ind.setdefault("total_achados", rm.get("total_achados", 0))
        saida[nome] = ind
    return saida


def _valores_iguais(a: Any, b: Any) -> bool:
    if isinstance(a, bool) or isinstance(b, bool):
        return bool(a) == bool(b)
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return quase_igual(float(a), float(b), tol=0.02)
    return a == b


def comparar(motor: dict, controldocs: dict) -> dict[str, Any]:
    """Compara indicadores modulo a modulo."""
    ind_m = extrair_indicadores(motor)
    ind_c = extrair_indicadores(controldocs)
    modulos = sorted(set(ind_m) | set(ind_c))
    divergencias: list[dict[str, Any]] = []
    por_modulo: dict[str, Any] = {}

    for nome in modulos:
        m = ind_m.get(nome)
        c = ind_c.get(nome)
        if m is None:
            divergencias.append({
                "modulo": nome,
                "campo": "_presenca",
                "motor": None,
                "controldocs": {k: c.get(k) for k in c} if isinstance(c, dict) else c,
                "motivo": "modulo ausente no motor",
            })
            por_modulo[nome] = {"ok": False, "motivo": "ausente_motor"}
            continue
        if c is None:
            # Nao embutir payload rico do motor (pode ter milhares de achados).
            divergencias.append({
                "modulo": nome,
                "campo": "_presenca",
                "motor": {k: m.get(k) for k in ("ok", "erros", "avisos", "total_achados",
                                               "vl_icms_recolher", "vl_ipi_recolher",
                                               "cruzamentos_ok") if k in m},
                "controldocs": None,
                "motivo": "modulo ausente no ControlDocs",
            })
            por_modulo[nome] = {
                "ok": False,
                "motivo": "ausente_controldocs",
                "indicadores_motor": m,
            }
            continue
        campos = sorted(set(m) | set(c))
        divs_mod = []
        for campo in campos:
            if campo not in m or campo not in c:
                # campo so de um lado: info, nao falha dura se o outro for subset
                continue
            if not _valores_iguais(m[campo], c[campo]):
                item = {
                    "modulo": nome,
                    "campo": campo,
                    "motor": m[campo],
                    "controldocs": c[campo],
                    "motivo": "valor divergente",
                }
                divergencias.append(item)
                divs_mod.append(item)
        por_modulo[nome] = {
            "ok": not divs_mod,
            "indicadores_motor": m,
            "indicadores_controldocs": c,
            "divergencias": divs_mod,
        }

    emp = _cnpj(motor.get("empresa_cnpj") or controldocs.get("empresa_cnpj"))
    comp = motor.get("competencia") or controldocs.get("competencia")
    mods_ok = [n for n, info in por_modulo.items() if info.get("ok")]
    mods_div = [n for n, info in por_modulo.items() if not info.get("ok")]
    return {
        "fonte_referencia": "controldocs",
        "nota": (
            "ControlDocs e legado/contraprova. Divergencias devem virar correcao "
            "no motor ou justificativa documentada antes de aposentar a planilha."
        ),
        "empresa_cnpj": emp,
        "competencia": comp,
        "gerado_em": agora_iso(),
        "ok": len(divergencias) == 0,
        "modulos_ok": mods_ok,
        "modulos_divergentes": mods_div,
        "total_divergencias": len(divergencias),
        "divergencias": divergencias,
        "por_modulo": por_modulo,
    }


def comparar_e_gravar(
    motor_path: str | Path,
    controldocs_path: str | Path,
    saida: str | Path | None = None,
) -> dict[str, Any]:
    motor = _load(motor_path)
    controldocs = _load(controldocs_path)
    rel = comparar(motor, controldocs)
    emp = rel["empresa_cnpj"] or "sem_cnpj"
    comp = rel["competencia"] or "sem_competencia"
    if saida:
        destino = Path(saida)
        if destino.suffix.lower() == ".json":
            arquivo = destino
        else:
            arquivo = destino / "paridade.json"
    else:
        arquivo = Path.cwd() / "_local" / "paridade" / emp / comp / "paridade.json"
    arquivo.parent.mkdir(parents=True, exist_ok=True)
    arquivo.write_text(
        json.dumps(rel, ensure_ascii=False, indent=2, default=str) + "\n",
        encoding="utf-8",
    )
    # tambem um markdown legivel
    md = arquivo.with_suffix(".md")
    linhas = [
        "# Relatorio de paridade — motor × ControlDocs",
        "",
        f"- Empresa: `{emp}`",
        f"- Competencia: `{comp}`",
        f"- Resultado: **{'OK' if rel['ok'] else 'DIVERGENCIAS'}**",
        f"- Divergencias: {rel['total_divergencias']}",
        "",
        "## Modulos",
        "",
    ]
    for nome, info in rel["por_modulo"].items():
        status = "OK" if info.get("ok") else "DIVERGE"
        linhas.append(f"- `{nome}`: {status}")
    if rel["divergencias"]:
        linhas.extend(["", "## Divergencias", ""])
        for d in rel["divergencias"]:
            linhas.append(
                f"- `{d['modulo']}.{d['campo']}`: motor={d['motor']!r} "
                f"controldocs={d['controldocs']!r} ({d['motivo']})"
            )
    linhas.extend([
        "",
        "## Nota",
        "",
        rel["nota"],
        "",
    ])
    md.write_text("\n".join(linhas), encoding="utf-8")
    rel["arquivo"] = str(arquivo)
    rel["arquivo_md"] = str(md)
    return rel
