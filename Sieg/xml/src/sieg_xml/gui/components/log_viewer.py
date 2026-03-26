"""
Componente visualizador de logs
"""
import tkinter as tk
from tkinter import ttk, scrolledtext
from datetime import datetime


class LogViewer:
    """Visualizador de logs com diferentes níveis"""
    
    # Cores para diferentes níveis
    COLORS = {
        'INFO': 'black',
        'SUCCESS': 'green',
        'WARNING': 'orange',
        'ERROR': 'red',
        'DEBUG': 'gray'
    }
    
    def __init__(self, parent, row=0, column=0, columnspan=2, sticky='nsew', height=15):
        """
        Inicializa o visualizador de logs
        
        Args:
            parent: Widget pai
            row: Linha do grid (ignorado se usar pack)
            column: Coluna do grid (ignorado se usar pack)
            columnspan: Quantas colunas ocupar (ignorado se usar pack)
            sticky: Sticky do grid (ignorado se usar pack)
            height: Altura em linhas
        """
        self.frame = ttk.Frame(parent)
        # Usar pack por padrão (pode ser mudado depois se necessário)
        
        # Label do título
        title_frame = ttk.Frame(self.frame)
        title_frame.pack(fill='x', padx=5, pady=(5, 0))
        
        ttk.Label(title_frame, text="Logs", font=('Arial', 10, 'bold')).pack(side='left')
        
        # Botão limpar
        self.clear_btn = ttk.Button(title_frame, text="Limpar", command=self.clear)
        self.clear_btn.pack(side='right', padx=5)
        
        # Área de texto com scroll
        self.text_area = scrolledtext.ScrolledText(
            self.frame,
            wrap=tk.WORD,
            height=height,
            font=('Consolas', 9),
            bg='#f5f5f5'
        )
        self.text_area.pack(fill='both', expand=True, padx=5, pady=5)
        
        # Configurar tags de cores
        for level, color in self.COLORS.items():
            self.text_area.tag_config(level, foreground=color)
    
    def log(self, message: str, level: str = 'INFO'):
        """
        Adiciona uma mensagem ao log
        
        Args:
            message: Mensagem a adicionar (pode ser multi-linha)
            level: Nível do log (INFO, SUCCESS, WARNING, ERROR, DEBUG)
        """
        timestamp = datetime.now().strftime("%H:%M:%S")
        
        # Processar mensagens multi-linha
        linhas = message.split('\n')
        primeira_linha = True
        
        for linha in linhas:
            if linha.strip():  # Ignorar linhas vazias
                if primeira_linha:
                    formatted_message = f"[{timestamp}] {linha}\n"
                    primeira_linha = False
                else:
                    # Linhas subsequentes com indentação
                    formatted_message = f"         {linha}\n"
                
                self.text_area.insert(tk.END, formatted_message, level)
        
        self.text_area.see(tk.END)
    
    def clear(self):
        """Limpa todos os logs"""
        self.text_area.delete(1.0, tk.END)
    
    def info(self, message: str):
        """Log de informação"""
        self.log(message, 'INFO')
    
    def success(self, message: str):
        """Log de sucesso"""
        self.log(message, 'SUCCESS')
    
    def warning(self, message: str):
        """Log de aviso"""
        self.log(message, 'WARNING')
    
    def error(self, message: str):
        """Log de erro"""
        self.log(message, 'ERROR')
