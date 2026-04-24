"""Utilitarios de concorrencia reutilizaveis fora da camada de GUI."""

from __future__ import annotations

import threading
from typing import Any, Callable


class CancellationToken:
    """Controla cancelamento e pausa cooperativa de operacoes em background."""

    def __init__(self) -> None:
        self._cancelled = threading.Event()
        self._resumed = threading.Event()
        self._resumed.set()

    def cancel(self) -> None:
        """Marca a operacao como cancelada."""
        self._cancelled.set()
        self._resumed.set()

    def is_cancelled(self) -> bool:
        """Retorna se a operacao foi cancelada."""
        return self._cancelled.is_set()

    def pause(self) -> None:
        """Pausa a operacao entre iteracoes cooperativas."""
        if not self.is_cancelled():
            self._resumed.clear()

    def resume(self) -> None:
        """Retoma a operacao pausada."""
        self._resumed.set()

    def is_paused(self) -> bool:
        """Retorna se a operacao esta pausada."""
        return not self._resumed.is_set()

    def wait_if_paused(self, poll_interval: float = 0.1) -> None:
        """Bloqueia enquanto a operacao estiver pausada."""
        while not self._resumed.wait(timeout=poll_interval):
            if self.is_cancelled():
                return

    def reset(self) -> None:
        """Reseta o token para reutilizacao."""
        self._cancelled.clear()
        self._resumed.set()


def run_in_thread(target_func: Callable[..., Any], *args: Any, **kwargs: Any) -> threading.Thread:
    """Executa uma funcao em uma thread separada."""
    thread = threading.Thread(target=target_func, args=args, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def update_gui(root: Any, func: Callable[..., Any], *args: Any, **kwargs: Any) -> None:
    """Agenda uma atualizacao thread-safe em um root Tk compativel com ``after``."""
    root.after(0, lambda: func(*args, **kwargs))
