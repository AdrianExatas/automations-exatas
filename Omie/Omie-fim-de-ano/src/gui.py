"""
Interface gráfica principal do projeto
"""
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk, StringVar
import threading
import os
from dotenv import load_dotenv

from .omie_automation import OmieAutomation
from .validation import OmieValidation
from utils.data_utils import carregar_dados_macro
from utils.checkpoint import limpar_checkpoint
from utils.logger import log_event


class AutomationGUI:
    """Classe principal da interface gráfica"""
    
    def __init__(self):
        # Carregar variáveis de ambiente
        load_dotenv('config.env')
        
        # Configurações
        self.email = os.getenv('EMAIL')
        self.senha = os.getenv('SENHA')
        self.stop_requested = False
        self.modo_simulacao = False
        
        # Instanciar automação e validação
        self.omie_automation = OmieAutomation(self.email, self.senha, "logs/omie_checkpoint.txt")
        self.omie_validation = OmieValidation(self.email, self.senha, "logs/validacao_checkpoint.txt")
        
        # Criar interface
        self.criar_interface()
    
    def criar_interface(self):
        """Cria a interface gráfica"""
        self.root = tk.Tk()
        self.root.title("Automação Omie - Contratos de Serviços")
        self.root.geometry("1000x750")
        
        # Notebook para abas
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill='both', expand=True)
        
        # Aba principal do Omie
        self.frame_omie = tk.Frame(self.notebook)
        self.notebook.add(self.frame_omie, text="Execução")
        
        # Aba de Validação
        self.frame_validacao = tk.Frame(self.notebook)
        self.notebook.add(self.frame_validacao, text="Validação")
        
        # Aba de Configurações
        self.frame_config = tk.Frame(self.notebook)
        self.notebook.add(self.frame_config, text="Configurações")
        
        # Criar interfaces específicas
        self.criar_interface_omie()
        self.criar_interface_validacao()
        self.criar_interface_config()
    
    def criar_interface_omie(self):
        """Cria a interface específica do Omie"""
        # Frame de botões
        frame_btns = tk.Frame(self.frame_omie)
        frame_btns.pack(pady=5)
        
        btn_iniciar = tk.Button(
            frame_btns, 
            text="[INICIAR] Iniciar Automação", 
            font=("Arial", 12), 
            command=self.iniciar_processo_omie
        )
        btn_iniciar.pack(side=tk.LEFT, padx=10)
        
        btn_parar = tk.Button(
            frame_btns, 
            text="[PARAR] Parar", 
            font=("Arial", 12), 
            command=self.parar_processo
        )
        btn_parar.pack(side=tk.LEFT, padx=10)
        
        btn_teste = tk.Button(
            frame_btns, 
            text="[TESTE] Testar ChromeDriver", 
            font=("Arial", 12), 
            command=self.testar_chromedriver_omie
        )
        btn_teste.pack(side=tk.LEFT, padx=10)
        
        btn_limpar_checkpoint = tk.Button(
            frame_btns, 
            text="[CHECKPOINT] Limpar", 
            font=("Arial", 12), 
            command=self.limpar_checkpoint_omie
        )
        btn_limpar_checkpoint.pack(side=tk.LEFT, padx=10)
        
        # Barra de progresso
        self.progress_omie = ttk.Progressbar(self.frame_omie, length=1000)
        self.progress_omie.pack(pady=5)
        
        # Widget de log
        self.log_widget_omie = scrolledtext.ScrolledText(
            self.frame_omie, 
            width=140, 
            height=35, 
            font=("Courier", 9)
        )
        self.log_widget_omie.pack(padx=10, pady=10)
    
    def criar_interface_validacao(self):
        """Cria a interface de validação"""
        # Frame de botões
        frame_btns = tk.Frame(self.frame_validacao)
        frame_btns.pack(pady=5)
        
        btn_iniciar_validacao = tk.Button(
            frame_btns, 
            text="[VALIDAR] Iniciar Validação", 
            font=("Arial", 12), 
            command=self.iniciar_validacao
        )
        btn_iniciar_validacao.pack(side=tk.LEFT, padx=10)
        
        btn_parar_validacao = tk.Button(
            frame_btns, 
            text="[PARAR] Parar", 
            font=("Arial", 12), 
            command=self.parar_processo
        )
        btn_parar_validacao.pack(side=tk.LEFT, padx=10)
        
        btn_limpar_checkpoint_validacao = tk.Button(
            frame_btns, 
            text="[CHECKPOINT] Limpar", 
            font=("Arial", 12), 
            command=self.limpar_checkpoint_validacao
        )
        btn_limpar_checkpoint_validacao.pack(side=tk.LEFT, padx=10)
        
        # Barra de progresso
        self.progress_validacao = ttk.Progressbar(self.frame_validacao, length=1000)
        self.progress_validacao.pack(pady=5)
        
        # Widget de log
        self.log_widget_validacao = scrolledtext.ScrolledText(
            self.frame_validacao, 
            width=140, 
            height=35, 
            font=("Courier", 9)
        )
        self.log_widget_validacao.pack(padx=10, pady=10)
        
        # Instruções na parte superior
        instrucoes_validacao = tk.Label(
            self.frame_validacao,
            text="Validação: Verifica se o 'Adicional de Final de Ano' foi adicionado aos CNPJs da planilha",
            font=("Arial", 10),
            fg="blue"
        )
        instrucoes_validacao.pack(pady=5)
    
    def criar_interface_config(self):
        """Cria a interface de configurações"""
        # Checkbox para modo simulação
        self.var_simulacao = StringVar(value="0")
        chk_simulacao = tk.Checkbutton(
            self.frame_config, 
            text="Modo Simulação (sem abrir navegador)", 
            variable=self.var_simulacao, 
            onvalue="1", 
            offvalue="0", 
            font=("Arial", 11)
        )
        chk_simulacao.pack(pady=20, anchor="w", padx=20)
        
        # Instruções
        instrucoes = tk.Label(
            self.frame_config, 
            text="""Instruções:

1. Certifique-se de que o arquivo config.env está configurado com suas credenciais
2. Selecione a planilha MACRO.xlsx com os dados dos CNPJs
3. Use o botão de teste para verificar se o ChromeDriver está funcionando
4. O script processará os dados automaticamente

Solução de Problemas:
- Se houver erro no ChromeDriver, reinstale o Google Chrome
- Verifique se o arquivo config.env tem as credenciais corretas
- Certifique-se de que a planilha tem as colunas necessárias
- Use o modo simulação para testar sem abrir o navegador""",
            font=("Arial", 10),
            justify="left"
        )
        instrucoes.pack(pady=20, padx=20)
    
    def iniciar_processo_omie(self):
        """Inicia o processo de automação do Omie"""
        self.stop_requested = False
        self.modo_simulacao = self.var_simulacao.get() == "1"
        
        arquivo = filedialog.askopenfilename(
            title="Selecione a planilha MACRO.xlsx", 
            filetypes=[("Planilhas Excel", "*.xlsx")]
        )
        
        if not arquivo:
            messagebox.showwarning("Aviso", "Nenhum arquivo selecionado.")
            return
        
        self.log_widget_omie.delete(1.0, tk.END)
        dados = carregar_dados_macro(arquivo, self.log_widget_omie)
        
        if not dados.empty:
            threading.Thread(
                target=self.omie_automation.processar_dados_macro, 
                args=(dados, self.log_widget_omie, self.progress_omie, self.root, self.stop_requested, self.modo_simulacao)
            ).start()
    
    
    def parar_processo(self):
        """Para o processo de automação"""
        self.stop_requested = True
    
    def testar_chromedriver_omie(self):
        """Testa o ChromeDriver para Omie"""
        self.omie_automation.testar_chromedriver(self.log_widget_omie)
    
    def limpar_checkpoint_omie(self):
        """Limpa o checkpoint do Omie"""
        limpar_checkpoint("logs/omie_checkpoint.txt")
        log_event(self.log_widget_omie, "[CHECKPOINT] Checkpoint limpo com sucesso")
    
    def iniciar_validacao(self):
        """Inicia o processo de validação"""
        self.stop_requested = False
        self.modo_simulacao = self.var_simulacao.get() == "1"
        
        arquivo = filedialog.askopenfilename(
            title="Selecione a planilha MACRO.xlsx para validação", 
            filetypes=[("Planilhas Excel", "*.xlsx")]
        )
        
        if not arquivo:
            messagebox.showwarning("Aviso", "Nenhum arquivo selecionado.")
            return
        
        self.log_widget_validacao.delete(1.0, tk.END)
        dados = carregar_dados_macro(arquivo, self.log_widget_validacao)
        
        if not dados.empty:
            threading.Thread(
                target=self.omie_validation.validar_planilha, 
                args=(dados, self.log_widget_validacao, self.progress_validacao, self.root, self.stop_requested, self.modo_simulacao)
            ).start()
    
    def limpar_checkpoint_validacao(self):
        """Limpa o checkpoint de validação"""
        limpar_checkpoint("logs/validacao_checkpoint.txt")
        log_event(self.log_widget_validacao, "[CHECKPOINT] Checkpoint de validação limpo com sucesso")
    
    def executar(self):
        """Executa a interface gráfica"""
        self.root.mainloop()
