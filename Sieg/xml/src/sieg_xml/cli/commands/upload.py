"""Subcomando de upload de XMLs."""

from __future__ import annotations

import argparse
import os

from ...config import NUM_THREADS_PADRAO, PASTA_PADRAO_XMLS, validate_required_settings
from ...services.upload_service import UploadService
from ...utils.file_utils import buscar_xmls_recursivo
from ...utils.ui_utils import selecionar_arquivos_xml, selecionar_pasta_xmls
from ..common import load_lines, print_header, resolve_reprocess_paths_by_key, resolve_reprocess_paths_by_name

ARQUIVO_ERROS_PADRAO = "arquivos_reprocessar.txt"


def register(subparsers: argparse._SubParsersAction[argparse.ArgumentParser]) -> None:
    parser = subparsers.add_parser("upload", help="Enviar XMLs para o SIEG.")
    parser.add_argument("--auto", action="store_true")
    parser.add_argument("--pasta")
    parser.add_argument("--arquivos", nargs="*")
    parser.add_argument("--threads", type=int, default=NUM_THREADS_PADRAO)
    parser.add_argument("--reprocessar", nargs="+")
    parser.add_argument("--reprocessar-arquivo")
    parser.add_argument("--reprocessar-nomes")
    parser.add_argument("--sem-verificacao", action="store_true")
    parser.add_argument("--sim", action="store_true")
    parser.set_defaults(func=handle)


def _run_upload_pipeline(
    caminhos_xml: list[str],
    *,
    threads: int,
    verificar_existentes: bool,
    excluir_sucesso: bool = False,
    excluir_existentes: bool = False,
) -> dict[str, object]:
    service = UploadService()
    xmls_validos, tipos_identificados = service.validar_xmls(caminhos_xml)
    xmls_para_enviar = xmls_validos
    xmls_ja_existentes: list[dict] = []

    if verificar_existentes:
        xmls_para_enviar, xmls_ja_existentes = service.verificar_xmls_existentes(xmls_validos)
        if excluir_existentes:
            for xml_info in xmls_ja_existentes:
                try:
                    os.remove(xml_info["caminho"])
                except OSError:
                    pass

    resultado = service.enviar_xmls(xmls_para_enviar, num_threads=threads, usar_warmup=excluir_sucesso)

    if excluir_sucesso:
        for xml_info in resultado["enviados_sucesso"]:
            try:
                os.remove(xml_info["caminho"])
            except OSError:
                pass

    return {
        "tipos_identificados": tipos_identificados,
        "xmls_validos": xmls_validos,
        "xmls_para_enviar": xmls_para_enviar,
        "xmls_ja_existentes": xmls_ja_existentes,
        "resultado": resultado,
    }


def handle(args: argparse.Namespace) -> int:
    validate_required_settings()
    print_header("SIEG XML - Upload")
    threads = args.threads or NUM_THREADS_PADRAO
    verificar_existentes = not args.sem_verificacao

    if args.auto:
        pasta = args.pasta or PASTA_PADRAO_XMLS
        xmls = buscar_xmls_recursivo(pasta)
        if not xmls:
            print("Nenhum XML encontrado.")
            return 0
        dados = _run_upload_pipeline(
            xmls,
            threads=threads,
            verificar_existentes=True,
            excluir_sucesso=True,
            excluir_existentes=True,
        )
        print(dados["resultado"])
        return 0 if dados["resultado"]["erros"] == 0 else 1

    if args.reprocessar:
        pasta = args.pasta or PASTA_PADRAO_XMLS
        xmls = resolve_reprocess_paths_by_key(pasta, args.reprocessar)
    elif args.reprocessar_arquivo:
        pasta = args.pasta or PASTA_PADRAO_XMLS
        xmls = resolve_reprocess_paths_by_key(pasta, load_lines(args.reprocessar_arquivo))
    elif args.reprocessar_nomes:
        pasta = args.pasta or PASTA_PADRAO_XMLS
        xmls = resolve_reprocess_paths_by_name(pasta, load_lines(args.reprocessar_nomes))
    elif args.pasta:
        xmls = buscar_xmls_recursivo(args.pasta)
    elif args.arquivos:
        xmls = list(args.arquivos)
    else:
        print("Opcoes:")
        print("  [1] Selecionar arquivos XML especificos")
        print("  [2] Selecionar pasta com XMLs")
        escolha = input("Escolha uma opcao (1/2/q): ").strip().lower()
        if escolha == "1":
            xmls = selecionar_arquivos_xml()
        elif escolha == "2":
            xmls = selecionar_pasta_xmls()
        else:
            print("Operacao cancelada.")
            return 0

    if not xmls:
        print("Nenhum XML selecionado.")
        return 1

    service = UploadService()
    xmls_validos, tipos_identificados = service.validar_xmls(xmls)
    xmls_para_enviar = xmls_validos
    xmls_ja_existentes: list[dict] = []
    if verificar_existentes:
        xmls_para_enviar, xmls_ja_existentes = service.verificar_xmls_existentes(xmls_validos)

    print(f"Tipos identificados: {tipos_identificados}")
    print(f"Ja existentes: {len(xmls_ja_existentes)}")
    print(f"Para enviar: {len(xmls_para_enviar)}")
    if not args.sim:
        resposta = input(f"Deseja enviar {len(xmls_para_enviar)} XML(s)? (s/n): ").strip().lower()
        if resposta != "s":
            print("Operacao cancelada.")
            return 0

    resultado = service.enviar_xmls(xmls_para_enviar, num_threads=threads, usar_warmup=False)
    print(resultado)
    if resultado["erros_detalhados"]:
        with open(ARQUIVO_ERROS_PADRAO, "w", encoding="utf-8") as handle:
            for erro in resultado["erros_detalhados"]:
                handle.write(f"{erro['xml']['nome']}\n")
        print(f"Erros salvos em: {ARQUIVO_ERROS_PADRAO}")
    return 0 if resultado["erros"] == 0 else 1
