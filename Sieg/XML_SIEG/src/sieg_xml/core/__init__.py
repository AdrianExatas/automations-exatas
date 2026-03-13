"""
Módulo core com funcionalidades principais de parsing e processamento de XML
"""

from .xml_parser import (
    validar_xml,
    extrair_chave_acesso,
    extrair_data_xml,
    identificar_tipo_xml
)

__all__ = [
    'validar_xml',
    'extrair_chave_acesso',
    'extrair_data_xml',
    'identificar_tipo_xml'
]
