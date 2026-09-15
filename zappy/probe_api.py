"""Probe Exatas Zappy API (read + optional send tests). Do not commit secrets."""
from __future__ import annotations

import json
import os
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

BASE = "https://api-exatas.zapcontabil.chat"
CTX = ssl._create_unverified_context()
ROOT = Path(__file__).resolve().parent
OUT = ROOT / "api_probe_results.json"
TEST_NUMBER = "5579998242555"


def load_key() -> str:
    env_key = os.environ.get("ZAPPY_API_KEY", "").strip()
    if env_key:
        return env_key
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if line.strip().startswith("zappy_api_key="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("Missing zappy_api_key")


KEY = load_key()
results: list[dict] = []
ids: dict = {}


def call(
    method: str,
    path: str,
    query: dict | None = None,
    body: dict | None = None,
    raw_body: bytes | None = None,
    extra_headers: dict | None = None,
):
    qs = ("?" + urllib.parse.urlencode(query)) if query else ""
    url = BASE + path + qs
    headers = {
        "Authorization": f"Bearer {KEY}",
        "Accept": "application/json",
    }
    data = raw_body
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if extra_headers:
        headers.update(extra_headers)
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=90, context=CTX) as r:
            raw = r.read().decode("utf-8", errors="replace")
            code = r.status
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        code = e.code
    except Exception as e:
        entry = {
            "method": method,
            "path": path + qs,
            "status": "ERR",
            "ms": int((time.time() - t0) * 1000),
            "summary": str(e)[:200],
        }
        results.append(entry)
        print(f"{method} {path} ERR {e}", flush=True)
        return None
    ms = int((time.time() - t0) * 1000)
    try:
        parsed = json.loads(raw) if raw else None
    except Exception:
        parsed = None
    summary = ""
    if isinstance(parsed, dict):
        if "error" in parsed:
            summary = f"error={parsed.get('error')}"
            if parsed.get("errorData"):
                summary += f" data={str(parsed.get('errorData'))[:120]}"
        else:
            list_keys = [k for k, v in parsed.items() if isinstance(v, list)]
            for lk in list_keys:
                summary += f"{lk}:{len(parsed[lk])} "
            meta = {
                k: parsed[k]
                for k, v in parsed.items()
                if k not in list_keys and not isinstance(v, (list, dict))
            }
            if meta:
                summary += str(meta)[:180]
            if not summary:
                summary = str(list(parsed.keys()))[:180]
    elif isinstance(parsed, list):
        summary = f"list:{len(parsed)}"
    else:
        summary = (raw or "")[:180]
    results.append(
        {
            "method": method,
            "path": path + qs,
            "status": code,
            "ms": ms,
            "summary": summary.strip(),
        }
    )
    print(f"{method} {path} -> {code} ({ms}ms) {summary[:140]}", flush=True)
    return parsed


def probe_gets() -> None:
    global ids
    conn = call("GET", "/api/connections")
    connection_id = 1
    if isinstance(conn, dict) and conn.get("connections"):
        connection_id = conn["connections"][0].get("id", 1)
        ids["connection"] = {
            "id": connection_id,
            "name": conn["connections"][0].get("name"),
            "status": conn["connections"][0].get("status"),
            "type": conn["connections"][0].get("type"),
            "connectionSubType": conn["connections"][0].get("connectionSubType"),
            "number": conn["connections"][0].get("number"),
        }
    elif isinstance(conn, list) and conn:
        connection_id = conn[0].get("id", 1)
        ids["connection"] = conn[0]
    ids["connectionId"] = connection_id

    call("GET", f"/api/connections/{connection_id}/templates")

    contacts = call("GET", "/api/contacts", {"page": 1, "pageSize": 20})
    contact_id = None
    if isinstance(contacts, dict):
        ids["contactsMeta"] = {
            k: contacts.get(k) for k in ("count", "page", "pageSize", "pageCount")
        }
        for c in contacts.get("contacts") or []:
            num = str(c.get("number") or "")
            if num == TEST_NUMBER or num.endswith("998242555"):
                contact_id = c.get("id")
                break
        if not contact_id and contacts.get("contacts"):
            # keep first as fallback for GET by id only
            pass

    # Search first pages for Adrian number
    if not contact_id:
        for p in range(1, 5):
            batch = call("GET", "/api/contacts", {"page": p, "pageSize": 1000})
            if not isinstance(batch, dict):
                break
            for c in batch.get("contacts") or []:
                num = str(c.get("number") or "")
                if num == TEST_NUMBER or num.endswith("998242555"):
                    contact_id = c["id"]
                    ids["testContact"] = {
                        "id": c.get("id"),
                        "name": c.get("name"),
                        "number": c.get("number"),
                    }
                    break
            if contact_id or not (batch.get("contacts") or []):
                break

    sb = call(
        "GET",
        "/api/tickets/search-by-contact",
        {"contactNumber": TEST_NUMBER, "page": 1, "pageSize": 5},
    )
    if isinstance(sb, dict):
        tickets = sb.get("tickets") or []
        if tickets:
            ids["ticketId"] = tickets[0].get("id")
            if tickets[0].get("contactId"):
                contact_id = tickets[0].get("contactId")

    # Fallback sample contact for GET by id
    sample_contact_id = contact_id
    if not sample_contact_id and isinstance(contacts, dict) and contacts.get("contacts"):
        sample_contact_id = contacts["contacts"][0].get("id")

    ids["contactId"] = contact_id
    if sample_contact_id:
        call("GET", f"/api/contacts/{sample_contact_id}")
        ids["sampleContactId"] = sample_contact_id

    tickets = call("GET", "/api/tickets", {"page": 1, "pageSize": 20})
    if isinstance(tickets, dict) and tickets.get("tickets"):
        tid = tickets["tickets"][0].get("id")
        ids.setdefault("ticketId", tid)
        if tid:
            call("GET", f"/api/tickets/{tid}")
            call("GET", f"/api/tickets/{tid}/info")

    msgs = call("GET", "/api/messages", {"page": 1, "pageSize": 20})
    filekey = None
    if isinstance(msgs, dict) and msgs.get("messages"):
        msg_id = msgs["messages"][0].get("id")
        ids["messageId"] = msg_id
        for m in msgs["messages"]:
            if m.get("fileKey"):
                filekey = m["fileKey"]
                break
        if msg_id:
            call("GET", f"/api/messages/{msg_id}")

    if contact_id:
        call(
            "GET",
            "/api/messages",
            {"page": 1, "pageSize": 10, "contactId": contact_id},
        )

    queues = call("GET", "/api/queues", {"page": 1, "pageSize": 20})
    if isinstance(queues, dict) and queues.get("queues"):
        qid = queues["queues"][0].get("id")
        ids["queueId"] = qid
        if qid:
            call("GET", f"/api/queues/{qid}")
    call("GET", "/api/queue-users", {"page": 1, "pageSize": 20})

    users = call("GET", "/api/users", {"page": 1, "pageSize": 20})
    if isinstance(users, dict) and users.get("users"):
        uid = users["users"][0].get("id")
        ids["userId"] = uid
        if uid:
            call("GET", f"/api/users/{uid}")

    tags = call("GET", "/api/tags", {"page": 1, "pageSize": 20})
    if isinstance(tags, dict) and tags.get("tags"):
        tag_id = tags["tags"][0].get("id")
        ids["tagId"] = tag_id
        if tag_id:
            call("GET", f"/api/tags/{tag_id}")

    webhooks = call("GET", "/api/webhooks", {"page": 1})
    if isinstance(webhooks, dict) and webhooks.get("webhooks"):
        wid = webhooks["webhooks"][0].get("id")
        ids["webhookId"] = wid
        ids["webhooksSample"] = [
            {"id": w.get("id"), "name": w.get("name"), "type": w.get("type")}
            for w in (webhooks.get("webhooks") or [])[:5]
        ]
        if wid:
            call("GET", f"/api/webhooks/{wid}")

    today = date.today()
    start = today.replace(day=1).isoformat()
    end = today.isoformat()
    call(
        "GET",
        "/api/dashboard/tickets-por-atendente",
        {"startDate": start, "endDate": end},
    )
    call(
        "GET",
        "/api/dashboard/tickets-por-qualificacao",
        {"startDate": start, "endDate": end},
    )
    # try common groupBy values
    for group_by in ("queue", "user", "status"):
        r = call(
            "GET",
            "/api/dashboard/tickets-agrupados",
            {"startDate": start, "endDate": end, "groupBy": group_by},
        )
        if isinstance(r, dict) and "error" not in r:
            break
    call("GET", "/api/metrics/messages", {"dateFrom": start, "dateTo": end})

    if filekey:
        encoded = urllib.parse.quote(str(filekey), safe="")
        call("GET", f"/api/storage/signed-url/{encoded}")
        ids["fileKey"] = filekey
    else:
        results.append(
            {
                "method": "GET",
                "path": "/api/storage/signed-url/{filekey}",
                "status": "SKIP",
                "ms": 0,
                "summary": "Nenhum fileKey nas mensagens amostradas",
            }
        )
        print("GET storage SKIP no fileKey", flush=True)


def multipart_document(path: Path, connection_from: int, ticket_strategy: str | None):
    boundary = "----ZappyBoundary7MA4YWxkTrZu0gW"
    filename = path.name
    file_bytes = path.read_bytes()
    parts = []

    def add_field(name: str, value: str):
        parts.append(
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n'
            f"{value}\r\n".encode("utf-8")
        )

    add_field("connectionFrom", str(connection_from))
    if ticket_strategy:
        add_field("ticketStrategy", ticket_strategy)
    parts.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="media"; filename="{filename}"\r\n'
            f"Content-Type: application/pdf\r\n\r\n"
        ).encode("utf-8")
        + file_bytes
        + b"\r\n"
    )
    parts.append(f"--{boundary}--\r\n".encode("utf-8"))
    body = b"".join(parts)
    return body, f"multipart/form-data; boundary={boundary}"


def make_min_pdf(path: Path) -> None:
    # Minimal valid-ish PDF
    content = b"""%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 68 >>stream
BT /F1 12 Tf 40 100 Td (Teste Exatas Zappy - documento) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000393 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
466
%%EOF
"""
    path.write_bytes(content)


def _unwrap_message(payload):
    if not isinstance(payload, dict):
        return None
    msg = payload.get("message") if isinstance(payload.get("message"), dict) else payload
    if not isinstance(msg, dict):
        return None
    return msg


def assert_persisted(message_id: str | None, label: str) -> dict:
    """GET /api/messages/{id} must be 200 for UI/audit visibility."""
    if not message_id:
        entry = {
            "label": label,
            "messageId": None,
            "persisted": False,
            "getStatus": None,
            "summary": "sem message.id na resposta do POST",
        }
        ids.setdefault("persistenceChecks", []).append(entry)
        results.append(
            {
                "method": "GET",
                "path": "/api/messages/{id}",
                "status": "SKIP",
                "ms": 0,
                "summary": f"{label}: {entry['summary']}",
            }
        )
        print(f"PERSIST {label}: FAIL (no id)", flush=True)
        return entry

    before = len(results)
    fetched = call("GET", f"/api/messages/{message_id}")
    get_status = results[before]["status"] if len(results) > before else None
    persisted = get_status == 200 and isinstance(fetched, dict) and "error" not in fetched
    entry = {
        "label": label,
        "messageId": message_id,
        "persisted": persisted,
        "getStatus": get_status,
        "ticketId": (fetched or {}).get("ticketId") if isinstance(fetched, dict) else None,
        "ack": (fetched or {}).get("ack") if isinstance(fetched, dict) else None,
    }
    ids.setdefault("persistenceChecks", []).append(entry)
    print(
        f"PERSIST {label}: {'OK' if persisted else 'FAIL'} "
        f"id={message_id} get={get_status}",
        flush=True,
    )
    return entry


def probe_sends() -> None:
    """Envio sob demanda. Nao usa nocreate — mensagens precisam aparecer no Zappy."""
    connection_id = ids.get("connectionId", 1)
    # Padrao create (omitir ticketStrategy). Nunca nocreate para auditoria na UI.
    text = call(
        "POST",
        f"/api/send/{TEST_NUMBER}",
        body={
            "body": (
                "[TESTE AUTOMATIZADO Exatas] Mensagem de texto via API Zappy. "
                "Pode ignorar — validacao de integracao."
            ),
            "connectionFrom": connection_id,
        },
    )
    text_msg = _unwrap_message(text)
    if text_msg:
        ids["sendText"] = {
            "id": text_msg.get("id"),
            "ticketId": text_msg.get("ticketId"),
            "ack": text_msg.get("ack"),
            "keys": list(text_msg.keys())[:20],
        }
        if text_msg.get("ticketId"):
            ids["ticketId"] = text_msg.get("ticketId")
        if text_msg.get("contactId"):
            ids["contactId"] = text_msg.get("contactId")
        assert_persisted(text_msg.get("id"), "text")

    pdf_path = ROOT / "_test_doc.pdf"
    make_min_pdf(pdf_path)
    try:
        # Sem ticketStrategy no multipart (equivale ao padrao create).
        raw, ctype = multipart_document(pdf_path, connection_id, ticket_strategy=None)
        doc = call(
            "POST",
            f"/api/send/document/{TEST_NUMBER}",
            raw_body=raw,
            extra_headers={"Content-Type": ctype},
        )
        doc_msg = _unwrap_message(doc)
        if doc_msg:
            ids["sendDocument"] = {
                "id": doc_msg.get("id"),
                "ticketId": doc_msg.get("ticketId"),
                "mediaType": doc_msg.get("mediaType"),
                "error": doc_msg.get("error"),
                "keys": list(doc_msg.keys())[:20],
            }
            if doc_msg.get("ticketId"):
                ids["ticketId"] = doc_msg.get("ticketId")
            if doc_msg.get("contactId"):
                ids["contactId"] = doc_msg.get("contactId")
            assert_persisted(doc_msg.get("id"), "document")
    finally:
        if pdf_path.exists():
            pdf_path.unlink()

    ticket_id = ids.get("ticketId")
    if ticket_id:
        call(
            "GET",
            "/api/messages",
            {"page": 1, "pageSize": 10, "ticketId": ticket_id},
        )
    call(
        "GET",
        "/api/tickets/search-by-contact",
        {"contactNumber": TEST_NUMBER, "page": 1, "pageSize": 10},
    )
    contact_id = ids.get("contactId")
    if contact_id:
        call(
            "GET",
            "/api/messages",
            {"page": 1, "pageSize": 10, "contactId": contact_id},
        )


def main():
    mode = os.environ.get("PROBE_MODE", "gets")
    if mode in ("gets", "all"):
        probe_gets()
    if mode in ("sends", "all"):
        probe_sends()
    payload = {
        "base": BASE,
        "testNumber": TEST_NUMBER,
        "ids": ids,
        "results": results,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("WROTE", OUT)
    print("IDS", json.dumps(ids, ensure_ascii=False)[:500])


if __name__ == "__main__":
    main()
