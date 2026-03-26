"""
Janela principal da aplicação
"""
import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys

# Adicionar src ao path se necessário
current_dir = os.path.dirname(__file__)
if 'gui' in current_dir:
    src_path = os.path.join(current_dir, '..', '..', '..')
    if os.path.exists(src_path):
        sys.path.insert(0, src_path)

from .tabs import DownloadTab, UploadTab, ExtractTab, OrganizeTab
from .components.config_dialog import ConfigDialog


class MainWindow:
    """Janela principal da aplicação"""
    
    def __init__(self):
        """Inicializa a janela principal"""
        self.root = tk.Tk()
        self.root.title("SIEG XML - Sistema de Gerenciamento de XMLs Fiscais")
        self.root.geometry("900x700")
        
        # Centralizar na tela
        self._centralizar_janela()
        
        # Criar menu
        self._criar_menu()
        
        # Criar notebook (abas)
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Criar abas
        self._criar_abas()
        
        # Status bar
        self.status_bar = ttk.Label(self.root, text="Pronto", relief=tk.SUNKEN, anchor='w')
        self.status_bar.pack(side='bottom', fill='x')
    
    def _centralizar_janela(self):
        """Centraliza a janela na tela"""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f"{width}x{height}+{x}+{y}")
    
    def _criar_menu(self):
        """Cria o menu da aplicação"""
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)
        
        # Menu Arquivo
        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Arquivo", menu=file_menu)
        file_menu.add_command(label="Sair", command=self._sair)
        
        # Menu Configurações
        config_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Configurações", menu=config_menu)
        config_menu.add_command(label="Configurações...", command=self._abrir_config)
        
        # Menu Ajuda
        help_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Ajuda", menu=help_menu)
        help_menu.add_command(label="Sobre", command=self._mostrar_sobre)
    
    def _criar_abas(self):
        """Cria as abas principais"""
        # Aba Download
        self.download_tab = DownloadTab(self.notebook, self.root)
        self.notebook.add(self.download_tab, text="📥 Download")
        
        # Aba Upload
        self.upload_tab = UploadTab(self.notebook, self.root)
        self.notebook.add(self.upload_tab, text="📤 Upload")
        
        # Aba Extração
        self.extract_tab = ExtractTab(self.notebook, self.root)
        self.notebook.add(self.extract_tab, text="🔑 Extrair Chaves")
        
        # Aba Organização
        self.organize_tab = OrganizeTab(self.notebook, self.root)
        self.notebook.add(self.organize_tab, text="📁 Organizar")
    
    def _abrir_config(self):
        """Abre o diálogo de configurações"""
        dialog = ConfigDialog(self.root)
        if dialog.show():
            messagebox.showinfo("Info", "Configuracoes salvas! Algumas mudancas podem requerer reiniciar a aplicacao.")
    
    def _mostrar_sobre(self):
        """Mostra diálogo sobre"""
        messagebox.showinfo(
            "Sobre",
            "SIEG XML - Sistema de Gerenciamento de XMLs Fiscais\n\n"
            "Versão: 1.0.0\n\n"
            "Sistema para gerenciamento de XMLs fiscais (NFe, NFCe, NFSe, CTe, CFe)\n"
            "integrado com a API SIEG.\n\n"
            "Funcionalidades:\n"
            "  • Download de XMLs\n"
            "  • Upload de XMLs\n"
            "  • Extração de chaves\n"
            "  • Organização automática"
        )
    
    def _sair(self):
        """Fecha a aplicação"""
        if messagebox.askokcancel("Sair", "Deseja realmente sair?"):
            self.root.quit()
            self.root.destroy()
    
    def atualizar_status(self, texto: str):
        """Atualiza a barra de status"""
        self.status_bar.config(text=texto)
    
    def run(self):
        """Inicia o loop principal da aplicação"""
        self.root.mainloop()
