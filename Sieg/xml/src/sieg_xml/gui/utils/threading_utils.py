"""
Utilitários para threading na GUI
"""
import threading
import queue


class CancellationToken:
    """Token para cancelamento de operações"""
    
    def __init__(self):
        self._cancelled = threading.Event()
    
    def cancel(self):
        """Marca a operação como cancelada"""
        self._cancelled.set()
    
    def is_cancelled(self):
        """Verifica se a operação foi cancelada"""
        return self._cancelled.is_set()
    
    def reset(self):
        """Reseta o token (para reutilização)"""
        self._cancelled.clear()


def run_in_thread(target_func, *args, **kwargs):
    """
    Executa uma função em uma thread separada
    
    Args:
        target_func: Função a executar
        *args: Argumentos posicionais
        **kwargs: Argumentos nomeados
        
    Returns:
        Thread criada
    """
    thread = threading.Thread(target=target_func, args=args, kwargs=kwargs, daemon=True)
    thread.start()
    return thread


def update_gui(root, func, *args, **kwargs):
    """
    Atualiza a GUI de forma thread-safe usando after()
    
    Args:
        root: Widget root (tk.Tk)
        func: Função a executar
        *args: Argumentos posicionais
        **kwargs: Argumentos nomeados
    """
    root.after(0, lambda: func(*args, **kwargs))
