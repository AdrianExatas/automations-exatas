"""
Utilitários para operações com arquivos
"""
import os
from typing import List
from pathlib import Path


def buscar_xmls_recursivo(pasta: str) -> List[str]:
    """
    Busca todos os arquivos XML em uma pasta e subpastas
    
    Args:
        pasta: Caminho da pasta raiz
        
    Returns:
        Lista de caminhos completos dos arquivos XML encontrados
    """
    xmls_encontrados = []
    if not os.path.exists(pasta):
        return xmls_encontrados
    
    for root_dir, dirs, files in os.walk(pasta):
        for arquivo in files:
            if arquivo.lower().endswith('.xml'):
                caminho_completo = os.path.join(root_dir, arquivo)
                xmls_encontrados.append(caminho_completo)
    
    return xmls_encontrados
