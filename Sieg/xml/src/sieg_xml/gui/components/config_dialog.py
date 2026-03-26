"""
Diálogo de configurações
"""
import tkinter as tk
from tkinter import ttk, messagebox
import os
import sys

# Adicionar src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from sieg_xml import config


class ConfigDialog:
    """Diálogo para editar configurações"""
    
    def __init__(self, parent):
        """
        Inicializa o diálogo de configurações
        
        Args:
            parent: Widget pai
        """
        self.parent = parent
        self.result = None
        
        # Criar janela de diálogo
        self.dialog = tk.Toplevel(parent)
        self.dialog.title("Configurações")
        self.dialog.geometry("500x300")
        self.dialog.transient(parent)
        self.dialog.grab_set()
        
        # Centralizar na tela
        self.dialog.update_idletasks()
        x = (self.dialog.winfo_screenwidth() // 2) - (self.dialog.winfo_width() // 2)
        y = (self.dialog.winfo_screenheight() // 2) - (self.dialog.winfo_height() // 2)
        self.dialog.geometry(f"+{x}+{y}")
        
        # Frame principal
        main_frame = ttk.Frame(self.dialog, padding=20)
        main_frame.pack(fill='both', expand=True)
        
        # API Key
        ttk.Label(main_frame, text="API Key SIEG:").grid(row=0, column=0, sticky='w', pady=5)
        self.api_key_var = tk.StringVar(value=config.SIEG_API_KEY)
        api_key_entry = ttk.Entry(main_frame, textvariable=self.api_key_var, width=50, show='*')
        api_key_entry.grid(row=0, column=1, sticky='ew', pady=5, padx=5)
        
        # Pasta padrão de XMLs
        ttk.Label(main_frame, text="Pasta padrão XMLs:").grid(row=1, column=0, sticky='w', pady=5)
        self.pasta_var = tk.StringVar(value=config.PASTA_PADRAO_XMLS)
        pasta_entry = ttk.Entry(main_frame, textvariable=self.pasta_var, width=50)
        pasta_entry.grid(row=1, column=1, sticky='ew', pady=5, padx=5)
        
        # Botão para selecionar pasta
        pasta_btn = ttk.Button(main_frame, text="...", command=self._selecionar_pasta, width=3)
        pasta_btn.grid(row=1, column=2, pady=5, padx=5)
        
        # Número de threads
        ttk.Label(main_frame, text="Threads padrão:").grid(row=2, column=0, sticky='w', pady=5)
        self.threads_var = tk.StringVar(value=str(config.NUM_THREADS_PADRAO))
        threads_spin = ttk.Spinbox(main_frame, from_=1, to=50, textvariable=self.threads_var, width=10)
        threads_spin.grid(row=2, column=1, sticky='w', pady=5, padx=5)
        
        # Configurar grid
        main_frame.columnconfigure(1, weight=1)
        
        # Botões
        btn_frame = ttk.Frame(main_frame)
        btn_frame.grid(row=3, column=0, columnspan=3, pady=20)
        
        ttk.Button(btn_frame, text="Salvar", command=self._salvar).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="Cancelar", command=self._cancelar).pack(side='left', padx=5)
    
    def _selecionar_pasta(self):
        """Abre diálogo para selecionar pasta"""
        from tkinter import filedialog
        pasta = filedialog.askdirectory(initialdir=self.pasta_var.get())
        if pasta:
            self.pasta_var.set(pasta)
    
    def _salvar(self):
        """Salva as configurações"""
        api_key = self.api_key_var.get().strip()
        if not api_key:
            messagebox.showerror("Erro", "API Key não pode estar vazia!")
            return
        
        # Salvar no .env
        env_path = os.path.join(os.getcwd(), '.env')
        try:
            # Ler .env existente se houver
            env_vars = {}
            if os.path.exists(env_path):
                with open(env_path, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
            
            # Atualizar valores
            env_vars['SIEG_API_KEY'] = api_key
            env_vars['PASTA_PADRAO_XMLS'] = self.pasta_var.get().strip()
            env_vars['NUM_THREADS_PADRAO'] = self.threads_var.get().strip()
            
            # Escrever .env
            with open(env_path, 'w', encoding='utf-8') as f:
                f.write("# Configuracoes do SIEG XML\n")
                f.write(f"SIEG_API_KEY={env_vars['SIEG_API_KEY']}\n")
                f.write(f"PASTA_PADRAO_XMLS={env_vars['PASTA_PADRAO_XMLS']}\n")
                f.write(f"NUM_THREADS_PADRAO={env_vars['NUM_THREADS_PADRAO']}\n")
            
            messagebox.showinfo("Sucesso", "Configuracoes salvas! Reinicie a aplicacao para aplicar as mudancas.")
            self.result = True
            self.dialog.destroy()
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar configuracoes: {e}")
    
    def _cancelar(self):
        """Cancela o diálogo"""
        self.result = False
        self.dialog.destroy()
    
    def show(self):
        """Mostra o diálogo e retorna True se salvou"""
        self.dialog.wait_window()
        return self.result
