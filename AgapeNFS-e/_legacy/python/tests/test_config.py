from __future__ import annotations

from agape_nfse.config import AppConfig


def test_agape_alias_env_is_ignored(monkeypatch) -> None:
    monkeypatch.setenv("AGAPE_LOGIN", "login")
    monkeypatch.setenv("AGAPE_PASSWORD", "senha")
    monkeypatch.setenv("AGAPE_ALIAS", "outro-alias")

    config = AppConfig.from_env()

    assert config.login == "login"
    assert config.password == "senha"
    assert not hasattr(config, "alias")
