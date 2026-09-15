"""CLI do motor fiscal.

Uso:
    python -m motor_fiscal importar --empresa <cnpj> --competencia AAAA-MM \\
        [--xml-dir <dir>] [--efd <arquivo>] [--efd-contrib <arquivo>] [--db-dir <dir>]

    python -m motor_fiscal auditar --empresa <cnpj> --competencia AAAA-MM \\
        [--modulos ...] [--guias <guias.json>] [--dossie <dir>] [--xlsx/--no-xlsx]

    python -m motor_fiscal auditar --todas-empresas --competencia AAAA-MM

    python -m motor_fiscal relatorio --empresa <cnpj> --competencia AAAA-MM [--dossie <dir>]

    python -m motor_fiscal paridade --motor <json> --controldocs <json>

    python -m motor_fiscal painel
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

from motor_fiscal import orquestracao
from motor_fiscal.db import caminho_banco, conectar
from motor_fiscal.db.consultas import resumo_importacao
from motor_fiscal.ingestao import efd_contribuicoes, efd_icms_ipi, xml_importador
from motor_fiscal.relatorios import gerar_relatorios


def _gerar_xlsx_efetivo(args: argparse.Namespace) -> bool:
    """Com ``--dossie``, a entrega fiscal em XLSX e sempre gerada."""
    if getattr(args, "dossie", None):
        return True
    return bool(getattr(args, "gerar_xlsx", True))


def construir_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="motor_fiscal",
        description="Motor fiscal: ingestao, auditoria, relatorios e painel.",
    )
    sub = parser.add_subparsers(dest="comando", required=True)

    imp = sub.add_parser("importar", help="Importa XMLs e/ou EFDs para o banco da empresa/competencia")
    imp.add_argument("--empresa", required=True, help="CNPJ da empresa (com ou sem mascara)")
    imp.add_argument("--competencia", required=True, help="Competencia no formato AAAA-MM")
    imp.add_argument("--xml-dir", help="Diretorio com XMLs (NF-e/NFC-e/CT-e/CF-e/eventos), busca recursiva")
    imp.add_argument("--efd", help="Arquivo .txt da EFD ICMS/IPI")
    imp.add_argument("--efd-contrib", help="Arquivo .txt da EFD-Contribuicoes")
    imp.add_argument("--db-dir", help="Raiz dos bancos (padrao: _local/db ou env MOTOR_FISCAL_DB_DIR)")

    mods_help = (
        "Lista separada por virgula. Disponiveis: "
        + ",".join(sorted(orquestracao.MODULOS_DISPONIVEIS))
        + " | 'todos' = documental,estoque,lmc,margens | 'completo' = todos os modulos"
    )
    aud = sub.add_parser("auditar", help="Roda auditorias/apuracoes sobre DB(s) ja importado(s)")
    aud.add_argument("--empresa", help="CNPJ da empresa (obrigatorio salvo com --todas-empresas)")
    aud.add_argument("--todas-empresas", action="store_true", help="Varre _local/db/ na competencia")
    aud.add_argument("--competencia", required=True, help="Competencia no formato AAAA-MM")
    aud.add_argument("--modulos", default="documental,estoque,lmc,margens", help=mods_help)
    aud.add_argument("--guias", help="Arquivo guias.json (cruzamento EFD x guia do ICMS)")
    aud.add_argument("--config-dir", help="Pasta com icms_<uf>.json / ipi_default.json")
    aud.add_argument("--db-dir", help="Raiz dos bancos (padrao: _local/db ou env MOTOR_FISCAL_DB_DIR)")
    aud.add_argument(
        "--saida",
        help="Arquivo JSON de saida (padrao: _local/auditorias/<cnpj>/<AAAA-MM>.json)",
    )
    aud.add_argument(
        "--saida-dir",
        help="Raiz alternativa para saida padrao (_local/auditorias)",
    )
    aud.add_argument(
        "--dossie",
        help="Dossie mensal: grava XLSX fiscal na pasta 09 (JSON em 09/tecnico/)",
    )
    aud.add_argument(
        "--saida-relatorios",
        help="Pasta explicita para XLSX/JSON por modulo (sobrepoe --dossie e padrao)",
    )
    xlsx = aud.add_mutually_exclusive_group()
    xlsx.add_argument("--xlsx", dest="gerar_xlsx", action="store_true", default=True,
                      help="Gera XLSX fiscal (padrao; sempre ativo com --dossie)")
    xlsx.add_argument("--no-xlsx", dest="gerar_xlsx", action="store_false",
                      help="Nao gera XLSX (ignorado se --dossie estiver presente)")

    apu = sub.add_parser("apurar", help="Atalho para auditar um tributo (icms|ipi)")
    apu.add_argument("--empresa", required=True)
    apu.add_argument("--competencia", required=True)
    apu.add_argument("--tributo", required=True, choices=("icms", "ipi"))
    apu.add_argument("--guias", help="Arquivo guias.json (ICMS)")
    apu.add_argument("--config-dir", help="Pasta de configs tributarias")
    apu.add_argument("--db-dir", help="Raiz dos bancos")
    apu.add_argument("--saida", help="Arquivo JSON de saida")
    apu.add_argument("--saida-dir", help="Raiz alternativa para saida padrao")
    apu.add_argument("--dossie", help="Dossie mensal (pasta 09)")
    apu.add_argument("--saida-relatorios", help="Pasta de relatorios")
    apu.add_argument("--xlsx", dest="gerar_xlsx", action="store_true", default=True)
    apu.add_argument("--no-xlsx", dest="gerar_xlsx", action="store_false")

    rel = sub.add_parser(
        "relatorio",
        help="Gera/regenera XLSX fiscal + JSON tecnico a partir do DB ou de um JSON de auditoria",
    )
    rel.add_argument("--empresa", required=True)
    rel.add_argument("--competencia", required=True)
    rel.add_argument("--modulos", default="completo", help=mods_help)
    rel.add_argument("--guias")
    rel.add_argument("--config-dir")
    rel.add_argument("--db-dir")
    rel.add_argument("--auditoria-json", help="JSON consolidado ja gerado (pula reauditoria)")
    rel.add_argument("--dossie", help="Dossie mensal: XLSX na pasta 09, JSON em 09/tecnico/")
    rel.add_argument("--saida-relatorios", help="Pasta de saida dos relatorios")
    rel.add_argument("--saida-dir", help="Raiz de _local/auditorias se reauditar")
    rel.add_argument("--xlsx", dest="gerar_xlsx", action="store_true", default=True,
                     help="Gera XLSX fiscal (padrao; sempre ativo com --dossie)")
    rel.add_argument("--no-xlsx", dest="gerar_xlsx", action="store_false",
                     help="Nao gera XLSX (ignorado se --dossie estiver presente)")

    par = sub.add_parser("paridade", help="Compara motor x ControlDocs (legado/contraprova)")
    par.add_argument("--motor", required=True, help="JSON consolidado do motor")
    par.add_argument("--controldocs", required=True, help="JSON exportado/sintetico do ControlDocs")
    par.add_argument(
        "--saida",
        help="Pasta de saida (padrao: _local/paridade/<cnpj>/<AAAA-MM>/)",
    )

    painel = sub.add_parser("painel", help="Abre o painel Streamlit de drill-down")
    painel.add_argument(
        "--relatorios-dir",
        help="Raiz dos relatorios (padrao: _local/relatorios)",
    )
    painel.add_argument("--port", type=int, default=8501)
    return parser


def cmd_importar(args: argparse.Namespace) -> int:
    if not (args.xml_dir or args.efd or args.efd_contrib):
        print("erro: informe pelo menos um input (--xml-dir, --efd ou --efd-contrib)", file=sys.stderr)
        return 2

    for rotulo, caminho, deve_ser_dir in (
        ("--xml-dir", args.xml_dir, True),
        ("--efd", args.efd, False),
        ("--efd-contrib", args.efd_contrib, False),
    ):
        if caminho:
            p = Path(caminho)
            if deve_ser_dir and not p.is_dir():
                print(f"erro: {rotulo} nao e um diretorio: {caminho}", file=sys.stderr)
                return 2
            if not deve_ser_dir and not p.is_file():
                print(f"erro: {rotulo} nao e um arquivo: {caminho}", file=sys.stderr)
                return 2

    try:
        banco = caminho_banco(args.empresa, args.competencia, args.db_dir)
    except ValueError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2

    con = conectar(banco)
    print(f"Banco: {banco}")
    try:
        if args.xml_dir:
            resumo = xml_importador.importar_diretorio(con, args.xml_dir, args.empresa, args.competencia)
            print(f"\nXMLs ({resumo['diretorio']}): {resumo['arquivos_lidos']} arquivo(s)")
            for tipo, qtd in sorted(resumo["por_tipo"].items()):
                print(f"  {tipo}: {qtd}")
            for erro in resumo["erros"]:
                print(f"  AVISO: {erro}")

        if args.efd:
            resumo = efd_icms_ipi.importar(con, args.efd, args.empresa, args.competencia)
            _imprimir_resumo_efd("EFD ICMS/IPI", resumo)

        if args.efd_contrib:
            resumo = efd_contribuicoes.importar(con, args.efd_contrib, args.empresa, args.competencia)
            _imprimir_resumo_efd("EFD-Contribuicoes", resumo)

        print("\nResumo do banco apos importacao:")
        _imprimir_resumo_banco(resumo_importacao(con))
    finally:
        con.close()
    return 0


def cmd_auditar(args: argparse.Namespace) -> int:
    try:
        modulos = orquestracao.parse_modulos(args.modulos)
    except ValueError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2

    if args.todas_empresas:
        return _cmd_auditar_lote(args, modulos)
    if not args.empresa:
        print("erro: informe --empresa ou --todas-empresas", file=sys.stderr)
        return 2
    return _cmd_auditar_uma(args, modulos)


def _cmd_auditar_uma(args: argparse.Namespace, modulos: list[str]) -> int:
    try:
        banco = caminho_banco(args.empresa, args.competencia, args.db_dir)
    except ValueError as exc:
        print(f"erro: {exc}", file=sys.stderr)
        return 2

    if not banco.is_file():
        print(f"erro: banco nao encontrado: {banco} (rode 'importar' antes)", file=sys.stderr)
        return 2

    kwargs = {
        "guias": getattr(args, "guias", None),
        "db_dir": args.db_dir,
        "config_dir": getattr(args, "config_dir", None),
    }

    con = conectar(banco)
    print(f"Banco: {banco}")
    print(f"Modulos: {', '.join(modulos)}")
    try:
        resultado = orquestracao.auditar(
            con, args.empresa, args.competencia, modulos, **kwargs
        )
    finally:
        con.close()

    if args.saida:
        caminho_saida = Path(args.saida)
    else:
        caminho_saida = orquestracao.caminho_saida_padrao(
            args.empresa, args.competencia, getattr(args, "saida_dir", None)
        )
    meta = orquestracao.persistir_saidas(
        resultado,
        caminho_auditoria=caminho_saida,
        dossie=getattr(args, "dossie", None),
        saida_relatorios=getattr(args, "saida_relatorios", None),
        gerar_xlsx=_gerar_xlsx_efetivo(args),
    )

    resumo = resultado["resumo"]
    print(f"\nAuditoria concluida: {'OK' if resumo['ok'] else 'COM PENDENCIAS'}")
    for nome, info in resumo["modulos"].items():
        status = "ok" if info["ok"] else "falhas"
        print(
            f"  {nome}: {status} "
            f"(erros={info['erros']}, avisos={info['avisos']}, achados={info['total_achados']})"
        )
    print(f"JSON: {caminho_saida}")
    print(f"Relatorios: {meta['relatorios']['destino']}")
    capa = {
        "empresa_cnpj": resultado["empresa_cnpj"],
        "competencia": resultado["competencia"],
        "gerado_em": resultado["gerado_em"],
        "resumo": resultado["resumo"],
        "saida": str(caminho_saida),
        "relatorios": meta["relatorios"]["destino"],
    }
    print(json.dumps(capa, ensure_ascii=False))
    return 0 if resumo["ok"] else 1


def _cmd_auditar_lote(args: argparse.Namespace, modulos: list[str]) -> int:
    empresas = orquestracao.listar_empresas_banco(args.competencia, args.db_dir)
    print(f"Lote: {len(empresas)} empresa(s) com banco em {args.competencia}")
    if not empresas:
        print("erro: nenhum banco encontrado para a competencia", file=sys.stderr)
        return 2
    print(f"Modulos: {', '.join(modulos)}")
    lote = orquestracao.auditar_lote(
        args.competencia,
        modulos,
        db_dir=args.db_dir,
        guias=getattr(args, "guias", None),
        config_dir=getattr(args, "config_dir", None),
        saida_dir=getattr(args, "saida_dir", None),
        dossie=getattr(args, "dossie", None),
        saida_relatorios=getattr(args, "saida_relatorios", None),
        gerar_xlsx=_gerar_xlsx_efetivo(args),
    )
    for item in lote["resultados"]:
        status = "OK" if item["ok"] else "PENDENCIAS"
        print(f"  {item['empresa_cnpj']}: {status}")
    if lote["falhas"]:
        print("\nFalhas:")
        for falha in lote["falhas"]:
            print(f"  {falha['empresa_cnpj']}: {falha['erro']}")
    resumo_path = Path.cwd() / "_local" / "auditorias" / f"lote-{args.competencia}.json"
    if getattr(args, "saida_dir", None):
        resumo_path = Path(args.saida_dir) / f"lote-{args.competencia}.json"
    orquestracao.escrever_json(lote, resumo_path)
    print(f"\nResumo do lote: {resumo_path}")
    print(json.dumps({
        "competencia": lote["competencia"],
        "total": lote["total"],
        "ok": lote["ok"],
        "falhas": len(lote["falhas"]),
        "com_pendencias": sum(1 for r in lote["resultados"] if not r["ok"]),
    }, ensure_ascii=False))
    return 0 if lote["ok"] and not lote["falhas"] else 1


def cmd_apurar(args: argparse.Namespace) -> int:
    args.modulos = args.tributo
    args.todas_empresas = False
    return cmd_auditar(args)


def cmd_relatorio(args: argparse.Namespace) -> int:
    if args.auditoria_json:
        path = Path(args.auditoria_json)
        if not path.is_file():
            print(f"erro: JSON nao encontrado: {path}", file=sys.stderr)
            return 2
        resultado = json.loads(path.read_text(encoding="utf-8"))
    else:
        try:
            modulos = orquestracao.parse_modulos(args.modulos)
        except ValueError as exc:
            print(f"erro: {exc}", file=sys.stderr)
            return 2
        try:
            banco = caminho_banco(args.empresa, args.competencia, args.db_dir)
        except ValueError as exc:
            print(f"erro: {exc}", file=sys.stderr)
            return 2
        if not banco.is_file():
            print(f"erro: banco nao encontrado: {banco}", file=sys.stderr)
            return 2
        kwargs = {
            "guias": args.guias,
            "db_dir": args.db_dir,
            "config_dir": args.config_dir,
        }
        con = conectar(banco)
        try:
            resultado = orquestracao.auditar(
                con, args.empresa, args.competencia, modulos, **kwargs
            )
        finally:
            con.close()
        caminho_aud = orquestracao.caminho_saida_padrao(
            args.empresa, args.competencia, args.saida_dir
        )
        orquestracao.escrever_json(resultado, caminho_aud)
        print(f"Auditoria: {caminho_aud}")

    pacote = gerar_relatorios(
        resultado,
        dossie=args.dossie,
        saida_dir=args.saida_relatorios,
        gerar_xlsx=_gerar_xlsx_efetivo(args),
    )
    print(f"Relatorios: {pacote['destino']}")
    for nome, caminho in sorted(pacote["arquivos"].items()):
        print(f"  {nome}: {caminho}")
    return 0


def cmd_paridade(args: argparse.Namespace) -> int:
    from motor_fiscal.paridade import comparar_e_gravar

    motor = Path(args.motor)
    controldocs = Path(args.controldocs)
    if not motor.is_file() or not controldocs.is_file():
        print("erro: informe JSON existentes em --motor e --controldocs", file=sys.stderr)
        return 2
    try:
        rel = comparar_e_gravar(motor, controldocs, saida=args.saida)
    except Exception as exc:  # noqa: BLE001
        print(f"erro: {exc}", file=sys.stderr)
        return 2
    print(f"Paridade: {'OK' if rel['ok'] else 'DIVERGENCIAS'}")
    print(f"Relatorio: {rel['arquivo']}")
    print(json.dumps({
        "ok": rel["ok"],
        "modulos_ok": rel["modulos_ok"],
        "modulos_divergentes": rel["modulos_divergentes"],
        "total_divergencias": rel["total_divergencias"],
    }, ensure_ascii=False))
    return 0 if rel["ok"] else 1


def cmd_painel(args: argparse.Namespace) -> int:
    app = Path(__file__).resolve().parents[2] / "app" / "painel.py"
    if not app.is_file():
        # fallback: motor-fiscal/app/painel.py a partir do pacote instalado
        app = Path(__file__).resolve().parents[3] / "app" / "painel.py"
    if not app.is_file():
        print(f"erro: painel nao encontrado em {app}", file=sys.stderr)
        return 2
    cmd = [
        sys.executable, "-m", "streamlit", "run", str(app),
        "--server.port", str(args.port),
        "--",
    ]
    if args.relatorios_dir:
        cmd.extend(["--relatorios-dir", args.relatorios_dir])
    print(f"Abrindo painel: {app}")
    return subprocess.call(cmd)


def _imprimir_resumo_efd(titulo: str, resumo: dict) -> None:
    print(f"\n{titulo} ({resumo['arquivo']}): {resumo['total_linhas']} linha(s)")
    for reg, qtd in sorted(resumo["registros"].items()):
        print(f"  {reg}: {qtd}")
    if resumo["nao_tipados"]:
        nao_tipados = ", ".join(f"{r} ({q}x)" for r, q in sorted(resumo["nao_tipados"].items()))
        print(f"  registros nao tipados (gravados crus): {nao_tipados}")
    for aviso in resumo["avisos"]:
        print(f"  AVISO: {aviso}")


def _imprimir_resumo_banco(resumo: dict) -> None:
    print("  documentos:")
    for chave, qtd in sorted(resumo["documentos"].items()):
        print(f"    {chave}: {qtd}")
    print(f"  itens: {resumo['itens']}")
    print(f"  eventos: {resumo['eventos']}")
    print(f"  produtos: {resumo['produtos']}")
    print(f"  apuracoes: {resumo['apuracoes']}")
    print(f"  registros EFD ICMS/IPI: {resumo['registros_efd_icms_ipi']}")
    print(f"  registros EFD-Contribuicoes: {resumo['registros_efd_contribuicoes']}")


def main(argv: list[str] | None = None) -> int:
    args = construir_parser().parse_args(argv)
    if args.comando == "importar":
        return cmd_importar(args)
    if args.comando == "auditar":
        return cmd_auditar(args)
    if args.comando == "apurar":
        return cmd_apurar(args)
    if args.comando == "relatorio":
        return cmd_relatorio(args)
    if args.comando == "paridade":
        return cmd_paridade(args)
    if args.comando == "painel":
        return cmd_painel(args)
    return 2


if __name__ == "__main__":
    sys.exit(main())
