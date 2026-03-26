"""
Aba de extração de chaves
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
import sys
import threading
from pathlib import Path

# Adicionar src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from sieg_xml.core.chave_extractor import processar_planilha
from ..components.progress_bar import ProgressBar
from ..components.log_viewer import LogViewer
from ..utils.threading_utils import update_gui, CancellationToken
import pandas as pd


class ExtractTab(ttk.Frame):
    """Aba para extração de chaves de XML"""
    
    def __init__(self, parent, root):
        """
        Inicializa a aba de extração
        
        Args:
            parent: Widget pai (Notebook)
            root: Janela principal
        """
        super().__init__(parent)
        self.root = root
        self.arquivos_excel = []
        self.chaves_encontradas = []
        self.cancel_token = None
        self.extract_thread = None
        
        self._criar_widgets()
    
    def _criar_widgets(self):
        """Cria os widgets da aba"""
        # Frame superior - Seleção
        top_frame = ttk.LabelFrame(self, text="Seleção de Planilhas", padding=10)
        top_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Label(top_frame, text="Opções:").grid(row=0, column=0, sticky='w', pady=5)
        
        btn_frame = ttk.Frame(top_frame)
        btn_frame.grid(row=0, column=1, columnspan=2, sticky='w', padx=5, pady=5)
        
        ttk.Button(btn_frame, text="Uma Planilha", command=self._selecionar_uma).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="Múltiplas Planilhas", command=self._selecionar_multiplas).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="Diretório Atual", command=self._processar_diretorio).pack(side='left', padx=5)
        
        self.arquivos_label = ttk.Label(top_frame, text="Nenhum arquivo selecionado", foreground='gray')
        self.arquivos_label.grid(row=1, column=0, columnspan=3, sticky='w', padx=5, pady=5)
        
        # Frame de preview
        preview_frame = ttk.LabelFrame(self, text="Preview das Chaves", padding=10)
        preview_frame.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Lista de chaves
        list_frame = ttk.Frame(preview_frame)
        list_frame.pack(fill='both', expand=True)
        
        scrollbar = ttk.Scrollbar(list_frame)
        scrollbar.pack(side='right', fill='y')
        
        self.chaves_listbox = tk.Listbox(list_frame, yscrollcommand=scrollbar.set, font=('Consolas', 9))
        self.chaves_listbox.pack(side='left', fill='both', expand=True)
        scrollbar.config(command=self.chaves_listbox.yview)
        
        # Frame de informações
        info_frame = ttk.Frame(preview_frame)
        info_frame.pack(fill='x', pady=5)
        
        self.info_label = ttk.Label(info_frame, text="Total de chaves: 0")
        self.info_label.pack(side='left', padx=5)
        
        # Nome do arquivo de saída
        output_frame = ttk.Frame(self)
        output_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Label(output_frame, text="Arquivo de saída:").pack(side='left', padx=5)
        self.output_var = tk.StringVar(value="chaves_xml_consolidadas.xlsx")
        ttk.Entry(output_frame, textvariable=self.output_var, width=40).pack(side='left', padx=5, fill='x', expand=True)
        
        # Barra de progresso
        self.progress = ProgressBar(self)
        self.progress.frame.pack(fill='x', padx=10, pady=10)
        
        # Botões de ação
        btn_frame = ttk.Frame(self)
        btn_frame.pack(fill='x', padx=10, pady=10)
        
        self.extract_btn = ttk.Button(btn_frame, text="Extrair Chaves", command=self._extrair_chaves, state='disabled')
        self.extract_btn.pack(side='left', padx=5)
        
        self.cancel_btn = ttk.Button(btn_frame, text="Cancelar", command=self._cancelar_extracao, state='disabled')
        self.cancel_btn.pack(side='left', padx=5)
        
        # Log viewer
        self.log_viewer = LogViewer(self)
        self.log_viewer.frame.pack(fill='both', expand=True, padx=10, pady=10)
    
    def _selecionar_uma(self):
        """Seleciona uma planilha"""
        arquivo = filedialog.askopenfilename(
            title="Selecione a planilha Excel",
            filetypes=[("Arquivos Excel", "*.xlsx *.xls"), ("Todos os arquivos", "*.*")],
            initialdir=os.getcwd()
        )
        
        if arquivo:
            self.arquivos_excel = [Path(arquivo)]
            self.arquivos_label.config(
                text=f"1 planilha selecionada: {os.path.basename(arquivo)}",
                foreground='black'
            )
            self._processar_planilhas()
    
    def _selecionar_multiplas(self):
        """Seleciona múltiplas planilhas"""
        arquivos = filedialog.askopenfilenames(
            title="Selecione as planilhas Excel",
            filetypes=[("Arquivos Excel", "*.xlsx *.xls"), ("Todos os arquivos", "*.*")],
            initialdir=os.getcwd()
        )
        
        if arquivos:
            self.arquivos_excel = [Path(arq) for arq in arquivos]
            self.arquivos_label.config(
                text=f"{len(self.arquivos_excel)} planilha(s) selecionada(s)",
                foreground='black'
            )
            self._processar_planilhas()
    
    def _processar_diretorio(self):
        """Processa todas as planilhas do diretório atual"""
        diretorio = Path('.')
        arquivos = [
            f for f in diretorio.glob('*.xlsx')
            if not f.name.startswith('~$')
        ]
        
        if arquivos:
            self.arquivos_excel = arquivos
            self.arquivos_label.config(
                text=f"{len(self.arquivos_excel)} planilha(s) encontrada(s) no diretório",
                foreground='black'
            )
            self._processar_planilhas()
        else:
            messagebox.showinfo("Info", "Nenhum arquivo Excel encontrado no diretório atual")
    
    def _processar_planilhas(self):
        """Processa as planilhas selecionadas"""
        if not self.arquivos_excel:
            return
        
        self.log_viewer.info(f"Processando {len(self.arquivos_excel)} planilha(s)...")
        self.progress.set_status("Processando planilhas...")
        
        # Criar token de cancelamento
        self.cancel_token = CancellationToken()
        self.extract_btn.config(state='disabled')
        self.cancel_btn.config(state='normal')
        
        # Executar em thread
        self.extract_thread = threading.Thread(target=self._executar_processamento, daemon=True)
        self.extract_thread.start()
    
    def _cancelar_extracao(self):
        """Cancela a extração em andamento"""
        if self.cancel_token:
            self.cancel_token.cancel()
            update_gui(self.root, self.log_viewer.warning, "Cancelamento solicitado...")
            update_gui(self.root, self.progress.set_status, "Cancelando...")
    
    def _executar_processamento(self):
        """Executa o processamento em thread separada"""
        try:
            todas_chaves = []
            
            for idx, arquivo in enumerate(self.arquivos_excel, 1):
                # Verificar cancelamento
                if self.cancel_token and self.cancel_token.is_cancelled():
                    update_gui(self.root, self.log_viewer.warning, "Extração cancelada pelo usuário")
                    update_gui(self.root, self.progress.set_status, "Cancelado")
                    break
                
                update_gui(self.root, self.progress.set_progress, idx, len(self.arquivos_excel))
                update_gui(self.root, self.progress.set_status, f"Processando: {arquivo.name}")
                update_gui(self.root, self.log_viewer.info, f"Processando: {arquivo.name}")
                
                chaves = processar_planilha(str(arquivo))
                for chave in chaves:
                    todas_chaves.append({
                        'Chave XML': chave,
                        'Arquivo Origem': arquivo.name
                    })
            
            # Remover duplicatas
            df_resultado = pd.DataFrame(todas_chaves)
            df_resultado = df_resultado.drop_duplicates(subset=['Chave XML'], keep='first')
            df_resultado = df_resultado.sort_values('Chave XML').reset_index(drop=True)
            
            self.chaves_encontradas = df_resultado['Chave XML'].tolist()
            
            # Atualizar lista
            foi_cancelado = self.cancel_token and self.cancel_token.is_cancelled()
            
            update_gui(self.root, self._atualizar_lista)
            update_gui(self.root, self.info_label.config, text=f"Total de chaves únicas: {len(self.chaves_encontradas)}")
            
            if foi_cancelado:
                update_gui(self.root, self.progress.set_status, f"Cancelado: {len(self.chaves_encontradas)} chaves encontradas até o momento")
                update_gui(self.root, self.log_viewer.warning, f"Extração cancelada! {len(self.chaves_encontradas)} chaves encontradas até o momento")
            else:
                update_gui(self.root, self.progress.set_status, f"Processamento concluído: {len(self.chaves_encontradas)} chaves encontradas")
                update_gui(self.root, self.log_viewer.success, f"Processamento concluído! {len(self.chaves_encontradas)} chaves únicas encontradas")
            
            update_gui(self.root, self.extract_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            
        except Exception as e:
            update_gui(self.root, self.log_viewer.error, f"Erro ao processar: {e}")
            update_gui(self.root, self.extract_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            update_gui(self.root, messagebox.showerror, "Erro", f"Erro ao processar planilhas:\n{e}")
    
    def _atualizar_lista(self):
        """Atualiza a lista de chaves"""
        self.chaves_listbox.delete(0, tk.END)
        for chave in self.chaves_encontradas[:100]:  # Mostrar apenas as 100 primeiras
            self.chaves_listbox.insert(tk.END, chave)
        if len(self.chaves_encontradas) > 100:
            self.chaves_listbox.insert(tk.END, f"... e mais {len(self.chaves_encontradas) - 100} chave(s)")
    
    def _extrair_chaves(self):
        """Exporta as chaves para Excel"""
        if not self.chaves_encontradas:
            messagebox.showwarning("Aviso", "Nenhuma chave para exportar!")
            return
        
        arquivo_saida = self.output_var.get().strip()
        if not arquivo_saida:
            arquivo_saida = "chaves_xml_consolidadas.xlsx"
        
        try:
            # Criar DataFrame
            todas_chaves = []
            for arquivo in self.arquivos_excel:
                chaves = processar_planilha(str(arquivo))
                for chave in chaves:
                    todas_chaves.append({
                        'Chave XML': chave,
                        'Arquivo Origem': arquivo.name
                    })
            
            df_resultado = pd.DataFrame(todas_chaves)
            df_resultado = df_resultado.drop_duplicates(subset=['Chave XML'], keep='first')
            df_resultado = df_resultado.sort_values('Chave XML').reset_index(drop=True)
            
            # Salvar
            df_resultado.to_excel(arquivo_saida, index=False)
            
            self.log_viewer.success(f"Arquivo gerado: {arquivo_saida}")
            messagebox.showinfo("Sucesso", f"Chaves exportadas com sucesso!\n\nArquivo: {arquivo_saida}\nTotal: {len(df_resultado)} chaves")
            
        except Exception as e:
            self.log_viewer.error(f"Erro ao exportar: {e}")
            messagebox.showerror("Erro", f"Erro ao exportar chaves:\n{e}")
