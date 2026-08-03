#!/usr/bin/env python3
"""Valida POP/IT/FORM/MP sem abrir Word ou Excel — apenas ZIP/XML do pacote Office."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {
    "w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
    "odrel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def normalize(text: str) -> str:
    """Uppercase, collapse spaces and fold accents for resilient matching."""
    folded = unicodedata.normalize("NFKD", text or "")
    folded = "".join(ch for ch in folded if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", folded).strip().upper()


def try_fix_cp1252_pair(first: str, second: str) -> str | None:
    """Converte par mojibake via cp1252→UTF-8; None se for texto legítimo (ex.: ÃO)."""
    try:
        decoded = (first + second).encode("cp1252").decode("utf-8")
    except (UnicodeEncodeError, UnicodeDecodeError):
        return None
    if decoded == first + second:
        return None
    return decoded


def repair_mojibake(text: str) -> str:
    """Corrige sequências UTF-8 interpretadas como Windows-1252 (ex.: EVIDÃŠNCIA)."""

    def repl(match: re.Match[str]) -> str:
        decoded = try_fix_cp1252_pair(match.group(0)[0], match.group(0)[1])
        return decoded if decoded is not None else match.group(0)

    return re.sub(r"[\u00c2-\u00c3].", repl, text or "")


def find_unrepaired_mojibake(text: str) -> list[str]:
    found: list[str] = []
    for match in re.finditer(r"[\u00c2-\u00c3].", text or ""):
        pair = match.group(0)
        if try_fix_cp1252_pair(pair[0], pair[1]) is not None:
            found.append(pair)
    return found


def searchable(text: str) -> str:
    return normalize(text + " " + repair_mojibake(text))


def contains_normalized(haystack: str, needle: str) -> bool:
    if not needle:
        return False
    if searchable(needle) in searchable(haystack) or normalize(needle) in searchable(haystack):
        return True
    # Numeração "1. TITULO" pode ficar separada no Word; tenta sem o prefixo.
    stripped = re.sub(r"^\d+\.\s*", "", needle).strip()
    if stripped and stripped != needle:
        if searchable(stripped) in searchable(haystack) or normalize(stripped) in searchable(haystack):
            return True
    # Correspondência frouxa por tokens (resiste a mojibake parcial entre runs do Word).
    tokens = [
        token
        for token in normalize(stripped or needle).split()
        if len(token) > 3 and token not in {"PARA", "COM", "UNA", "PELO", "PELA", "DESDE"}
    ]
    if not tokens:
        return False
    hay = searchable(haystack)
    hits = sum(1 for token in tokens if token in hay)
    return (hits / len(tokens)) >= 0.6


def read_zip_text(archive: zipfile.ZipFile, name: str) -> str:
    try:
        with archive.open(name) as handle:
            return handle.read().decode("utf-8")
    except KeyError:
        return ""


def word_text(archive: zipfile.ZipFile) -> str:
    parts: list[str] = []
    for entry in ("word/document.xml", "word/header1.xml", "word/header2.xml", "word/footer1.xml"):
        xml = read_zip_text(archive, entry)
        if not xml:
            continue
        root = ET.fromstring(xml)
        texts = [node.text or "" for node in root.iter(f"{{{NS['w']}}}t")]
        parts.append(" ".join(texts))
    return " ".join(parts)


def word_print_control_tags(archive: zipfile.ZipFile) -> list[str]:
    xml = read_zip_text(archive, "word/document.xml")
    if not xml:
        return []
    root = ET.fromstring(xml)
    tags: list[str] = []
    for sdt in root.iter(f"{{{NS['w']}}}sdt"):
        tag_el = sdt.find(".//w:tag", NS)
        alias_el = sdt.find(".//w:alias", NS)
        tag = tag_el.get(f"{{{NS['w']}}}val") if tag_el is not None else ""
        alias = alias_el.get(f"{{{NS['w']}}}val") if alias_el is not None else ""
        # Picture content controls usually carry PRINT-* tags from the generator.
        if tag.startswith("PRINT-") or "PRINT" in normalize(alias):
            tags.append(tag or alias)
        else:
            # Detect picture SDT via showingPlcHdr + docPartGallery or presence of drawing placeholder.
            showing = sdt.find(".//w:showingPlcHdr", NS) is not None
            has_drawing = sdt.find(".//w:drawing", NS) is not None or sdt.find(".//a:blip", NS) is not None
            if showing and has_drawing:
                tags.append(tag or alias or "PICTURE-CONTROL")
    return tags


def excel_sheet_names(archive: zipfile.ZipFile) -> list[str]:
    xml = read_zip_text(archive, "xl/workbook.xml")
    if not xml:
        return []
    root = ET.fromstring(xml)
    return [sheet.get("name", "") for sheet in root.findall("main:sheets/main:sheet", NS)]


def excel_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    xml = read_zip_text(archive, "xl/sharedStrings.xml")
    if not xml:
        return []
    root = ET.fromstring(xml)
    values: list[str] = []
    for si in root.findall("main:si", NS):
        texts = [node.text or "" for node in si.iter(f"{{{NS['main']}}}t")]
        values.append("".join(texts))
    return values


def excel_defined_names(archive: zipfile.ZipFile) -> list[str]:
    xml = read_zip_text(archive, "xl/workbook.xml")
    if not xml:
        return []
    root = ET.fromstring(xml)
    return [
        node.get("name", "")
        for node in root.findall("main:definedNames/main:definedName", NS)
    ]


def excel_inline_strings(archive: zipfile.ZipFile) -> list[str]:
    values: list[str] = []
    for name in archive.namelist():
        if not name.startswith("xl/worksheets/sheet") or not name.endswith(".xml"):
            continue
        xml = read_zip_text(archive, name)
        if not xml:
            continue
        root = ET.fromstring(xml)
        for is_node in root.iter(f"{{{NS['main']}}}is"):
            values.append(
                "".join(node.text or "" for node in is_node.iter(f"{{{NS['main']}}}t"))
            )
        # Fórmulas também carregam vocabulário (PENDENTE/CONFORME).
        for node in root.iter(f"{{{NS['main']}}}f"):
            if node.text:
                values.append(node.text)
    return values


def excel_text(archive: zipfile.ZipFile) -> str:
    return " ".join(excel_shared_strings(archive) + excel_inline_strings(archive))


class Checker:
    def __init__(self) -> None:
        self.checks: list[dict] = []

    def add(self, document: str, name: str, ok: bool, detail: str) -> None:
        self.checks.append(
            {"document": document, "name": name, "ok": bool(ok), "detail": detail}
        )

    def failures(self) -> list[dict]:
        return [item for item in self.checks if not item["ok"]]


def validate_word(checker: Checker, kind: str, path: Path, content: dict) -> None:
    checker.add(kind, "arquivo-existe", path.is_file(), path.name)
    if not path.is_file():
        return
    with zipfile.ZipFile(path) as archive:
        checker.add(kind, "pacote-zip", "word/document.xml" in archive.namelist(), "word/document.xml")
        text = word_text(archive)
        expected_header = "PROCEDIMENTO" if kind == "pop" else "INSTRUÇÃO DE TRABALHO"
        # Some templates may store without accent variation; accept both.
        header_ok = expected_header in text or normalize(expected_header.replace("Ç", "C").replace("Ã", "A")) in text
        if kind == "it" and not header_ok:
            header_ok = "INSTRUCAO DE TRABALHO" in text or "INSTRUÇÃO DE TRABALHO" in text
        checker.add(kind, "cabecalho", header_ok, f"Esperado: {expected_header}")
        title = str(content["documento"]["titulo"])
        checker.add(kind, "titulo", contains_normalized(text, title), title)
        code = str(
            content["documento"]["codigo_pop"] if kind == "pop" else content["documento"]["codigo_it"]
        )
        checker.add(kind, "codigo", contains_normalized(text, code), code)

        # Logo: image relationship in a header part.
        logo_ok = False
        for name in archive.namelist():
            if name.startswith("word/_rels/header") and name.endswith(".rels"):
                rels = read_zip_text(archive, name)
                if "/image" in rels:
                    logo_ok = True
                    break
        checker.add(kind, "logo-cabecalho", logo_ok, "relação de imagem em header")

        leftover = find_unrepaired_mojibake(text)
        checker.add(
            kind,
            "encoding-limpo",
            len(leftover) == 0,
            "ok" if not leftover else ("mojibake restante: " + ", ".join(sorted(set(leftover)))),
        )

        if kind == "pop":
            for label in ("O QUE", "COMO", "SETOR", "REGISTRO"):
                checker.add(kind, f"coluna-{label}", label in text, label)
            steps = content.get("pop", {}).get("etapas", [])
            checker.add(kind, "etapas-pop", len(steps) > 0, f"{len(steps)} etapa(s)")
            for step in steps:
                o_que = str(step.get("o_que", ""))
                checker.add(kind, f"etapa-{step.get('id')}", contains_normalized(text, o_que), o_que)
        else:
            sections = content.get("it", {}).get("secoes", [])
            expected_fields = sum(
                1
                for section in sections
                if (section.get("campo_print") or {}).get("incluir")
            )
            tags = word_print_control_tags(archive)
            checker.add(
                kind,
                "campos-print",
                len(tags) >= expected_fields,
                f"{len(tags)} controle(s), esperado >= {expected_fields}",
            )
            for section in sections:
                titulo = str(section.get("titulo", ""))
                checker.add(kind, f"secao-{section.get('id')}", contains_normalized(text, titulo), titulo)


def validate_excel(checker: Checker, kind: str, path: Path, content: dict) -> None:
    checker.add(kind, "arquivo-existe", path.is_file(), path.name)
    if not path.is_file():
        return
    sheet_expected = "FORM" if kind == "form" else "MP"
    with zipfile.ZipFile(path) as archive:
        checker.add(kind, "pacote-zip", "xl/workbook.xml" in archive.namelist(), "xl/workbook.xml")
        sheets = excel_sheet_names(archive)
        checker.add(kind, "aba-principal", sheet_expected in sheets, ",".join(sheets) or "(sem abas)")
        text = excel_text(archive)
        title = str(content["documento"]["titulo"])
        checker.add(kind, "titulo", contains_normalized(text, title), title)
        code_key = "codigo_form" if kind == "form" else "codigo_mp"
        code = str(content["documento"][code_key])
        checker.add(kind, "codigo", contains_normalized(text, code), code)
        names = excel_defined_names(archive)
        if kind == "form":
            for expected in ("FORM_RESPOSTAS", "FORM_PARECERES", "FORM_COEFICIENTES"):
                checker.add(kind, f"range-{expected.lower()}", expected in names, expected)
            checker.add(
                kind,
                "vocabulario-parecer",
                contains_normalized(text, "PENDENTE") and contains_normalized(text, "CONFORME"),
                "PENDENTE/CONFORME",
            )
            checker.add(
                kind,
                "vocabulario-evidencia",
                contains_normalized(text, "EVIDENCIA"),
                "EVIDÊNCIA/PRINT",
            )
            # Conteúdo preenchido (não apenas o template sanitizado).
            checker.add(
                kind,
                "conteudo-preenchido",
                not contains_normalized(text, "[Descreva o item verificavel]"),
                "itens reais no lugar do placeholder do template",
            )
            questions = []
            for block in content.get("form", {}).get("blocos", []):
                for item in block.get("itens", []):
                    questions.append(str(item.get("pergunta", "")))
            for idx, question in enumerate(questions, start=1):
                checker.add(
                    kind,
                    f"pergunta-{idx:02d}",
                    contains_normalized(text, question),
                    question[:80],
                )
        else:
            chain = content.get("mp", {}).get("cadeia", {})
            for key in ("fornecedores", "entradas", "clientes", "saidas"):
                values = chain.get(key) or []
                if values:
                    sample = str(values[0])
                    checker.add(kind, f"cadeia-{key}", contains_normalized(text, sample), sample)
            risks = content.get("mp", {}).get("riscos", [])
            checker.add(kind, "riscos", len(risks) > 0, f"{len(risks)} risco(s)")
            for risk in risks:
                risco = str(risk.get("risco", ""))
                checker.add(
                    kind,
                    f"risco-{risk.get('id')}",
                    contains_normalized(text, risco),
                    risco[:80],
                )


def write_report(path: Path, types: list[str], checker: Checker) -> None:
    failures = checker.failures()
    lines = [
        "# Relatório de validação",
        "",
        f"- Resultado: {'APROVADO' if not failures else 'REPROVADO'}",
        f"- Modo: estrutural (ZIP/XML, sem Word/Excel)",
        "- Documentos: " + ", ".join(t.upper() for t in types),
        f"- Verificações: {len(checker.checks) - len(failures)}/{len(checker.checks)} aprovadas",
        "",
        "## Resumo",
        "",
    ]
    by_doc: dict[str, list[dict]] = {}
    for item in checker.checks:
        by_doc.setdefault(item["document"], []).append(item)
    for document, items in by_doc.items():
        failed = sum(1 for item in items if not item["ok"])
        lines.append(
            f"- {document.upper()}: {len(items) - failed}/{len(items)} verificações aprovadas"
        )
    if failures:
        lines.extend(["", "## Falhas", ""])
        for failure in failures:
            lines.append(
                f"- {failure['document'].upper()} — {failure['name']}: {failure['detail']}"
            )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8-sig")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--content-json", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--document-types", default="")
    parser.add_argument("--report-path", default="")
    args = parser.parse_args()

    content = json.loads(Path(args.content_json).read_text(encoding="utf-8-sig"))
    output_dir = Path(args.output_dir)
    if args.document_types.strip():
        types = [
            part.strip().lower()
            for part in re.split(r"[,;|]", args.document_types)
            if part.strip()
        ]
    else:
        types = [str(item).lower() for item in content.get("documentos_solicitados", [])]

    alias = {"pr": "pop", "in": "it", "formulario": "form", "mapeamento": "mp"}
    types = [alias.get(item, item) for item in types]

    checker = Checker()
    saida = content.get("saida", {})
    mapping = {
        "pop": saida.get("arquivo_pop"),
        "it": saida.get("arquivo_it"),
        "form": saida.get("arquivo_form"),
        "mp": saida.get("arquivo_mp"),
    }

    for kind in types:
        file_name = mapping.get(kind)
        if not file_name:
            checker.add(kind, "nome-saida", False, "arquivo não definido em saida")
            continue
        path = output_dir / file_name
        if kind in ("pop", "it"):
            validate_word(checker, kind, path, content)
        elif kind in ("form", "mp"):
            validate_excel(checker, kind, path, content)
        else:
            checker.add(kind, "tipo", False, f"tipo inválido: {kind}")

    report = Path(args.report_path) if args.report_path else output_dir / "relatorio-validacao.md"
    write_report(report, types, checker)
    print(f"Relatório: {report}")
    failures = checker.failures()
    if failures:
        for failure in failures:
            print(
                f"ERRO: {failure['document']}/{failure['name']}: {failure['detail']}",
                file=sys.stderr,
            )
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
