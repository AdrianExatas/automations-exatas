"""
Fluxo extraordinario de consulta de XMLs na SEFAZ.
"""
from __future__ import annotations

import json
import os
import unicodedata
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Callable

from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select

from src.consulta.actions import SefazActions
from src.core.browser import SefazBrowser
from src.core.config import PATHS, SENHA_SEFAZ, USUARIO_SEFAZ, validar_configuracao_completa
from src.utils.logger import configurar_logging


COMBINACOES_FIXAS: list[tuple[str, str]] = [
    ("NFE", "Emitida"),
    ("NFE", "Recebida"),
    ("NFE", "Inutilizadas"),
    ("NFC", "Nota"),
    ("NFC", "Inutiliza\u00e7\u00e3o"),
    ("CTE", "Emitente"),
]

STATUS_ITEM_PROCESSAVEIS = {"pending", "blocked", "error"}
MENSAGENS_BLOQUEANTES = (
    "quantidade de solicitacoes diaria esgotada",
    "servico nao disponivel no momento",
)


def _agora_iso() -> str:
    return datetime.now().isoformat()


def normalizar_texto(texto: str | None) -> str:
    if not texto:
        return ""

    texto_normalizado = unicodedata.normalize("NFKD", str(texto))
    texto_sem_acentos = "".join(
        caractere
        for caractere in texto_normalizado
        if not unicodedata.combining(caractere)
    )
    texto_limpo = "".join(
        caractere if caractere.isalnum() else " "
        for caractere in texto_sem_acentos.upper()
    )
    return " ".join(texto_limpo.split())


def classificar_mensagem_portal(mensagem: str | None) -> str:
    texto_normalizado = normalizar_texto(mensagem).lower()
    if not texto_normalizado:
        return "ok"

    if any(padrao in texto_normalizado for padrao in MENSAGENS_BLOQUEANTES):
        return "blocking"

    return "warning"


def parse_data_argumento(valor: str) -> date:
    texto = (valor or "").strip()
    if not texto:
        raise ValueError("Data vazia.")

    for formato in ("%d/%m/%Y", "%d%m%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(texto, formato).date()
        except ValueError:
            continue

    raise ValueError(f"Formato de data invalido: {valor}")


def gerar_segmentos_periodo(
    data_inicial: date,
    data_final: date,
    segmentacao: str,
) -> list[dict[str, Any]]:
    if data_inicial > data_final:
        raise ValueError("Data inicial maior que data final.")

    if segmentacao not in {"mensal", "unico"}:
        raise ValueError(f"Segmentacao invalida: {segmentacao}")

    if segmentacao == "unico":
        return [
            {
                "mes_ref": "periodo_unico",
                "data_inicial": data_inicial,
                "data_final": data_final,
            }
        ]

    segmentos: list[dict[str, Any]] = []
    cursor = data_inicial
    while cursor <= data_final:
        primeiro_dia_mes = date(cursor.year, cursor.month, 1)
        proximo_mes = (primeiro_dia_mes.replace(day=28) + timedelta(days=4)).replace(day=1)
        ultimo_dia_mes = proximo_mes - timedelta(days=1)
        segmentos.append(
            {
                "mes_ref": cursor.strftime("%Y-%m"),
                "data_inicial": cursor,
                "data_final": min(ultimo_dia_mes, data_final),
            }
        )
        cursor = ultimo_dia_mes + timedelta(days=1)

    return segmentos


def construir_itens_auditoria(
    data_inicial: date,
    data_final: date,
    segmentacao: str,
    combinacoes: list[tuple[str, str]] | None = None,
) -> list[dict[str, Any]]:
    combinacoes_base = combinacoes or COMBINACOES_FIXAS
    segmentos = gerar_segmentos_periodo(data_inicial, data_final, segmentacao)

    itens: list[dict[str, Any]] = []
    ordem = 1
    for segmento in segmentos:
        for tipo_arquivo, pesquisar_por in combinacoes_base:
            itens.append(
                {
                    "ordem": ordem,
                    "mes_ref": segmento["mes_ref"],
                    "tipo_arquivo": tipo_arquivo,
                    "pesquisar_por": pesquisar_por,
                    "data_inicial": segmento["data_inicial"].isoformat(),
                    "data_final": segmento["data_final"].isoformat(),
                    "status": "pending",
                    "tentativas": 0,
                    "mensagem": "",
                    "transporte": "selenium",
                    "started_at": None,
                    "finished_at": None,
                }
            )
            ordem += 1

    return itens


def resumir_itens_por_status(auditoria: dict[str, Any]) -> dict[str, int]:
    resumo = {
        "pending": 0,
        "running": 0,
        "success": 0,
        "blocked": 0,
        "error": 0,
    }

    for item in auditoria.get("itens", []):
        status = item.get("status", "pending")
        resumo.setdefault(status, 0)
        resumo[status] += 1

    return resumo


def recalcular_status_geral(auditoria: dict[str, Any]) -> str:
    resumo = resumir_itens_por_status(auditoria)
    total_itens = len(auditoria.get("itens", []))

    if total_itens == 0:
        status = "pending"
    elif resumo.get("running", 0):
        status = "running"
    elif resumo.get("success", 0) == total_itens:
        status = "success"
    elif resumo.get("blocked", 0):
        status = "blocked"
    elif resumo.get("error", 0) and resumo.get("success", 0) == 0 and resumo.get("pending", 0) == 0:
        status = "error"
    elif resumo.get("success", 0) or resumo.get("error", 0):
        status = "partial"
    else:
        status = "pending"

    auditoria["status_geral"] = status
    auditoria["updated_at"] = _agora_iso()
    return status


def obter_itens_processaveis(auditoria: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        item
        for item in auditoria.get("itens", [])
        if item.get("status", "pending") in STATUS_ITEM_PROCESSAVEIS
    ]


def _diretorio_extraordinario() -> Path:
    diretorio = PATHS.checkpoints_dir / "extraordinario"
    diretorio.mkdir(parents=True, exist_ok=True)
    return diretorio


def caminho_auditoria(lote_id: str, audit_path: Path | None = None) -> Path:
    if audit_path is not None:
        return Path(audit_path)
    return _diretorio_extraordinario() / f"{lote_id}.json"


def carregar_auditoria(lote_id: str, audit_path: Path | None = None) -> dict[str, Any] | None:
    destino = caminho_auditoria(lote_id, audit_path=audit_path)
    if not destino.exists():
        return None

    with open(destino, "r", encoding="utf-8") as arquivo:
        return json.load(arquivo)


def salvar_auditoria(auditoria: dict[str, Any], audit_path: Path | None = None) -> Path:
    destino = caminho_auditoria(auditoria["lote_id"], audit_path=audit_path)
    destino.parent.mkdir(parents=True, exist_ok=True)

    arquivo_temporario = destino.with_suffix(".tmp")
    with open(arquivo_temporario, "w", encoding="utf-8") as arquivo:
        json.dump(auditoria, arquivo, indent=2, ensure_ascii=False)
    os.replace(arquivo_temporario, destino)
    return destino


def criar_auditoria(
    lote_id: str,
    inscricao: str,
    nome_esperado: str,
    data_inicial: date,
    data_final: date,
    segmentacao: str,
) -> dict[str, Any]:
    agora = _agora_iso()
    return {
        "lote_id": lote_id,
        "inscricao": str(inscricao),
        "nome_esperado": nome_esperado,
        "periodo": {
            "data_inicial": data_inicial.isoformat(),
            "data_final": data_final.isoformat(),
        },
        "segmentacao": segmentacao,
        "created_at": agora,
        "updated_at": agora,
        "finished_at": None,
        "status_geral": "pending",
        "itens": construir_itens_auditoria(
            data_inicial=data_inicial,
            data_final=data_final,
            segmentacao=segmentacao,
        ),
    }


def validar_auditoria_existente(
    auditoria: dict[str, Any],
    *,
    inscricao: str,
    nome_esperado: str,
    data_inicial: date,
    data_final: date,
    segmentacao: str,
) -> None:
    periodo = auditoria.get("periodo", {})
    inconsistencias = []

    if str(auditoria.get("inscricao")) != str(inscricao):
        inconsistencias.append("inscricao")
    if normalizar_texto(auditoria.get("nome_esperado")) != normalizar_texto(nome_esperado):
        inconsistencias.append("nome_esperado")
    if periodo.get("data_inicial") != data_inicial.isoformat():
        inconsistencias.append("data_inicial")
    if periodo.get("data_final") != data_final.isoformat():
        inconsistencias.append("data_final")
    if auditoria.get("segmentacao") != segmentacao:
        inconsistencias.append("segmentacao")

    if inconsistencias:
        raise ValueError(
            "Auditoria existente nao corresponde aos parametros informados: "
            + ", ".join(inconsistencias)
        )


def carregar_ou_criar_auditoria(
    *,
    lote_id: str,
    inscricao: str,
    nome_esperado: str,
    data_inicial: date,
    data_final: date,
    segmentacao: str,
    reiniciar: bool = False,
    audit_path: Path | None = None,
) -> dict[str, Any]:
    existente = None if reiniciar else carregar_auditoria(lote_id, audit_path=audit_path)
    if existente is not None:
        validar_auditoria_existente(
            existente,
            inscricao=inscricao,
            nome_esperado=nome_esperado,
            data_inicial=data_inicial,
            data_final=data_final,
            segmentacao=segmentacao,
        )
        return existente

    auditoria = criar_auditoria(
        lote_id=lote_id,
        inscricao=inscricao,
        nome_esperado=nome_esperado,
        data_inicial=data_inicial,
        data_final=data_final,
        segmentacao=segmentacao,
    )
    salvar_auditoria(auditoria, audit_path=audit_path)
    return auditoria


def verificar_lock_global() -> bool:
    lock_file = PATHS.lock_dir / "sefaz_global.lock"

    if lock_file.exists():
        try:
            pid = int(lock_file.read_text(encoding="utf-8").strip())
            try:
                import psutil

                processo = psutil.Process(pid)
                if processo.is_running():
                    cmdline = " ".join(processo.cmdline()).lower()
                    if any(palavra in cmdline for palavra in ("sefaz", "xml", "consulta", "download")):
                        return False
            except ImportError:
                try:
                    lock_file.unlink()
                except OSError:
                    pass
            except Exception:
                try:
                    lock_file.unlink()
                except OSError:
                    pass
        except Exception:
            try:
                lock_file.unlink()
            except OSError:
                pass

    lock_file.write_text(str(os.getpid()), encoding="utf-8")
    return True


def remover_lock_global() -> None:
    lock_file = PATHS.lock_dir / "sefaz_global.lock"
    try:
        if lock_file.exists():
            lock_file.unlink()
    except OSError:
        pass


class ConsultaExtraordinariaService:
    def __init__(
        self,
        *,
        inscricao: str,
        nome_esperado: str,
        data_inicial: date,
        data_final: date,
        lote_id: str,
        segmentacao: str = "mensal",
        headless: bool = False,
        audit_path: Path | None = None,
        browser_factory: Callable[..., Any] = SefazBrowser,
        actions_factory: Callable[..., Any] = SefazActions,
        validate_config: Callable[[], tuple[bool, list[str]]] = validar_configuracao_completa,
        acquire_lock: Callable[[], bool] = verificar_lock_global,
        release_lock: Callable[[], None] = remover_lock_global,
        logger=None,
    ) -> None:
        self.inscricao = str(inscricao)
        self.nome_esperado = nome_esperado
        self.data_inicial = data_inicial
        self.data_final = data_final
        self.lote_id = lote_id
        self.segmentacao = segmentacao
        self.headless = headless
        self.audit_path = caminho_auditoria(lote_id, audit_path=audit_path)
        self.browser_factory = browser_factory
        self.actions_factory = actions_factory
        self.validate_config = validate_config
        self.acquire_lock = acquire_lock
        self.release_lock = release_lock
        self.logger = logger or configurar_logging("consulta_extraordinaria")

    def carregar_auditoria(self, reiniciar: bool = False) -> dict[str, Any]:
        return carregar_ou_criar_auditoria(
            lote_id=self.lote_id,
            inscricao=self.inscricao,
            nome_esperado=self.nome_esperado,
            data_inicial=self.data_inicial,
            data_final=self.data_final,
            segmentacao=self.segmentacao,
            reiniciar=reiniciar,
            audit_path=self.audit_path,
        )

    def mostrar_status(self, reiniciar: bool = False) -> dict[str, Any]:
        auditoria = self.carregar_auditoria(reiniciar=reiniciar)
        resumo = resumir_itens_por_status(auditoria)

        print("=" * 72)
        print(f"LOTE EXTRAORDINARIO: {auditoria['lote_id']}")
        print("=" * 72)
        print(f"Inscricao: {auditoria['inscricao']}")
        print(f"Nome esperado: {auditoria['nome_esperado']}")
        print(
            f"Periodo: {auditoria['periodo']['data_inicial']} ate "
            f"{auditoria['periodo']['data_final']}"
        )
        print(f"Segmentacao: {auditoria['segmentacao']}")
        print(f"Status geral: {auditoria['status_geral']}")
        print(f"Arquivo de auditoria: {self.audit_path}")
        print(f"Total de itens: {len(auditoria.get('itens', []))}")
        print(
            "Resumo: "
            f"pending={resumo.get('pending', 0)}, "
            f"running={resumo.get('running', 0)}, "
            f"success={resumo.get('success', 0)}, "
            f"blocked={resumo.get('blocked', 0)}, "
            f"error={resumo.get('error', 0)}"
        )
        print("-" * 72)

        for item in auditoria.get("itens", []):
            print(
                f"{item['ordem']:03d} | {item['mes_ref']} | "
                f"{item['tipo_arquivo']}/{item['pesquisar_por']} | "
                f"{item['data_inicial']} ate {item['data_final']} | "
                f"status={item['status']} | tentativas={item['tentativas']}"
            )

        print("=" * 72)
        return auditoria

    def executar(self, reiniciar: bool = False) -> bool:
        auditoria = self.carregar_auditoria(reiniciar=reiniciar)
        itens_processaveis = obter_itens_processaveis(auditoria)
        if not itens_processaveis:
            recalcular_status_geral(auditoria)
            salvar_auditoria(auditoria, audit_path=self.audit_path)
            print("[INFO] Nenhum item pendente para processar neste lote.")
            return auditoria.get("status_geral") == "success"

        sucesso_config, erros_config = self.validate_config()
        if not sucesso_config:
            for erro in erros_config:
                self.logger.error(erro)
            auditoria["finished_at"] = _agora_iso()
            auditoria["status_geral"] = "error"
            salvar_auditoria(auditoria, audit_path=self.audit_path)
            return False

        if not self.acquire_lock():
            self.logger.warning("Ja existe outra execucao do SEFAZ em andamento.")
            auditoria["status_geral"] = "blocked"
            auditoria["finished_at"] = _agora_iso()
            auditoria["updated_at"] = _agora_iso()
            salvar_auditoria(auditoria, audit_path=self.audit_path)
            return False

        browser = None
        try:
            browser = self.browser_factory(headless=self.headless)
            if not browser.fazer_login(USUARIO_SEFAZ, SENHA_SEFAZ):
                raise RuntimeError("Falha ao fazer login no portal SEFAZ.")
            if not browser.navegar_para_menu_xml():
                raise RuntimeError("Falha ao navegar ate o menu de solicitacao de XML.")

            empresa_portal = self._validar_empresa_no_portal(browser)
            self.logger.info(
                "Empresa validada no portal: %s (%s)",
                empresa_portal["nome_portal"],
                empresa_portal["inscricao"],
            )

            actions = self.actions_factory(browser)
            for item in auditoria.get("itens", []):
                if item.get("status") not in STATUS_ITEM_PROCESSAVEIS:
                    continue

                self._marcar_item_em_execucao(auditoria, item)
                salvar_auditoria(auditoria, audit_path=self.audit_path)

                try:
                    resultado = self._processar_item(actions, item)
                except Exception as exc:
                    resultado = {
                        "status": "error",
                        "mensagem": str(exc),
                    }
                item["mensagem"] = resultado["mensagem"]
                item["finished_at"] = _agora_iso()

                if resultado["status"] == "success":
                    item["status"] = "success"
                    recalcular_status_geral(auditoria)
                    salvar_auditoria(auditoria, audit_path=self.audit_path)
                    if not self._recuperar_contexto(browser):
                        self.logger.error(
                            "Falha ao reabrir o formulario apos o item %s.",
                            item["ordem"],
                        )
                        break
                    continue

                item["status"] = resultado["status"]
                recalcular_status_geral(auditoria)
                salvar_auditoria(auditoria, audit_path=self.audit_path)

                if resultado["status"] == "blocked":
                    self.logger.warning(
                        "Lote interrompido por bloqueio do portal no item %s: %s",
                        item["ordem"],
                        resultado["mensagem"],
                    )
                    break

                if not self._recuperar_contexto(browser):
                    self.logger.error(
                        "Falha ao recuperar o contexto apos erro no item %s.",
                        item["ordem"],
                    )
                    break

            auditoria["finished_at"] = _agora_iso()
            recalcular_status_geral(auditoria)
            salvar_auditoria(auditoria, audit_path=self.audit_path)
            return auditoria.get("status_geral") == "success"

        except Exception as exc:
            self.logger.error("Erro critico no lote extraordinario: %s", exc)
            auditoria["finished_at"] = _agora_iso()
            auditoria["status_geral"] = "error"
            auditoria["updated_at"] = _agora_iso()
            salvar_auditoria(auditoria, audit_path=self.audit_path)
            return False
        finally:
            self.release_lock()
            if browser is not None:
                browser.fechar()

    def _validar_empresa_no_portal(self, browser) -> dict[str, str]:
        wait = browser.get_wait()
        select_empresas = wait.until(EC.presence_of_element_located((By.ID, "cdPessoaContribuinte")))
        select = Select(select_empresas)

        for opcao in select.options:
            valor = (opcao.get_attribute("value") or "").strip()
            texto = (opcao.text or "").strip()
            if not valor or not texto or texto.lower().startswith("selecione"):
                continue
            if valor != self.inscricao:
                continue

            if self.nome_esperado:
                nome_esperado_normalizado = normalizar_texto(self.nome_esperado)
                texto_normalizado = normalizar_texto(texto)
                if nome_esperado_normalizado not in texto_normalizado:
                    raise ValueError(
                        "A inscricao foi localizada, mas o nome no portal nao corresponde "
                        f"ao esperado. Portal: '{texto}'."
                    )

            return {
                "inscricao": valor,
                "nome_portal": texto,
            }

        raise ValueError(
            f"Inscricao {self.inscricao} nao encontrada no portal para o lote extraordinario."
        )

    def _marcar_item_em_execucao(self, auditoria: dict[str, Any], item: dict[str, Any]) -> None:
        item["status"] = "running"
        item["tentativas"] = int(item.get("tentativas", 0)) + 1
        item["started_at"] = _agora_iso()
        item["finished_at"] = None
        recalcular_status_geral(auditoria)

    def _processar_item(self, actions, item: dict[str, Any]) -> dict[str, str]:
        data_inicial = date.fromisoformat(item["data_inicial"]).strftime("%d/%m/%Y")
        data_final = date.fromisoformat(item["data_final"]).strftime("%d/%m/%Y")
        params = {
            "inscricao_municipal": self.inscricao,
            "tipo_arquivo": item["tipo_arquivo"],
            "pesquisar_por": item["pesquisar_por"],
            "data_inicial": data_inicial,
            "data_final": data_final,
        }

        self.logger.info(
            "Processando item %s: %s/%s %s ate %s",
            item["ordem"],
            item["tipo_arquivo"],
            item["pesquisar_por"],
            data_inicial,
            data_final,
        )

        if item["tipo_arquivo"] in {"NFE", "NFC"}:
            sucesso, mensagem = actions.processar_solicitacao_nfe_nfc(params)
        elif item["tipo_arquivo"] == "CTE":
            sucesso, mensagem = actions.processar_solicitacao_cte(params)
        else:
            return {
                "status": "error",
                "mensagem": f"Tipo de arquivo desconhecido: {item['tipo_arquivo']}",
            }

        mensagem_final = mensagem or (
            "Solicitacao concluida com sucesso" if sucesso else "Falha sem mensagem do portal"
        )
        classificacao = classificar_mensagem_portal(mensagem_final)

        if classificacao == "blocking":
            return {"status": "blocked", "mensagem": mensagem_final}
        if sucesso:
            return {"status": "success", "mensagem": mensagem_final}
        return {"status": "error", "mensagem": mensagem_final}

    def _recuperar_contexto(self, browser) -> bool:
        try:
            if browser.voltar_para_nova_solicitacao():
                return True
        except Exception:
            pass
        try:
            return browser.navegar_para_menu_xml()
        except Exception:
            return False


__all__ = [
    "COMBINACOES_FIXAS",
    "ConsultaExtraordinariaService",
    "STATUS_ITEM_PROCESSAVEIS",
    "caminho_auditoria",
    "carregar_auditoria",
    "carregar_ou_criar_auditoria",
    "classificar_mensagem_portal",
    "construir_itens_auditoria",
    "criar_auditoria",
    "gerar_segmentos_periodo",
    "normalizar_texto",
    "obter_itens_processaveis",
    "parse_data_argumento",
    "recalcular_status_geral",
    "resumir_itens_por_status",
    "salvar_auditoria",
]
