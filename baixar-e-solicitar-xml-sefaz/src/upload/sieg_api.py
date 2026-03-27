"""
Funções de API para comunicação com o SIEG
"""
import json
import time
import base64
import urllib.parse
from typing import Optional, Tuple
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from src.core.config import SIEG_API_KEY


# Configurações da API
API_URL_BASE = 'https://up.sieg.com/EnviarXml'
API_URL_VERIFICAR = 'https://api.sieg.com/BaixarXml?xmlType=1'

# Configurações de retry
RETRY_MAX_TENTATIVAS = 5  # Aumentado de 3 para 5
RETRY_ERROS_RECUPERAVEIS = [500, 502, 503, 504, 429]

# Configurações de timeout
TIMEOUT_ENVIO = 60  # Aumentado de 30s para 60s
TIMEOUT_VERIFICACAO = 15  # Aumentado de 10s para 15s

# Sessão HTTP global para reutilizar conexões (melhora performance e reduz timeouts)
_session: Optional[requests.Session] = None


def _get_session() -> requests.Session:
    """
    Retorna uma sessão HTTP configurada para reutilização de conexões.
    Usar sessão reduz timeouts pois mantém conexões TCP abertas.
    """
    global _session
    if _session is None:
        _session = requests.Session()
        
        # Configura retry automático para erros de conexão
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["POST"]
        )
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=20,
            pool_maxsize=20
        )
        _session.mount("https://", adapter)
        _session.mount("http://", adapter)
        
        # Headers padrão
        _session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
    return _session


def verificar_xml_existe(chave_acesso: str, api_key: Optional[str] = None) -> bool:
    """
    Verifica se um XML já existe no SIEG usando a chave de acesso
    
    Args:
        chave_acesso: Chave de acesso do XML (44 dígitos)
        api_key_verificar: API Key para verificação (usa a mesma do envio se None)
        
    Returns:
        True se o XML já existe, False caso contrário
    """
    if not chave_acesso or len(chave_acesso) != 44:
        return False
    
    try:
        # Usar a API key do config se não fornecida
        if not api_key:
            api_key = SIEG_API_KEY
        
        if not api_key:
            return False
        
        # Construir URL de verificação
        url_verificar = f"{API_URL_VERIFICAR}&api_key={urllib.parse.quote(api_key)}"
        
        # Usar sessão para reutilizar conexões
        session = _get_session()
        
        # Tentar baixar o XML
        response = session.post(
            url_verificar,
            data=chave_acesso,
            timeout=TIMEOUT_VERIFICACAO
        )
        
        # Se retornou 200, o XML existe
        if response.status_code == 200:
            return True
        # Se retornou 404 ou outro erro, provavelmente não existe
        return False
        
    except Exception:
        # Em caso de erro na verificação, assumir que não existe para não bloquear o envio
        return False


def enviar_xml(
    xml_content: str,
    api_key: Optional[str] = None,
    retry_count: int = RETRY_MAX_TENTATIVAS,
    silencioso: bool = False
) -> Tuple[bool, Optional[str], bool]:
    """
    Envia um XML para a API SIEG com retry inteligente
    
    Args:
        xml_content: Conteúdo do XML como string
        api_key: API Key para autenticação (usa do config se None)
        retry_count: Número de tentativas em caso de erro recuperável
        silencioso: Se True, não imprime mensagens de retry
        
    Returns:
        Tupla (sucesso, mensagem, erro_recuperavel) onde:
        - sucesso: True se enviado com sucesso
        - mensagem: Mensagem de erro ou sucesso
        - erro_recuperavel: True se o erro pode ser retentado
    """
    # Usar a API key do config se não fornecida
    if not api_key:
        api_key = SIEG_API_KEY
    
    if not api_key:
        return False, "API Key não configurada", False
    
    url_completa = f"{API_URL_BASE}?api_key={urllib.parse.quote(api_key)}"
    xml_base64 = base64.b64encode(xml_content.encode('utf-8')).decode('utf-8')
    payload = {"Xml": xml_base64}
    
    # Usar sessão para reutilizar conexões TCP (reduz timeouts)
    session = _get_session()
    
    ultimo_erro = ""
    ultimo_codigo = 0
    
    for tentativa in range(retry_count):
        try:
            response = session.post(
                url_completa,
                json=payload,
                timeout=TIMEOUT_ENVIO
            )
            
            ultimo_codigo = response.status_code
            
            if response.status_code == 200:
                try:
                    resposta_json = response.json()
                    return True, f"Enviado: {json.dumps(resposta_json, ensure_ascii=False)}", False
                except:
                    return True, "Enviado com sucesso", False
            
            # Erros recuperáveis - tentar novamente com backoff
            elif response.status_code in RETRY_ERROS_RECUPERAVEIS:
                wait_time = (2 ** tentativa) + (tentativa * 0.5)
                if tentativa < retry_count - 1:
                    if not silencioso:
                        print(f"    ⟳ Erro {response.status_code}, retry em {wait_time:.1f}s...")
                    time.sleep(wait_time)
                    continue
                else:
                    try:
                        error_data = response.json()
                        ultimo_erro = error_data.get('Message', error_data.get('message', response.text))
                    except:
                        ultimo_erro = response.text
                    return False, f"Erro HTTP {response.status_code}: {ultimo_erro}", True
            
            # Erros permanentes - não tentar novamente
            elif response.status_code == 401:
                return False, "Erro de autenticação. Verifique a API Key", False
            elif response.status_code == 404:
                return False, "Endpoint não encontrado (404)", False
            elif response.status_code == 400:
                try:
                    error_data = response.json()
                    ultimo_erro = error_data.get('message', error_data.get('error', response.text))
                except:
                    ultimo_erro = response.text
                return False, f"Erro na requisição: {ultimo_erro}", False
            else:
                try:
                    error_data = response.json()
                    ultimo_erro = error_data.get('message', error_data.get('error', response.text))
                except:
                    ultimo_erro = response.text
                return False, f"Erro HTTP {response.status_code}: {ultimo_erro}", False
                
        except requests.exceptions.Timeout:
            if tentativa < retry_count - 1:
                wait_time = (2 ** tentativa) + 2  # Backoff maior para timeout
                if not silencioso:
                    print(f"    ⟳ Timeout, retry em {wait_time:.1f}s...")
                time.sleep(wait_time)
                continue
            return False, "Timeout na requisição", True
        except requests.exceptions.RequestException as e:
            ultimo_erro = str(e)
            if tentativa < retry_count - 1:
                wait_time = (2 ** tentativa) + 1
                time.sleep(wait_time)
                continue
            return False, f"Erro na requisição: {ultimo_erro}", True
        except Exception as e:
            return False, f"Erro inesperado: {str(e)}", False
    
    return False, f"Falha após {retry_count} tentativas (último código: {ultimo_codigo})", True
