import importlib

import pytest


def test_get_sieg_api_key_falha_sem_env(monkeypatch):
    monkeypatch.setenv("SIEG_XML_DISABLE_DOTENV", "1")
    monkeypatch.delenv("SIEG_API_KEY", raising=False)
    settings = importlib.import_module("sieg_xml.config.settings")
    importlib.reload(settings)
    with pytest.raises(RuntimeError):
        settings.get_sieg_api_key()


def test_paths_respeitam_data_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("SIEG_XML_DATA_DIR", str(tmp_path / "dados"))
    paths = importlib.import_module("sieg_xml.config.paths")
    importlib.reload(paths)
    assert paths.DATA_DIR == (tmp_path / "dados").resolve()
    assert str(paths.XML_DOWNLOAD_DIR).endswith("dados\\xmls") or str(paths.XML_DOWNLOAD_DIR).endswith("dados/xmls")


def test_settings_priorizam_env_em_programdata(monkeypatch, tmp_path):
    programdata = tmp_path / "ProgramData"
    machine_env = programdata / "SIEG XML" / "config" / ".env"
    machine_env.parent.mkdir(parents=True, exist_ok=True)
    machine_env.write_text("SIEG_API_KEY=token_programdata\n", encoding="utf-8")

    monkeypatch.delenv("SIEG_API_KEY", raising=False)
    monkeypatch.delenv("SIEG_XML_DISABLE_DOTENV", raising=False)
    monkeypatch.delenv("SIEG_XML_PROGRAMDATA_DIR", raising=False)
    monkeypatch.setenv("PROGRAMDATA", str(programdata))

    paths = importlib.import_module("sieg_xml.config.paths")
    settings = importlib.import_module("sieg_xml.config.settings")
    importlib.reload(paths)
    importlib.reload(settings)

    assert paths.MACHINE_ENV_FILE == machine_env.resolve()
    assert settings.ACTIVE_ENV_FILE == machine_env.resolve()
    assert settings.get_sieg_api_key() == "token_programdata"


def test_inferir_tipo_documento_chave_suporta_nfce(monkeypatch):
    monkeypatch.setenv("SIEG_XML_DISABLE_DOTENV", "1")
    settings = importlib.import_module("sieg_xml.config.settings")
    importlib.reload(settings)

    assert settings.inferir_tipo_documento_chave("35250112345678000123650010000000011000000010") == "NFCe"


def test_xml_type_from_chave_suporta_nfce(monkeypatch):
    monkeypatch.setenv("SIEG_XML_DISABLE_DOTENV", "1")
    settings = importlib.import_module("sieg_xml.config.settings")
    importlib.reload(settings)

    assert settings.xml_type_from_chave("35250112345678000123650010000000011000000010") == 4


def test_settings_permite_override_xml_type_nfce(monkeypatch):
    monkeypatch.setenv("SIEG_XML_DISABLE_DOTENV", "1")
    monkeypatch.setenv("SIEG_XML_TYPE_NFCE", "9")
    settings = importlib.import_module("sieg_xml.config.settings")
    importlib.reload(settings)

    assert settings.XML_TYPE_NFCE == 9
    assert settings.xml_type_from_chave("35250112345678000123650010000000011000000010") == 9
