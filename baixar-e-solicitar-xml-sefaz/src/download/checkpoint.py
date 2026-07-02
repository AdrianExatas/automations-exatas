"""
Sistema de checkpoint para recuperação de progresso - Download
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Set

from src.core.config import PATHS
from src.core.constants import FileConfig


CHECKPOINT_FILE = PATHS.checkpoints_dir / "download_checkpoint.json"
CURSOR_CHECKPOINT_FILE = PATHS.checkpoints_dir / "download_cursor_checkpoint.json"
LEGACY_BACKUP_FILE = PATHS.checkpoints_dir / "download_checkpoint.json.bak"

_checkpoint_lock = threading.Lock()


def garantir_diretorio_checkpoint() -> None:
    """Garante que o diretório de checkpoint existe."""
    PATHS.checkpoints_dir.mkdir(parents=True, exist_ok=True)
    PATHS.checkpoints_backup_dir.mkdir(parents=True, exist_ok=True)
    for temp_file in (CHECKPOINT_FILE.with_name(f"{CHECKPOINT_FILE.name}.tmp"), CURSOR_CHECKPOINT_FILE.with_name(f"{CURSOR_CHECKPOINT_FILE.name}.tmp")):
        try:
            if temp_file.exists():
                temp_file.unlink()
        except OSError:
            pass


def limpar_checkpoints_antigos(dias: int = None) -> int:
    """
    Remove checkpoints mais antigos que X dias.
    """
    if dias is None:
        dias = FileConfig.CHECKPOINT_MAX_AGE_DAYS

    agora = datetime.now()
    removidos = 0

    for checkpoint_file in PATHS.checkpoints_dir.glob("*.json"):
        if checkpoint_file.parent.name == "backups":
            continue

        try:
            idade = agora - datetime.fromtimestamp(checkpoint_file.stat().st_mtime)
            if idade.days > dias:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_path = PATHS.checkpoints_backup_dir / f"{checkpoint_file.stem}_{timestamp}.json"
                try:
                    shutil.copy2(checkpoint_file, backup_path)
                except OSError:
                    pass
                checkpoint_file.unlink()
                removidos += 1
                print(f"[LIMPEZA] Checkpoint antigo removido: {checkpoint_file.name} ({idade.days} dias)")
        except (FileNotFoundError, PermissionError, OSError) as exc:
            print(f"[AVISO] Erro ao verificar {checkpoint_file.name}: {exc}")
        except Exception as exc:
            print(f"[AVISO] Erro inesperado ao verificar {checkpoint_file.name}: {exc}")

    if removidos > 0:
        print(f"[OK] {removidos} checkpoint(s) antigo(s) removido(s)")
    return removidos


def salvar_checkpoint(
    pagina_atual: int,
    arquivos_baixados: Set[str],
    total_baixados: int,
    data_solicitacao: Optional[str] = None
) -> bool:
    """
    Salva o estado completo da execução atual.

    O checkpoint completo é gravado apenas com metadados compactos dos arquivos
    baixados nesta execução para evitar JSONs muito grandes.
    """
    garantir_diretorio_checkpoint()

    arquivos_info = _compactar_arquivos_baixados(arquivos_baixados)
    tipos_contagem: Dict[str, int] = {}
    for info in arquivos_info:
        tipo = info.get("tipo_download", "DESCONHECIDO")
        tipos_contagem[tipo] = tipos_contagem.get(tipo, 0) + 1

    checkpoint: Dict[str, Any] = {
        "timestamp": datetime.now().isoformat(),
        "pagina_atual": pagina_atual,
        "arquivos_info": arquivos_info,
        "tipos_contagem": tipos_contagem,
        "total_baixados": total_baixados,
        "data_solicitacao": data_solicitacao,
        "tipo": "download",
    }

    checkpoint["checksum"] = _calcular_checksum(checkpoint)

    with _checkpoint_lock:
        try:
            _write_atomic_json(CHECKPOINT_FILE, checkpoint)
            print(f"[CHECKPOINT] Salvo estado completo: pagina {pagina_atual}, {total_baixados} arquivo(s)")
            return True
        except (FileNotFoundError, PermissionError, OSError) as exc:
            print(f"[AVISO] Erro ao salvar checkpoint: {exc}")
            return False
        except Exception as exc:
            print(f"[AVISO] Erro inesperado ao salvar checkpoint: {exc}")
            return False


def salvar_cursor_checkpoint(
    pagina_atual: int,
    total_baixados: int,
    data_solicitacao: Optional[str] = None
) -> bool:
    """
    Salva um cursor leve de retomada.
    """
    garantir_diretorio_checkpoint()

    checkpoint: Dict[str, Any] = {
        "timestamp": datetime.now().isoformat(),
        "pagina_atual": pagina_atual,
        "total_baixados": total_baixados,
        "data_solicitacao": data_solicitacao,
        "tipo": "download_cursor",
    }
    checkpoint["checksum"] = _calcular_checksum(checkpoint)

    with _checkpoint_lock:
        try:
            _write_atomic_json(CURSOR_CHECKPOINT_FILE, checkpoint)
            print(f"[CHECKPOINT] Cursor salvo: pagina {pagina_atual}, {total_baixados} arquivo(s)")
            return True
        except (FileNotFoundError, PermissionError, OSError) as exc:
            print(f"[AVISO] Erro ao salvar cursor de checkpoint: {exc}")
            return False
        except Exception as exc:
            print(f"[AVISO] Erro inesperado ao salvar cursor de checkpoint: {exc}")
            return False


def carregar_checkpoint() -> Optional[Dict[str, Any]]:
    """
    Carrega checkpoint do processo de download.

    Ordem de preferência:
    1. checkpoint principal íntegro
    2. backup íntegro mais recente
    3. cursor leve de retomada
    """
    garantir_diretorio_checkpoint()

    checkpoint = _carregar_checkpoint_principal()
    cursor = _carregar_json_validado(CURSOR_CHECKPOINT_FILE, {"download_cursor"})

    if checkpoint:
        checkpoint["arquivos_baixados"] = _expandir_arquivos_baixados(checkpoint.get("arquivos_info", []))
        if cursor and _timestamp_mais_recente(cursor, checkpoint):
            checkpoint["pagina_atual"] = max(checkpoint.get("pagina_atual", 1), cursor.get("pagina_atual", 1))
            checkpoint["total_baixados"] = max(checkpoint.get("total_baixados", 0), cursor.get("total_baixados", 0))
            checkpoint["data_solicitacao"] = cursor.get("data_solicitacao") or checkpoint.get("data_solicitacao")
            checkpoint["timestamp"] = cursor.get("timestamp", checkpoint.get("timestamp"))
        return checkpoint

    if cursor:
        return {
            "timestamp": cursor.get("timestamp"),
            "pagina_atual": cursor.get("pagina_atual", 1),
            "arquivos_baixados": set(),
            "arquivos_info": [],
            "tipos_contagem": {},
            "total_baixados": cursor.get("total_baixados", 0),
            "data_solicitacao": cursor.get("data_solicitacao"),
            "tipo": "download",
        }

    return None


def limpar_checkpoint() -> bool:
    """Remove checkpoints, criando backup do principal antes."""
    try:
        if CHECKPOINT_FILE.exists():
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = PATHS.checkpoints_backup_dir / f"download_checkpoint_{timestamp}.json"
            try:
                shutil.copy2(CHECKPOINT_FILE, backup_path)
                print(f"[BACKUP] Criado: {backup_path.name}")
            except OSError as exc:
                print(f"[AVISO] Nao foi possivel criar backup: {exc}")
            CHECKPOINT_FILE.unlink()

        for file_path in (CURSOR_CHECKPOINT_FILE, LEGACY_BACKUP_FILE):
            try:
                if file_path.exists():
                    file_path.unlink()
            except OSError:
                pass

        print("[OK] Checkpoint limpo com sucesso")
        return True
    except (FileNotFoundError, PermissionError, OSError) as exc:
        print(f"[AVISO] Erro ao limpar checkpoint: {exc}")
    except Exception as exc:
        print(f"[AVISO] Erro inesperado ao limpar checkpoint: {exc}")
    return False


def limpar_checkpoint_se_for_de_outro_dia() -> bool:
    """Limpa o checkpoint de download quando a ultima execucao foi em outro dia."""
    garantir_diretorio_checkpoint()

    checkpoints = [
        _carregar_json_validado(CHECKPOINT_FILE, {"download"}),
        _carregar_json_validado(CURSOR_CHECKPOINT_FILE, {"download_cursor"}),
    ]
    timestamps = []
    for checkpoint in checkpoints:
        if not checkpoint:
            continue
        try:
            timestamps.append(datetime.fromisoformat(checkpoint.get("timestamp", "")))
        except (TypeError, ValueError):
            continue

    if not timestamps:
        return False

    ultima_execucao = max(timestamps)
    hoje = datetime.now().date()
    if ultima_execucao.date() == hoje:
        return False

    print(
        "[CHECKPOINT] Ultima execucao de download foi em "
        f"{ultima_execucao.date().isoformat()}; limpando checkpoint para iniciar o dia atual."
    )
    return limpar_checkpoint()


def verificar_checkpoint() -> Optional[Dict[str, Any]]:
    """Verifica se existe checkpoint e exibe informações."""
    checkpoint = carregar_checkpoint()

    if checkpoint:
        timestamp = checkpoint.get("timestamp", "desconhecido")
        pagina_atual = checkpoint.get("pagina_atual", 0)
        total_baixados = checkpoint.get("total_baixados", 0)
        data_solicitacao = checkpoint.get("data_solicitacao")
        tipos_contagem = checkpoint.get("tipos_contagem", {})

        print("\n" + "=" * 60)
        print("[CHECKPOINT] ENCONTRADO")
        print("=" * 60)
        print(f"Timestamp: {timestamp}")
        print(f"Última página processada: {pagina_atual}")
        print(f"Total de arquivos baixados: {total_baixados}")
        if tipos_contagem:
            print("Tipos de arquivo:")
            for tipo, quantidade in sorted(tipos_contagem.items()):
                print(f"  - {tipo}: {quantidade}")
        if data_solicitacao:
            print(f"Filtro de data: {data_solicitacao}")
        print("=" * 60 + "\n")

        return checkpoint

    return None


def _carregar_checkpoint_principal() -> Optional[Dict[str, Any]]:
    checkpoint = _carregar_json_validado(CHECKPOINT_FILE, {"download"})
    if checkpoint:
        return checkpoint

    for candidate in _listar_backups_checkpoint():
        checkpoint = _carregar_json_validado(candidate, {"download"})
        if checkpoint:
            print(f"[CHECKPOINT] Recuperado a partir de backup: {candidate.name}")
            try:
                _write_atomic_json(CHECKPOINT_FILE, checkpoint)
            except OSError:
                pass
            return checkpoint

    return None


def _listar_backups_checkpoint() -> list[Path]:
    backups: list[Path] = []
    if LEGACY_BACKUP_FILE.exists():
        backups.append(LEGACY_BACKUP_FILE)
    backups.extend(
        sorted(
            PATHS.checkpoints_backup_dir.glob("download_checkpoint_*.json"),
            key=lambda path: path.stat().st_mtime,
            reverse=True,
        )
    )
    return backups


def _carregar_json_validado(file_path: Path, tipos_esperados: set[str]) -> Optional[Dict[str, Any]]:
    if not file_path.exists():
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as file_handle:
            payload = json.load(file_handle)

        if payload.get("tipo") not in tipos_esperados:
            return None

        timestamp = datetime.fromisoformat(payload.get("timestamp", ""))
        idade = datetime.now() - timestamp
        if idade.days > FileConfig.CHECKPOINT_MAX_AGE_DAYS:
            print(f"[AVISO] Checkpoint muito antigo ({idade.days} dias): {file_path.name}")
            return None

        checksum = payload.pop("checksum", None)
        if checksum and checksum != _calcular_checksum(payload):
            print(f"[AVISO] Checkpoint corrompido (checksum inválido): {file_path.name}")
            return None

        return payload
    except json.JSONDecodeError as exc:
        print(f"[AVISO] Checkpoint corrompido (JSON inválido): {file_path.name} - {exc}")
        return None
    except (FileNotFoundError, PermissionError, OSError, ValueError, TypeError) as exc:
        print(f"[AVISO] Erro ao acessar checkpoint {file_path.name}: {exc}")
        return None


def _write_atomic_json(file_path: Path, payload: Dict[str, Any]) -> None:
    temp_file = file_path.with_name(f"{file_path.name}.tmp")
    try:
        with open(temp_file, "w", encoding="utf-8") as file_handle:
            json.dump(payload, file_handle, indent=2, ensure_ascii=False)
            file_handle.flush()
            os.fsync(file_handle.fileno())

        last_error: Exception | None = None
        for attempt in range(3):
            try:
                os.replace(temp_file, file_path)
                return
            except PermissionError as exc:
                last_error = exc
                time.sleep(0.2 * (attempt + 1))
        if last_error:
            raise last_error
    finally:
        try:
            if temp_file.exists():
                temp_file.unlink()
        except OSError:
            pass


def _compactar_arquivos_baixados(arquivos_baixados: Set[str] | list[str]) -> list[Dict[str, str]]:
    arquivos_info: dict[str, Dict[str, str]] = {}

    for item in arquivos_baixados:
        try:
            info = json.loads(item)
        except (json.JSONDecodeError, TypeError):
            continue

        if not isinstance(info, dict) or not info.get("url"):
            continue

        normalizado = {
            "url": str(info.get("url", "")),
            "nome": str(info.get("nome", "")),
            "dt_solicitacao": str(info.get("dt_solicitacao", "")),
            "tipo_download": str(info.get("tipo_download", "DESCONHECIDO")),
        }
        arquivos_info[normalizado["url"]] = normalizado

    return list(arquivos_info.values())


def _expandir_arquivos_baixados(arquivos_info: list[Dict[str, str]]) -> Set[str]:
    arquivos_baixados: Set[str] = set()
    for info in arquivos_info:
        url = str(info.get("url", ""))
        nome = str(info.get("nome", ""))
        dt_solicitacao = str(info.get("dt_solicitacao", ""))
        tipo_download = str(info.get("tipo_download", "DESCONHECIDO"))
        normalizado = {
            "url": url,
            "nome": nome,
            "dt_solicitacao": dt_solicitacao,
            "tipo_download": tipo_download,
        }
        if url:
            arquivos_baixados.add(url)
        if nome:
            arquivos_baixados.add(nome)
        if dt_solicitacao:
            arquivos_baixados.add(dt_solicitacao)
        arquivos_baixados.add(json.dumps(normalizado, sort_keys=True))
    return arquivos_baixados


def _calcular_checksum(payload: Dict[str, Any]) -> str:
    payload_json = json.dumps(payload, sort_keys=True, ensure_ascii=False)
    return hashlib.md5(payload_json.encode("utf-8")).hexdigest()


def _timestamp_mais_recente(candidate: Dict[str, Any], baseline: Dict[str, Any]) -> bool:
    try:
        candidate_dt = datetime.fromisoformat(candidate.get("timestamp", ""))
        baseline_dt = datetime.fromisoformat(baseline.get("timestamp", ""))
        return candidate_dt > baseline_dt
    except (TypeError, ValueError):
        return False
