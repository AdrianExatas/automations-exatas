import importlib
from types import SimpleNamespace


CHAVE_NFCE = "35250112345678000123650010000000011000000010"


def _reload_api_modules(monkeypatch):
    monkeypatch.setenv("SIEG_XML_DISABLE_DOTENV", "1")
    monkeypatch.setenv("SIEG_API_KEY", "token")
    monkeypatch.setenv("SIEG_XML_TYPE_NFCE", "4")

    settings = importlib.import_module("sieg_xml.config.settings")
    endpoints = importlib.import_module("sieg_xml.api.endpoints")
    client = importlib.import_module("sieg_xml.api.client")

    importlib.reload(settings)
    importlib.reload(endpoints)
    importlib.reload(client)
    return endpoints, client


def test_api_endpoints_resolve_xml_type_nfce(monkeypatch):
    endpoints, _ = _reload_api_modules(monkeypatch)

    url = endpoints.APIEndpoints.get_download_url(api_key="token", chave_acesso=CHAVE_NFCE)

    assert "xmlType=4" in url


def test_client_download_xml_suporta_nfce(monkeypatch):
    _, client_module = _reload_api_modules(monkeypatch)
    client = client_module.SiegAPIClient(api_key="token")
    chamadas = []

    class FakeSession:
        def post(self, url, headers=None, data=None, timeout=None):
            chamadas.append({"url": url, "headers": headers, "data": data, "timeout": timeout})
            return SimpleNamespace(status_code=200, text="<xml/>")

    monkeypatch.setattr(client, "_get_session", lambda: FakeSession())

    xml_content, valido, erro = client.download_xml(CHAVE_NFCE)

    assert valido is True
    assert erro is None
    assert xml_content == "<xml/>"
    assert "xmlType=4" in chamadas[0]["url"]


def test_client_verify_xml_exists_suporta_nfce(monkeypatch):
    _, client_module = _reload_api_modules(monkeypatch)
    client = client_module.SiegAPIClient(api_key="token")
    chamadas = []

    class FakeSession:
        def post(self, url, headers=None, data=None, timeout=None):
            chamadas.append({"url": url, "headers": headers, "data": data, "timeout": timeout})
            return SimpleNamespace(status_code=200, text="")

    monkeypatch.setattr(client, "_get_session", lambda: FakeSession())

    assert client.verify_xml_exists(CHAVE_NFCE) is True
    assert "xmlType=4" in chamadas[0]["url"]


def test_client_mensagem_modelo_nao_suportado_lista_nfce(monkeypatch):
    _, client_module = _reload_api_modules(monkeypatch)
    client = client_module.SiegAPIClient(api_key="token")

    xml_content, valido, erro = client.download_xml("35250112345678000123670010000000011000000010")

    assert xml_content is None
    assert valido is False
    assert erro == "Documento modelo 67 nao suportado para download (suportados: NFe=55, NFCe=65, CTe=57)"
