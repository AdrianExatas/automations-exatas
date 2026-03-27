#!/usr/bin/env python3
"""
Interface gráfica para consulta/solicitação de XMLs do SEFAZ
"""
import sys
import os
from pathlib import Path

# Configura encoding
os.environ["PYTHONUTF8"] = "1"
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import tkinter as tk
from tkinter import filedialog, scrolledtext, messagebox
import threading
import pandas as pd
from datetime import datetime

from src.core.browser import SefazBrowser
from src.core.config import USUARIO_SEFAZ, SENHA_SEFAZ, validar_configuracoes
from src.core.constants import SIMBOLOS
from src.consulta.actions import SefazActions
from src.consulta.utils import preparar_parametros, timestamp


class ConsultaGUI:
    """Interface gráfica para consulta SEFAZ"""
    
    def __init__(self):
        # Valida configurações antes de iniciar
        config_valida, mensagem_config = validar_configuracoes()
        if not config_valida:
            root_temp = tk.Tk()
            root_temp.withdraw()
            messagebox.showerror("Erro de Configuração", mensagem_config)
            root_temp.destroy()
            sys.exit(1)
        
        self.root = tk.Tk()
        self.root.title("SEFAZ - Consulta de XMLs")
        self.root.geometry("700x750")
        
        self.caminho_planilha = tk.StringVar()
        self.parar_execucao = threading.Event()
        self.headless_var = tk.BooleanVar(value=False)
        
        self._criar_interface()
    
    def _criar_interface(self):
        """Cria os widgets da interface"""
        # Frame superior
        frame_top = tk.Frame(self.root)
        frame_top.pack(pady=10)
        
        btn_selecionar = tk.Button(
            frame_top, 
            text="📁 Selecionar Planilha", 
            command=self._selecionar_planilha,
            font=("Segoe UI", 10)
        )
        btn_selecionar.pack(side=tk.LEFT, padx=5)
        
        btn_executar = tk.Button(
            frame_top, 
            text="▶ Executar Consultas", 
            command=self._executar_consulta,
            font=("Segoe UI", 10, "bold"),
            bg="green",
            fg="white"
        )
        btn_executar.pack(side=tk.LEFT, padx=5)
        
        btn_parar = tk.Button(
            frame_top, 
            text="⛔ Parar", 
            command=self._parar_consulta,
            font=("Segoe UI", 10, "bold"),
            bg="red",
            fg="white"
        )
        btn_parar.pack(side=tk.LEFT, padx=5)
        
        check_headless = tk.Checkbutton(
            frame_top,
            text="Modo Headless",
            variable=self.headless_var,
            font=("Segoe UI", 10)
        )
        check_headless.pack(side=tk.LEFT, padx=10)
        
        # Label do caminho
        self.label_caminho = tk.Label(
            self.root, 
            textvariable=self.caminho_planilha,
            font=("Segoe UI", 9),
            fg="gray"
        )
        self.label_caminho.pack(pady=5)
        
        # Área de log
        self.log_output = scrolledtext.ScrolledText(
            self.root, 
            height=35, 
            width=80,
            font=("Consolas", 10)
        )
        self.log_output.pack(pady=10, padx=10, expand=True, fill='both')
        
        self._log("✅ Interface iniciada com sucesso!")
        self._log("📋 Selecione uma planilha para começar...")
    
    def _log(self, mensagem):
        """Adiciona mensagem ao log"""
        hora = datetime.now().strftime("[%H:%M:%S]")
        self.log_output.insert("end", f"{hora} {mensagem}\n")
        self.log_output.see("end")
    
    def _selecionar_planilha(self):
        """Abre diálogo para seleção da planilha"""
        caminho = filedialog.askopenfilename(
            title="Selecione a planilha", 
            filetypes=[("Arquivos Excel", "*.xlsx;*.xls")]
        )
        if caminho:
            self.caminho_planilha.set(caminho)
            self._log(f"📁 Planilha selecionada: {os.path.basename(caminho)}")
    
    def _carregar_empresas(self, arquivo):
        """Carrega empresas da planilha"""
        colunas = ["Inscrição Municipal", "Tipo de Arquivo", "Pesquisar Por", "Data Inicial", "Data Final"]
        try:
            df = pd.read_excel(arquivo, usecols=colunas).fillna("")
            return df if not df.empty else None
        except Exception as e:
            self._log(f"❌ Erro ao carregar planilha: {e}")
            return None
    
    def _processar_consultas(self, df_empresas):
        """Processa as consultas"""
        browser = None
        
        try:
            self.parar_execucao.clear()
            
            self._log("🔧 Iniciando navegador...")
            browser = SefazBrowser(headless=self.headless_var.get())
            
            self._log("🔐 Realizando login...")
            if not browser.fazer_login(USUARIO_SEFAZ, SENHA_SEFAZ):
                self._log("❌ Falha no login!")
                messagebox.showerror("Erro", "Falha ao fazer login!")
                return
            
            self._log("📋 Navegando para menu XML...")
            if not browser.navegar_para_menu_xml():
                self._log("❌ Falha ao navegar para menu!")
                return
            
            actions = SefazActions(browser)
            
            total = len(df_empresas)
            sucesso_count = 0
            erro_count = 0
            
            for idx, row in df_empresas.iterrows():
                if self.parar_execucao.is_set():
                    self._log("🛑 Execução interrompida!")
                    break
                
                params = preparar_parametros(row)
                inscricao = params["inscricao_municipal"]
                
                self._log(f"\n[{idx+1}/{total}] Processando: {inscricao}")
                self._log(f"  Tipo: {params['tipo_arquivo']} | Pesquisa: {params['pesquisar_por']}")
                self._log(f"  Período: {params['data_inicial']} até {params['data_final']}")
                
                try:
                    tipo = params["tipo_arquivo"].upper()
                    
                    if tipo in ["NFE", "NFC"]:
                        sucesso, msg = actions.processar_solicitacao_nfe_nfc(params)
                    elif tipo == "CTE":
                        sucesso, msg = actions.processar_solicitacao_cte(params)
                    else:
                        sucesso = False
                        msg = f"Tipo desconhecido: {tipo}"
                    
                    if sucesso:
                        self._log(f"  ✅ {msg}")
                        sucesso_count += 1
                        browser.voltar_para_nova_solicitacao()
                    else:
                        self._log(f"  ❌ {msg}")
                        erro_count += 1
                        
                except Exception as e:
                    self._log(f"  ❌ Erro: {e}")
                    erro_count += 1
            
            # Resumo
            self._log("\n" + "=" * 50)
            self._log("📊 RESUMO")
            self._log(f"  Total: {total}")
            self._log(f"  ✅ Sucesso: {sucesso_count}")
            self._log(f"  ❌ Erros: {erro_count}")
            self._log("=" * 50)
            
            messagebox.showinfo(
                "Concluído",
                f"Processamento finalizado!\n\n"
                f"✅ Sucesso: {sucesso_count}\n"
                f"❌ Erros: {erro_count}"
            )
            
        except Exception as e:
            self._log(f"❌ Erro crítico: {e}")
            messagebox.showerror("Erro", str(e))
        finally:
            if browser:
                self._log("🔒 Fechando navegador...")
                browser.fechar()
    
    def _executar_consulta(self):
        """Inicia execução em thread"""
        if not self.caminho_planilha.get():
            messagebox.showwarning("Aviso", "Selecione uma planilha primeiro!")
            return
        
        df = self._carregar_empresas(self.caminho_planilha.get())
        if df is None:
            messagebox.showerror("Erro", "Nenhuma empresa encontrada!")
            return
        
        self._log(f"📊 {len(df)} empresas carregadas")
        threading.Thread(target=self._processar_consultas, args=(df,), daemon=True).start()
    
    def _parar_consulta(self):
        """Para a execução"""
        self.parar_execucao.set()
        self._log("🛑 Solicitando parada...")
    
    def run(self):
        """Inicia a aplicação"""
        self.root.mainloop()


def main():
    """Função principal"""
    app = ConsultaGUI()
    app.run()


if __name__ == "__main__":
    main()
