import threading
import time
import sys
from pathlib import Path

from sieg_xml.core.xml_organizer import MODE_FLAT, MODE_YEAR, MODE_YEAR_MONTH
from sieg_xml.services.download_service import DownloadService
from sieg_xml.services.upload_service import UploadService
from sieg_xml.utils.concurrency import CancellationToken


download_service_module = sys.modules[DownloadService.__module__]


XML = """<?xml version="1.0" encoding="utf-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe35250112345678000123550010000000011000000010">
      <ide>
        <dhEmi>2025-01-15T10:30:00-03:00</dhEmi>
      </ide>
    </infNFe>
  </NFe>
</nfeProc>
"""


def test_download_service_salva_xml_por_ano(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    monkeypatch.setattr(service.client, "download_xml", lambda chave: (XML, True, None))
    resultado = service.baixar_xmls(
        ["35250112345678000123550010000000011000000010"],
        output_dir=str(tmp_path),
        organization_mode=MODE_YEAR,
        num_threads=1,
    )
    assert resultado["sucesso"] == 1
    assert resultado["output_dir"] == str(tmp_path)
    assert (tmp_path / "2025" / "35250112345678000123550010000000011000000010.xml").exists()


def test_download_service_salva_xml_nfce(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    chave_nfce = "35250112345678000123650010000000011000000010"
    monkeypatch.setattr(service.client, "download_xml", lambda chave: (XML, True, None))
    resultado = service.baixar_xmls(
        [chave_nfce],
        output_dir=str(tmp_path),
        organization_mode=MODE_YEAR,
        num_threads=1,
    )
    assert resultado["sucesso"] == 1
    assert (tmp_path / "2025" / f"{chave_nfce}.xml").exists()


def test_download_service_salva_xml_em_pasta_unica(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    monkeypatch.setattr(service.client, "download_xml", lambda chave: (XML, True, None))
    resultado = service.baixar_xmls(
        ["35250112345678000123550010000000011000000010"],
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=1,
    )
    assert resultado["sucesso"] == 1
    assert (tmp_path / "35250112345678000123550010000000011000000010.xml").exists()


def test_download_service_salva_xml_por_ano_mes(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    monkeypatch.setattr(service.client, "download_xml", lambda chave: (XML, True, None))
    resultado = service.baixar_xmls(
        ["35250112345678000123550010000000011000000010"],
        output_dir=str(tmp_path),
        organization_mode=MODE_YEAR_MONTH,
        num_threads=1,
    )
    assert resultado["sucesso"] == 1
    assert (tmp_path / "2025" / "01" / "35250112345678000123550010000000011000000010.xml").exists()


def test_download_service_pausa_e_retoma(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    token = CancellationToken()
    second_started = threading.Event()
    first_finished = threading.Event()
    resultado_holder = {}

    def fake_download(chave):
        if chave.endswith("11"):
            second_started.set()
        time.sleep(0.05)
        return (XML, True, None)

    def on_progress(**payload):
        if payload["current"] == 1:
            token.pause()
            first_finished.set()

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    thread = threading.Thread(
        target=lambda: resultado_holder.update(
            service.baixar_xmls(
                [
                    "35250112345678000123550010000000011000000010",
                    "35250112345678000123550010000000011000000011",
                ],
                output_dir=str(tmp_path),
                organization_mode=MODE_FLAT,
                num_threads=1,
                progress_callback=on_progress,
                control_token=token,
            )
        ),
        daemon=True,
    )
    thread.start()

    assert first_finished.wait(1)
    time.sleep(0.2)
    assert not second_started.is_set()

    token.resume()
    thread.join(timeout=2)

    assert resultado_holder["status"] == "completed"
    assert resultado_holder["sucesso"] == 2


def test_download_service_cancela_e_retorna_parcial(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    token = CancellationToken()

    monkeypatch.setattr(service.client, "download_xml", lambda chave: (XML, True, None))

    def on_progress(**payload):
        if payload["current"] == 1:
            token.cancel()

    resultado = service.baixar_xmls(
        [
            "35250112345678000123550010000000011000000010",
            "35250112345678000123550010000000011000000011",
            "35250112345678000123550010000000011000000012",
        ],
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=1,
        progress_callback=on_progress,
        control_token=token,
    )
    assert resultado["status"] == "cancelled"
    assert resultado["sucesso"] == 1
    assert resultado["pendentes"] == 2


def test_download_service_processa_em_paralelo(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_QTD", 0)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_QTD", 10)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_THREADS", 3)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_DELAY", 0.0)
    service = DownloadService(api_key="token")
    thread_ids: set[int] = set()

    def fake_download(chave):
        thread_ids.add(threading.get_ident())
        time.sleep(0.05)
        return (XML, True, None)

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    chaves = [
        "35250112345678000123550010000000011000000010",
        "35250112345678000123550010000000011000000011",
        "35250112345678000123550010000000011000000012",
        "35250112345678000123550010000000011000000013",
    ]
    resultado = service.baixar_xmls(
        chaves,
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=3,
    )

    assert resultado["sucesso"] == 4
    assert resultado["falhas"] == 0
    assert resultado["num_threads"] == 3
    assert len(thread_ids) >= 2


def test_download_service_agrega_falhas_e_salva_arquivo(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    falha_1 = "35250112345678000123550010000000011000000011"
    falha_2 = "35250112345678000123550010000000011000000012"

    def fake_download(chave):
        if chave in {falha_1, falha_2}:
            return (None, False, "Erro simulado")
        return (XML, True, None)

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    resultado = service.baixar_xmls(
        [
            "35250112345678000123550010000000011000000010",
            falha_1,
            falha_2,
        ],
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=2,
    )

    assert resultado["sucesso"] == 1
    assert resultado["falhas"] == 2
    assert sorted(resultado["chaves_com_falha"]) == sorted([falha_1, falha_2])
    assert resultado["arquivo_falhas"] is not None
    arquivo_falhas = Path(str(resultado["arquivo_falhas"]))
    assert arquivo_falhas.exists()
    assert sorted(arquivo_falhas.read_text(encoding="utf-8").splitlines()) == sorted([falha_1, falha_2])


def test_download_service_cancela_com_concorrencia(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    service = DownloadService(api_key="token")
    token = CancellationToken()
    progresso = []

    def fake_download(_chave):
        time.sleep(0.08)
        return (XML, True, None)

    def on_progress(**payload):
        if payload.get("event_type") != "result":
            return
        progresso.append(payload["chave"])
        token.cancel()

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    resultado = service.baixar_xmls(
        [
            "35250112345678000123550010000000011000000010",
            "35250112345678000123550010000000011000000011",
            "35250112345678000123550010000000011000000012",
            "35250112345678000123550010000000011000000013",
        ],
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=2,
        progress_callback=on_progress,
        control_token=token,
    )

    assert resultado["status"] == "cancelled"
    assert resultado["processadas"] >= 1
    assert resultado["processadas"] <= 2
    assert resultado["pendentes"] == resultado["total"] - resultado["processadas"]
    assert resultado["sucesso"] == resultado["processadas"]
    assert len(progresso) == resultado["processadas"]


def test_download_service_warmup_aumenta_concorrencia(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_QTD", 1)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_THREADS", 1)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_QTD", 2)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_THREADS", 2)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE3_QTD", 2)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE3_THREADS", 3)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_DELAY", 0.0)

    service = DownloadService(api_key="token")
    dispatch_targets = []

    def fake_download(_chave):
        time.sleep(0.03)
        return (XML, True, None)

    def on_progress(**payload):
        if payload.get("event_type") == "dispatch":
            dispatch_targets.append(payload["target_concurrency"])

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    resultado = service.baixar_xmls(
        [
            "35250112345678000123550010000000011000000010",
            "35250112345678000123550010000000011000000011",
            "35250112345678000123550010000000011000000012",
            "35250112345678000123550010000000011000000013",
            "35250112345678000123550010000000011000000014",
            "35250112345678000123550010000000011000000015",
        ],
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=4,
        progress_callback=on_progress,
    )

    assert resultado["sucesso"] == 6
    assert dispatch_targets[0] == 1
    assert 2 in dispatch_targets
    assert 3 in dispatch_targets or 4 in dispatch_targets


def test_download_service_cancela_durante_warmup(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_QTD", 1)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_THREADS", 1)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_QTD", 10)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_THREADS", 3)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE3_QTD", 10)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE3_THREADS", 4)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_DELAY", 0.05)

    service = DownloadService(api_key="token")
    token = CancellationToken()
    dispatches = []

    def fake_download(_chave):
        time.sleep(0.08)
        return (XML, True, None)

    def on_progress(**payload):
        if payload.get("event_type") == "dispatch":
            dispatches.append(payload["chave"])
            if len(dispatches) == 1:
                token.cancel()

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    resultado = service.baixar_xmls(
        [
            "35250112345678000123550010000000011000000010",
            "35250112345678000123550010000000011000000011",
            "35250112345678000123550010000000011000000012",
        ],
        output_dir=str(tmp_path),
        organization_mode=MODE_FLAT,
        num_threads=4,
        progress_callback=on_progress,
        control_token=token,
    )

    assert dispatches == ["35250112345678000123550010000000011000000010"]
    assert resultado["status"] == "cancelled"
    assert resultado["processadas"] == 1


def test_download_service_pausa_no_warmup_bloqueia_novos_despachos(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_QTD", 1)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE1_THREADS", 1)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_QTD", 5)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE2_THREADS", 2)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE3_QTD", 5)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_FASE3_THREADS", 3)
    monkeypatch.setattr(download_service_module, "DOWNLOAD_WARM_UP_DELAY", 0.0)

    service = DownloadService(api_key="token")
    token = CancellationToken()
    segundo_despacho = threading.Event()
    primeiro_resultado = threading.Event()
    resultado_holder = {}

    def fake_download(chave):
        time.sleep(0.05)
        return (XML, True, None)

    def on_progress(**payload):
        if payload.get("event_type") == "dispatch" and payload["dispatched"] == 2:
            segundo_despacho.set()
        if payload.get("event_type") == "result" and payload["current"] == 1:
            token.pause()
            primeiro_resultado.set()

    monkeypatch.setattr(service.client, "download_xml", fake_download)
    thread = threading.Thread(
        target=lambda: resultado_holder.update(
            service.baixar_xmls(
                [
                    "35250112345678000123550010000000011000000010",
                    "35250112345678000123550010000000011000000011",
                    "35250112345678000123550010000000011000000012",
                ],
                output_dir=str(tmp_path),
                organization_mode=MODE_FLAT,
                num_threads=3,
                progress_callback=on_progress,
                control_token=token,
            )
        ),
        daemon=True,
    )
    thread.start()

    assert primeiro_resultado.wait(1)
    time.sleep(0.2)
    assert not segundo_despacho.is_set()

    token.resume()
    thread.join(timeout=2)

    assert resultado_holder["status"] == "completed"
    assert resultado_holder["sucesso"] == 3


def test_upload_service_envia_em_lote(monkeypatch, tmp_path: Path):
    monkeypatch.setenv("SIEG_API_KEY", "token")
    arquivo = tmp_path / "nota.xml"
    arquivo.write_text(XML, encoding="utf-8")
    service = UploadService(api_key="token")
    monkeypatch.setattr(service.client, "verify_xml_exists", lambda chave: False)
    monkeypatch.setattr(service.client, "upload_xml", lambda conteudo, silencioso=True: (True, "ok", False))
    xmls_validos, _ = service.validar_xmls([str(arquivo)])
    resultado = service.enviar_xmls(xmls_validos, num_threads=1)
    assert resultado["enviados"] == 1
    assert resultado["erros"] == 0
