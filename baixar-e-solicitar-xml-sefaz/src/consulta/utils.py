"""
Módulo de utilitários para o sistema de consulta SEFAZ
Contém funções auxiliares reutilizáveis
"""
import pandas as pd
from datetime import datetime


def formatar_data(data):
    """
    Formata uma data para o padrão DD/MM/YYYY
    
    Args:
        data: Data em diversos formatos possíveis
        
    Returns:
        str: Data formatada como DD/MM/YYYY ou None se inválida
    """
    try:
        if isinstance(data, pd.Timestamp):
            return data.strftime("%d/%m/%Y")
        data_obj = pd.to_datetime(data, format="%d/%m/%Y", errors='coerce', dayfirst=True)
        if pd.isna(data_obj):
            raise ValueError("Data inválida")
        return data_obj.strftime("%d/%m/%Y")
    except Exception as e:
        print(f"[ERRO] Erro ao converter data: {data} -> {e}")
        return None


def formatar_data_segura(data_val):
    """
    Formata data de forma segura, retornando string vazia em caso de erro
    
    Args:
        data_val: Valor da data a ser formatado
        
    Returns:
        str: Data formatada ou string vazia
    """
    try:
        if pd.isna(data_val) or data_val == "":
            return ""
        if isinstance(data_val, pd.Timestamp):
            return data_val.strftime("%d/%m/%Y")
        data = pd.to_datetime(data_val, format="%d/%m/%Y", errors="coerce")
        if pd.isna(data):
            return ""
        return data.strftime("%d/%m/%Y")
    except Exception:
        return ""


def preparar_parametros(row):
    """
    Prepara os parâmetros de uma linha da planilha para consulta
    
    Args:
        row: Linha do DataFrame com os dados da empresa
        
    Returns:
        dict: Dicionário com os parâmetros formatados
    """
    return {
        "inscricao_municipal": str(row["Inscrição Municipal"]).strip(),
        "tipo_arquivo": str(row["Tipo de Arquivo"]).upper().strip(),
        "pesquisar_por": str(row["Pesquisar Por"]).capitalize().strip(),
        "data_inicial": formatar_data_segura(row["Data Inicial"]),
        "data_final": formatar_data_segura(row["Data Final"])
    }


def timestamp():
    """Retorna timestamp formatado para logs"""
    return datetime.now().strftime("[%H:%M:%S]")
