from __future__ import annotations

from agape_nfse.client import AgapeNfseClient


def test_max_workers_is_limited() -> None:
    assert AgapeNfseClient("login", "senha", max_workers=0).max_workers == 1
    assert AgapeNfseClient("login", "senha", max_workers=4).max_workers == 4
    assert AgapeNfseClient("login", "senha", max_workers=99).max_workers == 8


def test_clone_session_copies_cookies_without_credentials() -> None:
    client = AgapeNfseClient("login-secreto", "senha-secreta")
    client.session.cookies.set("JSESSIONID", "abc123", domain="agnfseprd.agapesistemas.com.br")

    clone = client._clone_session()

    assert clone.cookies.get("JSESSIONID", domain="agnfseprd.agapesistemas.com.br") == "abc123"
    assert "login-secreto" not in str(clone.headers)
    assert "senha-secreta" not in str(clone.headers)
