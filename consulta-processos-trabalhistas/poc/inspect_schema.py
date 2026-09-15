from __future__ import annotations

import json
from pathlib import Path

from datajud_client import (
    collect_keys,
    flatten_interesting_keys,
    get_mapping,
    post_search,
)

OUT_DIR = Path(__file__).resolve().parent / "out"
DEFAULT_ALIASES = ("trt20", "trt2", "trt15")


def inspect_alias(alias: str) -> dict:
    report: dict = {"alias": alias, "mapping": None, "sample": None}

    mapping_resp = get_mapping(alias)
    report["mapping"] = {
        "status": mapping_resp.status_code,
        "retry_after": mapping_resp.headers.get("Retry-After"),
        "keys": None,
        "error": None,
    }
    if mapping_resp.status_code == 200:
        try:
            payload = mapping_resp.json()
            report["mapping"]["keys"] = sorted(collect_keys(payload))[:400]
        except Exception as exc:  # noqa: BLE001
            report["mapping"]["error"] = str(exc)
    else:
        report["mapping"]["error"] = mapping_resp.text[:500]

    search_resp = post_search(alias, {"size": 1, "query": {"match_all": {}}})
    sample = {
        "status": search_resp.status_code,
        "elapsed_ms": int(search_resp.elapsed.total_seconds() * 1000),
        "retry_after": search_resp.headers.get("Retry-After"),
        "total": None,
        "source_keys": [],
        "interesting_keys": [],
        "source_preview": None,
        "error": None,
    }
    if search_resp.status_code != 200:
        sample["error"] = search_resp.text[:800]
        report["sample"] = sample
        return report

    body = search_resp.json()
    hits = body.get("hits", {}).get("hits", [])
    total = body.get("hits", {}).get("total", {})
    sample["total"] = total.get("value") if isinstance(total, dict) else total
    if hits:
        source = hits[0].get("_source") or {}
        keys = collect_keys(source)
        sample["source_keys"] = sorted(set(keys))
        sample["interesting_keys"] = flatten_interesting_keys(keys)
        sample["source_preview"] = {k: source[k] for k in list(source)[:12]}

    extra_resp = post_search(alias, {"size": 10, "query": {"match_all": {}}})
    extra_keys: set[str] = set()
    if extra_resp.status_code == 200:
        for hit in extra_resp.json().get("hits", {}).get("hits", []):
            extra_keys.update(collect_keys(hit.get("_source") or {}))
    sample["keys_in_10_docs"] = sorted(extra_keys)
    sample["interesting_keys_in_10_docs"] = flatten_interesting_keys(list(extra_keys))
    report["sample"] = sample
    return report


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for alias in DEFAULT_ALIASES:
        report = inspect_alias(alias)
        path = OUT_DIR / f"schema_{alias}.json"
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        sample = report["sample"] or {}
        print(
            f"{alias}: mapping={report['mapping']['status']} "
            f"search={sample.get('status')} keys={len(sample.get('source_keys') or [])} "
            f"interesting={sample.get('interesting_keys')}"
        )


if __name__ == "__main__":
    main()
