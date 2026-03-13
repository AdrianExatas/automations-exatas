"""
Componente de barra de progresso reutilizável
"""
import tkinter as tk
from tkinter import ttk


class ProgressBar:
    """Barra de progresso com label de status"""
    
    def __init__(self, parent, row=0, column=0, columnspan=2, sticky='ew'):
        """
        Inicializa a barra de progresso
        
        Args:
            parent: Widget pai
            row: Linha do grid (ignorado se usar pack)
            column: Coluna do grid (ignorado se usar pack)
            columnspan: Quantas colunas ocupar (ignorado se usar pack)
            sticky: Sticky do grid (ignorado se usar pack)
        """
        self.frame = ttk.Frame(parent)
        # Usar pack por padrão (pode ser mudado depois se necessário)
        
        # Label de status
        self.status_label = ttk.Label(self.frame, text="Pronto")
        self.status_label.pack(anchor='w', padx=5, pady=(5, 2))
        
        # Barra de progresso
        self.progress = ttk.Progressbar(
            self.frame,
            mode='determinate',
            length=400
        )
        self.progress.pack(fill='x', padx=5, pady=(0, 5))
        
        # Label de porcentagem
        self.percent_label = ttk.Label(self.frame, text="0%")
        self.percent_label.pack(anchor='e', padx=5, pady=(0, 5))
    
    def set_status(self, text: str):
        """Atualiza o texto de status"""
        self.status_label.config(text=text)
    
    def set_progress(self, value: int, maximum: int = 100):
        """
        Atualiza o progresso
        
        Args:
            value: Valor atual
            maximum: Valor máximo
        """
        if maximum > 0:
            percent = int((value / maximum) * 100)
            self.progress['maximum'] = maximum
            self.progress['value'] = value
            self.percent_label.config(text=f"{percent}%")
        else:
            self.progress['value'] = 0
            self.percent_label.config(text="0%")
    
    def reset(self):
        """Reseta a barra de progresso"""
        self.set_status("Pronto")
        self.set_progress(0, 100)
    
    def set_indeterminate(self, active: bool = True):
        """
        Define modo indeterminado
        
        Args:
            active: Se True, modo indeterminado; se False, modo determinado
        """
        if active:
            self.progress.config(mode='indeterminate')
            self.progress.start()
            self.percent_label.config(text="Processando...")
        else:
            self.progress.stop()
            self.progress.config(mode='determinate')
            self.percent_label.config(text="0%")
