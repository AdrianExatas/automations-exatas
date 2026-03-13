"""
Aba de upload de XMLs
"""
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import os
import sys
import threading

# Adicionar src ao path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))

from sieg_xml.services.upload_service import UploadService
from sieg_xml.utils.file_utils import buscar_xmls_recursivo
from sieg_xml.config import NUM_THREADS_PADRAO
from ..components.progress_bar import ProgressBar
from ..components.log_viewer import LogViewer
from ..utils.threading_utils import update_gui, CancellationToken
from ..utils.error_utils import interpretar_erro_api, formatar_erro_para_log


class UploadTab(ttk.Frame):
    """Aba para upload de XMLs"""
    
    def __init__(self, parent, root):
        """
        Inicializa a aba de upload
        
        Args:
            parent: Widget pai (Notebook)
            root: Janela principal
        """
        super().__init__(parent)
        self.root = root
        self.arquivos_xml = []
        self.service = None
        self.cancel_token = None
        self.upload_thread = None
        
        self._criar_widgets()
    
    def _criar_widgets(self):
        """Cria os widgets da aba"""
        # Frame superior - Seleção de arquivos
        top_frame = ttk.LabelFrame(self, text="Seleção de Arquivos XML", padding=10)
        top_frame.pack(fill='x', padx=10, pady=10)
        
        ttk.Label(top_frame, text="Opções:").grid(row=0, column=0, sticky='w', pady=5)
        
        btn_frame = ttk.Frame(top_frame)
        btn_frame.grid(row=0, column=1, columnspan=2, sticky='w', padx=5, pady=5)
        
        ttk.Button(btn_frame, text="Selecionar Arquivos", command=self._selecionar_arquivos).pack(side='left', padx=5)
        ttk.Button(btn_frame, text="Selecionar Pasta", command=self._selecionar_pasta).pack(side='left', padx=5)
        
        self.arquivos_label = ttk.Label(top_frame, text="Nenhum arquivo selecionado", foreground='gray')
        self.arquivos_label.grid(row=1, column=0, columnspan=3, sticky='w', padx=5, pady=5)
        
        # Frame de configurações
        config_frame = ttk.LabelFrame(self, text="Configurações", padding=10)
        config_frame.pack(fill='x', padx=10, pady=10)
        
        # Verificar existentes
        self.verificar_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            config_frame,
            text="Verificar XMLs existentes antes de enviar",
            variable=self.verificar_var
        ).grid(row=0, column=0, sticky='w', pady=5)
        
        # Número de threads
        ttk.Label(config_frame, text="Threads:").grid(row=1, column=0, sticky='w', pady=5)
        self.threads_var = tk.StringVar(value=str(NUM_THREADS_PADRAO))
        threads_spin = ttk.Spinbox(config_frame, from_=1, to=50, textvariable=self.threads_var, width=10)
        threads_spin.grid(row=1, column=1, sticky='w', padx=5, pady=5)
        
        # Barra de progresso
        self.progress = ProgressBar(self)
        self.progress.frame.pack(fill='x', padx=10, pady=10)
        
        # Botões de ação
        btn_frame = ttk.Frame(self)
        btn_frame.pack(fill='x', padx=10, pady=10)
        
        self.upload_btn = ttk.Button(btn_frame, text="Enviar XMLs", command=self._enviar_xmls, state='disabled')
        self.upload_btn.pack(side='left', padx=5)
        
        self.cancel_btn = ttk.Button(btn_frame, text="Cancelar", command=self._cancelar_upload, state='disabled')
        self.cancel_btn.pack(side='left', padx=5)
        
        # Log viewer
        self.log_viewer = LogViewer(self)
        self.log_viewer.frame.pack(fill='both', expand=True, padx=10, pady=10)
    
    def _selecionar_arquivos(self):
        """Abre diálogo para selecionar arquivos XML"""
        arquivos = filedialog.askopenfilenames(
            title="Selecione os arquivos XML",
            filetypes=[("Arquivos XML", "*.xml"), ("Todos os arquivos", "*.*")],
            initialdir=os.getcwd()
        )
        
        if arquivos:
            self.arquivos_xml = list(arquivos)
            self.arquivos_label.config(
                text=f"{len(self.arquivos_xml)} arquivo(s) selecionado(s)",
                foreground='black'
            )
            self.upload_btn.config(state='normal')
            self.log_viewer.info(f"{len(self.arquivos_xml)} arquivo(s) XML selecionado(s)")
    
    def _selecionar_pasta(self):
        """Abre diálogo para selecionar pasta"""
        pasta = filedialog.askdirectory(
            title="Selecione a pasta com os arquivos XML",
            initialdir=os.getcwd()
        )
        
        if pasta:
            xmls = buscar_xmls_recursivo(pasta)
            if xmls:
                self.arquivos_xml = xmls
                self.arquivos_label.config(
                    text=f"{len(self.arquivos_xml)} arquivo(s) encontrado(s) na pasta",
                    foreground='black'
                )
                self.upload_btn.config(state='normal')
                self.log_viewer.info(f"Encontrados {len(self.arquivos_xml)} arquivo(s) XML na pasta")
            else:
                messagebox.showinfo("Info", "Nenhum arquivo XML encontrado na pasta selecionada")
    
    def _enviar_xmls(self):
        """Inicia o envio dos XMLs"""
        if not self.arquivos_xml:
            messagebox.showwarning("Aviso", "Nenhum arquivo selecionado!")
            return
        
        try:
            num_threads = int(self.threads_var.get())
            if num_threads < 1 or num_threads > 50:
                messagebox.showerror("Erro", "Número de threads deve estar entre 1 e 50")
                return
        except ValueError:
            messagebox.showerror("Erro", "Número de threads inválido")
            return
        
        resposta = messagebox.askyesno(
            "Confirmar",
            f"Deseja enviar {len(self.arquivos_xml)} XML(s) para o SIEG?"
        )
        
        if not resposta:
            return
        
        # Desabilitar botão durante envio
        self.upload_btn.config(state='disabled')
        self.cancel_btn.config(state='normal')
        self.progress.reset()
        self.progress.set_status("Iniciando envio...")
        
        # Criar token de cancelamento
        self.cancel_token = CancellationToken()
        
        # Capturar valor do checkbox antes de iniciar a thread
        verificar_existentes = self.verificar_var.get()
        
        # Executar em thread separada
        self.upload_thread = threading.Thread(target=self._executar_envio, args=(num_threads, verificar_existentes), daemon=True)
        self.upload_thread.start()
    
    def _cancelar_upload(self):
        """Cancela o upload em andamento"""
        if self.cancel_token:
            self.cancel_token.cancel()
            update_gui(self.root, self.log_viewer.warning, "Cancelamento solicitado...")
            update_gui(self.root, self.progress.set_status, "Cancelando...")
    
    def _executar_envio(self, num_threads, verificar_existentes):
        """Executa o envio em thread separada"""
        try:
            self.service = UploadService()
            
            # Verificar cancelamento
            if self.cancel_token and self.cancel_token.is_cancelled():
                update_gui(self.root, self.log_viewer.warning, "Operação cancelada antes de iniciar")
                update_gui(self.root, self.upload_btn.config, state='normal')
                update_gui(self.root, self.cancel_btn.config, state='disabled')
                return
            
            # Validar XMLs
            update_gui(self.root, self.progress.set_status, "Validando XMLs...")
            update_gui(self.root, self.log_viewer.info, "Validando XMLs...")
            
            xmls_validos, tipos_identificados = self.service.validar_xmls(self.arquivos_xml)
            
            # Verificar cancelamento após validação
            if self.cancel_token and self.cancel_token.is_cancelled():
                update_gui(self.root, self.log_viewer.warning, "Operação cancelada durante validação")
                update_gui(self.root, self.upload_btn.config, state='normal')
                update_gui(self.root, self.cancel_btn.config, state='disabled')
                return
            
            update_gui(self.root, self.log_viewer.info, f"XMLs válidos: {len(xmls_validos)}")
            
            if tipos_identificados:
                for tipo, qtd in tipos_identificados.items():
                    update_gui(self.root, self.log_viewer.info, f"  - {tipo}: {qtd}")
            
            if not xmls_validos:
                update_gui(self.root, self.log_viewer.error, "Nenhum XML válido encontrado")
                update_gui(self.root, self.upload_btn.config, state='normal')
                update_gui(self.root, self.cancel_btn.config, state='disabled')
                return
            
            # Verificar existentes se solicitado
            xmls_para_enviar = xmls_validos
            if verificar_existentes:
                update_gui(self.root, self.progress.set_status, "Verificando XMLs existentes...")
                update_gui(self.root, self.log_viewer.info, "Verificando XMLs existentes no SIEG...")
                
                xmls_para_enviar, xmls_ja_existentes = self.service.verificar_xmls_existentes(xmls_validos)
                
                update_gui(self.root, self.log_viewer.info, f"XMLs para enviar: {len(xmls_para_enviar)}")
                if xmls_ja_existentes:
                    update_gui(self.root, self.log_viewer.warning, f"XMLs já existentes (ignorados): {len(xmls_ja_existentes)}")
            else:
                update_gui(self.root, self.log_viewer.info, "Verificação de XMLs existentes desabilitada - enviando todos os XMLs válidos")
            
            if not xmls_para_enviar:
                update_gui(self.root, self.log_viewer.warning, "Todos os XMLs já existem no SIEG")
                update_gui(self.root, self.upload_btn.config, state='normal')
                update_gui(self.root, self.cancel_btn.config, state='disabled')
                return
            
            # Verificar cancelamento antes de enviar
            if self.cancel_token and self.cancel_token.is_cancelled():
                update_gui(self.root, self.log_viewer.warning, "Operação cancelada antes do envio")
                update_gui(self.root, self.upload_btn.config, state='normal')
                update_gui(self.root, self.cancel_btn.config, state='disabled')
                return
            
            # Enviar XMLs
            update_gui(self.root, self.progress.set_status, f"Enviando {len(xmls_para_enviar)} XML(s)...")
            update_gui(self.root, self.log_viewer.info, f"Iniciando envio de {len(xmls_para_enviar)} XML(s) com {num_threads} thread(s)...")
            
            # Enviar usando o serviço
            resultado = self.service.enviar_xmls(xmls_para_enviar, num_threads=num_threads, usar_warmup=False)
            
            # Log dos resultados detalhados
            if resultado.get('enviados_sucesso'):
                for xml_info in resultado['enviados_sucesso'][:20]:  # Mostrar apenas os 20 primeiros
                    update_gui(self.root, self.log_viewer.success, f"✓ {xml_info['nome']}")
                if len(resultado['enviados_sucesso']) > 20:
                    update_gui(self.root, self.log_viewer.success, f"... e mais {len(resultado['enviados_sucesso']) - 20} XML(s)")
            
            if resultado.get('erros_detalhados'):
                for erro in resultado['erros_detalhados'][:10]:  # Mostrar apenas os 10 primeiros erros
                    erro_msg = erro.get('erro', 'Erro desconhecido')
                    erro_info = interpretar_erro_api(erro_msg)
                    erro_formatado = formatar_erro_para_log(erro_info)
                    update_gui(self.root, self.log_viewer.error, f"✗ {erro['xml']['nome']}: {erro_formatado}")
                if len(resultado['erros_detalhados']) > 10:
                    update_gui(self.root, self.log_viewer.error, f"... e mais {len(resultado['erros_detalhados']) - 10} erro(s)")
            
            # Verificar se foi cancelado
            foi_cancelado = self.cancel_token and self.cancel_token.is_cancelled()
            
            # Atualizar progresso baseado no resultado
            update_gui(self.root, self.progress.set_progress, resultado['total'], resultado['total'])
            
            if foi_cancelado:
                update_gui(self.root, self.progress.set_status, f"Cancelado! Enviados: {resultado['enviados']}, Erros: {resultado['erros']}")
                update_gui(self.root, self.log_viewer.warning, f"\n{'='*60}")
                update_gui(self.root, self.log_viewer.warning, f"UPLOAD CANCELADO")
                update_gui(self.root, self.log_viewer.warning, f"  Enviados: {resultado['enviados']}")
                update_gui(self.root, self.log_viewer.warning, f"  Erros: {resultado['erros']}")
                update_gui(self.root, self.log_viewer.warning, f"  Total processado: {resultado['total']}")
                update_gui(self.root, self.log_viewer.warning, f"{'='*60}")
            else:
                update_gui(self.root, self.progress.set_status, f"Concluído! Enviados: {resultado['enviados']}, Erros: {resultado['erros']}")
                update_gui(self.root, self.log_viewer.success, f"\n{'='*60}")
                update_gui(self.root, self.log_viewer.success, f"RESUMO FINAL")
                update_gui(self.root, self.log_viewer.success, f"  Enviados: {resultado['enviados']}")
                update_gui(self.root, self.log_viewer.success, f"  Erros: {resultado['erros']}")
                update_gui(self.root, self.log_viewer.success, f"  Total: {resultado['total']}")
                update_gui(self.root, self.log_viewer.success, f"  Tempo: {resultado['tempo_total']:.2f}s")
                update_gui(self.root, self.log_viewer.success, f"{'='*60}")
                update_gui(self.root, messagebox.showinfo, "Concluído", 
                          f"Envio concluído!\n\nEnviados: {resultado['enviados']}\nErros: {resultado['erros']}")
            
            update_gui(self.root, self.upload_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            
        except Exception as e:
            update_gui(self.root, self.log_viewer.error, f"Erro durante envio: {e}")
            update_gui(self.root, self.upload_btn.config, state='normal')
            update_gui(self.root, self.cancel_btn.config, state='disabled')
            update_gui(self.root, messagebox.showerror, "Erro", f"Erro durante envio:\n{e}")
