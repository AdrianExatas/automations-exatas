"""Servico para download de XMLs da API SIEG."""

from __future__ import annotations

import os
import time
from datetime import datetime
from concurrent.futures import FIRST_COMPLETED, Future, ThreadPoolExecutor, wait
from typing import Callable, Optional

from ..api.client import SiegAPIClient
from ..config import (
    DOWNLOAD_WARM_UP_DELAY,
    DOWNLOAD_WARM_UP_FASE1_QTD,
    DOWNLOAD_WARM_UP_FASE1_THREADS,
    DOWNLOAD_WARM_UP_FASE2_QTD,
    DOWNLOAD_WARM_UP_FASE2_THREADS,
    DOWNLOAD_WARM_UP_FASE3_QTD,
    DOWNLOAD_WARM_UP_FASE3_THREADS,
    NUM_THREADS_DOWNLOAD,
    PASTA_XMLS_BAIXADOS,
    inferir_tipo_documento_chave,
)
from ..core.xml_organizer import MODE_FLAT, MODE_YEAR, MODE_YEAR_MONTH, ORGANIZER_MODES
from ..core.xml_parser import extrair_data_xml, validar_xml
from ..utils.concurrency import CancellationToken

NUM_DETALHES_ERRO = 5
ORGANIZATION_MODES = ORGANIZER_MODES


class DownloadService:
    """Servico para download e organizacao de XMLs."""

    def __init__(self, api_key: Optional[str] = None):
        self.client = SiegAPIClient(api_key)
        self.pasta_xmls = PASTA_XMLS_BAIXADOS
        os.makedirs(self.pasta_xmls, exist_ok=True)

    def baixar_xmls(
        self,
        chaves: list[str],
        *,
        output_dir: str | None = None,
        organization_mode: str = MODE_YEAR,
        num_threads: int = NUM_THREADS_DOWNLOAD,
        progress_callback: Callable[..., None] | None = None,
        control_token: CancellationToken | None = None,
    ) -> dict[str, object]:
        """
        Baixa XMLs para uma lista de chaves de acesso.

        Args:
            chaves: Lista de chaves de acesso com 44 digitos.
            output_dir: Pasta base de saida desta execucao.
            organization_mode: flat, year ou year_month.
            num_threads: Quantidade de downloads concorrentes.
            progress_callback: Callback chamado ao final de cada chave.
            control_token: Estado cooperativo de pausa/cancelamento.
        """
        if organization_mode not in ORGANIZATION_MODES:
            raise ValueError(f"Modo de organizacao invalido: {organization_mode}")
        if num_threads < 1:
            raise ValueError("Numero de threads deve ser maior ou igual a 1")

        if output_dir:
            self.pasta_xmls = output_dir
        os.makedirs(self.pasta_xmls, exist_ok=True)

        sucesso = 0
        falhas = 0
        processadas = 0
        chaves_com_falha: list[str] = []
        status = "completed"

        print(f"\n{'=' * 60}")
        print("Iniciando download dos XMLs...")
        print(f"{'=' * 60}\n")

        detalhes_mostrados = 0
        total = len(chaves)
        with ThreadPoolExecutor(max_workers=min(num_threads, total or 1)) as executor:
            futuros: dict[Future, str] = {}
            chaves_pendentes = iter(chaves)
            despachadas = 0

            while True:
                target_concurrency, fase, deve_aguardar = self._resolve_warmup_state(despachadas, num_threads)
                while len(futuros) < target_concurrency:
                    if control_token is not None:
                        control_token.wait_if_paused()
                        if control_token.is_cancelled():
                            status = "cancelled"
                            break

                    try:
                        chave = next(chaves_pendentes)
                    except StopIteration:
                        break

                    tipo = inferir_tipo_documento_chave(chave)
                    if tipo in {"CTe", "NFCe"}:
                        print(f"[{processadas + len(futuros) + 1}/{total}] Agendando chave ({tipo}): {chave}")
                    else:
                        print(f"[{processadas + len(futuros) + 1}/{total}] Agendando chave: {chave}")
                    futuros[executor.submit(self._download_single, chave, organization_mode)] = chave
                    despachadas += 1
                    self._emit_progress(
                        progress_callback,
                        event_type="dispatch",
                        current=0,
                        total=total,
                        chave=chave,
                        success=False,
                        message=self._build_dispatch_message(fase, despachadas, total, target_concurrency),
                        output_path=None,
                        dispatched=despachadas,
                        phase=fase,
                        target_concurrency=target_concurrency,
                    )
                    if deve_aguardar and despachadas < total:
                        self._wait_for_warmup(control_token, DOWNLOAD_WARM_UP_DELAY)

                if not futuros:
                    break

                concluidos, _ = wait(futuros.keys(), return_when=FIRST_COMPLETED)
                for futuro in concluidos:
                    chave = futuros.pop(futuro)
                    processadas += 1
                    resultado = futuro.result()

                    if resultado["success"]:
                        sucesso += 1
                        print(f"  OK - XML baixado e salvo{resultado['info_data']}: {resultado['output_path']}")
                    else:
                        print(f"  ERRO: Falha ao baixar XML para chave: {chave}")
                        if resultado["message"] and detalhes_mostrados < NUM_DETALHES_ERRO:
                            print(f"    Detalhe: {resultado['message']}")
                            detalhes_mostrados += 1
                        falhas += 1
                        chaves_com_falha.append(chave)

                    self._emit_progress(
                        progress_callback,
                        event_type="result",
                        current=processadas,
                        total=total,
                        chave=chave,
                        success=bool(resultado["success"]),
                        message=str(resultado["message"]),
                        output_path=resultado["output_path"],
                        dispatched=despachadas,
                    )

                if status == "cancelled" and not futuros:
                    break

        pendentes = total - processadas
        print(f"\n{'=' * 60}")
        print("Resumo do download")
        print(f"{'=' * 60}")
        print(f"  Status:  {status}")
        print(f"  Sucesso: {sucesso}")
        print(f"  Falhas:  {falhas}")
        print(f"  Total:   {total}")
        print(f"  Pendentes: {pendentes}")

        arquivo_falhas = None
        if chaves_com_falha:
            arquivo_falhas = os.path.join(
                self.pasta_xmls,
                f"chaves_falha_{datetime.now().strftime('%Y%m%d_%H%M')}.txt",
            )
            try:
                with open(arquivo_falhas, "w", encoding="utf-8") as file_handle:
                    file_handle.write("\n".join(chaves_com_falha))
                print(f"\n  Chaves com falha salvas em: {arquivo_falhas}")
                print("  (Use essa lista para tentar novamente depois.)")
            except OSError as exc:
                print(f"\n  (Nao foi possivel salvar lista de falhas: {exc})")
                arquivo_falhas = None
        print()

        return {
            "status": status,
            "sucesso": sucesso,
            "falhas": falhas,
            "total": total,
            "processadas": processadas,
            "pendentes": pendentes,
            "chaves_com_falha": chaves_com_falha,
            "arquivo_falhas": arquivo_falhas,
            "output_dir": self.pasta_xmls,
            "organization_mode": organization_mode,
            "num_threads": num_threads,
        }

    @staticmethod
    def _resolve_warmup_state(despachadas: int, num_threads: int) -> tuple[int, str, bool]:
        if despachadas < DOWNLOAD_WARM_UP_FASE1_QTD:
            return min(num_threads, max(1, DOWNLOAD_WARM_UP_FASE1_THREADS)), "fase_1", True
        if despachadas < DOWNLOAD_WARM_UP_FASE1_QTD + DOWNLOAD_WARM_UP_FASE2_QTD:
            return min(num_threads, max(1, DOWNLOAD_WARM_UP_FASE2_THREADS)), "fase_2", True
        if despachadas < DOWNLOAD_WARM_UP_FASE1_QTD + DOWNLOAD_WARM_UP_FASE2_QTD + DOWNLOAD_WARM_UP_FASE3_QTD:
            return min(num_threads, max(1, DOWNLOAD_WARM_UP_FASE3_THREADS)), "fase_3", True
        return max(1, num_threads), "final", False

    @staticmethod
    def _build_dispatch_message(fase: str, despachadas: int, total: int, target_concurrency: int) -> str:
        if fase == "fase_1":
            prefixo = "Aquecendo conexoes"
        elif fase == "fase_2":
            prefixo = "Despachando lote inicial"
        elif fase == "fase_3":
            prefixo = "Aumentando concorrencia"
        else:
            prefixo = "Download em velocidade total"
        return f"{prefixo} ({despachadas}/{total}, limite atual: {target_concurrency})"

    @staticmethod
    def _wait_for_warmup(control_token: CancellationToken | None, delay: float) -> None:
        fim = time.monotonic() + max(0.0, delay)
        while time.monotonic() < fim:
            if control_token is not None:
                control_token.wait_if_paused()
                if control_token.is_cancelled():
                    return
            time.sleep(min(0.02, max(0.0, fim - time.monotonic())))

    def _download_single(self, chave: str, organization_mode: str) -> dict[str, object]:
        xml_content, valido, erro_detalhe = self.client.download_xml(chave)

        if not (xml_content and valido):
            return {
                "success": False,
                "message": erro_detalhe or "Falha ao baixar XML",
                "output_path": None,
                "info_data": "",
            }

        if not validar_xml(xml_content):
            return {
                "success": False,
                "message": "XML invalido",
                "output_path": None,
                "info_data": "",
            }

        ano, mes = extrair_data_xml(xml_content)
        caminho_xml, info_data = self._build_output_path(chave, ano, mes, organization_mode)

        if os.path.exists(caminho_xml):
            print("  AVISO: Arquivo ja existe, sobrescrevendo...")

        with open(caminho_xml, "w", encoding="utf-8") as file_handle:
            file_handle.write(xml_content)

        return {
            "success": True,
            "message": f"XML salvo em {caminho_xml}",
            "output_path": caminho_xml,
            "info_data": info_data,
        }

    def _build_output_path(
        self,
        chave: str,
        ano: int | None,
        mes: int | None,
        organization_mode: str,
    ) -> tuple[str, str]:
        if organization_mode == MODE_FLAT or ano is None:
            pasta_destino = self.pasta_xmls
            info_data = "" if ano is None else " (pasta unica)"
        elif organization_mode == MODE_YEAR_MONTH and mes is not None:
            pasta_destino = os.path.join(self.pasta_xmls, str(ano), f"{mes:02d}")
            info_data = f" ({ano}/{mes:02d})"
        else:
            pasta_destino = os.path.join(self.pasta_xmls, str(ano))
            info_data = f" ({ano})"

        os.makedirs(pasta_destino, exist_ok=True)
        return os.path.join(pasta_destino, f"{chave}.xml"), info_data

    @staticmethod
    def _emit_progress(callback: Callable[..., None] | None, **payload) -> None:
        if callback is None:
            return
        callback(**payload)
