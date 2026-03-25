"""
Script temporário para organizar XMLs já baixados por ano e mês
"""
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Optional, Tuple

PASTA_XMLS = 'xmls_baixados'


def extrair_data_xml(caminho_arquivo: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Extrai o ano e mês da data de emissão do XML da NFe
    
    Args:
        caminho_arquivo: Caminho completo do arquivo XML
        
    Returns:
        Tupla (ano, mês) ou (None, None) se não conseguir extrair
    """
    try:
        # Ler e parse do XML
        tree = ET.parse(caminho_arquivo)
        root = tree.getroot()
        
        # Namespace da NFe
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Tentar encontrar dhEmi (data e hora de emissão)
        caminhos_possiveis = [
            './/nfe:dhEmi',
            './/{http://www.portalfiscal.inf.br/nfe}dhEmi',
            './/dhEmi',
        ]
        
        data_emissao = None
        for caminho in caminhos_possiveis:
            try:
                elemento = root.find(caminho, ns) if 'nfe:' in caminho else root.find(caminho)
                if elemento is not None and elemento.text:
                    data_emissao = elemento.text
                    break
            except:
                continue
        
        # Se não encontrou com namespace, tenta sem namespace
        if data_emissao is None:
            for elem in root.iter():
                if elem.tag.endswith('dhEmi') or 'dhEmi' in elem.tag:
                    if elem.text:
                        data_emissao = elem.text
                        break
        
        if data_emissao:
            # Formato esperado: 2023-01-17T11:40:00-03:00 ou similar
            # Extrair apenas a parte da data (antes do T)
            data_part = data_emissao.split('T')[0]
            partes = data_part.split('-')
            
            if len(partes) >= 2:
                ano = int(partes[0])
                mes = int(partes[1])
                return ano, mes
        
        return None, None
        
    except Exception as e:
        print(f"  ERRO ao ler XML {os.path.basename(caminho_arquivo)}: {e}")
        return None, None


def organizar_xmls():
    """Organiza todos os XMLs da pasta por ano e mês"""
    print("="*60)
    print("Organizador de XMLs - Por Ano e Mês")
    print("="*60)
    
    if not os.path.exists(PASTA_XMLS):
        print(f"ERRO: Pasta '{PASTA_XMLS}' não encontrada.")
        return
    
    # Listar todos os arquivos XML na pasta raiz
    arquivos_xml = []
    for arquivo in os.listdir(PASTA_XMLS):
        caminho_completo = os.path.join(PASTA_XMLS, arquivo)
        if os.path.isfile(caminho_completo) and arquivo.lower().endswith('.xml'):
            arquivos_xml.append(caminho_completo)
    
    if len(arquivos_xml) == 0:
        print(f"Nenhum arquivo XML encontrado em '{PASTA_XMLS}'")
        return
    
    print(f"\nEncontrados {len(arquivos_xml)} arquivo(s) XML para organizar\n")
    
    # Estatísticas
    organizados = 0
    sem_data = 0
    erros = 0
    ja_organizados = 0
    
    # Processar cada arquivo
    for idx, caminho_arquivo in enumerate(arquivos_xml, 1):
        nome_arquivo = os.path.basename(caminho_arquivo)
        
        # Verificar se já está em uma pasta ano/mês
        caminho_relativo = os.path.relpath(caminho_arquivo, PASTA_XMLS)
        partes_caminho = caminho_relativo.split(os.sep)
        
        if len(partes_caminho) == 3:  # ano/mes/arquivo.xml
            try:
                ano = int(partes_caminho[0])
                mes = int(partes_caminho[1])
                print(f"[{idx}/{len(arquivos_xml)}] {nome_arquivo} - Já organizado ({ano}/{mes:02d})")
                ja_organizados += 1
                continue
            except:
                pass  # Não é uma estrutura ano/mes válida, processa normalmente
        
        print(f"[{idx}/{len(arquivos_xml)}] Processando: {nome_arquivo}")
        
        # Extrair data
        ano, mes = extrair_data_xml(caminho_arquivo)
        
        if ano and mes:
            # Criar pasta destino
            pasta_destino = os.path.join(PASTA_XMLS, str(ano), f"{mes:02d}")
            os.makedirs(pasta_destino, exist_ok=True)
            
            # Caminho destino
            caminho_destino = os.path.join(pasta_destino, nome_arquivo)
            
            # Verificar se já existe no destino
            if os.path.exists(caminho_destino):
                if os.path.samefile(caminho_arquivo, caminho_destino):
                    print(f"  Já está no local correto")
                    ja_organizados += 1
                else:
                    # Arquivo diferente com mesmo nome, renomear
                    base, ext = os.path.splitext(nome_arquivo)
                    contador = 1
                    while os.path.exists(caminho_destino):
                        novo_nome = f"{base}_{contador}{ext}"
                        caminho_destino = os.path.join(pasta_destino, novo_nome)
                        contador += 1
                    os.rename(caminho_arquivo, caminho_destino)
                    print(f"  OK - Movido para {ano}/{mes:02d}/ (renomeado para evitar duplicata)")
                    organizados += 1
            else:
                # Mover arquivo
                try:
                    os.rename(caminho_arquivo, caminho_destino)
                    print(f"  OK - Movido para {ano}/{mes:02d}/")
                    organizados += 1
                except Exception as e:
                    print(f"  ERRO ao mover: {e}")
                    erros += 1
        else:
            # Não conseguiu extrair data
            print(f"  AVISO - Data não identificada, mantendo na pasta raiz")
            sem_data += 1
    
    # Resumo final
    print(f"\n{'='*60}")
    print("RESUMO DA ORGANIZAÇÃO")
    print(f"{'='*60}")
    print(f"  Organizados (movidos): {organizados}")
    print(f"  Já organizados: {ja_organizados}")
    print(f"  Sem data (mantidos na raiz): {sem_data}")
    print(f"  Erros: {erros}")
    print(f"  Total processado: {len(arquivos_xml)}")
    
    # Listar estrutura de pastas criadas
    if os.path.exists(PASTA_XMLS):
        print(f"\n  Estrutura de pastas:")
        pastas_ano = sorted([d for d in os.listdir(PASTA_XMLS) 
                            if os.path.isdir(os.path.join(PASTA_XMLS, d)) and d.isdigit()])
        
        for ano in pastas_ano:
            pasta_ano = os.path.join(PASTA_XMLS, ano)
            pastas_mes = sorted([d for d in os.listdir(pasta_ano) 
                               if os.path.isdir(os.path.join(pasta_ano, d))])
            for mes in pastas_mes:
                pasta_mes = os.path.join(pasta_ano, mes)
                num_xmls = len([f for f in os.listdir(pasta_mes) 
                              if f.lower().endswith('.xml')])
                if num_xmls > 0:
                    print(f"    {ano}/{mes}/ - {num_xmls} XML(s)")
    
    print(f"{'='*60}")


if __name__ == "__main__":
    organizar_xmls()

