"""Cliente para integracao com a API SIEG."""

from __future__ import annotations

import base64
import json
import threading
import time
from typing import Optional, Tuple

import requests
from requests.adapters import HTTPAdapter

from ..config import HEADERS, RETRY_ERROS_RECUPERAVEIS, RETRY_MAX_TENTATIVAS, get_sieg_api_key, inferir_tipo_documento_chave
from .endpoints import APIEndpoints


class SiegAPIClient:
    """Cliente para operacoes com a API."""

    def __init__(self, api_key: str | None = None):
        self.api_key = get_sieg_api_key(api_key)
        self.endpoints = APIEndpoints()
        self._thread_local = threading.local()

    def _get_session(self) -> requests.Session:
        session = getattr(self._thread_local, "session", None)
        if session is None:
            session = requests.Session()
            adapter = HTTPAdapter(pool_connections=20, pool_maxsize=20)
            session.mount("http://", adapter)
            session.mount("https://", adapter)
            self._thread_local.session = session
        return session

    def download_xml(
        self,
        chave_acesso: str,
        timeout: int = 30,
        retry_count: int = 3,
        retry_delay: int = 2,
    ) -> Tuple[Optional[str], bool, Optional[str]]:
        if not chave_acesso or len(chave_acesso) != 44 or not chave_acesso.isdigit():
            return None, False, "Chave invalida (deve ter 44 digitos numericos)"

        tipo = inferir_tipo_documento_chave(chave_acesso)
        if tipo is None:
            modelo = int(chave_acesso[20:22]) if chave_acesso.isdigit() and len(chave_acesso) >= 22 else 0
            return None, False, f"Documento modelo {modelo} nao suportado para download (suportados: NFe=55, NFCe=65, CTe=57)"

        url = self.endpoints.get_download_url(self.api_key, chave_acesso=chave_acesso)
        headers = {"Content-Type": "application/json", "Accept": "text/xml, application/json, */*"}
        last_error: Optional[str] = None

        for tentativa in range(retry_count):
            try:
                response = self._get_session().post(url, headers=headers, data=json.dumps(chave_acesso), timeout=timeout)
                if response.status_code == 200:
                    xml_content = response.text.strip()
                    if xml_content.startswith("{"):
                        try:
                            payload = response.json()
                            xml_content = payload.get("Codigo") or payload.get("codigo") or ""
                            if isinstance(payload.get("Mensagens"), list) and not xml_content:
                                xml_content = payload["Mensagens"][0] or ""
                        except (json.JSONDecodeError, TypeError):
                            pass
                    if isinstance(xml_content, str) and xml_content.startswith('"') and xml_content.endswith('"'):
                        xml_content = json.loads(xml_content)
                    if not (xml_content and xml_content.strip().startswith("<")):
                        last_error = "Resposta 200 mas conteudo nao e XML"
                        if tentativa < retry_count - 1:
                            time.sleep(retry_delay)
                            continue
                        return None, False, last_error
                    return xml_content, True, None

                if response.status_code in RETRY_ERROS_RECUPERAVEIS and tentativa < retry_count - 1:
                    time.sleep(retry_delay * (tentativa + 1))
                    continue

                short = (response.text[:200] if response.text else "").replace("\n", " ")
                last_error = f"HTTP {response.status_code}: {short}"
                return None, False, last_error
            except requests.exceptions.Timeout:
                last_error = "Timeout na requisicao"
                if tentativa < retry_count - 1:
                    time.sleep(retry_delay)
                    continue
                return None, False, last_error
            except requests.exceptions.RequestException as exc:
                last_error = f"Erro de rede: {type(exc).__name__} - {str(exc)[:120]}"
                if tentativa < retry_count - 1:
                    time.sleep(retry_delay)
                    continue
                return None, False, last_error
            except Exception as exc:
                return None, False, f"Erro: {type(exc).__name__} - {str(exc)[:120]}"

        return None, False, last_error or "Falha apos retries"

    def upload_xml(
        self,
        xml_content: str,
        retry_count: int = RETRY_MAX_TENTATIVAS,
        silencioso: bool = False,
    ) -> Tuple[bool, Optional[str], bool]:
        url = self.endpoints.get_upload_url(self.api_key)
        xml_base64 = base64.b64encode(xml_content.encode("utf-8")).decode("utf-8")
        payload = {"Xml": xml_base64}
        ultimo_codigo = 0

        for tentativa in range(retry_count):
            try:
                response = self._get_session().post(url, headers=HEADERS, json=payload, timeout=30)
                ultimo_codigo = response.status_code
                if response.status_code == 200:
                    try:
                        return True, f"Enviado: {json.dumps(response.json(), ensure_ascii=False)}", False
                    except Exception:
                        return True, "Enviado com sucesso", False

                if response.status_code in RETRY_ERROS_RECUPERAVEIS and tentativa < retry_count - 1:
                    wait_time = (2**tentativa) + (tentativa * 0.5)
                    if not silencioso:
                        print(f"    Erro {response.status_code}, retry em {wait_time:.1f}s...")
                    time.sleep(wait_time)
                    continue

                try:
                    payload = response.json()
                    ultimo_erro = payload.get("message", payload.get("error", response.text))
                except Exception:
                    ultimo_erro = response.text
                return False, f"Erro HTTP {response.status_code}: {ultimo_erro}", response.status_code in RETRY_ERROS_RECUPERAVEIS
            except requests.exceptions.Timeout:
                if tentativa < retry_count - 1:
                    time.sleep((2**tentativa) + 1)
                    continue
                return False, "Timeout na requisicao", True
            except requests.exceptions.RequestException as exc:
                if tentativa < retry_count - 1:
                    time.sleep((2**tentativa) + 1)
                    continue
                return False, f"Erro na requisicao: {exc}", True
            except Exception as exc:
                return False, f"Erro inesperado: {str(exc)}", False

        return False, f"Falha apos {retry_count} tentativas (ultimo codigo: {ultimo_codigo})", True

    def verify_xml_exists(self, chave_acesso: str, timeout: int = 10) -> bool:
        if not chave_acesso or len(chave_acesso) != 44:
            return False
        if inferir_tipo_documento_chave(chave_acesso) is None:
            return False
        try:
            url = self.endpoints.get_verify_url(self.api_key, chave_acesso=chave_acesso)
            response = self._get_session().post(
                url,
                headers={"Content-Type": "application/json", "Accept": "text/xml, application/json, */*"},
                data=json.dumps(chave_acesso),
                timeout=timeout,
            )
            return response.status_code == 200
        except Exception:
            return False
