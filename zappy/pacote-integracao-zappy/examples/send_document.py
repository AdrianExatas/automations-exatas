#!/usr/bin/env python3
"""
Exemplo mínimo: health check → envia PDF → confirma persistência no Zappy.

Uso:
  set ZAPPY_API_KEY=...   (ou arquivo .env na pasta do pacote / cwd)
  set ZAPPY_TO=5579...    (número autorizado, só dígitos)
  python send_document.py caminho/arquivo.pdf

Stdlib only. Não use ticketStrategy=nocreate.
"""
from __future__ import annotations

import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = os.environ.get("ZAPPY_BASE_URL", "https://api-exatas.zapcontabil.chat").rstrip("/")
CONNECTION_ID = int(os.environ.get("ZAPPY_CONNECTION_ID", "1"))
CTX = ssl._create_unverified_context()


def load_api_key() -> str:
    key = os.environ.get("ZAPPY_API_KEY", "").strip()
    if key:
        return key
    for candidate in (Path.cwd() / ".env", Path(__file__).resolve().parents[1] / ".env"):
        if not candidate.is_file():
            continue
        for line in candidate.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("ZAPPY_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
            if line.startswith("zappy_api_key="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("Defina ZAPPY_API_KEY no ambiente ou em .env")


def api(method: str, path: str, body: dict | None = None, raw: bytes | None = None, content_type: str | None = None):
    headers = {
        "Authorization": f"Bearer {load_api_key()}",
        "Accept": "application/json",
    }
    data = raw
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif content_type:
        headers["Content-Type"] = content_type
    req = urllib.request.Request(BASE + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=120, context=CTX) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as e:
        raw_err = e.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(raw_err)
        except Exception:
            parsed = raw_err
        return e.code, parsed


def unwrap_message(payload):
    if isinstance(payload, dict) and isinstance(payload.get("message"), dict):
        return payload["message"]
    if isinstance(payload, dict) and payload.get("id"):
        return payload
    return None


def assert_persisted(message_id: str) -> dict:
    code, data = api("GET", f"/api/messages/{message_id}")
    if code != 200:
        raise SystemExit(f"Falha de auditoria: GET /api/messages/{message_id} -> {code} {data}")
    print(f"OK persistido id={message_id} ack={data.get('ack')} ticketId={data.get('ticketId')}")
    return data


def health() -> None:
    code, data = api("GET", "/api/connections")
    if code != 200:
        raise SystemExit(f"Health falhou: {code} {data}")
    connections = data.get("connections") if isinstance(data, dict) else data
    if not isinstance(connections, list):
        connections = [data] if isinstance(data, dict) else []
    target = next((c for c in connections if c.get("id") == CONNECTION_ID), None)
    if not target:
        raise SystemExit(f"Conexão id={CONNECTION_ID} não encontrada")
    if target.get("status") != "CONNECTED":
        raise SystemExit(f"Conexão offline: status={target.get('status')}")
    print(f"OK conexão {target.get('name')} status=CONNECTED")


def multipart_pdf(path: Path) -> tuple[bytes, str]:
    boundary = "----ZappyHandoffBoundary"
    file_bytes = path.read_bytes()
    parts = []
    for name, value in (("connectionFrom", str(CONNECTION_ID)),):
        parts.append(
            f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode()
        )
    parts.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="media"; filename="{path.name}"\r\n'
            f"Content-Type: application/pdf\r\n\r\n"
        ).encode()
        + file_bytes
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Uso: python send_document.py arquivo.pdf")
    pdf = Path(sys.argv[1])
    if not pdf.is_file():
        raise SystemExit(f"Arquivo não encontrado: {pdf}")
    to = os.environ.get("ZAPPY_TO", "").strip()
    if not to.isdigit():
        raise SystemExit("Defina ZAPPY_TO com o número (só dígitos), ex. 5579999999999")

    health()
    raw, ctype = multipart_pdf(pdf)
    code, payload = api("POST", f"/api/send/document/{to}", raw=raw, content_type=ctype)
    print("POST document ->", code)
    if code != 200:
        raise SystemExit(payload)
    msg = unwrap_message(payload)
    if not msg or not msg.get("id"):
        raise SystemExit(f"Resposta sem message.id: {payload}")
    print("message.id=", msg["id"], "ticketId=", msg.get("ticketId"))
    assert_persisted(msg["id"])


if __name__ == "__main__":
    main()
