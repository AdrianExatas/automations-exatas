#!/usr/bin/env python3
"""Dispara um agente Cursor local para gerar POP/IT/FORM/MP a partir de uma transcricão.

Requer CURSOR_API_KEY no ambiente e o pacote cursor-sdk:
  pip install cursor-sdk

Uso tipico (via gerar_de_midia.ps1):
  python run_agent_gerar.py --transcript path/to.txt --slug meu-processo --docs pop,it,form,mp
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


def _project_root() -> Path:
    # scripts/ -> gerar-pop-it/ -> skills/ -> gerador-pop-it/
    return Path(__file__).resolve().parents[3]


def _build_prompt(
    *,
    transcript_path: Path,
    output_dir: Path,
    content_json: Path,
    document_types: list[str],
    brief: dict,
    skill_rel: str,
) -> str:
    docs = ", ".join(document_types)
    brief_lines = []
    for key in (
        "titulo",
        "setor",
        "sigla",
        "codigo_pr",
        "codigo_in",
        "codigo_form",
        "codigo_mp",
        "elaborador",
        "verificador",
        "aprovador",
        "sistema",
        "registro_saida",
        "prazo",
        "executor",
        "comunicador_cliente",
        "observacoes",
    ):
        val = brief.get(key)
        if val:
            brief_lines.append(f"- {key}: {val}")
    brief_block = "\n".join(brief_lines) if brief_lines else "(nenhum metadado adicional; marcar lacunas em pontos_validacao)"

    return f"""Voce esta no repositorio gerador-pop-it. Execute a skill gerar-pop-it em modo NAO INTERATIVO.

## Instrucoes obrigatorias
1. Leia e siga integralmente `{skill_rel}` e as references citadas la.
2. NAO pergunte nada ao usuario. Use o brief abaixo; o que faltar vira `pontos_validacao` agrupados. Nunca invente regra de negocio, codigo, prazo ou caminho de sistema.
3. A transcricão ja esta no disco. Leia o arquivo:
   `{transcript_path.as_posix()}`
4. Documentos a gerar (documentos_solicitados): [{docs}]
5. Salve o JSON v2 em:
   `{content_json.as_posix()}`
6. Defina `transcricao.status` = `fornecida`, `transcricao.idioma` = `pt`, e `transcricao.observacao` com o nome do arquivo de transcricão.
7. Rode o gate semântico:
   ```
   python "skills/gerar-pop-it/scripts/validate_content_quality.py" --content-json "{content_json.as_posix()}" --report-path "{(output_dir / 'geracao' / 'relatorio-qualidade.md').as_posix()}"
   ```
   Corrija falhas de conteudo antes do build.
8. Gere e valide:
   ```
   powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "skills/gerar-pop-it/scripts/build_documents.ps1" -ContentJson "{content_json.as_posix()}" -OutputDir "{output_dir.as_posix()}"
   ```
9. Ao terminar, confirme em uma linha curta: caminhos de `content-v2.json` e da pasta `documentos/`, ou descreva a falha.

## Brief
- slug / pasta de saida: `{output_dir.as_posix()}`
- documentos: {docs}
{brief_block}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="Agente Cursor local: transcricão -> documentos POP/IT")
    parser.add_argument("--transcript", required=True, help="Caminho do .txt/.md de transcricão")
    parser.add_argument("--slug", required=True, help="Slug da pasta em output/")
    parser.add_argument("--output-root", default="", help="Raiz de output (padrao: <projeto>/output)")
    parser.add_argument("--docs", default="pop,it,form,mp", help="Lista separada por virgula")
    parser.add_argument("--brief-json", default="", help="Caminho de JSON com metadados opcionais")
    parser.add_argument("--brief", default="{}", help="JSON inline com metadados opcionais")
    parser.add_argument("--model", default="composer-2.5", help="Modelo do agente Cursor")
    parser.add_argument("--print-prompt-only", action="store_true", help="So imprime o prompt (sem chamar o SDK)")
    args = parser.parse_args()

    root = _project_root()
    transcript = Path(args.transcript).expanduser().resolve()
    if not transcript.is_file():
        print(f"ERRO: transcricão nao encontrada: {transcript}", file=sys.stderr)
        return 2

    output_root = Path(args.output_root).expanduser().resolve() if args.output_root else (root / "output")
    output_dir = output_root / args.slug
    geracao = output_dir / "geracao"
    geracao.mkdir(parents=True, exist_ok=True)
    content_json = geracao / "content-v2.json"

    document_types = [d.strip().lower() for d in args.docs.split(",") if d.strip()]
    if not document_types:
        document_types = ["pop", "it", "form", "mp"]

    brief: dict = {}
    if args.brief_json:
        brief_path = Path(args.brief_json).expanduser().resolve()
        brief.update(json.loads(brief_path.read_text(encoding="utf-8")))
    if args.brief and args.brief.strip() not in ("", "{}"):
        brief.update(json.loads(args.brief))

    skill_rel = "skills/gerar-pop-it/SKILL.md"
    prompt = _build_prompt(
        transcript_path=transcript,
        output_dir=output_dir,
        content_json=content_json,
        document_types=document_types,
        brief=brief,
        skill_rel=skill_rel,
    )

    if args.print_prompt_only:
        print(prompt)
        return 0

    api_key = os.environ.get("CURSOR_API_KEY", "").strip()
    if not api_key:
        print(
            "ERRO: CURSOR_API_KEY nao definida. Defina a chave ou rode com --print-prompt-only "
            "e cole o prompt no chat do Cursor.",
            file=sys.stderr,
        )
        print("---PROMPT---", file=sys.stderr)
        print(prompt)
        return 3

    try:
        from cursor_sdk import Agent, AgentOptions, LocalAgentOptions, CursorAgentError
    except ImportError:
        try:
            from cursor_sdk import Agent, AgentOptions, LocalAgentOptions

            CursorAgentError = Exception  # type: ignore[misc, assignment]
        except ImportError:
            print(
                "ERRO: pacote cursor-sdk nao instalado. Execute: pip install cursor-sdk",
                file=sys.stderr,
            )
            return 4

    print(f"[agent] cwd={root}")
    print(f"[agent] transcript={transcript}")
    print(f"[agent] output={output_dir}")
    print(f"[agent] model={args.model}")

    try:
        result = Agent.prompt(
            prompt,
            AgentOptions(
                api_key=api_key,
                model=args.model,
                local=LocalAgentOptions(cwd=str(root)),
            ),
        )
    except CursorAgentError as exc:
        retryable = getattr(exc, "is_retryable", None)
        msg = getattr(exc, "message", None) or str(exc)
        print(f"ERRO ao iniciar o agente: {msg} (retryable={retryable})", file=sys.stderr)
        return 5
    except Exception as exc:
        print(f"ERRO ao iniciar o agente: {exc}", file=sys.stderr)
        return 5

    status = getattr(result, "status", None)
    text = getattr(result, "result", None) or getattr(result, "text", None) or str(result)
    print(f"[agent] status={status}")
    print(text)

    if status and str(status).lower() in {"error", "failed", "cancelled"}:
        return 6

    if not content_json.is_file():
        print(
            f"AVISO: agente terminou sem criar {content_json}. Verifique o log acima.",
            file=sys.stderr,
        )
        return 7

    docs_dir = output_dir / "documentos"
    summary = {
        "status": str(status) if status is not None else "ok",
        "content_json": str(content_json),
        "documentos_dir": str(docs_dir) if docs_dir.is_dir() else None,
        "transcript": str(transcript),
    }
    print("AGENT_JSON:" + json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
