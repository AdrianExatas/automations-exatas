"""
Cliente HTTP da SEFAZ.
"""

from .client import SefazHttpClient, SefazHttpError, SefazSessionExpiredError, SolicitacaoResultado
from .parser import DownloadInfo, DownloadListingPage, HtmlForm

__all__ = [
    "DownloadInfo",
    "DownloadListingPage",
    "HtmlForm",
    "SefazHttpClient",
    "SefazHttpError",
    "SefazSessionExpiredError",
    "SolicitacaoResultado",
]
