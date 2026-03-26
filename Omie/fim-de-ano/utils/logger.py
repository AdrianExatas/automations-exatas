"""
Módulo de logging para o projeto de automação
"""
import tkinter as tk
from datetime import datetime


def log_event(log_widget, msg):
    """
    Registra um evento no widget de log e no console
    
    Args:
        log_widget: Widget de texto do tkinter para exibir logs
        msg: Mensagem a ser registrada
    """
    timestamp = datetime.now().strftime("%H:%M:%S")
    linha = f"[{timestamp}] {msg}"
    
    try:
        print(linha)
    except UnicodeEncodeError:
        # Fallback para Windows com problemas de codificação
        print(linha.encode('ascii', 'ignore').decode('ascii'))
    
    log_widget.insert(tk.END, linha + "\n")
    log_widget.see(tk.END)


def criar_arquivo_log(prefixo="log"):
    """
    Cria um arquivo de log com timestamp na pasta logs
    
    Args:
        prefixo: Prefixo para o nome do arquivo
        
    Returns:
        Arquivo aberto para escrita
    """
    import os
    
    # Criar pasta logs se não existir
    os.makedirs("logs", exist_ok=True)
    
    agora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    nome_arquivo = f"logs/{prefixo}_{agora}.txt"
    return open(nome_arquivo, "w", encoding="utf-8")
