"""
Aba de organização de XMLs
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
import sys
import threading

# Adicionar src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from sieg_xml.core.xml_organizer import organizar_xmls_por_data
from sieg_xml.config import PASTA_XMLS_BAIXADOS
from ..components.progress_bar import ProgressBar
from ..components.log_viewer import LogViewer
from ..utils.threading_utils import update_gui, CancellationToken


class OrganizeTab(ttk.Frame):
    """Aba para organização de XMLs"""
    
    def __init__(self, parent, root):
        """
        Inicializa a aba de organização
        
        Args:
            parent: Widget pai (Notebook)
            root: Janela principal
        """
        super().__init__(parent)
        self.root = root
        self.cancel_token = None
        self.organize_thread = None
        
        self._criar_widgets()
    
    def _criar_widgets(self):
        """Cria os widgets da aba"""
        # Frame superior - Seleção de pasta
        top_frame = ttk.LabelFrame(self, text="Pasta de XMLs", padding=10)
        top_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Label(top_frame, text="Pasta:").grid(row=0, column=0, sticky='w', pady=5)
        
        self.pasta_var = tk.StringVar(value=PASTA_XMLS_BAIXADOS)
        pasta_entry = ttk.Entry(top_frame, textvariable=self.pasta_var, width=50)
        pasta_entry.grid(row=0, column=1, sticky='ew', padx=5, pady=5)
        
        ttk.Button(top_frame, text="Selecionar Pasta", command=self._selecionar_pasta).grid(
            row=0, column=2, padx=5, pady=5
        )
        
        top_frame.columnconfigure(1, weight=1)
        
        # Barra de progresso
        self.progress = ProgressBar(self)
        self.progress.frame.pack(fill='x', padx=10, pady=10)
        
        # Botões de ação
        btn_frame = ttk.Frame(self)
        btn_frame.pack(fill='x', padx=10, pady=10)
        
        self.organize_btn = ttk.Button(btn_frame, text="Organizar XMLs", command=self._organizar_xmls)
        self.organize_btn.pack(side='left', padx=5)
        
        self.cancel_btn = ttk.Button(btn_frame, text="Cancelar", command=self._cancelar_organizacao, state='disabled')
        self.cancel_btn.pack(side='left', padx=5)
        
        # Frame de resultados
        results_frame = ttk.LabelFrame(self, text="Estrutura de Pastas", padding=10)
        results_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        self.results_text = tk.Text(results_frame, height=10, wrap=tk.WORD, state='disabled', font=('Consolas', 9))
        self.results_text.pack(fill='both', expand=True)
        
        # Log viewer
        self.log_viewer = LogViewer(self)
        self.log_viewer.frame.pack(fill='both', expand=True, padx=10, pady=10)
    
    def _selecionar_pasta(self):
        """Abre diálogo para selecionar pasta"""
        pasta = filedialog.askdirectory(
            title="Selecione a pasta com os XMLs",
            initialdir=self.pasta_var.get()
        )
        
        if pasta:
            self.pasta_var.set(pasta)
    
    def _organizar_xmls(self):
        """Inicia a organização dos XMLs"""
        pasta = self.pasta_var.get().strip()
        
        if not pasta:
            messagebox.showwarning("Aviso", "Selecione uma pasta!")
            return
        
        if not os.path.exists(pasta):
            messagebox.showerror("Erro", f"Pasta não encontrada: {pasta}")
            return
        
        resposta = messagebox.askyesno(
            "Confirmar",
            f"Organizar XMLs na pasta:\n{pasta}\n\nDeseja continuar?"
        )
        
        if not resposta:
            return
        
        # Desabilitar botão durante organização
        self.organize_btn.config(state='disabled')
        self.cancel_btn.config(state='normal')
        self.progress.reset()
        self.progress.set_status("Organizando XMLs...")
        
        # Criar token de cancelamento
        self.cancel_token = CancellationToken()
        
        # Executar em thread separada
        self.organize_thread = threading.Thread(target=self._executar_organizacao, args=(pasta,), daemon=True)
        self.organize_thread.start()
    
    def _cancelar_organizacao(self):
        """Cancela a organização em andamento"""
        if self.cancel_token:
            self.cancel_token.cancel()
            update_gui(self.root, self.log_viewer.warning, "Cancelamento solicitado...")
            update_gui(self.root, self.progress.set_status, "Cancelando...")
    
    def _executar_organizacao(self, pasta):
        """Executa a organização em thread separada"""
        try:
            # Verificar cancelamento
            if self.cancel_token and self.cancel_token.is_cancelled():
                update_gui(self.root, self.log_viewer.warning, "Operação cancelada antes de iniciar")
                update_gui(self.root, self.organize_btn.config, state='normal')
                update_gui(self.root, self.cancel_btn.config, state='disabled')
                return
            
            update_gui(self.root, self.log_viewer.info, f"Organizando XMLs em: {pasta}")
            
            resultado = organizar_xmls_por_data(pasta)
            
            # Verificar cancelamento
            foi_cancelado = self.cancel_token and self.cancel_token.is_cancelled()
            
            if 'erro' in resultado:
                update_gui(self.root, self.log_viewer.error, resultado['erro'])
                update_gui(self.root, self.organize_btn.config, state='normal')
                return
            
            # Atualizar progresso
            update_gui(self.root, self.progress.set_progress, resultado['total'], resultado['total'])
            update_gui(self.root, self.progress.set_status, "Organização concluída!")
            
            # Mostrar resultados
            if foi_cancelado:
                update_gui(self.root, self.log_viewer.warning, f"\n{'='*60}")
                update_gui(self.root, self.log_viewer.warning, f"ORGANIZAÇÃO CANCELADA")
                update_gui(self.root, self.log_viewer.warning, f"  Organizados (movidos): {resultado['organizados']}")
                update_gui(self.root, self.log_viewer.warning, f"  Já organizados: {resultado['ja_organizados']}")
                update_gui(self.root, self.log_viewer.warning, f"  Sem data: {resultado['sem_data']}")
                update_gui(self.root, self.log_viewer.warning, f"  Erros: {resultado['erros']}")
                update_gui(self.root, self.log_viewer.warning, f"  Total processado: {resultado['total']}")
                update_gui(self.root, self.log_viewer.warning, f"{'='*60}")
            else:
                update_gui(self.root, self.log_viewer.success, f"\n{'='*60}")
                update_gui(self.root, self.log_viewer.success, f"RESUMO DA ORGANIZAÇÃO")
                update_gui(self.root, self.log_viewer.success, f"  Organizados (movidos): {resultado['organizados']}")
                update_gui(self.root, self.log_viewer.success, f"  Já organizados: {resultado['ja_organizados']}")
                update_gui(self.root, self.log_viewer.success, f"  Sem data: {resultado['sem_data']}")
                update_gui(self.root, self.log_viewer.success, f"  Erros: {resultado['erros']}")
                update_gui(self.root, self.log_viewer.success, f"  Total: {resultado['total']}")
                update_gui(self.root, self.log_viewer.success, f"{'='*60}")
                update_gui(self.root, messagebox.showinfo, "Concluído", 
                          f"Organização concluída!\n\nOrganizados: {resultado['organizados']}\nJá organizados: {resultado['ja_organizados']}")
            
            # Mostrar estrutura de pastas
            update_gui(self.root, self._atualizar_estrutura, pasta)
            
            update_gui(self.root, self.organize_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            
        except Exception as e:
            update_gui(self.root, self.log_viewer.error, f"Erro durante organização: {e}")
            update_gui(self.root, self.organize_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            update_gui(self.root, messagebox.showerror, "Erro", f"Erro durante organização:\n{e}")
    
    def _atualizar_estrutura(self, pasta):
        """Atualiza a visualização da estrutura de pastas"""
        self.results_text.config(state='normal')
        self.results_text.delete(1.0, tk.END)
        
        if os.path.exists(pasta):
            pastas_ano = sorted([d for d in os.listdir(pasta)
                                if os.path.isdir(os.path.join(pasta, d)) and d.isdigit()])

            if pastas_ano:
                self.results_text.insert(tk.END, "Estrutura de pastas (por ano):\n\n")
                for ano in pastas_ano:
                    pasta_ano = os.path.join(pasta, ano)
                    num_xmls = sum(
                        1 for _r, _d, files in os.walk(pasta_ano)
                        for f in files if f.lower().endswith('.xml')
                    )
                    if num_xmls > 0:
                        self.results_text.insert(tk.END, f"  {ano}/ - {num_xmls} XML(s)\n")
            else:
                self.results_text.insert(tk.END, "Nenhuma estrutura de pastas criada ainda.")
        
        self.results_text.config(state='disabled')
