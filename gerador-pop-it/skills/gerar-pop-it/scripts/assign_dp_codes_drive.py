#!/usr/bin/env python3
"""Atribui códigos *.DP.NNN aos pacotes em DP\\.CONCLUÍDOS (rename + patch in-place)."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import time
import zipfile
from copy import deepcopy
from datetime import datetime
from pathlib import Path

from openpyxl import load_workbook

SECTOR = "DP"
SECTOR_LABEL = "02 - Departamento Pessoal"
CODE_RE = re.compile(
    r"\b(PR|IN|FORM|MP)\.(XXX|PES|DP)\.(XXX|\d{3})\b",
    re.IGNORECASE,
)
FILE_CODE_RE = re.compile(
    r"^(PR|IN|FORM|MP)\.(XXX|PES|DP)\.(XXX|\d{3})\b",
    re.IGNORECASE,
)
DOC_PREFIXES = ("PR", "IN", "FORM", "MP")

# Ordem canônica por data original do PR (mtime pré-patch). Evita colisão se reexecutar.
CANONICAL_ORDER = [
    "atualizar-gozo-ferias",
    "criar-centros-de-custos",
    "verificacao-situacao-fiscal",
    "verificacao-fgts",
    "preencher-planilha-onboarding-debitos",
    "parcelamento-previdenciario",
    "consultar-aliquota-fap-govbr",
    "lancar-aliquota-fap-dominio",
    "admissao-rubrica-onvio",
    "consultar-extrato-emprestimo-consignado",
    "importar-emprestimo-consignado-dominio",
    "lancar-emprestimo-consignado-dominio",
    "liberacao-modulos-onvio",
    "departamentos",
    "jornada-e-horario",
    "parametros-calculo-regime-contabilidade",
    "parametros-faseamento-sst-geral-contratacoes",
    "parametros-geral-esocial",
    "parametros-importacao-esocial-cadastramento",
    "servicos-ponto-aprendiz-inss",
    "consulta-fap-lancamento-filiais",
    "alteracao-de-cargo",
    "alteracao-salarial",
    "consulta-emissao-rais-emprega-brasil",
    "custo-horas-extras-50-100",
    "adiantamento-decimo-terceiro",
    "emissao-programacao-ferias",
    "relatorio-admissionais",
]

def retry_io(fn, attempts: int = 8, delay: float = 0.6):
    last = None
    for i in range(attempts):
        try:
            return fn()
        except OSError as exc:
            last = exc
            time.sleep(delay * (i + 1))
    raise last  # type: ignore[misc]


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def codes_for(number: str) -> dict[str, str]:
    return {
        "pop": f"PR.{SECTOR}.{number}",
        "it": f"IN.{SECTOR}.{number}",
        "form": f"FORM.{SECTOR}.{number}",
        "mp": f"MP.{SECTOR}.{number}",
    }


def replace_codes(text: str, number: str) -> str:
    if not text:
        return text
    mapping = {
        "PR": f"PR.{SECTOR}.{number}",
        "IN": f"IN.{SECTOR}.{number}",
        "FORM": f"FORM.{SECTOR}.{number}",
        "MP": f"MP.{SECTOR}.{number}",
    }

    def _sub(match: re.Match[str]) -> str:
        kind = match.group(1).upper()
        return mapping.get(kind, match.group(0))

    return CODE_RE.sub(_sub, text)


def find_process_docs(docs_dir: Path) -> dict[str, Path]:
    found: dict[str, Path] = {}
    if not docs_dir.is_dir():
        return found
    for path in docs_dir.iterdir():
        if not path.is_file():
            continue
        # Skip lista mestra QUA.003
        if path.name.upper().startswith("FORM.QUA."):
            continue
        m = FILE_CODE_RE.match(path.name)
        if not m:
            continue
        kind = m.group(1).upper()
        # Prefer process docs; keep first if duplicates
        if kind not in found:
            found[kind] = path
    return found


def pr_mtime(docs_dir: Path) -> datetime:
    docs = find_process_docs(docs_dir)
    pr = docs.get("PR")
    if pr is None:
        return datetime.max
    return datetime.fromtimestamp(pr.stat().st_mtime)


def title_from_filename(path: Path) -> str:
    # "PR.XXX.XXX - Titulo.docx" → "Titulo"
    stem = path.stem
    if " - " in stem:
        return stem.split(" - ", 1)[1].strip()
    return stem


def new_filename(kind: str, number: str, old: Path) -> str:
    title = title_from_filename(old)
    return f"{kind}.{SECTOR}.{number} - {title}{old.suffix}"


def patch_json_obj(data: dict, number: str, files: dict[str, str]) -> dict:
    data = deepcopy(data)
    doc = data.setdefault("documento", {})
    doc["sigla_setor"] = SECTOR
    doc["numero"] = number
    doc["setor"] = SECTOR_LABEL
    codes = codes_for(number)
    doc["codigo_pop"] = codes["pop"]
    doc["codigo_it"] = codes["it"]
    doc["codigo_form"] = codes["form"]
    doc["codigo_mp"] = codes["mp"]

    saida = data.setdefault("saida", {})
    for key, fname in files.items():
        saida[f"arquivo_{key}"] = fname

    # Walk strings in lista_mestra and complementary docs
    def walk(obj):
        if isinstance(obj, dict):
            for k, v in list(obj.items()):
                if isinstance(v, str):
                    obj[k] = replace_codes(v, number)
                    if k in {"setor"} and (
                        not v
                        or v.casefold() in {"a definir", "pendente", "pessoal"}
                        or "ponto para validação" in v.casefold()
                    ):
                        obj[k] = SECTOR_LABEL
                else:
                    walk(v)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                if isinstance(item, str):
                    obj[i] = replace_codes(item, number)
                else:
                    walk(item)

    walk(data.get("lista_mestra"))
    # Also replace codes in nested string fields under documento/saida already set
    for key in list(doc.keys()):
        if isinstance(doc[key], str) and key.startswith("codigo_"):
            continue
        if isinstance(doc[key], str):
            doc[key] = replace_codes(doc[key], number)
    return data


def patch_json_file(path: Path, number: str, files: dict[str, str]) -> None:
    if not path.is_file():
        return
    data = load_json(path)
    save_json(path, patch_json_obj(data, number, files))


def patch_form_xlsx(path: Path, number: str) -> None:
    wb = load_workbook(path)
    ws = wb["FORM"] if "FORM" in wb.sheetnames else wb.worksheets[0]
    ws["C3"] = SECTOR_LABEL
    ws["D3"] = f"FORM.{SECTOR}.{number}"
    # Replace codes in used cells (headers / context)
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row or 1, 90), max_col=12):
        for cell in row:
            if isinstance(cell.value, str) and CODE_RE.search(cell.value):
                cell.value = replace_codes(cell.value, number)
    retry_io(lambda: wb.save(path))


def patch_mp_xlsx(path: Path, number: str) -> None:
    wb = load_workbook(path)
    ws = wb["MP"] if "MP" in wb.sheetnames else wb.worksheets[0]
    ws["J1"] = f"MP.{SECTOR}.{number}"
    ws["C3"] = SECTOR_LABEL
    # BARREIRA / RESULTADO and any code strings
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row or 1, 86), max_col=12):
        for cell in row:
            if isinstance(cell.value, str) and CODE_RE.search(cell.value):
                cell.value = replace_codes(cell.value, number)
            if isinstance(cell.value, str) and cell.comment is not None:
                # comments may mention codes rarely; skip
                pass
    retry_io(lambda: wb.save(path))


def patch_docx(path: Path, number: str) -> None:
    """Replace code tokens inside docx XML parts."""
    tmp = path.with_suffix(path.suffix + ".tmp")
    with zipfile.ZipFile(path, "r") as zin, zipfile.ZipFile(tmp, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename.startswith("word/") and info.filename.endswith(".xml"):
                text = data.decode("utf-8")
                new_text = replace_codes(text, number)
                # Soft setor placeholders in plain runs (best-effort)
                new_text = re.sub(
                    r"(Ponto para valida[cç][aã]o:\s*confirmar setor[^\.<]*)",
                    SECTOR_LABEL,
                    new_text,
                    flags=re.IGNORECASE,
                )
                data = new_text.encode("utf-8")
            zout.writestr(info, data)
    retry_io(lambda: tmp.replace(path))


def rename_doc(path: Path, kind: str, number: str) -> Path:
    dest = path.with_name(new_filename(kind, number, path))
    if dest.resolve() == path.resolve():
        return path
    if dest.exists():
        retry_io(lambda: dest.unlink())
    retry_io(lambda: path.rename(dest))
    return dest


def find_local_package(output_root: Path, slug: str) -> Path | None:
    for date_dir in output_root.iterdir():
        if not date_dir.is_dir():
            continue
        cand = date_dir / slug
        if (cand / "geracao").is_dir() or (cand / "documentos").is_dir():
            return cand
    return None


def process_package(
    pkg_dir: Path,
    number: str,
    local_root: Path | None,
    *,
    skip_local_docs: bool = False,
) -> list[str]:
    notes: list[str] = []
    docs_dir = pkg_dir / "documentos"
    geracao = pkg_dir / "geracao"
    docs = find_process_docs(docs_dir)
    if not docs:
        raise RuntimeError("nenhum PR/IN/FORM/MP de processo em documentos/")

    # Target filenames (for JSON saida)
    file_map: dict[str, str] = {}
    kind_to_saida = {"PR": "pop", "IN": "it", "FORM": "form", "MP": "mp"}
    for kind, path in docs.items():
        fname = new_filename(kind, number, path)
        file_map[kind_to_saida[kind]] = fname

    # Patch JSON on Drive
    for name in ("content-v2.json", "content.normalized.json"):
        patch_json_file(geracao / name, number, file_map)

    # Patch binaries before rename
    if "FORM" in docs:
        patch_form_xlsx(docs["FORM"], number)
        notes.append(f"FORM->{file_map['form']}")
    if "MP" in docs:
        patch_mp_xlsx(docs["MP"], number)
        notes.append(f"MP->{file_map['mp']}")
    if "PR" in docs:
        patch_docx(docs["PR"], number)
        notes.append(f"PR->{file_map['pop']}")
    if "IN" in docs:
        patch_docx(docs["IN"], number)
        notes.append(f"IN->{file_map['it']}")

    # Rename
    for kind, path in list(docs.items()):
        current = docs_dir / path.name
        if not current.exists():
            continue
        rename_doc(current, kind, number)

    # Mirror JSON (and optionally docs) on local output
    if local_root is not None:
        local_pkg = find_local_package(local_root, pkg_dir.name)
        if local_pkg is not None:
            local_geracao = local_pkg / "geracao"
            for name in ("content-v2.json", "content.normalized.json"):
                patch_json_file(local_geracao / name, number, file_map)
            notes.append("local-json")
            if not skip_local_docs:
                local_docs = local_pkg / "documentos"
                if local_docs.is_dir():
                    local_found = find_process_docs(local_docs)
                    for kind, path in local_found.items():
                        if kind == "FORM":
                            patch_form_xlsx(path, number)
                        elif kind == "MP":
                            patch_mp_xlsx(path, number)
                        elif kind in {"PR", "IN"}:
                            patch_docx(path, number)
                        rename_doc(path, kind, number)
                    notes.append("local-docs")

    return notes


def inventory(concluidos: Path) -> list[tuple[str, Path, str]]:
    """Retorna (slug, path, number) na ordem canônica; slugs extras vão ao final."""
    by_slug = {
        child.name: child
        for child in concluidos.iterdir()
        if child.is_dir() and (child / "documentos").is_dir()
    }
    rows: list[tuple[str, Path, str]] = []
    used: set[str] = set()
    for index, slug in enumerate(CANONICAL_ORDER, start=1):
        pkg = by_slug.get(slug)
        if pkg is None:
            continue
        rows.append((slug, pkg, f"{index:03d}"))
        used.add(slug)
    extras = sorted(set(by_slug) - used)
    next_n = len(rows) + 1
    for slug in extras:
        rows.append((slug, by_slug[slug], f"{next_n:03d}"))
        next_n += 1
    return rows

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--drive-concluidos",
        default=r"G:\Meu Drive\GESTÃO DE PROCESSOS\02 - Departamento Pessoal\ARQUIVOS POP\DP\.CONCLUÍDOS",
    )
    parser.add_argument(
        "--local-output",
        default=str(Path(__file__).resolve().parents[3] / "output"),
    )
    parser.add_argument(
        "--report",
        default=str(Path(__file__).resolve().parents[3] / "output" / "dp-codigos.md"),
    )
    args = parser.parse_args()

    concluidos = Path(args.drive_concluidos)
    local_root = Path(args.local_output)
    if not concluidos.is_dir():
        print(f"CONCLUÍDOS não encontrado: {concluidos}", file=sys.stderr)
        return 1

    rows = inventory(concluidos)
    report_lines = [
        "# Códigos DP (.CONCLUÍDOS)",
        "",
        f"Gerado: {datetime.now().isoformat(timespec='seconds')}",
        f"Sigla: {SECTOR} | Setor: {SECTOR_LABEL}",
        f"Pacotes: {len(rows)}",
        "",
        "## Mapa planejado",
        "",
    ]
    for slug, _pkg, number in rows:
        report_lines.append(f"- `{slug}` → `{SECTOR}.{number}`")
    report_lines.extend(["", "## Execução", ""])
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    # Grava mapa antes de mutar (recuperação se interromper).
    report_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    ok = 0
    fail = 0
    for slug, pkg, number in rows:
        print(f"=== {number} {slug} ===", flush=True)
        try:
            notes = process_package(
                pkg,
                number,
                local_root if local_root.is_dir() else None,
                skip_local_docs=True,
            )
            report_lines.append(f"- OK: `{slug}` → **{SECTOR}.{number}** — " + ", ".join(notes))
            ok += 1
        except Exception as exc:  # noqa: BLE001 — lote deve continuar
            fail += 1
            report_lines.append(f"- FALHA: `{slug}` → {SECTOR}.{number} — {exc}")
            print(f"FALHA {slug}: {exc}", file=sys.stderr, flush=True)
        report_path.write_text(
            "\n".join(report_lines[:6] + [f"Resumo: ok={ok} falha={fail}", ""] + report_lines[6:]) + "\n",
            encoding="utf-8",
        )

    print(f"Relatorio: {report_path}", flush=True)
    print(f"DONE ok={ok} falha={fail}", flush=True)
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
