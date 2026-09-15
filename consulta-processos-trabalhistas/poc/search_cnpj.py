from __future__ import annotations

import csv
import json
import re
from pathlib import Path
from typing import Any, Iterator

from datajud_client import post_search

ROOT = Path(__file__).resolve().parent
OUT_DIR = ROOT / "out"
AMOSTRA = ROOT / "amostra.csv"
DEFAULT_ALIASES = ("trt20", "trt2")


def digits_only(value: str) -> str:
    return re.sub(r"\D", "", value or "")


def mask_cnpj(digits: str) -> str:
    return f"{digits[:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:]}"


def is_trabalhista(numero: str) -> bool:
    compact = re.sub(r"\D", "", numero or "")
    # NNNNNNNDDAAAAJTROOOO — justiça é o 13º dígito (índice 12) no CNJ de 20 dígitos
    return len(compact) == 20 and compact[13] == "5"


def strategies(cnpj_digits: str, razao: str) -> Iterator[tuple[str, dict[str, Any]]]:
    for field in ("partes.numeroDocumento", "partes.documento"):
        yield (
            f"match:{field}:{cnpj_digits}",
            {"size": 5, "query": {"match": {field: cnpj_digits}}},
        )
        yield (
            f"nested:{field}:{cnpj_digits}",
            {
                "size": 5,
                "query": {
                    "nested": {
                        "path": "partes",
                        "query": {"match": {field: cnpj_digits}},
                    }
                },
            },
        )
    if razao:
        yield (
            f"match:partes.nome:{razao}",
            {"size": 5, "query": {"match": {"partes.nome": razao}}},
        )


def summarize_hits(hits: list[dict[str, Any]]) -> list[dict[str, Any]]:
    summarized = []
    for hit in hits:
        source = hit.get("_source") or {}
        numero = str(source.get("numeroProcesso") or "")
        summarized.append(
            {
                "numeroProcesso": numero,
                "tribunal": source.get("tribunal"),
                "classe": (source.get("classe") or {}).get("nome")
                if isinstance(source.get("classe"), dict)
                else source.get("classe"),
                "trabalhista": is_trabalhista(numero),
                "tem_partes": "partes" in source or "polo" in source,
            }
        )
    return summarized


def run_query(alias: str, body: dict[str, Any]) -> dict[str, Any]:
    try:
        resp = post_search(alias, body)
    except Exception as exc:  # noqa: BLE001
        return {"status": 0, "error": str(exc), "hits": [], "total": 0, "elapsed_ms": None}
    elapsed_ms = int(resp.elapsed.total_seconds() * 1000)
    if resp.status_code != 200:
        return {
            "status": resp.status_code,
            "error": resp.text[:500],
            "hits": [],
            "total": 0,
            "elapsed_ms": elapsed_ms,
            "retry_after": resp.headers.get("Retry-After"),
        }
    payload = resp.json()
    raw_hits = payload.get("hits", {}).get("hits", [])
    total = payload.get("hits", {}).get("total", {})
    total_value = total.get("value") if isinstance(total, dict) else total
    return {
        "status": 200,
        "error": None,
        "hits": summarize_hits(raw_hits),
        "total": total_value,
        "elapsed_ms": elapsed_ms,
    }


def load_amostra() -> list[dict[str, str]]:
    with AMOSTRA.open(encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    raw_log: list[dict[str, Any]] = []

    for empresa in load_amostra():
        cnpj = digits_only(empresa["cnpj"])
        razao = (empresa.get("razao_social") or "").strip()
        aliases = []
        esperado = (empresa.get("trt_esperado") or "").strip()
        if esperado:
            aliases.append(esperado)
        for extra in DEFAULT_ALIASES:
            if extra not in aliases:
                aliases.append(extra)

        for alias in aliases:
            found = False
            for name, body in strategies(cnpj, razao):
                result = run_query(alias, body)
                record = {
                    "cnpj": cnpj,
                    "razao_social": razao,
                    "trt": alias,
                    "estrategia": name,
                    "http_status": result["status"],
                    "hits": result["total"],
                    "processos": ";".join(
                        h["numeroProcesso"] for h in result["hits"] if h["numeroProcesso"]
                    ),
                    "campo_usado": name.split(":")[1] if ":" in name else name,
                    "trabalhistas": sum(1 for h in result["hits"] if h["trabalhista"]),
                    "tem_partes": any(h["tem_partes"] for h in result["hits"]),
                    "elapsed_ms": result["elapsed_ms"],
                    "error": result["error"] or "",
                }
                rows.append(record)
                raw_log.append({**record, "hits_detalhe": result["hits"]})
                print(
                    f"{cnpj} {alias} {name}: status={result['status']} total={result['total']}",
                    flush=True,
                )
                if result["status"] == 200 and result["total"]:
                    found = True
                    break
            if not found:
                print(f"{cnpj} {alias}: nenhum hit verificável")

    csv_path = OUT_DIR / "resultados.csv"
    fields = [
        "cnpj",
        "razao_social",
        "trt",
        "estrategia",
        "http_status",
        "hits",
        "processos",
        "campo_usado",
        "trabalhistas",
        "tem_partes",
        "elapsed_ms",
        "error",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    (OUT_DIR / "resultados.json").write_text(
        json.dumps(raw_log, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"gravado {csv_path}")


if __name__ == "__main__":
    main()
