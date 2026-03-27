"""
Sistema de retry com exponential backoff.
"""
import time
from typing import Callable, Tuple, Type, TypeVar

T = TypeVar("T")

_DEFAULT_MAX_TENTATIVAS = 3
_DEFAULT_BACKOFF_BASE = 2.0
_MIN_WAIT_TIME = 0.5
_MAX_WAIT_TIME = 10.0


def _get_retry_config():
    """Obtem configuracoes de retry de forma lazy."""
    try:
        from src.core.constants import RetryConfig

        return RetryConfig
    except ImportError:
        class DefaultConfig:
            DEFAULT_MAX_TENTATIVAS = _DEFAULT_MAX_TENTATIVAS
            DEFAULT_BACKOFF_BASE = _DEFAULT_BACKOFF_BASE
            MIN_WAIT_TIME = _MIN_WAIT_TIME
            MAX_WAIT_TIME = _MAX_WAIT_TIME

        return DefaultConfig


def retry_com_backoff(
    func: Callable[[], T],
    max_tentativas: int = None,
    backoff_base: float = None,
    excecoes: Tuple[Type[Exception], ...] = (Exception,),
    logger=None,
) -> T:
    """
    Executa funcao com retry e backoff exponencial.

    Args:
        func: Funcao a ser executada.
        max_tentativas: Numero maximo de tentativas.
        backoff_base: Base para calculo do backoff.
        excecoes: Tupla de excecoes que devem disparar retry.
        logger: Logger opcional.
    """
    config = _get_retry_config()

    if max_tentativas is None:
        max_tentativas = config.DEFAULT_MAX_TENTATIVAS
    if backoff_base is None:
        backoff_base = config.DEFAULT_BACKOFF_BASE

    ultima_excecao = None

    for tentativa in range(max_tentativas):
        try:
            return func()
        except excecoes as exc:
            ultima_excecao = exc

            if tentativa == max_tentativas - 1:
                if logger:
                    logger.error(f"Falha apos {max_tentativas} tentativas: {exc}")
                raise

            espera = min(backoff_base**tentativa, config.MAX_WAIT_TIME)
            espera = max(espera, config.MIN_WAIT_TIME)

            if logger:
                logger.warning(
                    f"Erro (tentativa {tentativa + 1}/{max_tentativas}), aguardando {espera:.1f}s: {exc}"
                )
            else:
                print(
                    f"Aviso: erro na tentativa {tentativa + 1}/{max_tentativas}, aguardando {espera:.1f}s..."
                )

            time.sleep(espera)

    if ultima_excecao:
        raise ultima_excecao
    raise Exception("Erro desconhecido no retry")
