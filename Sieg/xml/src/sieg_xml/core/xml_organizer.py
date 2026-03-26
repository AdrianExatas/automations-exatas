"""
Módulo para organização de XMLs por ano
"""
import os
from typing import Optional
from .xml_parser import extrair_data_xml


def organizar_xmls_por_data(pasta_xmls: str) -> dict:
    """
    Organiza todos os XMLs da pasta por ano (apenas ano, sem mês).

    Args:
        pasta_xmls: Caminho da pasta contendo os XMLs

    Returns:
        Dicionário com estatísticas da organização
    """
    if not os.path.exists(pasta_xmls):
        print(f"ERRO: Pasta '{pasta_xmls}' não encontrada.")
        return {"erro": "Pasta não encontrada"}

    # Listar todos os arquivos XML na pasta raiz
    arquivos_xml = []
    for arquivo in os.listdir(pasta_xmls):
        caminho_completo = os.path.join(pasta_xmls, arquivo)
        if os.path.isfile(caminho_completo) and arquivo.lower().endswith('.xml'):
            arquivos_xml.append(caminho_completo)

    if len(arquivos_xml) == 0:
        print(f"Nenhum arquivo XML encontrado em '{pasta_xmls}'")
        return {"total": 0, "organizados": 0, "sem_data": 0, "erros": 0, "ja_organizados": 0}

    # Estatísticas
    organizados = 0
    sem_data = 0
    erros = 0
    ja_organizados = 0

    # Processar cada arquivo
    for idx, caminho_arquivo in enumerate(arquivos_xml, 1):
        nome_arquivo = os.path.basename(caminho_arquivo)

        # Verificar se já está em uma pasta por ano (ano/arquivo.xml)
        caminho_relativo = os.path.relpath(caminho_arquivo, pasta_xmls)
        partes_caminho = caminho_relativo.split(os.sep)

        if len(partes_caminho) == 2:  # ano/arquivo.xml
            try:
                ano = int(partes_caminho[0])
                print(f"[{idx}/{len(arquivos_xml)}] {nome_arquivo} - Já organizado ({ano})")
                ja_organizados += 1
                continue
            except ValueError:
                pass

        print(f"[{idx}/{len(arquivos_xml)}] Processando: {nome_arquivo}")

        # Ler XML e extrair data
        try:
            with open(caminho_arquivo, 'r', encoding='utf-8') as f:
                xml_content = f.read()
            ano, _ = extrair_data_xml(xml_content)
        except Exception as e:
            print(f"  ERRO ao ler XML: {e}")
            erros += 1
            continue

        if ano:
            # Criar pasta destino: apenas por ano
            pasta_destino = os.path.join(pasta_xmls, str(ano))
            os.makedirs(pasta_destino, exist_ok=True)

            caminho_destino = os.path.join(pasta_destino, nome_arquivo)

            if os.path.exists(caminho_destino):
                if os.path.samefile(caminho_arquivo, caminho_destino):
                    print(f"  Já está no local correto")
                    ja_organizados += 1
                else:
                    base, ext = os.path.splitext(nome_arquivo)
                    contador = 1
                    while os.path.exists(caminho_destino):
                        novo_nome = f"{base}_{contador}{ext}"
                        caminho_destino = os.path.join(pasta_destino, novo_nome)
                        contador += 1
                    os.rename(caminho_arquivo, caminho_destino)
                    print(f"  OK - Movido para {ano}/ (renomeado para evitar duplicata)")
                    organizados += 1
            else:
                try:
                    os.rename(caminho_arquivo, caminho_destino)
                    print(f"  OK - Movido para {ano}/")
                    organizados += 1
                except Exception as e:
                    print(f"  ERRO ao mover: {e}")
                    erros += 1
        else:
            print(f"  AVISO - Data não identificada, mantendo na pasta raiz")
            sem_data += 1

    return {
        "total": len(arquivos_xml),
        "organizados": organizados,
        "sem_data": sem_data,
        "erros": erros,
        "ja_organizados": ja_organizados
    }


def reorganizar_por_ano(pasta_xmls: str) -> dict:
    """
    Reorganiza XMLs que estão em estrutura ano/mês para apenas ano.
    Move todos os arquivos de pasta_xmls/ANO/MES/ para pasta_xmls/ANO/ e remove pastas de mês vazias.

    Args:
        pasta_xmls: Caminho da pasta (ex: xmls_baixados)

    Returns:
        Dicionário com estatísticas (movidos, conflitos, erros)
    """
    if not os.path.exists(pasta_xmls):
        return {"erro": "Pasta não encontrada", "movidos": 0, "conflitos": 0, "erros": 0}

    movidos = 0
    conflitos = 0
    erros = 0

    for nome_ano in os.listdir(pasta_xmls):
        pasta_ano = os.path.join(pasta_xmls, nome_ano)
        if not os.path.isdir(pasta_ano) or not nome_ano.isdigit():
            continue

        for nome_mes in os.listdir(pasta_ano):
            pasta_mes = os.path.join(pasta_ano, nome_mes)
            if not os.path.isdir(pasta_mes):
                continue

            for nome_arquivo in os.listdir(pasta_mes):
                caminho_origem = os.path.join(pasta_mes, nome_arquivo)
                if not os.path.isfile(caminho_origem) or not nome_arquivo.lower().endswith('.xml'):
                    continue

                caminho_destino = os.path.join(pasta_ano, nome_arquivo)
                try:
                    if os.path.exists(caminho_destino):
                        if os.path.samefile(caminho_origem, caminho_destino):
                            pass
                        else:
                            base, ext = os.path.splitext(nome_arquivo)
                            contador = 1
                            while os.path.exists(caminho_destino):
                                caminho_destino = os.path.join(pasta_ano, f"{base}_{contador}{ext}")
                                contador += 1
                            conflitos += 1
                    os.rename(caminho_origem, caminho_destino)
                    movidos += 1
                except Exception as e:
                    print(f"  ERRO ao mover {nome_arquivo}: {e}")
                    erros += 1

        # Remover pastas de mês vazias
        for nome_mes in list(os.listdir(pasta_ano)):
            pasta_mes = os.path.join(pasta_ano, nome_mes)
            if os.path.isdir(pasta_mes) and not os.listdir(pasta_mes):
                try:
                    os.rmdir(pasta_mes)
                except OSError:
                    pass

    return {"movidos": movidos, "conflitos": conflitos, "erros": erros}
