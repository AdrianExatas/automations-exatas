"""
Cliente para integração com a API SIEG
"""
import requests
import json
import base64
import time
import urllib.parse
from typing import Optional, Tuple

from ..config import (
    RETRY_MAX_TENTATIVAS,
    RETRY_ERROS_RECUPERAVEIS,
    HEADERS,
    SIEG_API_KEY,
    inferir_tipo_documento_chave,
)
from .endpoints import APIEndpoints


class SiegAPIClient:
    """Cliente para operações com a API SIEG"""
    
    def __init__(self, api_key: str = None):
        """
        Inicializa o cliente da API
        
        Args:
            api_key: Chave da API (usa a padrão se None)
        """
        self.api_key = api_key or SIEG_API_KEY
        self.endpoints = APIEndpoints()
    
    def download_xml(
        self, 
        chave_acesso: str, 
        timeout: int = 30, 
        retry_count: int = 3,
        retry_delay: int = 2
    ) -> Tuple[Optional[str], bool, Optional[str]]:
        """
        Baixa o XML para uma chave de acesso
        
        Args:
            chave_acesso: Chave de acesso da NFe (44 dígitos)
            timeout: Timeout da requisição em segundos
            retry_count: Número de tentativas em caso de erro 400 (pode ser delay de processamento)
            retry_delay: Delay entre tentativas em segundos
            
        Returns:
            Tupla (conteúdo_xml, válido, erro_detalhe) onde:
            - conteúdo_xml: String com o XML ou None em caso de erro
            - válido: True se o XML é válido, False caso contrário
            - erro_detalhe: Mensagem de erro (ex.: "HTTP 401: Unauthorized") ou None
        """
        if not chave_acesso or len(chave_acesso) != 44 or not chave_acesso.isdigit():
            return None, False, "Chave inválida (deve ter 44 dígitos numéricos)"
        tipo = inferir_tipo_documento_chave(chave_acesso)
        if tipo is None:
            try:
                modelo = int(chave_acesso[20:22])
            except (ValueError, IndexError):
                modelo = 0
            return None, False, f"Documento modelo {modelo} não suportado para download (suportados: NFe=55, CTe=57)"
        url = self.endpoints.get_download_url(self.api_key, chave_acesso=chave_acesso)
        # API SIEG /BaixarXml espera Content-Type application/json com a chave como string JSON pura
        download_headers = {
            'Content-Type': 'application/json',
            'Accept': 'text/xml, application/json, */*'
        }
        last_error: Optional[str] = None
        
        for tentativa in range(retry_count):
            try:
                response = requests.post(
                    url,
                    headers=download_headers,
                    data=json.dumps(chave_acesso),
                    timeout=timeout
                )
                
                if response.status_code == 200:
                    xml_content = response.text.strip()
                    # Resposta pode ser JSON (DownloadResponse com Codigo/Mensagens) ou XML direto
                    if xml_content.startswith('{'):
                        try:
                            d = response.json()
                            if d.get('error') or ('error' in xml_content.lower() and 'message' in d):
                                if tentativa < retry_count - 1:
                                    time.sleep(retry_delay)
                                    continue
                                last_error = str(d.get('message', d.get('error', response.text)))[:200]
                                return None, False, last_error
                            # Modelo DownloadResponse: Status, Codigo, Mensagens
                            xml_content = d.get('Codigo') or d.get('codigo') or (d.get('Mensagens') or [None])[0]
                            if not xml_content:
                                xml_content = ''
                            if isinstance(xml_content, list):
                                xml_content = xml_content[0] or ''
                        except (json.JSONDecodeError, TypeError):
                            if 'error' in xml_content.lower():
                                if tentativa < retry_count - 1:
                                    time.sleep(retry_delay)
                                    continue
                                last_error = response.text[:200]
                                return None, False, last_error
                            xml_content = response.text
                    if isinstance(xml_content, str) and xml_content.startswith('"') and xml_content.endswith('"'):
                        xml_content = json.loads(xml_content)
                    if not (xml_content and xml_content.strip().startswith('<')):
                        if tentativa < retry_count - 1:
                            time.sleep(retry_delay)
                            continue
                        last_error = "Resposta 200 mas conteúdo não é XML"
                        return None, False, last_error
                    return xml_content, True, None
                
                elif response.status_code == 400:
                    if tentativa < retry_count - 1:
                        time.sleep(retry_delay * (tentativa + 1))
                        continue
                    try:
                        d = response.json()
                        last_error = f"HTTP 400: {d.get('message', d.get('error', response.text))}"[:200]
                    except Exception:
                        last_error = f"HTTP 400: {response.text[:150]}" if response.text else "HTTP 400"
                    return None, False, last_error
                elif response.status_code in RETRY_ERROS_RECUPERAVEIS:
                    # 500, 502, 503, 504, 429: retry com backoff (servidor SIEG pode estar sobrecarregado)
                    if tentativa < retry_count - 1:
                        espera = retry_delay * (tentativa + 1)
                        time.sleep(espera)
                        continue
                    try:
                        d = response.json()
                        err = d.get('error', d)
                        if isinstance(err, dict):
                            last_error = f"HTTP {response.status_code}: {json.dumps(err)}"
                        else:
                            last_error = f"HTTP {response.status_code}: {d.get('message', response.text or str(err))}"
                        if len(last_error) > 400:
                            last_error = last_error[:400] + "..."
                    except Exception:
                        last_error = f"HTTP {response.status_code}: {(response.text or '')[:200]}"
                    return None, False, last_error
                else:
                    short = (response.text[:150] if response.text else "").replace("\n", " ")
                    if response.status_code == 401:
                        last_error = "HTTP 401: Não autorizado. Verifique SIEG_API_KEY no .env"
                    elif response.status_code == 403:
                        last_error = "HTTP 403: Acesso negado"
                    elif response.status_code == 404:
                        last_error = "HTTP 404: Endpoint não encontrado"
                    else:
                        last_error = f"HTTP {response.status_code}: {short}"
                    return None, False, last_error
                    
            except requests.exceptions.Timeout:
                last_error = "Timeout na requisição"
                if tentativa < retry_count - 1:
                    time.sleep(retry_delay)
                    continue
                return None, False, last_error
            except requests.exceptions.RequestException as e:
                last_error = f"Erro de rede: {type(e).__name__} - {str(e)[:120]}"
                if tentativa < retry_count - 1:
                    time.sleep(retry_delay)
                    continue
                return None, False, last_error
            except Exception as e:
                return None, False, f"Erro: {type(e).__name__} - {str(e)[:120]}"
        
        return None, False, last_error or "Falha após retries"
    
    def upload_xml(
        self,
        xml_content: str,
        retry_count: int = RETRY_MAX_TENTATIVAS,
        silencioso: bool = False
    ) -> Tuple[bool, Optional[str], bool]:
        """
        Envia um XML para a API SIEG com retry inteligente
        
        Args:
            xml_content: Conteúdo do XML como string
            retry_count: Número de tentativas em caso de erro recuperável
            silencioso: Se True, não imprime mensagens de retry
            
        Returns:
            Tupla (sucesso, mensagem, erro_recuperavel) onde:
            - sucesso: True se enviado com sucesso
            - mensagem: Mensagem de erro ou sucesso
            - erro_recuperavel: True se o erro pode ser retentado
        """
        url_completa = self.endpoints.get_upload_url(self.api_key)
        xml_base64 = base64.b64encode(xml_content.encode('utf-8')).decode('utf-8')
        payload = {"Xml": xml_base64}
        
        ultimo_erro = ""
        ultimo_codigo = 0
        
        for tentativa in range(retry_count):
            try:
                response = requests.post(
                    url_completa,
                    headers=HEADERS,
                    json=payload,
                    timeout=30
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
                    wait_time = (2 ** tentativa) + 1
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
    
    def verify_xml_exists(self, chave_acesso: str, timeout: int = 10) -> bool:
        """
        Verifica se um XML já existe no SIEG usando a chave de acesso
        
        Args:
            chave_acesso: Chave de acesso do XML (44 dígitos)
            timeout: Timeout da requisição em segundos
            
        Returns:
            True se o XML já existe, False caso contrário
        """
        if not chave_acesso or len(chave_acesso) != 44:
            return False
        if inferir_tipo_documento_chave(chave_acesso) is None:
            return False
        
        try:
            url_verificar = self.endpoints.get_verify_url(self.api_key, chave_acesso=chave_acesso)
            download_headers = {
                'Content-Type': 'application/json',
                'Accept': 'text/xml, application/json, */*'
            }
            response = requests.post(
                url_verificar,
                headers=download_headers,
                data=json.dumps(chave_acesso),
                timeout=timeout
            )
            
            # Se retornou 200, o XML existe
            return response.status_code == 200
            
        except Exception:
            # Em caso de erro na verificação, assumir que não existe
            return False
