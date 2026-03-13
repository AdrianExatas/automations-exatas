"""
Módulo de integração com a API SIEG
"""

from .client import SiegAPIClient
from .endpoints import APIEndpoints

__all__ = ['SiegAPIClient', 'APIEndpoints']
