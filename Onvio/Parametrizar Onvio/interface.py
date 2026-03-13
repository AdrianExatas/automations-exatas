"""
Interface Gráfica para Automação Onvio
Permite alterar CNPJ e visualizar dados antes de executar
"""

import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import json
import subprocess
import threading
import sys
import os

class AutomacaoOnvioGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Automação Onvio - Parametrizar Empresa")
        self.root.geometry("800x600")
        self.root.resizable(True, True)
        
        # Arquivo de dados
        self.arquivo_dados = "dados.json"
        self.dados = self.carregar_dados()
        
        # Criar interface
        self.criar_widgets()
        self.atualizar_tabela()
        
    def carregar_dados(self):
        """Carrega dados do arquivo JSON"""
        try:
            with open(self.arquivo_dados, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao carregar dados: {str(e)}")
            return {"cnpj": "", "departamentos": []}
    
    def salvar_dados(self):
        """Salva dados no arquivo JSON"""
        try:
            with open(self.arquivo_dados, 'w', encoding='utf-8') as f:
                json.dump(self.dados, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao salvar dados: {str(e)}")
            return False
    
    def criar_widgets(self):
        """Cria todos os widgets da interface"""
        
        # ========== FRAME SUPERIOR - CNPJ ==========
        frame_cnpj = ttk.LabelFrame(self.root, text="Configuração da Empresa", padding=10)
        frame_cnpj.pack(fill="x", padx=10, pady=10)
        
        ttk.Label(frame_cnpj, text="CNPJ:", font=("Arial", 10, "bold")).grid(row=0, column=0, sticky="w", padx=5)
        
        self.entry_cnpj = ttk.Entry(frame_cnpj, font=("Arial", 12), width=20)
        self.entry_cnpj.grid(row=0, column=1, padx=5)
        self.entry_cnpj.insert(0, self.dados.get("cnpj", ""))
        
        btn_salvar_cnpj = ttk.Button(frame_cnpj, text="💾 Salvar CNPJ", command=self.salvar_cnpj)
        btn_salvar_cnpj.grid(row=0, column=2, padx=5)
        
        # Contador de departamentos
        self.label_contador = ttk.Label(frame_cnpj, text="", font=("Arial", 9))
        self.label_contador.grid(row=0, column=3, padx=20)
        
        # ========== FRAME CENTRAL - TABELA ==========
        frame_tabela = ttk.LabelFrame(self.root, text="Departamentos e Usuários", padding=10)
        frame_tabela.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Tabela com scrollbar
        self.tree = ttk.Treeview(frame_tabela, columns=("Departamento", "Usuário"), show="headings", height=15)
        self.tree.heading("Departamento", text="Departamento")
        self.tree.heading("Usuário", text="Usuário")
        self.tree.column("Departamento", width=350)
        self.tree.column("Usuário", width=350)
        
        scrollbar = ttk.Scrollbar(frame_tabela, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        # ========== FRAME INFERIOR - BOTÕES DE AÇÃO ==========
        frame_acoes = ttk.Frame(self.root, padding=10)
        frame_acoes.pack(fill="x", padx=10, pady=10)
        
        btn_executar = ttk.Button(
            frame_acoes, 
            text="▶ EXECUTAR AUTOMAÇÃO", 
            command=self.executar_automacao,
            style="Accent.TButton"
        )
        btn_executar.pack(side="left", padx=5, ipadx=20, ipady=10)
        
        btn_atualizar = ttk.Button(frame_acoes, text="🔄 Atualizar Tabela", command=self.atualizar_tabela)
        btn_atualizar.pack(side="left", padx=5)
        
        btn_editar = ttk.Button(frame_acoes, text="✏ Editar JSON", command=self.editar_json)
        btn_editar.pack(side="left", padx=5)
        
        btn_sair = ttk.Button(frame_acoes, text="❌ Sair", command=self.root.quit)
        btn_sair.pack(side="right", padx=5)
        
        # ========== FRAME STATUS ==========
        frame_status = ttk.Frame(self.root)
        frame_status.pack(fill="x", padx=10, pady=(0, 10))
        
        self.label_status = ttk.Label(frame_status, text="Pronto para executar", foreground="green", font=("Arial", 9))
        self.label_status.pack(side="left")
    
    def atualizar_contador(self):
        """Atualiza o contador de departamentos"""
        total = len(self.dados.get("departamentos", []))
        self.label_contador.config(text=f"Total: {total} registro(s)")
    
    def atualizar_tabela(self):
        """Atualiza a tabela com os dados do JSON"""
        # Limpar tabela
        for item in self.tree.get_children():
            self.tree.delete(item)
        
        # Recarregar dados
        self.dados = self.carregar_dados()
        
        # Preencher tabela
        departamentos = self.dados.get("departamentos", [])
        for idx, item in enumerate(departamentos, 1):
            dept = item.get("departamento", "")
            user = item.get("usuario", "")
            self.tree.insert("", "end", values=(dept, user), tags=("odd" if idx % 2 else "even",))
        
        # Estilizar linhas alternadas
        self.tree.tag_configure("odd", background="#f0f0f0")
        self.tree.tag_configure("even", background="#ffffff")
        
        # Atualizar contador
        self.atualizar_contador()
        
        self.label_status.config(text=f"Tabela atualizada - {len(departamentos)} registro(s)", foreground="blue")
    
    def limpar_cnpj(self, cnpj):
        """Remove pontos, barras e traços do CNPJ"""
        if not cnpj:
            return ""
        return cnpj.replace(".", "").replace("/", "").replace("-", "").strip()
    
    def salvar_cnpj(self):
        """Salva o CNPJ no arquivo JSON"""
        novo_cnpj = self.entry_cnpj.get().strip()
        
        if not novo_cnpj:
            messagebox.showwarning("Atenção", "Por favor, digite um CNPJ válido!")
            return
        
        # Limpar o CNPJ removendo pontos, barras e traços
        cnpj_limpo = self.limpar_cnpj(novo_cnpj)
        
        if not cnpj_limpo:
            messagebox.showwarning("Atenção", "Por favor, digite um CNPJ válido!")
            return
        
        self.dados["cnpj"] = cnpj_limpo
        
        if self.salvar_dados():
            messagebox.showinfo("Sucesso", f"CNPJ atualizado para: {cnpj_limpo}")
            self.label_status.config(text=f"CNPJ atualizado: {cnpj_limpo}", foreground="green")
            # Atualizar o campo de entrada com o CNPJ limpo
            self.entry_cnpj.delete(0, tk.END)
            self.entry_cnpj.insert(0, cnpj_limpo)
    
    def editar_json(self):
        """Abre janela para editar o JSON diretamente"""
        janela_editor = tk.Toplevel(self.root)
        janela_editor.title("Editar dados.json")
        janela_editor.geometry("600x500")
        
        # Texto com scroll
        frame = ttk.Frame(janela_editor, padding=10)
        frame.pack(fill="both", expand=True)
        
        ttk.Label(frame, text="Edite o JSON abaixo:", font=("Arial", 10, "bold")).pack(anchor="w", pady=(0, 5))
        
        texto = scrolledtext.ScrolledText(frame, width=70, height=25, font=("Consolas", 10))
        texto.pack(fill="both", expand=True)
        
        # Carregar conteúdo atual
        try:
            with open(self.arquivo_dados, 'r', encoding='utf-8') as f:
                conteudo = f.read()
                texto.insert("1.0", conteudo)
        except Exception as e:
            messagebox.showerror("Erro", f"Erro ao carregar arquivo: {str(e)}")
            janela_editor.destroy()
            return
        
        # Botões
        frame_botoes = ttk.Frame(janela_editor, padding=10)
        frame_botoes.pack(fill="x")
        
        def salvar_edicao():
            try:
                conteudo = texto.get("1.0", "end-1c")
                # Validar JSON
                json.loads(conteudo)
                
                # Salvar
                with open(self.arquivo_dados, 'w', encoding='utf-8') as f:
                    f.write(conteudo)
                
                messagebox.showinfo("Sucesso", "Arquivo salvo com sucesso!")
                self.atualizar_tabela()
                janela_editor.destroy()
                
            except json.JSONDecodeError as e:
                messagebox.showerror("Erro JSON", f"JSON inválido:\n{str(e)}")
            except Exception as e:
                messagebox.showerror("Erro", f"Erro ao salvar: {str(e)}")
        
        ttk.Button(frame_botoes, text="💾 Salvar", command=salvar_edicao).pack(side="left", padx=5)
        ttk.Button(frame_botoes, text="❌ Cancelar", command=janela_editor.destroy).pack(side="left", padx=5)
    
    def executar_automacao(self):
        """Executa o script de automação"""
        
        # Validar CNPJ
        if not self.dados.get("cnpj"):
            messagebox.showwarning("Atenção", "Por favor, configure o CNPJ antes de executar!")
            return
        
        # Validar departamentos
        if not self.dados.get("departamentos"):
            messagebox.showwarning("Atenção", "Não há departamentos para processar!")
            return
        
        # Confirmação
        total = len(self.dados.get("departamentos", []))
        resposta = messagebox.askyesno(
            "Confirmar Execução",
            f"Deseja executar a automação?\n\n"
            f"CNPJ: {self.dados.get('cnpj')}\n"
            f"Total de registros: {total}\n\n"
            f"O navegador será aberto automaticamente."
        )
        
        if not resposta:
            return
        
        # Executar em thread separada para não travar a interface
        self.label_status.config(text="Executando automação...", foreground="orange")
        thread = threading.Thread(target=self._executar_automacao_thread, daemon=True)
        thread.start()
    
    def _executar_automacao_thread(self):
        """Thread para executar a automação"""
        try:
            # Executar o script Python
            processo = subprocess.Popen(
                [sys.executable, "automacao.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            
            # Aguardar conclusão
            stdout, stderr = processo.communicate()
            
            # Atualizar status na thread principal
            if processo.returncode == 0:
                self.root.after(0, lambda: self.label_status.config(
                    text="Automação concluída com sucesso!", 
                    foreground="green"
                ))
                self.root.after(0, lambda: messagebox.showinfo(
                    "Sucesso", 
                    "Automação executada com sucesso!"
                ))
            else:
                self.root.after(0, lambda: self.label_status.config(
                    text="Erro na automação!", 
                    foreground="red"
                ))
                self.root.after(0, lambda: messagebox.showerror(
                    "Erro", 
                    f"Erro ao executar automação:\n{stderr}"
                ))
        
        except Exception as e:
            self.root.after(0, lambda: self.label_status.config(
                text=f"Erro: {str(e)}", 
                foreground="red"
            ))
            self.root.after(0, lambda: messagebox.showerror(
                "Erro", 
                f"Erro ao executar automação:\n{str(e)}"
            ))


def main():
    """Função principal"""
    root = tk.Tk()
    
    # Estilo moderno
    style = ttk.Style()
    try:
        style.theme_use('clam')  # Tema moderno
    except:
        pass
    
    # Criar aplicação
    app = AutomacaoOnvioGUI(root)
    
    # Centralizar janela
    root.update_idletasks()
    width = root.winfo_width()
    height = root.winfo_height()
    x = (root.winfo_screenwidth() // 2) - (width // 2)
    y = (root.winfo_screenheight() // 2) - (height // 2)
    root.geometry(f'{width}x{height}+{x}+{y}')
    
    # Iniciar loop
    root.mainloop()


if __name__ == "__main__":
    main()

