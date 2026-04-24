from sieg_xml.gui.controllers.download_controller import DownloadController
from sieg_xml.gui.controllers.reorganize_controller import ReorganizeController


class DummyVar:
    def __init__(self, value=None):
        self.value = value

    def get(self):
        return self.value

    def set(self, value):
        self.value = value


class DummyButton:
    def __init__(self):
        self.state = None
        self.command = None

    def config(self, **kwargs):
        if "state" in kwargs:
            self.state = kwargs["state"]
        if "command" in kwargs:
            self.command = kwargs["command"]


class DummyText:
    def __init__(self):
        self.value = ""
        self.modified = False
        self.bindings = {}

    def get(self, _start, _end):
        return self.value

    def delete(self, _start, _end):
        self.value = ""

    def insert(self, _start, value):
        self.value = value

    def edit_modified(self, value=None):
        if value is None:
            return self.modified
        self.modified = value

    def bind(self, event, callback):
        self.bindings[event] = callback


class DummyRoot:
    def __init__(self):
        self.scheduled = {}
        self.next_job = 0

    def after(self, delay, func):
        if delay == 0:
            func()
            return "immediate"
        job = f"job-{self.next_job}"
        self.next_job += 1
        self.scheduled[job] = func
        return job

    def after_cancel(self, job):
        self.scheduled.pop(job, None)

    def run_scheduled(self):
        jobs = list(self.scheduled.items())
        self.scheduled.clear()
        for _, func in jobs:
            func()


class DummyProgress:
    def __init__(self):
        self.status = None
        self.indeterminate = False
        self.progress_calls = []
        self.reset_calls = 0

    def reset(self):
        self.reset_calls += 1
        self.status = "Pronto"
        self.progress_calls.clear()

    def set_status(self, text):
        self.status = text

    def set_indeterminate(self, active=True):
        self.indeterminate = active

    def set_progress(self, value, maximum=100):
        self.progress_calls.append((value, maximum))


class DummyLogViewer:
    def __init__(self):
        self.messages = []

    def info(self, message):
        self.messages.append(("info", message))

    def warning(self, message):
        self.messages.append(("warning", message))

    def success(self, message):
        self.messages.append(("success", message))

    def error(self, message):
        self.messages.append(("error", message))

    def clear(self):
        self.messages.clear()


class DummyDownloadView:
    def __init__(self):
        self.source_mode = DummyVar("file")
        self.output_dir_var = DummyVar("")
        self.summary_var = DummyVar("")
        self.download_mode_var = DummyVar("Por ano")
        self.download_threads_var = DummyVar(6)
        self.pause_button_var = DummyVar("Pausar")
        self.manual_text = DummyText()
        self.start_button = DummyButton()
        self.retry_button = DummyButton()
        self.pause_button = DummyButton()
        self.cancel_button = DummyButton()
        self.clear_button = DummyButton()
        self.select_file_button = DummyButton()
        self.select_output_dir_button = DummyButton()
        self.open_output_button = DummyButton()
        self.update_source_mode_calls = 0
        self.callbacks = {}
        self.source_files_set: list[list[str]] = []

    def bind_actions(self, **callbacks):
        self.callbacks = callbacks

    def set_source_files(self, paths: list[str]) -> None:
        self.source_files_set.append(list(paths))

    def update_source_mode(self):
        self.update_source_mode_calls += 1


class DummyReorganizeView:
    def __init__(self):
        self.reorganize_dir_var = DummyVar("")
        self.reorganize_mode_var = DummyVar("Por ano")
        self.reorganize_button = DummyButton()
        self.select_dir_button = DummyButton()
        self.callbacks = {}

    def bind_actions(self, **callbacks):
        self.callbacks = callbacks


def _make_download_controller():
    root = DummyRoot()
    view = DummyDownloadView()
    progress = DummyProgress()
    log_viewer = DummyLogViewer()
    messages = []

    controller = DownloadController(
        root=root,
        view=view,
        progress=progress,
        log_viewer=log_viewer,
        show_error=lambda title, message: messages.append(("error", title, message)),
        show_warning=lambda title, message: messages.append(("warning", title, message)),
        show_info=lambda title, message: messages.append(("info", title, message)),
        refresh_actions=lambda: controller.refresh_view_state(False),
    )
    return controller, root, view, progress, log_viewer, messages


def _make_reorganize_controller():
    root = DummyRoot()
    view = DummyReorganizeView()
    progress = DummyProgress()
    log_viewer = DummyLogViewer()
    messages = []

    controller = ReorganizeController(
        root=root,
        view=view,
        progress=progress,
        log_viewer=log_viewer,
        show_error=lambda title, message: messages.append(("error", title, message)),
        refresh_actions=lambda: controller.refresh_view_state(False),
    )
    return controller, root, view, progress, log_viewer, messages


def test_download_controller_finish_download_habilita_retry_quando_ha_falhas():
    controller, _, view, progress, _, _ = _make_download_controller()

    controller.finish_download(
        {
            "status": "completed",
            "sucesso": 2,
            "falhas": 1,
            "pendentes": 0,
            "output_dir": "C:/xmls",
            "chaves_com_falha": ["35250112345678000123550010000000011000000011"],
        },
        None,
        False,
    )

    assert controller.last_failed_keys == ["35250112345678000123550010000000011000000011"]
    assert view.retry_button.state == "normal"
    assert progress.status == "Download concluido"


def test_download_controller_finish_download_desabilita_retry_sem_falhas():
    controller, _, view, _, log_viewer, _ = _make_download_controller()
    controller.last_failed_keys = ["35250112345678000123550010000000011000000011"]

    controller.finish_download(
        {
            "status": "completed",
            "sucesso": 2,
            "falhas": 0,
            "pendentes": 0,
            "output_dir": "C:/xmls",
            "chaves_com_falha": [],
        },
        None,
        True,
    )

    assert controller.last_failed_keys == []
    assert view.retry_button.state == "disabled"
    assert ("info", "Resultado consolidado apos reprocessamento. Falhas remanescentes: 0.") in log_viewer.messages


def test_download_controller_retry_reutiliza_configuracao_da_ultima_sessao():
    controller, _, _, _, _, _ = _make_download_controller()
    chamadas = []
    controller.last_failed_keys = [
        "35250112345678000123550010000000011000000011",
        "35250112345678000123550010000000011000000012",
    ]
    controller.last_download_request = {
        "keys": ["a", "b"],
        "output_dir": "C:/saida",
        "organization_mode": "year_month",
        "num_threads": 4,
    }

    def fake_begin_download(keys, *, output_dir, organization_mode, num_threads, is_retry):
        chamadas.append(
            {
                "keys": keys,
                "output_dir": output_dir,
                "organization_mode": organization_mode,
                "num_threads": num_threads,
                "is_retry": is_retry,
            }
        )

    controller.begin_download = fake_begin_download
    controller.start_retry_download()

    assert chamadas == [
        {
            "keys": [
                "35250112345678000123550010000000011000000011",
                "35250112345678000123550010000000011000000012",
            ],
            "output_dir": "C:/saida",
            "organization_mode": "year_month",
            "num_threads": 4,
            "is_retry": True,
        }
    ]


def test_download_controller_start_download_reaproveita_validacao_automatica():
    controller, _, view, _, _, _ = _make_download_controller()
    controller.source_files = ["C:/entrada.xlsx"]
    view.output_dir_var.set("C:/saida")
    controller.validated_keys = ["35250112345678000123550010000000011000000010"]
    controller.last_validation_signature = ("file", ("C:/entrada.xlsx",))
    controller.last_validation_ok = True

    chamadas_validacao = []
    chamadas_begin = []

    def fake_run_auto_validation():
        chamadas_validacao.append("run")
        return True

    def fake_begin_download(keys, *, output_dir, organization_mode, num_threads, is_retry):
        chamadas_begin.append(
            {
                "keys": keys,
                "output_dir": output_dir,
                "organization_mode": organization_mode,
                "num_threads": num_threads,
                "is_retry": is_retry,
            }
        )

    controller.run_auto_validation = fake_run_auto_validation
    controller.begin_download = fake_begin_download
    controller.start_download()

    assert chamadas_validacao == []
    assert chamadas_begin == [
        {
            "keys": ["35250112345678000123550010000000011000000010"],
            "output_dir": "C:/saida",
            "organization_mode": "year",
            "num_threads": 6,
            "is_retry": False,
        }
    ]


def test_download_controller_dispatch_progress_mantem_barra_indeterminada_ate_primeiro_resultado():
    controller, _, _, progress, log_viewer, _ = _make_download_controller()
    controller.download_received_result = False

    controller.handle_download_progress(
        event_type="dispatch",
        current=0,
        total=10,
        chave="35250112345678000123550010000000011000000010",
        success=False,
        message="Aquecendo conexoes (1/10, limite atual: 1)",
        output_path=None,
    )

    assert progress.status == "Aquecendo conexoes (1/10, limite atual: 1)"
    assert progress.indeterminate is False

    progress.set_indeterminate(True)
    controller.handle_download_progress(
        event_type="result",
        current=1,
        total=10,
        chave="35250112345678000123550010000000011000000010",
        success=True,
        message="ok",
        output_path="C:/saida/nota.xml",
    )

    assert controller.download_received_result is True
    assert progress.indeterminate is False
    assert progress.progress_calls[-1] == (1, 10)
    assert progress.status == "Baixando XML 1/10"
    assert ("info", "[Download 1/10] 35250112345678000123550010000000011000000010 OK") in log_viewer.messages


def test_reorganize_controller_finish_reorganize_registra_resumo():
    controller, _, _, progress, log_viewer, _ = _make_reorganize_controller()

    controller.finish_reorganize(
        {
            "movidos": 3,
            "ja_organizados": 1,
            "conflitos": 0,
            "sem_data": 2,
            "erros": 0,
        },
        None,
    )

    assert progress.status == "Reorganizacao concluida"
    assert log_viewer.messages[-1] == (
        "success",
        "Reorganizacao concluida. Movidos: 3 | Ja organizados: 1 | Conflitos: 0 | Sem data: 2 | Erros: 0",
    )
