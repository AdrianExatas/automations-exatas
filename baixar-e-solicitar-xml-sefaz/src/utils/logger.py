"""
Sistema de logging estruturado para SEFAZ
Substitui prints por logging profissional
"""
import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path
from datetime import datetime


def _get_logs_dir() -> Path:
    """Obtém diretório de logs de forma lazy"""
    try:
        from src.core.config import PATHS
        return PATHS.logs_dir
    except ImportError:
        # Fallback para diretório padrão
        logs_dir = Path.home() / "logs" / "sefaz"
        logs_dir.mkdir(parents=True, exist_ok=True)
        return logs_dir


def configurar_logging(nome_script: str, nivel: int = logging.INFO) -> logging.Logger:
    """
    Configura sistema de logging com arquivo rotativo
    
    Args:
        nome_script: Nome do script para identificar logs
        nivel: Nível de logging (default: INFO)
    
    Returns:
        Logger configurado
        
    Examples:
        >>> logger = configurar_logging("consulta")
        >>> logger.info("Iniciando consulta")
        >>> logger.warning("Erro ao processar empresa")
        >>> logger.error(f"Erro crítico: {e}")
    """
    logs_dir = _get_logs_dir()
    logs_dir.mkdir(parents=True, exist_ok=True)
    
    log_file = logs_dir / f"{nome_script}_{datetime.now().strftime('%Y%m%d')}.log"
    
    logger = logging.getLogger(nome_script)
    
    # Remove handlers existentes para evitar duplicação
    logger.handlers.clear()
    
    logger.setLevel(nivel)
    
    # Handler para arquivo (rotativo, máximo 10MB, mantém 5 backups)
    file_handler = RotatingFileHandler(
        log_file, maxBytes=10*1024*1024, backupCount=5, encoding='utf-8'
    )
    file_handler.setLevel(nivel)
    file_handler.setFormatter(
        logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
    )
    
    # Handler para console (apenas INFO e acima)
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(
        logging.Formatter('%(levelname)s - %(message)s')
    )
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger
