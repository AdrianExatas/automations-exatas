"""
Configurações centralizadas do sistema
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis de ambiente
try:
    load_dotenv()
except Exception:
    pass  # Ignorar se não houver .env

# URLs da API SIEG
API_URL_BASE = 'https://up.sieg.com/EnviarXml'
# Base para download/verificação (xmlType é acrescentado conforme o tipo do documento)
API_URL_BAIXAR_BASE = 'https://api.sieg.com/BaixarXml'
# Fallback para compatibilidade: URL com xmlType=1 (NFe)
API_URL_BAIXAR = 'https://api.sieg.com/BaixarXml?xmlType=1'
API_URL_VERIFICAR = 'https://api.sieg.com/BaixarXml?xmlType=1'

# Valores de xmlType aceitos pela API SIEG BaixarXml (confirmar no Swagger)
# 55 = NF-e, 57 = CT-e (posições 21-22 da chave de 44 dígitos)
XML_TYPE_NFE = 1
XML_TYPE_CTE = 2  # placeholder até confirmar na documentação oficial da API SIEG

# Mapeamento modelo (posições 21-22 da chave) -> xmlType
_MODELO_TO_XML_TYPE = {
    55: XML_TYPE_NFE,   # NF-e
    57: XML_TYPE_CTE,   # CT-e
}


def inferir_tipo_documento_chave(chave_acesso: str):
    """
    Infere o tipo de documento (NFe ou CTe) a partir da chave de acesso de 44 dígitos.
    Posições 21-22 = modelo: 55 = NF-e, 57 = CT-e.

    Args:
        chave_acesso: Chave de 44 dígitos numéricos.

    Returns:
        'NFe' ou 'CTe' se suportado; None se modelo não suportado para download.
    """
    if not chave_acesso or len(chave_acesso) != 44 or not chave_acesso.isdigit():
        return None
    try:
        modelo = int(chave_acesso[20:22])
    except (ValueError, IndexError):
        return None
    if modelo == 55:
        return 'NFe'
    if modelo == 57:
        return 'CTe'
    return None


def xml_type_from_chave(chave_acesso: str):
    """
    Retorna o valor de xmlType para a API BaixarXml a partir da chave de acesso.
    Se o modelo não for suportado, retorna XML_TYPE_NFE como fallback (comportamento anterior).

    Args:
        chave_acesso: Chave de 44 dígitos.

    Returns:
        int: valor de xmlType (1 = NFe, 2 = CTe, etc.)
    """
    if not chave_acesso or len(chave_acesso) != 44 or not chave_acesso.isdigit():
        return XML_TYPE_NFE
    try:
        modelo = int(chave_acesso[20:22])
        return _MODELO_TO_XML_TYPE.get(modelo, XML_TYPE_NFE)
    except (ValueError, IndexError):
        return XML_TYPE_NFE

# API Key (do .env ou valor padrão)
SIEG_API_KEY = os.getenv('SIEG_API_KEY', 'oecN20qEJJ0D8l6IFq7Nvg==')

# Pastas padrão
PASTA_XMLS_BAIXADOS = 'xmls_baixados'
PASTA_PADRAO_XMLS = os.getenv('PASTA_PADRAO_XMLS', r'C:\Users\Exatas\Downloads\XML SEFAZ')

# Configurações de processamento paralelo
NUM_THREADS_PADRAO = 20
NUM_THREADS_VERIFICACAO = 20

# Configurações de warm-up (aquecimento gradual)
WARM_UP_FASE1_QTD = 5
WARM_UP_FASE1_THREADS = 1
WARM_UP_FASE2_QTD = 15
WARM_UP_FASE2_THREADS = 5
WARM_UP_FASE3_QTD = 30
WARM_UP_FASE3_THREADS = 10
WARM_UP_DELAY = 0.2  # segundos

# Configurações de retry
RETRY_MAX_TENTATIVAS = 3
RETRY_ERROS_RECUPERAVEIS = [500, 502, 503, 504, 429]

# Rate limit
RATE_LIMIT_MAX = 2000  # Requisições por minuto
RATE_LIMIT_WINDOW = 60  # Janela de tempo em segundos

# Headers padrão para requisições
HEADERS = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
}

# Criar pasta de XMLs baixados se não existir
os.makedirs(PASTA_XMLS_BAIXADOS, exist_ok=True)
