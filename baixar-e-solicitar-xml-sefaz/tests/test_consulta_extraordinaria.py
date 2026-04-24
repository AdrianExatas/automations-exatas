"""
Testes do fluxo extraordinario de consulta.
"""
import tempfile
import unittest
from datetime import date
from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src.consulta.extraordinaria import (
    ConsultaExtraordinariaService,
    carregar_auditoria,
    carregar_ou_criar_auditoria,
    classificar_mensagem_portal,
    construir_itens_auditoria,
    gerar_segmentos_periodo,
    obter_itens_processaveis,
    salvar_auditoria,
)
from src.consulta.historico import HISTORICO_FILE


class _FakeBrowser:
    def __init__(self, headless: bool = False):
        self.headless = headless
        self.closed = False
        self.navigation_calls = 0

    def fazer_login(self, usuario: str, senha: str) -> bool:
        return True

    def navegar_para_menu_xml(self) -> bool:
        self.navigation_calls += 1
        return True

    def voltar_para_nova_solicitacao(self) -> bool:
        self.navigation_calls += 1
        return True

    def fechar(self) -> None:
        self.closed = True


class _FakeActionsBlocking:
    def __init__(self, browser):
        self.browser = browser

    def processar_solicitacao_nfe_nfc(self, params):
        return True, "Quantidade de solicita\u00e7\u00f5es di\u00e1ria esgotada."

    def processar_solicitacao_cte(self, params):
        return True, "Quantidade de solicita\u00e7\u00f5es di\u00e1ria esgotada."


class _SilentLogger:
    def info(self, *args, **kwargs):
        return None

    def warning(self, *args, **kwargs):
        return None

    def error(self, *args, **kwargs):
        return None


class _TestableConsultaExtraordinariaService(ConsultaExtraordinariaService):
    def _validar_empresa_no_portal(self, browser):
        return {
            "inscricao": self.inscricao,
            "nome_portal": f"{self.inscricao} - {self.nome_esperado}",
        }


class TestConsultaExtraordinaria(unittest.TestCase):
    def setUp(self):
        self.historico_backup = HISTORICO_FILE.read_bytes() if HISTORICO_FILE.exists() else None

    def tearDown(self):
        if self.historico_backup is None:
            if HISTORICO_FILE.exists():
                HISTORICO_FILE.unlink()
        else:
            HISTORICO_FILE.write_bytes(self.historico_backup)

    def test_segmentacao_mensal_gera_12_fatias_e_72_itens(self):
        segmentos = gerar_segmentos_periodo(date(2025, 1, 1), date(2025, 12, 31), "mensal")
        itens = construir_itens_auditoria(date(2025, 1, 1), date(2025, 12, 31), "mensal")

        self.assertEqual(len(segmentos), 12)
        self.assertEqual(len(itens), 72)
        self.assertEqual(itens[0]["mes_ref"], "2025-01")
        self.assertEqual(itens[0]["tipo_arquivo"], "NFE")
        self.assertEqual(itens[0]["pesquisar_por"], "Emitida")
        self.assertEqual(itens[0]["data_inicial"], "2025-01-01")
        self.assertEqual(itens[0]["data_final"], "2025-01-31")
        self.assertEqual(itens[-1]["mes_ref"], "2025-12")
        self.assertEqual(itens[-1]["tipo_arquivo"], "CTE")
        self.assertEqual(itens[-1]["pesquisar_por"], "Emitente")
        self.assertEqual(itens[-1]["data_inicial"], "2025-12-01")
        self.assertEqual(itens[-1]["data_final"], "2025-12-31")

    def test_retomada_pula_success_e_reprocessa_pending_blocked_error(self):
        with tempfile.TemporaryDirectory() as tempdir:
            audit_path = Path(tempdir) / "retroativo.json"
            auditoria = carregar_ou_criar_auditoria(
                lote_id="retroativo_teste",
                inscricao="271219858",
                nome_esperado="P T C SANTOS INDUSTRIA E COMERCIO PEDRO THIAGO LTDA",
                data_inicial=date(2025, 1, 1),
                data_final=date(2025, 12, 31),
                segmentacao="mensal",
                audit_path=audit_path,
            )

            auditoria["itens"][0]["status"] = "success"
            auditoria["itens"][1]["status"] = "blocked"
            auditoria["itens"][2]["status"] = "error"
            salvar_auditoria(auditoria, audit_path=audit_path)

            recarregada = carregar_ou_criar_auditoria(
                lote_id="retroativo_teste",
                inscricao="271219858",
                nome_esperado="P T C SANTOS INDUSTRIA E COMERCIO PEDRO THIAGO LTDA",
                data_inicial=date(2025, 1, 1),
                data_final=date(2025, 12, 31),
                segmentacao="mensal",
                audit_path=audit_path,
            )
            processaveis = obter_itens_processaveis(recarregada)

            self.assertEqual(len(processaveis), 71)
            self.assertEqual(processaveis[0]["ordem"], 2)
            self.assertEqual(processaveis[0]["status"], "blocked")
            self.assertEqual(processaveis[1]["ordem"], 3)
            self.assertEqual(processaveis[1]["status"], "error")
            self.assertEqual(processaveis[2]["ordem"], 4)
            self.assertEqual(processaveis[2]["status"], "pending")

    def test_classifica_mensagens_bloqueantes(self):
        self.assertEqual(
            classificar_mensagem_portal("Quantidade de solicita\u00e7\u00f5es di\u00e1ria esgotada."),
            "blocking",
        )
        self.assertEqual(
            classificar_mensagem_portal("Servi\u00e7o n\u00e3o dispon\u00edvel no momento"),
            "blocking",
        )
        self.assertEqual(classificar_mensagem_portal("Solicita\u00e7\u00e3o enviada com aviso."), "warning")

    def test_bloqueio_interrompe_lote_sem_tocar_historico_diario(self):
        historico_antes = HISTORICO_FILE.read_bytes() if HISTORICO_FILE.exists() else None

        with tempfile.TemporaryDirectory() as tempdir:
            audit_path = Path(tempdir) / "retroativo_bloqueado.json"
            service = _TestableConsultaExtraordinariaService(
                inscricao="271219858",
                nome_esperado="P T C SANTOS INDUSTRIA E COMERCIO PEDRO THIAGO LTDA",
                data_inicial=date(2025, 1, 1),
                data_final=date(2025, 1, 31),
                lote_id="retroativo_bloqueado",
                segmentacao="unico",
                headless=False,
                audit_path=audit_path,
                browser_factory=_FakeBrowser,
                actions_factory=_FakeActionsBlocking,
                validate_config=lambda: (True, []),
                acquire_lock=lambda: True,
                release_lock=lambda: None,
                logger=_SilentLogger(),
            )

            sucesso = service.executar(reiniciar=True)
            self.assertFalse(sucesso)

            auditoria = carregar_auditoria("retroativo_bloqueado", audit_path=audit_path)
            self.assertIsNotNone(auditoria)
            self.assertEqual(auditoria["status_geral"], "blocked")
            self.assertEqual(auditoria["itens"][0]["status"], "blocked")
            self.assertEqual(auditoria["itens"][0]["tentativas"], 1)
            self.assertTrue(all(item["status"] == "pending" for item in auditoria["itens"][1:]))

        historico_depois = HISTORICO_FILE.read_bytes() if HISTORICO_FILE.exists() else None
        self.assertEqual(historico_depois, historico_antes)


if __name__ == "__main__":
    unittest.main()
