"""
Script unificado para baixar XMLs da API SIEG
Permite selecionar a planilha e processa as chaves de acesso
"""
import requests
import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path
import pandas as pd
from typing import Optional, Tuple
import tkinter as tk
from tkinter import filedialog

# Configurações
API_URL = 'https://api.sieg.com/BaixarXml?xmlType=1&api_key=V9qh9u%2BRmI7VINT4ynER7A%3D%3D'
HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}
PASTA_XMLS = 'xmls_baixados'

# Criar pasta se não existir
os.makedirs(PASTA_XMLS, exist_ok=True)


def selecionar_planilha() -> Optional[str]:
    """
    Abre um diálogo para o usuário selecionar uma planilha do computador
    Retorna o caminho completo da planilha selecionada ou None se cancelado
    """
    print("\nAbrindo diálogo de seleção de arquivo...")
    print("Por favor, selecione a planilha Excel no diálogo que será aberto.\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente
    
    # Abrir diálogo de seleção de arquivo
    arquivo = filedialog.askopenfilename(
        title="Selecione a planilha Excel",
        filetypes=[
            ("Arquivos Excel", "*.xlsx *.xls"),
            ("Excel 2007+", "*.xlsx"),
            ("Excel 97-2003", "*.xls"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivo:
        print(f"Planilha selecionada: {arquivo}")
        return arquivo
    else:
        print("Nenhuma planilha selecionada.")
        return None


def validar_xml(xml_string: str) -> bool:
    """Valida se o XML é bem formado"""
    try:
        ET.fromstring(xml_string)
        return True
    except ET.ParseError:
        return False


def extrair_data_xml(xml_string: str) -> Tuple[Optional[int], Optional[int]]:
    """
    Extrai o ano e mês da data de emissão do XML da NFe
    
    Args:
        xml_string: String com o conteúdo do XML
        
    Returns:
        Tupla (ano, mês) ou (None, None) se não conseguir extrair
    """
    try:
        # Parse do XML
        root = ET.fromstring(xml_string)
        
        # Namespace da NFe
        ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
        
        # Tentar encontrar dhEmi (data e hora de emissão)
        # Pode estar em diferentes caminhos dependendo da estrutura
        caminhos_possiveis = [
            './/nfe:dhEmi',  # Caminho mais comum
            './/{http://www.portalfiscal.inf.br/nfe}dhEmi',
            './/dhEmi',  # Sem namespace
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
        print(f"  AVISO: Erro ao extrair data do XML: {e}")
        return None, None


def baixar_xml(chave_acesso: str) -> Tuple[Optional[str], bool]:
    """
    Baixa o XML para uma chave de acesso
    
    Args:
        chave_acesso: Chave de acesso da NFe (44 dígitos)
        
    Returns:
        Tupla (conteúdo_xml, válido) onde:
        - conteúdo_xml: String com o XML ou None em caso de erro
        - válido: True se o XML é válido, False caso contrário
    """
    try:
        response = requests.post(API_URL, headers=HEADERS, data=chave_acesso, timeout=30)
        
        if response.status_code == 200:
            # A resposta vem como JSON string contendo o XML
            xml_content = response.text.strip()
            
            # Remover aspas se vier como string JSON
            if xml_content.startswith('"') and xml_content.endswith('"'):
                xml_content = json.loads(xml_content)
            
            # Validar XML
            if validar_xml(xml_content):
                return xml_content, True
            else:
                print(f"  AVISO: XML inválido para chave: {chave_acesso}")
                return xml_content, False
        else:
            print(f"  ERRO HTTP {response.status_code} para chave: {chave_acesso}")
            if response.status_code == 401:
                print(f"  DICA: Verifique se a API key está correta")
            return None, False
            
    except requests.exceptions.RequestException as e:
        print(f"  ERRO na requisição para chave {chave_acesso}: {e}")
        return None, False
    except Exception as e:
        print(f"  ERRO inesperado: {e}")
        return None, False


def identificar_coluna_chaves(df: pd.DataFrame) -> Optional[str]:
    """
    Identifica automaticamente a coluna que contém as chaves de acesso
    
    Args:
        df: DataFrame da planilha
        
    Returns:
        Nome da coluna ou None se não encontrada
    """
    # Primeiro, procura por nome da coluna
    for col in df.columns:
        col_lower = str(col).lower()
        if 'chave' in col_lower or 'acesso' in col_lower or 'nfe' in col_lower:
            # Verifica se os valores parecem chaves (44 dígitos)
            amostra = df[col].dropna().astype(str).str.strip().head(5)
            if len(amostra) > 0:
                primeira_valor = amostra.iloc[0]
                if primeira_valor.isdigit() and len(primeira_valor) == 44:
                    return col
    
    # Se não encontrou pelo nome, procura por padrão (44 dígitos)
    for col in df.columns:
        first_val = df[col].dropna().iloc[0] if not df[col].dropna().empty else None
        if first_val and str(first_val).isdigit() and len(str(first_val)) == 44:
            return col
    
    return None


def processar_planilha(caminho_planilha: str):
    """
    Lê a planilha e processa as chaves de acesso
    
    Args:
        caminho_planilha: Caminho para o arquivo Excel
    """
    print(f"\nLendo planilha: {caminho_planilha}")
    
    try:
        # Ler a planilha Excel
        df = pd.read_excel(caminho_planilha)
        
        print(f"\nColunas encontradas na planilha ({len(df.columns)} colunas):")
        for col in df.columns:
            print(f"  - {col}")
        
        # Identificar coluna com chaves
        chave_col = identificar_coluna_chaves(df)
        
        if chave_col is None:
            print("\nERRO: Não foi possível identificar a coluna com as chaves de acesso.")
            print("Por favor, informe o nome da coluna que contém as chaves.")
            coluna_manual = input("Nome da coluna: ").strip()
            if coluna_manual in df.columns:
                chave_col = coluna_manual
            else:
                print(f"ERRO: Coluna '{coluna_manual}' não encontrada na planilha.")
                return
        else:
            print(f"\nColuna identificada automaticamente: '{chave_col}'")
        
        # Extrair chaves únicas (remover nulos e duplicados)
        chaves = df[chave_col].dropna().astype(str).str.strip().unique()
        chaves = [ch for ch in chaves if ch.isdigit() and len(ch) == 44]
        
        print(f"\nTotal de chaves válidas encontradas: {len(chaves)}")
        
        if len(chaves) == 0:
            print("ERRO: Nenhuma chave válida encontrada na planilha.")
            return
        
        # Confirmação
        resposta = input(f"\nDeseja baixar {len(chaves)} XMLs? (s/n): ").strip().lower()
        if resposta != 's':
            print("Operação cancelada.")
            return
        
        # Processar cada chave
        sucesso = 0
        falhas = 0
        
        print(f"\n{'='*60}")
        print("Iniciando download dos XMLs...")
        print(f"{'='*60}\n")
        
        for idx, chave in enumerate(chaves, 1):
            print(f"[{idx}/{len(chaves)}] Processando chave: {chave}")
            
            xml_content, valido = baixar_xml(chave)
            
            if xml_content and valido:
                # Extrair ano e mês do XML
                ano, mes = extrair_data_xml(xml_content)
                
                # Determinar pasta de destino
                if ano and mes:
                    # Criar estrutura: xmls_baixados/2023/01/
                    pasta_ano_mes = os.path.join(PASTA_XMLS, str(ano), f"{mes:02d}")
                    os.makedirs(pasta_ano_mes, exist_ok=True)
                    caminho_xml = os.path.join(pasta_ano_mes, f"{chave}.xml")
                    info_data = f" ({ano}/{mes:02d})"
                else:
                    # Se não conseguir extrair data, salva na pasta raiz
                    caminho_xml = os.path.join(PASTA_XMLS, f"{chave}.xml")
                    info_data = " (data não identificada)"
                
                # Verificar se já existe
                if os.path.exists(caminho_xml):
                    print(f"  AVISO: Arquivo já existe, sobrescrevendo...")
                
                with open(caminho_xml, 'w', encoding='utf-8') as f:
                    f.write(xml_content)
                
                print(f"  OK - XML baixado e salvo{info_data}: {caminho_xml}")
                sucesso += 1
            else:
                falhas += 1
        
        # Resumo final
        print(f"\n{'='*60}")
        print("RESUMO FINAL")
        print(f"{'='*60}")
        print(f"  Sucesso: {sucesso}")
        print(f"  Falhas: {falhas}")
        print(f"  Total processado: {len(chaves)}")
        print(f"  XMLs organizados por ano/mês em: {os.path.abspath(PASTA_XMLS)}")
        
        # Listar estrutura de pastas criadas
        if os.path.exists(PASTA_XMLS):
            print(f"\n  Estrutura de pastas criada:")
            for root_dir, dirs, files in os.walk(PASTA_XMLS):
                nivel = root_dir.replace(PASTA_XMLS, '').strip(os.sep)
                if nivel:
                    nivel_parts = nivel.split(os.sep)
                    if len(nivel_parts) == 2:  # ano/mes
                        ano, mes = nivel_parts
                        num_xmls = len([f for f in files if f.endswith('.xml')])
                        if num_xmls > 0:
                            print(f"    {ano}/{mes}/ - {num_xmls} XML(s)")
        
        print(f"{'='*60}")
        
    except FileNotFoundError:
        print(f"ERRO: Arquivo '{caminho_planilha}' não encontrado.")
    except Exception as e:
        print(f"ERRO ao processar planilha: {e}")
        import traceback
        traceback.print_exc()


def main():
    """Função principal"""
    print("="*60)
    print("Sistema de Gerenciamento de XMLs - API SIEG")
    print("="*60)
    
    # Menu principal
    print("\nOpções disponíveis:")
    print("  [1] Baixar XMLs (por chave de acesso)")
    print("  [2] Enviar XMLs para o SIEG")
    print("  [q] Sair")
    
    escolha = input("\nEscolha uma opção (1/2/q): ").strip().lower()
    
    if escolha == '1':
        # Modo de download (código original)
        print("\n" + "="*60)
        print("Modo: Download de XMLs")
        print("="*60)
        planilha = selecionar_planilha()
        
        if planilha:
            processar_planilha(planilha)
        else:
            print("\nNenhuma planilha selecionada. Encerrando...")
    
    elif escolha == '2':
        # Modo de envio
        print("\n" + "="*60)
        print("Modo: Envio de XMLs")
        print("="*60)
        try:
            from enviar_xmls_sieg import processar_envio_xmls
            processar_envio_xmls()
        except ImportError as e:
            print(f"\nERRO: Não foi possível importar o módulo de envio: {e}")
            print("Certifique-se de que o arquivo 'enviar_xmls_sieg.py' está no mesmo diretório.")
        except Exception as e:
            print(f"\nERRO inesperado: {e}")
            import traceback
            traceback.print_exc()
    
    elif escolha == 'q':
        print("\nEncerrando...")
    else:
        print("\nOpção inválida. Encerrando...")


if __name__ == "__main__":
    main()

