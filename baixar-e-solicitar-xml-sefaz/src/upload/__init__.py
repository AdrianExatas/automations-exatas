"""
Modulo de upload de XMLs para o SIEG.
"""
from src.upload.sieg_api import enviar_xml, verificar_xml_existe
from src.upload.uploader import enviar_automatico
from src.upload.utils import extrair_chave_acesso, identificar_tipo_xml, validar_xml

__all__ = [
    "enviar_automatico",
    "enviar_xml",
    "verificar_xml_existe",
    "validar_xml",
    "extrair_chave_acesso",
    "identificar_tipo_xml",
]
