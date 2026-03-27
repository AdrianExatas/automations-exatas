"""
Utilitarios compartilhados do sistema SEFAZ.
"""
from .logger import configurar_logging
from .retry import retry_com_backoff

__all__ = [
    "configurar_logging",
    "retry_com_backoff",
]
