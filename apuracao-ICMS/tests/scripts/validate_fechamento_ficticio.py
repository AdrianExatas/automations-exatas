#!/usr/bin/env python3
"""Validacao ponta a ponta do fechamento ICMS com dados ficticios."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MONOREPO_ROOT = PROJECT_ROOT.parent
FIXTURES = PROJECT_ROOT / "tests" / "fixtures"
CONTENT_JSON = PROJECT_ROOT / "content" / "apuracao-icms-fechamento-mensal" / "content-v2.json"
DOCS_DIR = PROJECT_ROOT / "documentos" / "apuracao-icms-fechamento-mensal" / "documentos"
LOCAL_VALIDACAO = PROJECT_ROOT / "_local" / "validacao"
SCAFFOLD = PROJECT_ROOT / "skills" / "apuracao-icms" / "scripts" / "scaffold_dossie_mensal.py"
QUALITY_SCRIPT = (
    MONOREPO_ROOT
    / "gerador-pop-it"
    / "skills"
    / "gerar-pop-it"
    / "scripts"
    / "validate_content_quality.py"
)
STRUCTURAL_SCRIPT = (
    MONOREPO_ROOT
    / "gerador-pop-it"
    / "skills"
    / "gerar-pop-it"
    / "scripts"
    / "validate_documents_structural.py"
)

SUBPASTAS = [
    "01 - Documentos fiscais",
    "02 - Relatorios de entradas",
    "03 - Relatorios de saidas",
    "04 - Apuracao ICMS proprio",
    "05 - ICMS-ST",
    "06 - DIFAL-FCP",
    "07 - CIAP",
    "08 - Ajustes e beneficios",
    "09 - Relatorio de conferencia",
    "10 - EFD transmitida",
    "11 - Recibo",
    "12 - Obrigacoes estaduais",
    "13 - Guias",
    "14 - Comprovantes",
    "15 - Evidencias de revisao",
]

PLACEHOLDERS = {
    "01 - Documentos fiscais": "lista-xml-ficticia.txt",
    "02 - Relatorios de entradas": "entradas-resumo.txt",
    "03 - Relatorios de saidas": "saidas-resumo.txt",
    "04 - Apuracao ICMS proprio": "apuracao-e110.txt",
    "05 - ICMS-ST": "apuracao-st.txt",
    "06 - DIFAL-FCP": "apuracao-difal.txt",
    "07 - CIAP": "ciap-controle.txt",
    "08 - Ajustes e beneficios": "ajustes.txt",
    "09 - Relatorio de conferencia": "folha-13-cruzamentos.txt",
    "10 - EFD transmitida": "efd-placeholder.txt",
    "11 - Recibo": "recibo-transmissao.txt",
    "12 - Obrigacoes estaduais": "obrigacoes-uf.txt",
    "13 - Guias": "guias.txt",
    "14 - Comprovantes": "comprovantes.txt",
    "15 - Evidencias de revisao": "parecer-revisao.txt",
}


@dataclass
class CheckResult:
    name: str
    passed: bool
    detail: str


@dataclass
class ValidationRun:
    started_at: str
    checks: list[CheckResult] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return all(c.passed for c in self.checks)

    def add(self, name: str, passed: bool, detail: str) -> None:
        self.checks.append(CheckResult(name=name, passed=passed, detail=detail))
        status = "PASS" if passed else "FAIL"
        line = f"[{status}] {name}: {detail}"
        try:
            print(line)
        except UnicodeEncodeError:
            print(line.encode("ascii", errors="replace").decode("ascii"))


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def normalize_resposta(value: str) -> str:
    text = (value or "").strip().upper()
    if text in {"NAO", "NÃO"}:
        return "NÃO"
    return text


def run_subprocess(args: list[str]) -> tuple[int, str]:
    return run_subprocess_env(args)


def run_subprocess_env(
    args: list[str],
    *,
    env: dict[str, str] | None = None,
    cwd: Path | None = None,
) -> tuple[int, str]:
    proc = subprocess.run(
        args,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
        cwd=str(cwd) if cwd else None,
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    # Evita caracteres de substituicao que quebram o console Windows cp1252.
    out = out.replace("\ufffd", "?").strip()
    return proc.returncode, out


def check_qualidade(run: ValidationRun) -> None:
    report = LOCAL_VALIDACAO / "relatorio-qualidade.md"
    code, out = run_subprocess(
        [
            sys.executable,
            str(QUALITY_SCRIPT),
            "--content-json",
            str(CONTENT_JSON),
            "--report-path",
            str(report),
        ]
    )
    run.add(
        "qualidade_content_v2",
        code == 0,
        f"exit={code}; relatorio={report.name}" + (f"; {out[:200]}" if code != 0 else ""),
    )


def check_estrutura(run: ValidationRun) -> None:
    report = LOCAL_VALIDACAO / "relatorio-estrutural.md"
    expected = [
        "PR.FIS.001 - Apuracao de ICMS Fechamento Mensal.docx",
        "IN.FIS.001 - Apuracao de ICMS Fechamento Mensal.docx",
        "FORM.FIS.001 - Apuracao de ICMS Fechamento Mensal.xlsx",
        "MP.FIS.001 - Apuracao de ICMS Fechamento Mensal.xlsx",
    ]
    missing = [name for name in expected if not (DOCS_DIR / name).is_file()]
    if missing:
        run.add("estrutura_office_arquivos", False, f"Arquivos ausentes: {', '.join(missing)}")
        return
    code, out = run_subprocess(
        [
            sys.executable,
            str(STRUCTURAL_SCRIPT),
            "--content-json",
            str(CONTENT_JSON),
            "--output-dir",
            str(DOCS_DIR),
            "--report-path",
            str(report),
        ]
    )
    run.add(
        "estrutura_office",
        code == 0,
        f"exit={code}; relatorio={report.name}" + (f"; {out[:300]}" if code != 0 else " 4 documentos OK"),
    )


def check_dossie(run: ValidationRun, empresa: dict[str, Any], competencia: dict[str, Any]) -> Path:
    cnpj = empresa["cnpj"]
    comp = competencia["competencia"]
    code, out = run_subprocess(
        [
            sys.executable,
            str(SCAFFOLD),
            "--empresa",
            cnpj,
            "--competencia",
            comp,
        ]
    )
    dossie = PROJECT_ROOT / "_local" / "dossies" / cnpj / comp
    if code != 0 or not dossie.is_dir():
        run.add("scaffold_dossie", False, f"exit={code}; {out[:200]}")
        return dossie

    for pasta, filename in PLACEHOLDERS.items():
        pasta_path = dossie / pasta
        pasta_path.mkdir(parents=True, exist_ok=True)
        file_path = pasta_path / filename
        if not file_path.exists():
            file_path.write_text(
                f"Evidencia ficticia - {pasta}\nEmpresa: {empresa['razao_social']}\n"
                f"CNPJ: {cnpj}\nCompetencia: {comp}\n",
                encoding="utf-8",
            )

    ausentes = [p for p in SUBPASTAS if not (dossie / p).is_dir()]
    sem_arquivo = [
        p for p in SUBPASTAS if not any((dossie / p).iterdir()) if (dossie / p).is_dir()
    ]
    # Fix: sem_arquivo logic - list dirs that have no files
    sem_arquivo = [p for p in SUBPASTAS if (dossie / p).is_dir() and not any((dossie / p).iterdir())]

    ok = not ausentes and not sem_arquivo
    detail = f"dossie={dossie}"
    if ausentes:
        detail += f"; pastas ausentes={ausentes}"
    if sem_arquivo:
        detail += f"; pastas vazias={sem_arquivo}"
    run.add("dossie_15_pastas_com_evidencias", ok, detail)
    return dossie


def parecer_form(
    content: dict[str, Any],
    respostas: dict[str, str],
) -> tuple[str, list[str]]:
    """Retorna parecer e lista de divergencias/pendencias."""
    expected: dict[str, str] = {}
    for bloco in content.get("form", {}).get("blocos", []):
        for item in bloco.get("itens", []):
            expected[item["id"]] = normalize_resposta(item["resposta_conforme"])

    pendencias: list[str] = []
    divergencias: list[str] = []
    for cid, esperado in expected.items():
        atual = normalize_resposta(respostas.get(cid, ""))
        if not atual:
            pendencias.append(cid)
        elif atual != esperado:
            divergencias.append(f"{cid}: obtido={atual} esperado={esperado}")

    if pendencias:
        return "PENDENTE", pendencias + divergencias
    if divergencias:
        return "NÃO CONFORME", divergencias
    return "CONFORME", []


def check_form_conforme(run: ValidationRun, content: dict[str, Any]) -> None:
    fixture = load_json(FIXTURES / "form-respostas-conforme.json")
    parecer, issues = parecer_form(content, fixture["respostas"])
    esperado = normalize_resposta(fixture["parecer_esperado"].replace(" CONFORME", "").replace("CONFORME", "CONFORME"))
    # parecer_esperado is "CONFORME"
    ok = parecer == "CONFORME" and fixture["pode_avancar_apos_gate1"] is True
    run.add(
        "form_cenario_conforme",
        ok and parecer == fixture["parecer_esperado"],
        f"parecer={parecer}; esperado={fixture['parecer_esperado']}"
        + (f"; issues={issues[:5]}" if issues else ""),
    )


def check_form_bloqueio_gate1(run: ValidationRun, content: dict[str, Any]) -> None:
    fixture = load_json(FIXTURES / "form-respostas-bloqueio-gate1.json")
    parecer, issues = parecer_form(content, fixture["respostas"])

    # Gate 1 bloqueante: C04 deve divergir (SIM vs NÃO)
    c04 = normalize_resposta(fixture["respostas"]["C04"])
    c04_esperado = None
    for bloco in content["form"]["blocos"]:
        for item in bloco["itens"]:
            if item["id"] == "C04":
                c04_esperado = normalize_resposta(item["resposta_conforme"])
    gate1_bloqueia = c04 != c04_esperado
    nao_avanca = fixture["pode_avancar_apos_gate1"] is False
    parecer_ok = parecer in {"NÃO CONFORME", "PENDENTE"} and parecer == fixture["parecer_esperado"]

    # Com respostas vazias apos Gate1, parecer e PENDENTE; o plano pede NÃO CONFORME.
    # Ajuste: avaliar Gate1 isoladamente para parecer do gate, e parecer global.
    respostas_gate1 = {k: fixture["respostas"][k] for k in fixture["criterios_gate1"]}
    parecer_gate1, issues_gate1 = parecer_form_subset(content, respostas_gate1, fixture["criterios_gate1"])

    ok = (
        gate1_bloqueia
        and nao_avanca
        and parecer_gate1 == "NÃO CONFORME"
        and not fixture["pode_avancar_apos_gate1"]
    )
    run.add(
        "form_cenario_bloqueio_gate1",
        ok,
        f"gate1_parecer={parecer_gate1}; global={parecer}; bloqueia={gate1_bloqueia}; "
        f"avanca={fixture['pode_avancar_apos_gate1']}; issues_gate1={issues_gate1}",
    )
    run.add(
        "skill_nao_avanca_apos_gate1",
        nao_avanca and gate1_bloqueia,
        "Skill nao deve liberar classificacao com documentos faltantes",
    )


def parecer_form_subset(
    content: dict[str, Any],
    respostas: dict[str, str],
    ids: list[str],
) -> tuple[str, list[str]]:
    expected: dict[str, str] = {}
    for bloco in content.get("form", {}).get("blocos", []):
        for item in bloco.get("itens", []):
            if item["id"] in ids:
                expected[item["id"]] = normalize_resposta(item["resposta_conforme"])
    pendencias: list[str] = []
    divergencias: list[str] = []
    for cid in ids:
        atual = normalize_resposta(respostas.get(cid, ""))
        esperado = expected.get(cid, "")
        if not atual:
            pendencias.append(cid)
        elif atual != esperado:
            divergencias.append(f"{cid}: obtido={atual} esperado={esperado}")
    if pendencias:
        return "PENDENTE", pendencias + divergencias
    if divergencias:
        return "NÃO CONFORME", divergencias
    return "CONFORME", []


def check_conciliacao(run: ValidationRun, competencia: dict[str, Any]) -> None:
    conf = competencia["cruzamentos_conforme"]
    ok_conf = len(conf) == 13 and all(c.get("fecha") is True for c in conf)
    run.add(
        "conciliacao_conforme_13",
        ok_conf,
        f"total={len(conf)}; todos_fecham={ok_conf}",
    )

    bloq = competencia["cruzamentos_bloqueio_gate1"]
    xml = next((c for c in bloq if c["id"] == 1), None)
    ok_bloq = (
        len(bloq) == 13
        and xml is not None
        and xml.get("fecha") is False
        and any(c.get("fecha") is False for c in bloq)
    )
    run.add(
        "conciliacao_bloqueio_xml_escrituracao",
        ok_bloq,
        f"xml_fecha={None if xml is None else xml.get('fecha')}; falhas={sum(1 for c in bloq if not c.get('fecha'))}",
    )


def check_guias(run: ValidationRun, competencia: dict[str, Any]) -> None:
    guias = competencia.get("guias", [])
    ok = bool(guias) and all(
        abs(float(g["valor_guia"]) - float(g["valor_obrigacao"])) < 0.005 for g in guias
    )
    run.add(
        "gate3_guia_igual_obrigacao",
        ok,
        f"guias={len(guias)}; valores_iguais={ok}",
    )


def check_skill_regras(run: ValidationRun, empresa: dict[str, Any], competencia: dict[str, Any]) -> None:
    skill = PROJECT_ROOT / "skills" / "apuracao-icms" / "SKILL.md"
    refs = [
        PROJECT_ROOT / "skills" / "apuracao-icms" / "references" / "mapa-macro-processo.md",
        PROJECT_ROOT / "skills" / "apuracao-icms" / "references" / "gates-de-controle.md",
        PROJECT_ROOT / "skills" / "apuracao-icms" / "references" / "checklist-conciliacao.md",
        PROJECT_ROOT / "skills" / "apuracao-icms" / "references" / "matriz-tributaria.md",
        PROJECT_ROOT / "skills" / "apuracao-icms" / "references" / "dossie-mensal-estrutura.md",
    ]
    missing = [str(p.name) for p in [skill, *refs] if not p.is_file()]
    run.add("skill_e_referencias_presentes", not missing, "ok" if not missing else f"ausentes={missing}")

    skill_text = skill.read_text(encoding="utf-8") if skill.is_file() else ""
    aponta_motor = "motor-fiscal" in skill_text or "motor_fiscal" in skill_text
    removeu_restricao = "não lê/valida XML" not in skill_text and "nao le/valida XML" not in skill_text
    run.add(
        "skill_aponta_motor_fiscal",
        aponta_motor and removeu_restricao,
        "SKILL referencia motor-fiscal como ferramenta dos Gates"
        if aponta_motor and removeu_restricao
        else "SKILL ainda sem motor ou com restricao antiga de XML/SPED",
    )

    # Regra: bloqueio Gate1 impede status 19
    pend = competencia["pendencia_gate1"]
    ok = (
        pend.get("bloqueia_avancao") is True
        and competencia["status_esperado_bloqueio_gate1"].startswith("04")
        and competencia["status_esperado_conforme"].startswith("19")
        and empresa["cnpj"] == competencia["cnpj"]
    )
    run.add(
        "skill_status_cenarios",
        ok,
        f"bloqueio={competencia['status_esperado_bloqueio_gate1']}; "
        f"conforme={competencia['status_esperado_conforme']}",
    )


def check_motor_fiscal(run: ValidationRun, dossie: Path) -> None:
    """Importa + audita fixtures do motor-fiscal e grava relatorios na pasta 09 do dossie.

    As fixtures documentais de apuracao-ICMS (CNPJ 11222333000181 / 2026-07) nao
    incluem EFD/XML completos; usamos as fixtures sinteticas do motor-fiscal
    (12345678000199 / 2026-06) e apontamos --dossie para a pasta 09 do dossie
    ja scaffoldado (ou um subdiretorio de validacao).
    """
    motor_root = MONOREPO_ROOT / "motor-fiscal"
    fixtures = motor_root / "tests" / "fixtures"
    if not motor_root.is_dir() or not fixtures.is_dir():
        run.add("motor_fiscal_disponivel", False, f"projeto ausente: {motor_root}")
        return
    run.add("motor_fiscal_disponivel", True, str(motor_root.relative_to(MONOREPO_ROOT)))

    emp_motor = "12345678000199"
    comp_motor = "2026-06"
    db_dir = LOCAL_VALIDACAO / "motor_db"
    saida_dir = LOCAL_VALIDACAO / "motor_auditorias"
    # Usa pasta 09 do dossie scaffoldado (mesmo que a competencia do dossie seja
    # 2026-07 — evidencias do motor ficam sob motor-fixtures/ dentro de 09).
    pasta09 = dossie / "09 - Relatorio de conferencia" / "motor-fixtures"
    pasta09.mkdir(parents=True, exist_ok=True)

    env = {**os.environ, "PYTHONPATH": str(motor_root / "src")}

    code_imp, out_imp = run_subprocess_env(
        [
            sys.executable,
            "-m",
            "motor_fiscal",
            "importar",
            "--empresa",
            emp_motor,
            "--competencia",
            comp_motor,
            "--xml-dir",
            str(fixtures / "xmls"),
            "--efd",
            str(fixtures / "efd_icms_ipi_2026-06.txt"),
            "--efd-contrib",
            str(fixtures / "efd_contribuicoes_2026-06.txt"),
            "--db-dir",
            str(db_dir),
        ],
        env=env,
        cwd=motor_root,
    )
    run.add(
        "motor_importar_fixtures",
        code_imp == 0,
        f"exit={code_imp}" + (f"; {out_imp[:220]}" if code_imp != 0 else f"; db={db_dir}"),
    )
    if code_imp != 0:
        return

    code_aud, out_aud = run_subprocess_env(
        [
            sys.executable,
            "-m",
            "motor_fiscal",
            "auditar",
            "--empresa",
            emp_motor,
            "--competencia",
            comp_motor,
            "--modulos",
            "documental,icms,estoque",
            "--db-dir",
            str(db_dir),
            "--saida-dir",
            str(saida_dir),
            "--saida-relatorios",
            str(pasta09),
            "--guias",
            str(fixtures / "guias_2026-06.json"),
            "--config-dir",
            str(motor_root / "config"),
        ],
        env=env,
        cwd=motor_root,
    )
    # exit 1 = auditoria com pendencias (aceitavel em fixture mista)
    ok_aud = code_aud in (0, 1)
    consolidado = pasta09 / "consolidado.json"
    xlsx_doc = pasta09 / "documental.xlsx"
    ok_artefatos = consolidado.is_file() and xlsx_doc.is_file()
    run.add(
        "motor_auditar_gera_relatorios",
        ok_aud and ok_artefatos,
        f"exit={code_aud}; consolidado={consolidado.is_file()}; xlsx={xlsx_doc.is_file()}"
        + (f"; {out_aud[:200]}" if not (ok_aud and ok_artefatos) else f"; dest={pasta09}"),
    )


def write_reports(run: ValidationRun) -> None:
    LOCAL_VALIDACAO.mkdir(parents=True, exist_ok=True)
    resultado = {
        "started_at": run.started_at,
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "ok": run.ok,
        "checks": [asdict(c) for c in run.checks],
    }
    (LOCAL_VALIDACAO / "resultado.json").write_text(
        json.dumps(resultado, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    lines = [
        "# Relatorio de validacao ficticia — Apuracao ICMS",
        "",
        f"- Inicio: {run.started_at}",
        f"- Resultado geral: **{'PASS' if run.ok else 'FAIL'}**",
        f"- Checks: {sum(1 for c in run.checks if c.passed)}/{len(run.checks)} aprovados",
        "",
        "## Caso ficticio",
        "",
        "- Empresa: Comercial Exemplo SE Ltda",
        "- CNPJ: 11222333000181",
        "- Competencia: 2026-07",
        "- UF: SE",
        "- Cenarios: CONFORME e BLOQUEIO Gate 1",
        "",
        "## Checks",
        "",
        "| Check | Resultado | Detalhe |",
        "| --- | --- | --- |",
    ]
    for c in run.checks:
        status = "PASS" if c.passed else "FAIL"
        detail = c.detail.replace("|", "\\|")
        lines.append(f"| `{c.name}` | {status} | {detail} |")
    lines.extend(["", "## Observacoes", "", "- Dados sao ficticios e nao substituem homologacao institucional.", "- Pendencias de codigos/caminhos reais do content-v2 permanecem abertas.", ""])
    (LOCAL_VALIDACAO / "relatorio-validacao-ficticia.md").write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


def main() -> int:
    LOCAL_VALIDACAO.mkdir(parents=True, exist_ok=True)
    run = ValidationRun(started_at=datetime.now(timezone.utc).isoformat())

    if not CONTENT_JSON.is_file():
        run.add("content_v2_existe", False, str(CONTENT_JSON))
        write_reports(run)
        return 1
    run.add("content_v2_existe", True, str(CONTENT_JSON.relative_to(PROJECT_ROOT)))

    empresa = load_json(FIXTURES / "empresa-exemplo.json")
    competencia = load_json(FIXTURES / "competencia-2026-07.json")
    content = load_json(CONTENT_JSON)

    check_qualidade(run)
    check_estrutura(run)
    dossie = check_dossie(run, empresa, competencia)
    check_form_conforme(run, content)
    check_form_bloqueio_gate1(run, content)
    check_conciliacao(run, competencia)
    check_guias(run, competencia)
    check_skill_regras(run, empresa, competencia)
    check_motor_fiscal(run, dossie)

    write_reports(run)
    print()
    print(f"Relatorio: {LOCAL_VALIDACAO / 'relatorio-validacao-ficticia.md'}")
    print(f"JSON: {LOCAL_VALIDACAO / 'resultado.json'}")
    print("RESULTADO GERAL:", "PASS" if run.ok else "FAIL")
    return 0 if run.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
