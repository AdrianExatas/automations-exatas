"""
Módulos centrais compartilhados do sistema SEFAZ
"""
from .constants import Timeouts, FileConfig, RetryConfig, CapturaContinuaConfig
from .browser import SefazBrowser

__all__ = [
    'Timeouts',
    'FileConfig', 
    'RetryConfig',
    'CapturaContinuaConfig',
    'SefazBrowser'
]
