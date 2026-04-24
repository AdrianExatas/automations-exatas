"""Definicoes de endpoints da API SIEG."""

from __future__ import annotations

import urllib.parse
from typing import Optional

from ..config import API_URL_BAIXAR_BASE, API_URL_BASE, XML_TYPE_NFE, get_sieg_api_key, xml_type_from_chave


class APIEndpoints:
    """Monta URLs completas dos endpoints."""

    @staticmethod
    def get_upload_url(api_key: str | None = None) -> str:
        key = get_sieg_api_key(api_key)
        return f"{API_URL_BASE}?api_key={urllib.parse.quote(key)}"

    @staticmethod
    def get_download_url(api_key: str | None = None, xml_type: Optional[int] = None, chave_acesso: Optional[str] = None) -> str:
        key = get_sieg_api_key(api_key)
        if xml_type is None and chave_acesso:
            xml_type = xml_type_from_chave(chave_acesso)
        if xml_type is None:
            xml_type = XML_TYPE_NFE
        return f"{API_URL_BAIXAR_BASE}?xmlType={xml_type}&api_key={urllib.parse.quote(key)}"

    @staticmethod
    def get_verify_url(api_key: str | None = None, xml_type: Optional[int] = None, chave_acesso: Optional[str] = None) -> str:
        return APIEndpoints.get_download_url(api_key=api_key, xml_type=xml_type, chave_acesso=chave_acesso)
