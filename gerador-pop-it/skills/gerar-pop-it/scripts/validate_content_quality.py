#!/usr/bin/env python3
"""Gate semântico do conteúdo v2 (sem abrir Word/Excel)."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


IMPERATIVE_HINTS = (
    "acesse",
    "abra",
    "clique",
    "confirme",
    "consulte",
    "copie",
    "cole",
    "descreva",
    "digite",
    "registre",
    "selecione",
    "tire",
    "verifique",
    "localize",
    "mantenha",
    "expanda",
    "anexe",
    "preencha",
    "envie",
)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def requested_types(content: dict[str, Any]) -> set[str]:
    return {str(item).strip().lower() for item in as_list(content.get("documentos_solicitados"))}


def stage_ids(content: dict[str, Any]) -> list[str]:
    pop = content.get("pop") or {}
    ids = [text(step.get("id")) for step in as_list(pop.get("etapas")) if text(step.get("id"))]
    if ids:
        return ids
    it = content.get("it") or {}
    return [text(sec.get("etapa_id")) for sec in as_list(it.get("secoes")) if text(sec.get("etapa_id"))]


def looks_imperative(instruction: str) -> bool:
    lowered = instruction.strip().lower()
    if not lowered:
        return False
    first = re.split(r"\s+", lowered, maxsplit=1)[0]
    return first in IMPERATIVE_HINTS or lowered.endswith(".")


def validate(content: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    types = requested_types(content)
    doc = content.get("documento") or {}
    stages = stage_ids(content)
    stage_set = set(stages)

    if "pop" in types:
        if not text(doc.get("objetivo")):
            errors.append("POP solicitado sem documento.objetivo preenchido.")
        if not text(doc.get("resultado_esperado")):
            errors.append("POP solicitado sem documento.resultado_esperado preenchido.")
        etapas = as_list((content.get("pop") or {}).get("etapas"))
        if not etapas:
            errors.append("POP solicitado sem etapas.")
        for step in etapas:
            if not text(step.get("registro")):
                warnings.append(f"Etapa {text(step.get('id'))} sem REGISTRO concreto.")
            como = text(step.get("como"))
            if len(como) > 280:
                warnings.append(f"Etapa {text(step.get('id'))}: COMO longo demais para POP (detalhe na IT).")

    it_sections = as_list((content.get("it") or {}).get("secoes"))
    if "it" in types:
        if not it_sections:
            errors.append("IT solicitada sem seções.")
        if "pop" in types:
            it_by_stage = {text(sec.get("etapa_id")) for sec in it_sections}
            missing = [sid for sid in stages if sid not in it_by_stage]
            if missing:
                errors.append("Cobertura POP→IT incompleta. Etapas sem seção IT: " + ", ".join(missing))
        for sec in it_sections:
            sid = text(sec.get("id") or sec.get("etapa_id"))
            instructions = [text(i) for i in as_list(sec.get("instrucoes")) if text(i)]
            if not instructions:
                errors.append(f"Seção IT {sid} sem instruções.")
            weak = [i for i in instructions if not looks_imperative(i)]
            if weak:
                warnings.append(f"Seção IT {sid}: preferir imperativo nas instruções.")
            joined = " ".join(instructions).lower()
            if any(token in joined for token in ("se ", "caso ", "quando ")):
                if not any(token in joined for token in ("senão", "senao", "caso contrário", "caso contrario", "se não", "se nao", "se houver", "se não houver", "se nao houver")):
                    # Soft check: conditional language without an obvious alternate branch.
                    if joined.count(" se ") + joined.count(" caso ") + joined.count(" quando ") >= 1 and (
                        "se houver" in joined or "se não" in joined or "se nao" in joined or "caso" in joined
                    ):
                        pass
                    elif "se " in joined and "senão" not in joined and "senao" not in joined and "caso contrário" not in joined:
                        warnings.append(f"Seção IT {sid}: há linguagem condicional; confira se ambos os ramos estão documentados.")

    form_blocks = as_list((content.get("form") or {}).get("blocos"))
    if "form" in types:
        if not form_blocks:
            errors.append("FORM solicitado sem blocos.")
        covered = {text(block.get("etapa_id")) for block in form_blocks}
        if stages:
            uncovered = [sid for sid in stages if sid not in covered]
            if uncovered:
                pending = " ".join(text(p) for p in as_list(content.get("pontos_validacao"))).lower()
                justified = "form" in pending and ("omiss" in pending or "sem bloco" in pending or "não requer" in pending or "nao requer" in pending)
                if justified:
                    warnings.append("Etapas sem bloco FORM justificadas em pontos_validacao: " + ", ".join(uncovered))
                else:
                    # Critical heuristic: last stage and any stage mentioning evidência in IT title/path are critical.
                    critical = set()
                    if stages:
                        critical.add(stages[-1])
                    for sec in it_sections:
                        blob = " ".join(
                            [
                                text(sec.get("titulo")),
                                text(sec.get("caminho")),
                                " ".join(text(i) for i in as_list(sec.get("instrucoes"))),
                            ]
                        ).lower()
                        if any(k in blob for k in ("evid", "print", "comunic", "cliente", "planilha", "registro")):
                            critical.add(text(sec.get("etapa_id")))
                    missing_critical = [sid for sid in uncovered if sid in critical]
                    if missing_critical:
                        errors.append(
                            "Etapas críticas sem bloco FORM (ou pendência justificada): " + ", ".join(missing_critical)
                        )
                    elif uncovered:
                        warnings.append("Etapas sem bloco FORM: " + ", ".join(uncovered))
        for block in form_blocks:
            bid = text(block.get("id"))
            for item in as_list(block.get("itens")):
                cid = text(item.get("id"))
                pergunta = text(item.get("pergunta"))
                if not pergunta.endswith("?"):
                    errors.append(f"Critério FORM {bid}/{cid} deve terminar com '?'.")
                if " e " in pergunta.lower() and pergunta.lower().count("?") == 1:
                    if not pergunta.lower().startswith("quando "):
                        warnings.append(f"Critério FORM {bid}/{cid} parece composto; prefira um fato por pergunta.")
                resp = text(item.get("resposta_conforme")).upper()
                if resp not in {"SIM", "NÃO", "NAO"}:
                    errors.append(f"Critério FORM {bid}/{cid} com resposta_conforme inválida: {resp or '(vazio)'}")

    mp = content.get("mp") or {}
    if "mp" in types:
        cadeia = mp.get("cadeia") or {}
        for key in ("fornecedores", "entradas", "clientes", "saidas"):
            if not as_list(cadeia.get(key)):
                errors.append(f"MP sem cadeia.{key}.")
        risks = as_list(mp.get("riscos"))
        if not risks:
            errors.append("MP solicitado sem riscos.")
        for risk in risks:
            rid = text(risk.get("id"))
            etapa_id = text(risk.get("etapa_id"))
            if etapa_id and stage_set and etapa_id not in stage_set:
                errors.append(f"Risco MP {rid} referencia etapa inexistente: {etapa_id}")
            barreira = text(risk.get("barreira"))
            if "form" in types and barreira and "FORM" not in barreira.upper() and "BLOCO" not in barreira.upper():
                warnings.append(f"Risco MP {rid}: barreira poderia apontar bloco/critério FORM.")
            if not barreira:
                warnings.append(f"Risco MP {rid} sem barreira nomeada.")

    lista = content.get("lista_mestra") or {}
    entradas = [e for e in as_list(lista.get("entradas")) if isinstance(e, dict)]
    expected_types = []
    type_to_prefix = {"pop": "PR", "it": "IN", "form": "FORM", "mp": "MP"}
    for t in ("pop", "it", "form", "mp"):
        if t in types:
            expected_types.append(type_to_prefix[t])
    if expected_types:
        if not entradas:
            # Normalização deriva a lista mestra; avisar em vez de falhar no JSON cru.
            warnings.append(
                "lista_mestra.entradas ausente; a normalização/build deve derivar uma entrada por documento."
            )
        else:
            if len(entradas) < len(expected_types):
                errors.append(
                    f"Lista mestra incompleta: esperadas {len(expected_types)} entradas, encontradas {len(entradas)}."
                )
            found_types = {text(e.get("tipo")).upper() for e in entradas}
            for prefix in expected_types:
                if prefix not in found_types:
                    errors.append(f"Lista mestra sem entrada do tipo {prefix}.")
            for entry in entradas:
                if not text(entry.get("codigo_titulo")):
                    errors.append("Entrada da lista mestra sem codigo_titulo.")
                if text(entry.get("origem")).upper() not in {"", "INTERNO"}:
                    warnings.append(f"Lista mestra: origem inesperada em {text(entry.get('codigo_titulo'))}.")

    return errors, warnings


def write_report(path: Path, errors: list[str], warnings: list[str]) -> None:
    lines = ["# Relatório de qualidade do conteúdo", ""]
    if not errors and not warnings:
        lines.append("Status: **PASS** — nenhum achado semântico.")
    elif not errors:
        lines.append("Status: **PASS COM AVISOS**")
    else:
        lines.append("Status: **FAIL**")
    lines.append("")
    lines.append("## Erros")
    lines.append("")
    if errors:
        for item in errors:
            lines.append(f"- {item}")
    else:
        lines.append("- Nenhum.")
    lines.append("")
    lines.append("## Avisos")
    lines.append("")
    if warnings:
        for item in warnings:
            lines.append(f"- {item}")
    else:
        lines.append("- Nenhum.")
    lines.append("")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Valida qualidade semântica do content-v2.json")
    parser.add_argument("--content-json", required=True)
    parser.add_argument("--report-path", default="")
    parser.add_argument("--strict", action="store_true", help="Falhar também em avisos")
    args = parser.parse_args()

    content_path = Path(args.content_json)
    if not content_path.is_file():
        print(f"JSON não encontrado: {content_path}", file=sys.stderr)
        return 2

    content = load_json(content_path)
    errors, warnings = validate(content)

    report_path = Path(args.report_path) if args.report_path else content_path.parent / "relatorio-qualidade.md"
    write_report(report_path, errors, warnings)

    for err in errors:
        print(f"ERROR: {err}")
    for warn in warnings:
        print(f"WARN: {warn}")
    print(f"Relatório: {report_path}")

    if errors:
        return 1
    if args.strict and warnings:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
