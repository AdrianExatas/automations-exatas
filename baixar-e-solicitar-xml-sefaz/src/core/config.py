"""
Configuracao centralizada de paths e variaveis de ambiente do sistema SEFAZ.
"""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass
class PathsConfig:
    """Configuracao centralizada de paths."""

    base_dir: Path = None
    project_root: Path = None
    downloads_dir: Path = None
    checkpoints_dir: Path = None
    checkpoints_backup_dir: Path = None
    logs_dir: Path = None
    lock_dir: Path = None

    def __init__(self):
        """Inicializa paths e cria diretorios necessarios."""
        self.project_root = Path(__file__).resolve().parents[2]
        self.base_dir = Path.home()
        self.downloads_dir = self.base_dir / "Downloads" / "XML SEFAZ"

        local_dir = self.project_root / "_local"
        self.checkpoints_dir = local_dir / "checkpoints"
        self.checkpoints_backup_dir = self.checkpoints_dir / "backups"
        self.logs_dir = local_dir / "logs"
        self.lock_dir = local_dir / "lock"

        self._criar_diretorios()

    def _criar_diretorios(self):
        """Cria diretorios necessarios."""
        self.downloads_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoints_dir.mkdir(parents=True, exist_ok=True)
        self.checkpoints_backup_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.lock_dir.mkdir(parents=True, exist_ok=True)


PATHS = PathsConfig()
load_dotenv(PATHS.project_root / ".env")


USUARIO_SEFAZ = os.getenv("USUARIO_SEFAZ", "")
SENHA_SEFAZ = os.getenv("SENHA_SEFAZ", "")
SIEG_API_KEY = os.getenv("SIEG_API_KEY", "")

UPLOAD_NUM_WORKERS = int(os.getenv("UPLOAD_NUM_WORKERS", "3"))
UPLOAD_DELAY_SECONDS = float(os.getenv("UPLOAD_DELAY_SECONDS", "0.1"))
LIMPEZA_AUTOMATICA_XMLS_PRESOS = os.getenv(
    "LIMPEZA_AUTOMATICA_XMLS_PRESOS",
    "true",
).lower() in ("true", "1", "yes")


def validar_configuracoes() -> tuple:
    """
    Valida se as configuracoes necessarias estao presentes.

    Returns:
        Tuple (sucesso: bool, mensagem: str)
    """
    erros = []

    if not USUARIO_SEFAZ:
        erros.append("USUARIO_SEFAZ nao configurado no .env")

    if not SENHA_SEFAZ:
        erros.append("SENHA_SEFAZ nao configurado no .env")

    if erros:
        return False, "; ".join(erros)

    return True, "Configuracoes validas"


def validar_configuracao_completa() -> tuple:
    """
    Valida configuracao completa incluindo diretorios.

    Returns:
        Tuple (sucesso: bool, lista_erros: list)
    """
    erros = []

    sucesso, msg = validar_configuracoes()
    if not sucesso:
        erros.append(msg)

    if not PATHS.checkpoints_dir.exists():
        erros.append(f"Diretorio de checkpoints nao existe: {PATHS.checkpoints_dir}")

    return len(erros) == 0, erros
