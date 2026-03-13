"""
Módulo para extração de chaves de XML de planilhas Excel e arquivos de texto
"""
import re
import pandas as pd
from typing import List
import traceback
from pathlib import Path


def extrair_chaves_xml(texto: str) -> List[str]:
    """
    Extrai chaves de XML de um texto.
    A chave é um número de 44 dígitos.
    
    Args:
        texto: Texto onde buscar as chaves
        
    Returns:
        Lista de chaves encontradas
    """
    if not texto or pd.isna(texto):
        return []
    
    texto_str = str(texto).strip()
    
    # Remove espaços e caracteres especiais que podem interferir
    texto_str = texto_str.replace(' ', '').replace('-', '').replace('.', '')
    
    # Padrão para chave de XML: 44 dígitos consecutivos
    # Usa lookahead/lookbehind para garantir que não há mais dígitos adjacentes
    padrao = r'(?<!\d)\d{44}(?!\d)'
    chaves = re.findall(padrao, texto_str)
    
    # Validação adicional: garante que são exatamente 44 dígitos
    chaves_validas = [chave for chave in chaves if chave.isdigit() and len(chave) == 44]
    
    return chaves_validas


def _converter_valor_para_texto(valor) -> str:
    """
    Converte um valor para texto, tratando casos especiais como notação científica.
    
    IMPORTANTE: Números de 44 dígitos não podem ser representados com precisão como float.
    Esta função tenta recuperar o valor original quando possível.
    
    Args:
        valor: Valor a ser convertido
        
    Returns:
        String representando o valor
    """
    if pd.isna(valor) or valor == 'nan' or str(valor).strip().lower() == 'nan':
        return ""
    
    # Converte para string primeiro
    valor_str = str(valor).strip()
    
    # Se já é string e está vazia, retorna
    if not valor_str:
        return ""
    
    # Se for numérico, pode estar em notação científica ou ter perdido precisão
    if isinstance(valor, (int, float)):
        if isinstance(valor, float):
            # Verifica se está em notação científica na string
            if 'e' in valor_str.lower() or 'E' in valor_str.lower():
                # Está em notação científica - números grandes perderam precisão
                # Não podemos recuperar o valor original, então retornamos vazio
                # para evitar falsos positivos
                return ""
            elif valor.is_integer():
                # É um float que representa um inteiro
                try:
                    valor_str = str(int(valor))
                except (ValueError, OverflowError):
                    # Se falhar, verifica se o número é muito grande (perdeu precisão)
                    # Números de 44 dígitos não podem ser representados como float
                    if len(valor_str.replace('.', '').replace('-', '')) > 15:
                        # Provavelmente perdeu precisão, retorna vazio
                        return ""
                    valor_str = str(valor)
            else:
                # Tem decimais, não é uma chave válida
                return ""
        else:
            # É int, converte diretamente
            valor_str = str(valor)
    
    return valor_str


def processar_arquivo_texto(caminho_arquivo: str) -> List[str]:
    """
    Processa um arquivo de texto e extrai todas as chaves de XML encontradas.
    Suporta arquivos com uma chave por linha ou chaves em qualquer lugar do texto.
    
    Args:
        caminho_arquivo: Caminho para o arquivo de texto
        
    Returns:
        Lista de chaves únicas encontradas
    """
    print(f"Processando arquivo de texto: {caminho_arquivo}")
    chaves_encontradas = []
    
    try:
        # Codificações comuns em arquivos brasileiros (cp1252/latin-1 antes de utf-8)
        encodings = ['cp1252', 'latin-1', 'iso-8859-1', 'utf-8']
        conteudo = None
        encoding_usado = None
        
        for encoding in encodings:
            try:
                with open(caminho_arquivo, 'r', encoding=encoding) as f:
                    conteudo = f.read()
                encoding_usado = encoding
                break
            except UnicodeDecodeError:
                continue
        
        if conteudo is None:
            # Último recurso: ler com errors='replace' para não falhar
            try:
                with open(caminho_arquivo, 'r', encoding='utf-8', errors='replace') as f:
                    conteudo = f.read()
                encoding_usado = 'utf-8 (substituindo erros)'
            except Exception as e:
                print(f"  Erro: Não foi possível ler o arquivo: {e}")
                return []
        
        if encoding_usado:
            print(f"  Codificação usada: {encoding_usado}")
        
        # Processa o conteúdo completo primeiro (como o JavaScript faz)
        # Isso garante que chaves sejam encontradas mesmo se estiverem em linhas diferentes
        # ou com caracteres especiais ao redor
        chaves = extrair_chaves_xml(conteudo)
        chaves_encontradas.extend(chaves)
        
        # Conta linhas para estatísticas
        linhas_processadas = len(conteudo.splitlines())
        
        # Remove duplicatas mantendo a ordem
        chaves_unicas = []
        for chave in chaves_encontradas:
            # Validação final: garante que é uma chave válida de 44 dígitos
            if chave.isdigit() and len(chave) == 44 and chave not in chaves_unicas:
                chaves_unicas.append(chave)
        
        print(f"  Linhas processadas: {linhas_processadas}")
        print(f"  Encontradas {len(chaves_unicas)} chaves únicas")
        
        return chaves_unicas
        
    except Exception as e:
        print(f"  Erro ao processar arquivo de texto {caminho_arquivo}: {e}")
        print(f"  Detalhes do erro:")
        traceback.print_exc()
        return []


def processar_planilha(caminho_arquivo: str) -> List[str]:
    """
    Processa uma planilha Excel e extrai todas as chaves de XML encontradas.
    
    Args:
        caminho_arquivo: Caminho para o arquivo Excel
        
    Returns:
        Lista de chaves únicas encontradas
    """
    print(f"Processando: {caminho_arquivo}")
    chaves_encontradas = []
    
    try:
        # Tenta ler a planilha de diferentes formas para garantir compatibilidade
        df = None
        
        # Método 1: Tentar ler como string diretamente (IMPORTANTE para números grandes)
        # Isso evita que números de 44 dígitos sejam convertidos para float e percam precisão
        try:
            df = pd.read_excel(caminho_arquivo, header=None, dtype=str, engine='openpyxl')
        except Exception as e1:
            # Método 2: Tentar sem especificar dtype, mas converter tudo para string depois
            try:
                df = pd.read_excel(caminho_arquivo, header=None, engine='openpyxl')
                # Converte todas as colunas para string para evitar perda de precisão
                for col in df.columns:
                    df[col] = df[col].astype(str)
            except Exception as e2:
                # Método 3: Tentar com engine xlrd para arquivos .xls antigos
                try:
                    df = pd.read_excel(caminho_arquivo, header=None, engine='xlrd')
                    # Converte todas as colunas para string
                    for col in df.columns:
                        df[col] = df[col].astype(str)
                except Exception as e3:
                    print(f"  Erro ao ler planilha:")
                    print(f"    Tentativa 1 (openpyxl + dtype=str): {e1}")
                    print(f"    Tentativa 2 (openpyxl): {e2}")
                    print(f"    Tentativa 3 (xlrd): {e3}")
                    raise
        
        if df is None or df.empty:
            print(f"  Aviso: Planilha vazia ou não pôde ser lida")
            return []
        
        # Itera por todas as células da planilha
        total_celulas = 0
        celulas_com_chaves = 0
        
        for coluna in df.columns:
            for valor in df[coluna]:
                total_celulas += 1
                if pd.notna(valor):
                    # Converte valor para texto tratando casos especiais
                    valor_texto = _converter_valor_para_texto(valor)
                    
                    if valor_texto:
                        chaves = extrair_chaves_xml(valor_texto)
                        if chaves:
                            celulas_com_chaves += 1
                            chaves_encontradas.extend(chaves)
        
        # Remove duplicatas mantendo a ordem
        chaves_unicas = []
        for chave in chaves_encontradas:
            # Validação final: garante que é uma chave válida de 44 dígitos
            if chave.isdigit() and len(chave) == 44 and chave not in chaves_unicas:
                chaves_unicas.append(chave)
        
        print(f"  Células processadas: {total_celulas}")
        print(f"  Células com chaves: {celulas_com_chaves}")
        print(f"  Encontradas {len(chaves_unicas)} chaves únicas")
        
        return chaves_unicas
        
    except Exception as e:
        print(f"  Erro ao processar {caminho_arquivo}: {e}")
        print(f"  Detalhes do erro:")
        traceback.print_exc()
        return []


def processar_arquivo(caminho_arquivo: str) -> List[str]:
    """
    Processa um arquivo (Excel ou texto) e extrai todas as chaves de XML encontradas.
    Detecta automaticamente o tipo de arquivo e chama a função apropriada.
    
    Args:
        caminho_arquivo: Caminho para o arquivo (Excel ou texto)
        
    Returns:
        Lista de chaves únicas encontradas
    """
    caminho = Path(caminho_arquivo) if not isinstance(caminho_arquivo, Path) else caminho_arquivo
    extensao = caminho.suffix.lower()
    
    if extensao in ['.txt', '.text', '.csv']:
        return processar_arquivo_texto(str(caminho))
    elif extensao in ['.xlsx', '.xls']:
        return processar_planilha(str(caminho))
    else:
        # Tenta como texto primeiro, depois como Excel
        print(f"  Extensão desconhecida ({extensao}), tentando como arquivo de texto...")
        chaves = processar_arquivo_texto(str(caminho))
        if not chaves:
            print(f"  Nenhuma chave encontrada como texto, tentando como planilha Excel...")
            chaves = processar_planilha(str(caminho))
        return chaves
