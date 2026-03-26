"""
Utilitários para operações com planilhas Excel
"""
import pandas as pd
import os
import re
from typing import Optional, List


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


def ler_arquivo_txt_chaves(caminho_arquivo: str) -> List[str]:
    """
    Lê um arquivo de texto e extrai chaves de acesso (44 dígitos)
    
    Args:
        caminho_arquivo: Caminho para o arquivo de texto
        
    Returns:
        Lista de chaves válidas (44 dígitos)
    """
    # Codificações comuns para arquivos brasileiros
    codificacoes = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252', 'windows-1252']
    
    print(f"Lendo arquivo de texto: {caminho_arquivo}")
    print(f"Tentando codificações: {', '.join(codificacoes)}")
    print(f"[DEBUG] Versão atualizada da função ler_arquivo_txt_chaves")
    
    for encoding in codificacoes:
        print(f"   Tentando codificação: {encoding}")
        try:
            with open(caminho_arquivo, 'r', encoding=encoding) as f:
                conteudo = f.read()
            
            # Procurar por padrões de 44 dígitos no conteúdo
            # Pode estar em linhas separadas ou dentro do texto
            padrao_chave = r'\b\d{44}\b'
            chaves_encontradas = re.findall(padrao_chave, conteudo)
            
            # Remover duplicatas e validar
            chaves_unicas = list(set(chaves_encontradas))
            chaves_validas = [ch for ch in chaves_unicas if ch.isdigit() and len(ch) == 44]
            
            if chaves_validas:
                print(f"   Codificação usada: {encoding}")
                print(f"   Chaves encontradas: {len(chaves_validas)}")
                return chaves_validas
            
            # Tentar ler linha por linha (caso as chaves estejam uma por linha)
            with open(caminho_arquivo, 'r', encoding=encoding) as f:
                linhas = f.readlines()
            
            chaves_linhas = []
            for linha in linhas:
                linha = linha.strip()
                # Verificar se a linha inteira é uma chave válida
                if linha.isdigit() and len(linha) == 44:
                    chaves_linhas.append(linha)
                # Ou procurar chaves dentro da linha
                else:
                    chaves_na_linha = re.findall(padrao_chave, linha)
                    chaves_linhas.extend(chaves_na_linha)
            
            chaves_unicas = list(set(chaves_linhas))
            chaves_validas = [ch for ch in chaves_unicas if ch.isdigit() and len(ch) == 44]
            
            if chaves_validas:
                print(f"   Codificação usada: {encoding}")
                print(f"   Chaves encontradas: {len(chaves_validas)}")
                return chaves_validas
                    
        except UnicodeDecodeError as e:
            # Tentar próxima codificação se esta falhar
            print(f"   Tentando próxima codificação ({encoding} falhou: {e})")
            continue
        except Exception as e:
            # Outros erros também devem tentar próxima codificação
            print(f"   Erro com codificação {encoding}: {e}")
            continue
    
    print("ERRO: Nenhuma chave válida encontrada no arquivo .txt.")
    print("Certifique-se de que o arquivo contém uma chave de acesso (44 dígitos) por linha.")
    return []


def ler_planilha_chaves(caminho_planilha: str, coluna_chaves: Optional[str] = None) -> List[str]:
    """
    Lê uma planilha Excel ou arquivo de texto e extrai as chaves de acesso
    
    Args:
        caminho_planilha: Caminho para o arquivo Excel ou .txt
        coluna_chaves: Nome da coluna com chaves (None para auto-detectar, apenas para Excel)
        
    Returns:
        Lista de chaves válidas (44 dígitos)
    """
    # Verificar se é arquivo de texto
    extensao = os.path.splitext(caminho_planilha)[1].lower()
    if extensao in ['.txt', '.csv']:
        return ler_arquivo_txt_chaves(caminho_planilha)
    
    # Caso contrário, tratar como Excel
    try:
        df = pd.read_excel(caminho_planilha)
        
        # Identificar coluna se não fornecida
        if coluna_chaves is None:
            coluna_chaves = identificar_coluna_chaves(df)
        
        if coluna_chaves is None or coluna_chaves not in df.columns:
            return []
        
        # Extrair chaves únicas (remover nulos e duplicados)
        chaves = df[coluna_chaves].dropna().astype(str).str.strip().unique()
        chaves = [ch for ch in chaves if ch.isdigit() and len(ch) == 44]
        
        return chaves
        
    except Exception:
        return []
