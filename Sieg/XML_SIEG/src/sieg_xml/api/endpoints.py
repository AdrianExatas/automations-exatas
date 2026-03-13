"""
Definições de endpoints da API SIEG
"""
import urllib.parse
from typing import Optional

from ..config import (
    API_URL_BASE,
    API_URL_BAIXAR_BASE,
    SIEG_API_KEY,
    XML_TYPE_NFE,
    xml_type_from_chave,
)


class APIEndpoints:
    """Gerencia URLs dos endpoints da API"""

    @staticmethod
    def get_upload_url(api_key: str = None) -> str:
        """Retorna URL completa para upload de XML"""
        if api_key is None:
            api_key = SIEG_API_KEY
        return f"{API_URL_BASE}?api_key={urllib.parse.quote(api_key)}"

    @staticmethod
    def get_download_url(api_key: str = None, xml_type: Optional[int] = None, chave_acesso: Optional[str] = None) -> str:
        """
        Retorna URL completa para download de XML.

        Args:
            api_key: Chave da API SIEG.
            xml_type: Valor de xmlType (1=NFe, 2=CTe). Se None, usa chave_acesso para inferir.
            chave_acesso: Chave de 44 dígitos; usada para inferir xmlType se xml_type não for passado.
        """
        if api_key is None:
            api_key = SIEG_API_KEY
        if xml_type is None and chave_acesso:
            xml_type = xml_type_from_chave(chave_acesso)
        if xml_type is None:
            xml_type = XML_TYPE_NFE
        return f"{API_URL_BAIXAR_BASE}?xmlType={xml_type}&api_key={urllib.parse.quote(api_key)}"

    @staticmethod
    def get_verify_url(api_key: str = None, xml_type: Optional[int] = None, chave_acesso: Optional[str] = None) -> str:
        """
        Retorna URL completa para verificação de XML.

        Args:
            api_key: Chave da API SIEG.
            xml_type: Valor de xmlType (1=NFe, 2=CTe). Se None, usa chave_acesso para inferir.
            chave_acesso: Chave de 44 dígitos; usada para inferir xmlType se xml_type não for passado.
        """
        if api_key is None:
            api_key = SIEG_API_KEY
        if xml_type is None and chave_acesso:
            xml_type = xml_type_from_chave(chave_acesso)
        if xml_type is None:
            xml_type = XML_TYPE_NFE
        return f"{API_URL_BAIXAR_BASE}?xmlType={xml_type}&api_key={urllib.parse.quote(api_key)}"
