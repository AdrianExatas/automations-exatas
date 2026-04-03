from __future__ import annotations

import json
import sys
from datetime import date, timedelta
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_URL = "https://app.omie.com.br/api/v1/servicos/nfse/"
REGISTROS_POR_PAGINA = 20
STATUS_FATURADA = "F"


def load_env(env_path: Path) -> dict[str, str]:
    if not env_path.exists():
        raise RuntimeError(f"Arquivo .env nao encontrado em {env_path}")

    values: dict[str, str] = {}
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()

    missing = [name for name in ("APP_KEY", "APP_SECRET") if not values.get(name)]
    if missing:
        raise RuntimeError(f"Variaveis ausentes no .env: {', '.join(missing)}")

    return values


def previous_month_period(today: date) -> tuple[date, date]:
    first_day_current_month = today.replace(day=1)
    last_day_previous_month = first_day_current_month - timedelta(days=1)
    first_day_previous_month = last_day_previous_month.replace(day=1)
    return first_day_previous_month, last_day_previous_month


def format_br_date(value: date) -> str:
    return value.strftime("%d/%m/%Y")


def build_payload(app_key: str, app_secret: str, page: int, start_date: date, end_date: date) -> bytes:
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


def ensure_list(value: Any) -> list[dict[str, Any]]:
    if value is None:
        return []
    if isinstance(value, list):
        return [item for item in value if isinstance(item, dict)]
    if isinstance(value, dict):
        return [value]
    return []


def normalize_nfse(item: dict[str, Any]) -> dict[str, Any] | None:
    cabecalho = item.get("Cabecalho")
    emissao = item.get("Emissao")

    if not isinstance(cabecalho, dict):
        cabecalho = {}
    if not isinstance(emissao, dict):
        emissao = {}

    if cabecalho.get("cStatusNFSe") != STATUS_FATURADA:
        return None

    return {
        "cCNPJEmissor": cabecalho.get("cCNPJEmissor"),
        "cCodigoVerifNFSe": cabecalho.get("cCodigoVerifNFSe"),
        "nNumeroNFSe": cabecalho.get("nNumeroNFSe"),
        "Emissao": {
            "cDataEmissao": emissao.get("cDataEmissao"),
            "cHoraEmissao": emissao.get("cHoraEmissao"),
        },
    }


def fetch_all_nfse(app_key: str, app_secret: str, start_date: date, end_date: date) -> list[dict[str, Any]]:
    page = 1
    total_pages = 1
    items: list[dict[str, Any]] = []

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


def output_path(base_dir: Path, start_date: date) -> Path:
    return base_dir / f"nfse_{start_date.strftime('%Y-%m')}.json"


def main() -> int:
    base_dir = Path(__file__).resolve().parent

    try:
        env = load_env(base_dir / ".env")
        start_date, end_date = previous_month_period(date.today())
        nfse = fetch_all_nfse(env["APP_KEY"], env["APP_SECRET"], start_date, end_date)
        target_file = output_path(base_dir, start_date)
        target_file.write_text(json.dumps(nfse, indent=2, ensure_ascii=False), encoding="utf-8")
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    print(
        f"Periodo consultado: {format_br_date(start_date)} a {format_br_date(end_date)} | "
        f"Notas extraidas: {len(nfse)} | Arquivo: {target_file.name}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
