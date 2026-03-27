"""
Orquestracao de downloads via HTTP.
"""
from __future__ import annotations

import json
import os
import signal
from pathlib import Path
from typing import Callable

from src.core.config import PATHS, SENHA_SEFAZ, USUARIO_SEFAZ
from src.download import state
from src.download.checkpoint import (
    carregar_checkpoint,
    salvar_checkpoint,
    salvar_cursor_checkpoint,
)
from src.download.downloader import _parse_nome_empresa_e_ano_mes, _processar_xmls_presos_automaticamente
from src.sefaz_http import DownloadInfo, SefazHttpClient, SefazHttpError


DOWNLOAD_LOCK_FILE = PATHS.lock_dir / "download_http.lock"
CURSOR_SAVE_INTERVAL = 10


def executar_download_http() -> None:
    """Executa o fluxo de listagem e download por HTTP."""
    lock_fd = _adquirir_lock_download()
    checkpoint = carregar_checkpoint()
    arquivos_baixados = set(checkpoint.get("arquivos_baixados", [])) if checkpoint else set()
    total_baixados = checkpoint.get("total_baixados", 0) if checkpoint else 0
    pagina_inicial = state.pagina_inicial or (checkpoint.get("pagina_atual", 1) if checkpoint else 1)
    pagina_final = state.pagina_final
    ultima_pagina_processada = pagina_inicial - 1
    paginas_desde_cursor = 0

    def salvar_cursor_atual() -> None:
        pagina_checkpoint = max(ultima_pagina_processada, pagina_inicial)
        salvar_cursor_checkpoint(
            pagina_atual=pagina_checkpoint,
            total_baixados=total_baixados,
            data_solicitacao=state.data_solicitacao,
        )

    def salvar_estado_completo(pagina_checkpoint: int) -> None:
        salvar_checkpoint(
            pagina_atual=pagina_checkpoint,
            arquivos_baixados=arquivos_baixados,
            total_baixados=total_baixados,
            data_solicitacao=state.data_solicitacao,
        )

    def registrar_download_completo(pagina_checkpoint: int) -> None:
        nonlocal total_baixados
        total_baixados += 1
        salvar_estado_completo(pagina_checkpoint)

    def tratar_sinal(signum, _frame) -> None:
        try:
            sinal_nome = signal.Signals(signum).name
        except ValueError:
            sinal_nome = str(signum)
        print(f"\n[INFO] Sinal {sinal_nome} recebido. Salvando cursor e encerrando...")
        state.executando = False
        salvar_cursor_atual()

    handlers_anteriores = _registrar_handlers_sinal(tratar_sinal)

    print("\n" + "=" * 60)
    print("INICIANDO DOWNLOAD DE ARQUIVOS VIA HTTP")
    print("=" * 60)
    if checkpoint:
        print(f"[CHECKPOINT] Retomando da pagina {pagina_inicial} com {total_baixados} arquivo(s)")

    try:
        with SefazHttpClient() as client:
            client.login(USUARIO_SEFAZ, SENHA_SEFAZ)

            pagina = pagina_inicial
            while True:
                if not state.executando:
                    print("\n[INFO] Execucao interrompida pelo usuario")
                    break

                if pagina_final and pagina > pagina_final:
                    break

                print(f"[INFO] Abrindo pagina {pagina}...")
                pagina_info = client.listar_downloads(pagina=pagina, ready_only=True)
                novos, erros = _processar_pagina_http(
                    client=client,
                    pagina_info=pagina_info,
                    arquivos_baixados=arquivos_baixados,
                    on_download=registrar_download_completo,
                )

                ultima_pagina_processada = pagina_info.current_page or pagina
                paginas_desde_cursor += 1

                if paginas_desde_cursor >= CURSOR_SAVE_INTERVAL:
                    salvar_cursor_atual()
                    paginas_desde_cursor = 0

                print(f"[PAGINA {ultima_pagina_processada}] +{novos} download(s), {erros} erro(s)")

                proxima = ultima_pagina_processada + 1
                if pagina_final and proxima > pagina_final:
                    break
                if proxima not in pagina_info.page_links and not pagina_info.next_page_url:
                    break
                pagina = proxima
    finally:
        try:
            salvar_cursor_atual()
        finally:
            _restaurar_handlers_sinal(handlers_anteriores)
            _liberar_lock_download(lock_fd)

    print("\n" + "=" * 60)
    print("RESUMO DO DOWNLOAD")
    print("=" * 60)
    print(f"[OK] Total de arquivos baixados: {total_baixados}")
    print(f"[INFO] Diretorio de destino: {PATHS.downloads_dir}")
    print("=" * 60)

    if state.upload_automatico:
        _executar_upload_automatico()


def _processar_pagina_http(
    client: SefazHttpClient,
    pagina_info,
    arquivos_baixados: set[str],
    on_download: Callable[[int], None],
) -> tuple[int, int]:
    novos = 0
    erros = 0
    pagina_checkpoint = pagina_info.current_page or 1

    print(f"\n[INFO] Processando pagina {pagina_checkpoint}: {len(pagina_info.downloads)} arquivo(s) pronto(s)")

    for info in pagina_info.downloads:
        if not state.executando:
            break

        if state.data_solicitacao and not (info.dt_solicitacao or "").startswith(state.data_solicitacao):
            continue

        if _ja_baixado(info, arquivos_baixados):
            print(f"   [SKIP] {info.nm_arquivo or info.dt_solicitacao} - ja processado")
            continue

        if _arquivo_ja_organizado(info):
            print(f"   [SKIP] {info.nm_arquivo or info.dt_solicitacao} - ja existe em disco")
            _registrar_arquivo_baixado(info, arquivos_baixados)
            continue

        print(f"   [DOWNLOAD] {info.nm_arquivo or info.dt_solicitacao} [{info.tipo_download}]")
        try:
            client.baixar_arquivo(info, PATHS.downloads_dir)
            _registrar_arquivo_baixado(info, arquivos_baixados)
            on_download(pagina_checkpoint)
            novos += 1
        except SefazHttpError as exc:
            erros += 1
            print(f"   [ERRO] {exc}")

    return novos, erros


def _arquivo_ja_organizado(info: DownloadInfo) -> bool:
    empresa, ano, mes = _parse_nome_empresa_e_ano_mes(info.nm_arquivo or "", info.dt_solicitacao)
    nome_base = info.nm_arquivo or (info.dt_solicitacao or "arquivo")
    nome_com_tipo = (
        nome_base
        if not info.tipo_download or info.tipo_download == "DESCONHECIDO" or nome_base.startswith(f"{info.tipo_download}_")
        else f"{info.tipo_download}_{nome_base}"
    )
    destino = PATHS.downloads_dir / ano / mes / empresa / "zips" / f"{nome_com_tipo}.zip"
    if destino.exists():
        return True
    legado = PATHS.downloads_dir / ano / mes / empresa / "zips" / f"{nome_base}.zip"
    return legado.exists()


def _ja_baixado(info: DownloadInfo, arquivos_baixados: set[str]) -> bool:
    if info.url in arquivos_baixados:
        return True
    if info.nm_arquivo and info.nm_arquivo in arquivos_baixados:
        return True
    if info.dt_solicitacao and info.dt_solicitacao in arquivos_baixados:
        return True
    return False


def _registrar_arquivo_baixado(info: DownloadInfo, arquivos_baixados: set[str]) -> None:
    payload = {
        "url": info.url,
        "nome": info.nm_arquivo,
        "dt_solicitacao": info.dt_solicitacao or "",
        "tipo_download": info.tipo_download,
    }
    arquivos_baixados.add(info.url)
    if info.nm_arquivo:
        arquivos_baixados.add(info.nm_arquivo)
    if info.dt_solicitacao:
        arquivos_baixados.add(info.dt_solicitacao)
    arquivos_baixados.add(json.dumps(payload, sort_keys=True))


def _adquirir_lock_download() -> int:
    PATHS.lock_dir.mkdir(parents=True, exist_ok=True)

    if DOWNLOAD_LOCK_FILE.exists():
        pid_existente = _ler_pid_lock(DOWNLOAD_LOCK_FILE)
        if pid_existente and _processo_ativo(pid_existente):
            raise RuntimeError(
                f"Ja existe um download HTTP em andamento (PID: {pid_existente}). "
                "Feche a outra instancia antes de iniciar uma nova."
            )
        try:
            DOWNLOAD_LOCK_FILE.unlink()
        except OSError:
            pass

    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    fd = os.open(str(DOWNLOAD_LOCK_FILE), flags)
    with os.fdopen(fd, "w", encoding="utf-8", closefd=False) as lock_handle:
        lock_handle.write(str(os.getpid()))
        lock_handle.flush()
        os.fsync(lock_handle.fileno())
    return fd


def _liberar_lock_download(lock_fd: int | None) -> None:
    try:
        if lock_fd is not None:
            os.close(lock_fd)
    except OSError:
        pass

    pid_existente = _ler_pid_lock(DOWNLOAD_LOCK_FILE)
    if pid_existente == os.getpid():
        try:
            DOWNLOAD_LOCK_FILE.unlink()
        except OSError:
            pass


def _ler_pid_lock(lock_file: Path) -> int | None:
    try:
        return int(lock_file.read_text(encoding="utf-8").strip())
    except (OSError, ValueError):
        return None


def _processo_ativo(pid: int) -> bool:
    try:
        import psutil

        processo = psutil.Process(pid)
        return processo.is_running() and processo.status() != psutil.STATUS_ZOMBIE
    except ImportError:
        try:
            os.kill(pid, 0)
            return True
        except OSError:
            return False
    except Exception:
        return False


def _registrar_handlers_sinal(handler):
    handlers = {}
    for signame in ("SIGINT", "SIGTERM"):
        signum = getattr(signal, signame, None)
        if signum is None:
            continue
        handlers[signum] = signal.getsignal(signum)
        signal.signal(signum, handler)
    return handlers


def _restaurar_handlers_sinal(handlers) -> None:
    for signum, handler in handlers.items():
        signal.signal(signum, handler)


def _executar_upload_automatico() -> None:
    print("\n" + "=" * 60)
    print("INICIANDO UPLOAD AUTOMATICO PARA SIEG")
    print("=" * 60)
    try:
        from src.upload.uploader import enviar_automatico

        resultado = enviar_automatico(
            pasta=str(PATHS.downloads_dir),
            excluir_enviados=True,
            num_threads=20,
        )

        if "erro" in resultado:
            print(f"[ERRO] Upload: {resultado['erro']}")
        else:
            print(
                f"[OK] Upload concluido: {resultado.get('enviados', 0)} enviado(s), "
                f"{resultado.get('erros', 0)} erro(s)"
            )
    except Exception as exc:
        print(f"[ERRO] Falha no upload automatico: {exc}")

    _processar_xmls_presos_automaticamente()
