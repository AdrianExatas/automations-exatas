"""
Aba de download de XMLs
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
import sys
import threading

# Adicionar src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from sieg_xml.services.download_service import DownloadService
from sieg_xml.utils.excel_utils import ler_planilha_chaves, identificar_coluna_chaves
from ..components.progress_bar import ProgressBar
from ..components.log_viewer import LogViewer
from ..utils.threading_utils import update_gui, CancellationToken
import pandas as pd


class DownloadTab(ttk.Frame):
    """Aba para download de XMLs"""
    
    def __init__(self, parent, root):
        """
        Inicializa a aba de download
        
        Args:
            parent: Widget pai (Notebook)
            root: Janela principal (para atualizações thread-safe)
        """
        super().__init__(parent)
        self.root = root
        self.planilha_path = None
        self.chaves = []
        self.service = None
        self.cancel_token = None
        self.download_thread = None
        
        self._criar_widgets()
    
    def _criar_widgets(self):
        """Cria os widgets da aba"""
        # Frame superior - Seleção de planilha
        top_frame = ttk.LabelFrame(self, text="Seleção de Planilha", padding=10)
        top_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Label(top_frame, text="Planilha Excel:").grid(row=0, column=0, sticky='w', pady=5)
        
        self.planilha_var = tk.StringVar(value="Nenhuma planilha selecionada")
        planilha_label = ttk.Label(top_frame, textvariable=self.planilha_var, foreground='gray')
        planilha_label.grid(row=0, column=1, sticky='ew', padx=5, pady=5)
        
        ttk.Button(top_frame, text="Selecionar Planilha", command=self._selecionar_planilha).grid(
            row=0, column=2, padx=5, pady=5
        )
        
        top_frame.columnconfigure(1, weight=1)
        
        # Frame de informações
        info_frame = ttk.LabelFrame(self, text="Informações", padding=10)
        info_frame.pack(fill='x', padx=10, pady=10)
        
        self.info_text = tk.Text(info_frame, height=6, wrap=tk.WORD, state='disabled')
        self.info_text.pack(fill='both', expand=True)
        
        # Frame de coluna (aparece após selecionar planilha)
        self.coluna_frame = ttk.LabelFrame(self, text="Coluna de Chaves", padding=10)
        
        self.coluna_var = tk.StringVar()
        self.coluna_combo = ttk.Combobox(self.coluna_frame, textvariable=self.coluna_var, state='readonly')
        self.coluna_combo.pack(fill='x', pady=5)
        
        # Barra de progresso
        self.progress = ProgressBar(self)
        self.progress.frame.pack(fill='x', padx=10, pady=10)
        
        # Botões de ação
        btn_frame = ttk.Frame(self)
        btn_frame.pack(fill='x', padx=10, pady=10)
        
        self.download_btn = ttk.Button(btn_frame, text="Baixar XMLs", command=self._baixar_xmls, state='disabled')
        self.download_btn.pack(side='left', padx=5)
        
        self.cancel_btn = ttk.Button(btn_frame, text="Cancelar", command=self._cancelar_download, state='disabled')
        self.cancel_btn.pack(side='left', padx=5)
        
        # Log viewer
        self.log_viewer = LogViewer(self)
        self.log_viewer.frame.pack(fill='both', expand=True, padx=10, pady=10)
    
    def _selecionar_planilha(self):
        """Abre diálogo para selecionar planilha"""
        arquivo = filedialog.askopenfilename(
            title="Selecione a planilha Excel",
            filetypes=[
                ("Arquivos Excel", "*.xlsx *.xls"),
                ("Excel 2007+", "*.xlsx"),
                ("Excel 97-2003", "*.xls"),
                ("Todos os arquivos", "*.*")
            ],
            initialdir=os.getcwd()
        )
        
        if arquivo:
            self.planilha_path = arquivo
            self.planilha_var.set(os.path.basename(arquivo))
            self._processar_planilha()
    
    def _processar_planilha(self):
        """Processa a planilha selecionada"""
        if not self.planilha_path:
            return
        
        try:
            self.log_viewer.info(f"Lendo planilha: {os.path.basename(self.planilha_path)}")
            
            df = pd.read_excel(self.planilha_path)
            
            # Atualizar informações
            self.info_text.config(state='normal')
            self.info_text.delete(1.0, tk.END)
            self.info_text.insert(tk.END, f"Colunas encontradas ({len(df.columns)}):\n")
            for col in df.columns:
                self.info_text.insert(tk.END, f"  - {col}\n")
            self.info_text.config(state='disabled')
            
            # Identificar coluna
            chave_col = identificar_coluna_chaves(df)
            
            # Configurar combobox de colunas
            self.coluna_combo['values'] = list(df.columns)
            
            if chave_col:
                self.coluna_var.set(chave_col)
                self.log_viewer.success(f"Coluna identificada automaticamente: '{chave_col}'")
            else:
                self.log_viewer.warning("Não foi possível identificar a coluna automaticamente")
                if len(df.columns) > 0:
                    self.coluna_var.set(df.columns[0])
            
            # Mostrar frame de coluna
            self.coluna_frame.pack(fill='x', padx=10, pady=10)
            
            # Extrair chaves
            coluna_selecionada = self.coluna_var.get()
            if coluna_selecionada:
                self.chaves = ler_planilha_chaves(self.planilha_path, coluna_selecionada)
                self.log_viewer.info(f"Total de chaves válidas encontradas: {len(self.chaves)}")
                
                if len(self.chaves) > 0:
                    self.download_btn.config(state='normal')
                    self.info_text.config(state='normal')
                    self.info_text.insert(tk.END, f"\nChaves válidas: {len(self.chaves)}\n")
                    self.info_text.config(state='disabled')
                else:
                    self.download_btn.config(state='disabled')
                    self.log_viewer.error("Nenhuma chave válida encontrada na planilha")
            
            # Atualizar quando coluna mudar
            self.coluna_combo.bind('<<ComboboxSelected>>', lambda e: self._atualizar_chaves())
            
        except Exception as e:
            self.log_viewer.error(f"Erro ao processar planilha: {e}")
            messagebox.showerror("Erro", f"Erro ao processar planilha:\n{e}")
    
    def _atualizar_chaves(self):
        """Atualiza as chaves quando a coluna é alterada"""
        if self.planilha_path:
            coluna_selecionada = self.coluna_var.get()
            if coluna_selecionada:
                self.chaves = ler_planilha_chaves(self.planilha_path, coluna_selecionada)
                self.log_viewer.info(f"Chaves atualizadas: {len(self.chaves)} encontradas")
                
                if len(self.chaves) > 0:
                    self.download_btn.config(state='normal')
                else:
                    self.download_btn.config(state='disabled')
    
    def _baixar_xmls(self):
        """Inicia o download dos XMLs"""
        if not self.chaves:
            messagebox.showwarning("Aviso", "Nenhuma chave para baixar!")
            return
        
        resposta = messagebox.askyesno(
            "Confirmar",
            f"Deseja baixar {len(self.chaves)} XML(s)?"
        )
        
        if not resposta:
            return
        
        # Desabilitar botão durante download
        self.download_btn.config(state='disabled')
        self.cancel_btn.config(state='normal')
        self.progress.reset()
        self.progress.set_status(f"Baixando {len(self.chaves)} XML(s)...")
        
        # Criar token de cancelamento
        self.cancel_token = CancellationToken()
        
        # Executar em thread separada
        self.download_thread = threading.Thread(target=self._executar_download, daemon=True)
        self.download_thread.start()
    
    def _cancelar_download(self):
        """Cancela o download em andamento"""
        if self.cancel_token:
            self.cancel_token.cancel()
            update_gui(self.root, self.log_viewer.warning, "Cancelamento solicitado...")
            update_gui(self.root, self.progress.set_status, "Cancelando...")
    
    def _executar_download(self):
        """Executa o download em thread separada"""
        try:
            self.service = DownloadService()
            total = len(self.chaves)
            
            # Modificar o serviço para usar callbacks (simulação)
            # Por enquanto, vamos fazer o download e atualizar progresso manualmente
            sucesso = 0
            falhas = 0
            
            for idx, chave in enumerate(self.chaves, 1):
                # Verificar cancelamento
                if self.cancel_token and self.cancel_token.is_cancelled():
                    update_gui(self.root, self.log_viewer.warning, "Download cancelado pelo usuário")
                    update_gui(self.root, self.progress.set_status, "Cancelado")
                    break
                
                update_gui(self.root, self.progress.set_progress, idx, total)
                update_gui(self.root, self.progress.set_status, f"Baixando XML {idx}/{total}: {chave[:10]}...")
                update_gui(self.root, self.log_viewer.info, f"[{idx}/{total}] Processando chave: {chave}")
                
                xml_content, valido, erro_detalhe = self.service.client.download_xml(chave)
                
                if xml_content and valido:
                    from sieg_xml.core.xml_parser import validar_xml, extrair_data_xml
                    
                    if not validar_xml(xml_content):
                        update_gui(self.root, self.log_viewer.warning, f"  XML inválido para chave: {chave}")
                        falhas += 1
                        continue
                    
                    ano, _ = extrair_data_xml(xml_content)
                    
                    if ano:
                        pasta_ano = os.path.join(self.service.pasta_xmls, str(ano))
                        os.makedirs(pasta_ano, exist_ok=True)
                        caminho_xml = os.path.join(pasta_ano, f"{chave}.xml")
                    else:
                        caminho_xml = os.path.join(self.service.pasta_xmls, f"{chave}.xml")
                    
                    with open(caminho_xml, 'w', encoding='utf-8') as f:
                        f.write(xml_content)
                    
                    update_gui(self.root, self.log_viewer.success, f"  OK - XML baixado: {os.path.basename(caminho_xml)}")
                    sucesso += 1
                else:
                    update_gui(self.root, self.log_viewer.error, f"  ERRO: Falha ao baixar XML para chave: {chave}")
                    if erro_detalhe and not getattr(self, "_detalhe_download_ja_mostrado", False):
                        update_gui(self.root, self.log_viewer.error, f"    Detalhe: {erro_detalhe}")
                        self._detalhe_download_ja_mostrado = True
                    falhas += 1
            
            # Resumo final
            if self.cancel_token and self.cancel_token.is_cancelled():
                update_gui(self.root, self.progress.set_status, f"Cancelado! Sucesso: {sucesso}, Falhas: {falhas}")
                update_gui(self.root, self.log_viewer.warning, f"\n{'='*60}")
                update_gui(self.root, self.log_viewer.warning, f"DOWNLOAD CANCELADO")
                update_gui(self.root, self.log_viewer.warning, f"  Sucesso: {sucesso}")
                update_gui(self.root, self.log_viewer.warning, f"  Falhas: {falhas}")
                update_gui(self.root, self.log_viewer.warning, f"  Processados: {sucesso + falhas}/{total}")
                update_gui(self.root, self.log_viewer.warning, f"{'='*60}")
            else:
                update_gui(self.root, self.progress.set_status, f"Concluído! Sucesso: {sucesso}, Falhas: {falhas}")
                update_gui(self.root, self.log_viewer.success, f"\n{'='*60}")
                update_gui(self.root, self.log_viewer.success, f"RESUMO FINAL")
                update_gui(self.root, self.log_viewer.success, f"  Sucesso: {sucesso}")
                update_gui(self.root, self.log_viewer.success, f"  Falhas: {falhas}")
                update_gui(self.root, self.log_viewer.success, f"  Total: {total}")
                update_gui(self.root, self.log_viewer.success, f"{'='*60}")
                update_gui(self.root, messagebox.showinfo, "Concluído", f"Download concluído!\n\nSucesso: {sucesso}\nFalhas: {falhas}")
            
            update_gui(self.root, self.download_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            
        except Exception as e:
            update_gui(self.root, self.log_viewer.error, f"Erro durante download: {e}")
            update_gui(self.root, self.download_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            update_gui(self.root, messagebox.showerror, "Erro", f"Erro durante download:\n{e}")
