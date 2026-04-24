from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from .config import format_br_date
from .models import NFSeItem


API_URL = "https://app.omie.com.br/api/v1/servicos/nfse/"
REGISTROS_POR_PAGINA = 20
STATUS_FATURADA = "F"


def build_payload(app_key: str, app_secret: str, page: int, start_date, end_date) -> bytes:
    body = {
        "call": "ListarNFSEs",
        "param": [
            {
                "nPagina": page,
                "nRegPorPagina": REGISTROS_POR_PAGINA,
                "dEmiInicial": format_br_date(start_date),
                "dEmiFinal": format_br_date(end_date),
                "cStatusNFSe": STATUS_FATURADA,
            }
        ],
        "app_key": app_key,
        "app_secret": app_secret,
    }
    return json.dumps(body).encode("utf-8")


def extract_api_error(data: dict[str, Any]) -> str | None:
    for key in ("faultstring", "message", "descricao", "error", "erro"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()

    if data.get("cCodStatus") == "1" and isinstance(data.get("cDesStatus"), str):
        return data["cDesStatus"].strip()

    if "nfseEncontradas" not in data and any(key in data for key in ("faultcode", "faultstring", "cDesStatus")):
        return "Resposta sem nfseEncontradas."

    return None


def call_omie(payload: bytes) -> dict[str, Any]:
    request = Request(
        API_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlopen(request, timeout=30) as response:
            raw_response = response.read().decode("utf-8")
    except HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace").strip()
        raise RuntimeError(
            f"Erro HTTP ao consultar Omie: {exc.code} {exc.reason}. {details[:300]}"
        ) from exc
    except URLError as exc:
        raise RuntimeError(f"Erro de rede ao consultar Omie: {exc.reason}") from exc

    try:
        data = json.loads(raw_response)
    except json.JSONDecodeError as exc:
        raise RuntimeError("Resposta da Omie nao esta em JSON valido.") from exc

    if not isinstance(data, dict):
        raise RuntimeError("Resposta da Omie em formato inesperado.")

    error_message = extract_api_error(data)
    if error_message:
        raise RuntimeError(f"Erro retornado pela Omie: {error_message}")

    return data


def ensure_list(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [value]
    return []


def normalize_nfse(item: dict[str, Any]) -> NFSeItem | None:
    cabecalho = item.get("Cabecalho")
    emissao = item.get("Emissao")

    if not isinstance(cabecalho, dict):
        cabecalho = {}
    if not isinstance(emissao, dict):
        emissao = {}

    if cabecalho.get("cStatusNFSe") != STATUS_FATURADA:
        return None

    return NFSeItem(
        cnpj_emissor=str(cabecalho.get("cCNPJEmissor") or "").strip(),
        codigo_verificacao=str(cabecalho.get("cCodigoVerifNFSe") or "").strip(),
        numero=str(cabecalho.get("nNumeroNFSe") or "").strip(),
        data_emissao=str(emissao.get("cDataEmissao") or "").strip() or None,
        hora_emissao=str(emissao.get("cHoraEmissao") or "").strip() or None,
    )


def fetch_all_nfse(app_key: str, app_secret: str, start_date, end_date) -> list[NFSeItem]:
    page = 1
    total_pages = 1
    items: list[NFSeItem] = []

    while page <= total_pages:
        payload = build_payload(app_key, app_secret, page, start_date, end_date)
        response = call_omie(payload)

        total_pages_value = response.get("nTotPaginas", total_pages)
        if isinstance(total_pages_value, int) and total_pages_value > 0:
            total_pages = total_pages_value
        elif total_pages_value in (None, 0):
            total_pages = page
        else:
            raise RuntimeError("Campo nTotPaginas retornado pela Omie em formato invalido.")

        for raw_item in ensure_list(response.get("nfseEncontradas")):
            normalized = normalize_nfse(raw_item)
            if normalized is not None:
                items.append(normalized)

        page += 1

    return items
