#!/usr/bin/env python3
"""
Interface gráfica para automação de download de XMLs do SEFAZ
"""
import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

import tkinter as tk
from tkinter import scrolledtext
import threading

from src.download import state
from src.download.login import executar_login_completo, parar_automacao


class RedirectText:
    """Redireciona stdout para widget de texto"""
    def __init__(self, text_widget):
        self.text_widget = text_widget
    
    def write(self, string):
        self.text_widget.insert(tk.END, string)
        self.text_widget.see(tk.END)
    
    def flush(self):
        pass


def iniciar_interface():
    """Inicia a interface gráfica"""
    try:
        janela = tk.Tk()
        janela.title("SEFAZ - Automação de Download")
        janela.geometry("850x650")
        
        # Garantir que a janela apareça na frente
        janela.lift()
        janela.attributes('-topmost', True)
        janela.after_idle(janela.attributes, '-topmost', False)

        headless_var = tk.BooleanVar(value=False)

        def atualizar_headless():
            state.usar_headless = headless_var.get()
            print(f"🔧 Modo headless definido como: {state.usar_headless}")

        def atualizar_range_paginas():
            try:
                pagina_inicio = entrada_pagina_inicio.get().strip()
                pagina_fim = entrada_pagina_fim.get().strip()
                
                state.pagina_inicial = int(pagina_inicio) if pagina_inicio else None
                state.pagina_final = int(pagina_fim) if pagina_fim else None
                
                if state.pagina_inicial and state.pagina_final:
                    if state.pagina_inicial > state.pagina_final:
                        print("⚠️ Página inicial não pode ser maior que página final!")
                        return
                    print(f"📄 Range de páginas definido: {state.pagina_inicial} até {state.pagina_final}")
                elif state.pagina_inicial:
                    print(f"📄 Página inicial definida: {state.pagina_inicial} (até o fim)")
                elif state.pagina_final:
                    print(f"📄 Página final definida: até {state.pagina_final}")
                else:
                    print("📄 Processando todas as páginas")
            except ValueError:
                print("⚠️ Por favor, insira números válidos para as páginas!")

        def atualizar_data_solicitacao():
            try:
                data_input = entrada_data.get().strip()
                
                if not data_input or data_input == "DD/MM/YYYY":
                    state.data_solicitacao = None
                    print("📅 Filtro de data removido - processando todas as datas")
                    return
                
                import re
                if not re.match(r'^\d{2}/\d{2}/\d{4}$', data_input):
                    print("⚠️ Formato de data inválido! Use DD/MM/YYYY (ex: 26/12/2025)")
                    return
                
                partes = data_input.split('/')
                if len(partes) != 3:
                    print("⚠️ Formato de data inválido! Use DD/MM/YYYY")
                    return
                
                dia, mes, ano = partes
                data_formatada = f"{dia}{mes}{ano}"
                
                try:
                    from datetime import datetime
                    datetime.strptime(data_input, '%d/%m/%Y')
                except ValueError:
                    print("⚠️ Data inválida! Verifique o dia, mês e ano.")
                    return
                
                state.data_solicitacao = data_formatada
                print(f"📅 Filtro de data definido: {data_input}")
            except Exception as e:
                print(f"⚠️ Erro ao definir data: {e}")

        def iniciar_automacao():
            state.executando = True
            thread = threading.Thread(target=executar_login_completo)
            thread.start()

        # Frame topo
        frame_topo = tk.Frame(janela)
        frame_topo.pack(pady=10)

        botao_iniciar = tk.Button(frame_topo, text="▶ Iniciar Automação", command=iniciar_automacao,
                                  font=("Segoe UI", 12, "bold"), bg="green", fg="white", width=18)
        botao_iniciar.grid(row=0, column=0, padx=10)

        botao_parar = tk.Button(frame_topo, text="⛔ Parar Automação", command=parar_automacao,
                                font=("Segoe UI", 12, "bold"), bg="red", fg="white", width=18)
        botao_parar.grid(row=0, column=1, padx=10)

        check_headless = tk.Checkbutton(
            frame_topo,
            text="Modo Headless (oculto)",
            variable=headless_var,
            command=atualizar_headless,
            font=("Segoe UI", 11)
        )
        check_headless.grid(row=0, column=2, padx=10)

        # Frame range
        frame_range = tk.Frame(janela)
        frame_range.pack(pady=5)

        tk.Label(frame_range, text="Página inicial:", font=("Segoe UI", 10)).grid(row=0, column=0, padx=5)
        entrada_pagina_inicio = tk.Entry(frame_range, width=10, font=("Segoe UI", 10))
        entrada_pagina_inicio.grid(row=0, column=1, padx=5)

        tk.Label(frame_range, text="Página final:", font=("Segoe UI", 10)).grid(row=0, column=2, padx=5)
        entrada_pagina_fim = tk.Entry(frame_range, width=10, font=("Segoe UI", 10))
        entrada_pagina_fim.grid(row=0, column=3, padx=5)

        botao_definir_range = tk.Button(
            frame_range,
            text="Definir Range",
            command=atualizar_range_paginas,
            font=("Segoe UI", 9),
            bg="#4CAF50",
            fg="white"
        )
        botao_definir_range.grid(row=0, column=4, padx=5)

        tk.Label(
            frame_range,
            text="(Deixe vazio para processar todas)",
            font=("Segoe UI", 8),
            fg="gray"
        ).grid(row=1, column=0, columnspan=5, pady=2)

        # Frame data
        frame_data = tk.Frame(janela)
        frame_data.pack(pady=5)

        tk.Label(frame_data, text="Data de solicitação:", font=("Segoe UI", 10)).grid(row=0, column=0, padx=5)
        entrada_data = tk.Entry(frame_data, width=12, font=("Segoe UI", 10))
        entrada_data.grid(row=0, column=1, padx=5)
        entrada_data.insert(0, "DD/MM/YYYY")
        entrada_data.config(fg="gray")
        
        def on_entry_focus_in(event):
            if entrada_data.get() == "DD/MM/YYYY":
                entrada_data.delete(0, tk.END)
                entrada_data.config(fg="black")
        
        def on_entry_focus_out(event):
            if not entrada_data.get():
                entrada_data.insert(0, "DD/MM/YYYY")
                entrada_data.config(fg="gray")
        
        entrada_data.bind("<FocusIn>", on_entry_focus_in)
        entrada_data.bind("<FocusOut>", on_entry_focus_out)

        botao_definir_data = tk.Button(
            frame_data,
            text="Definir Data",
            command=atualizar_data_solicitacao,
            font=("Segoe UI", 9),
            bg="#2196F3",
            fg="white"
        )
        botao_definir_data.grid(row=0, column=2, padx=5)

        tk.Label(
            frame_data,
            text="(Deixe vazio para processar todas as datas)",
            font=("Segoe UI", 8),
            fg="gray"
        ).grid(row=1, column=0, columnspan=3, pady=2)

        # Área de log
        log_area = scrolledtext.ScrolledText(janela, wrap=tk.WORD, font=("Consolas", 10))
        log_area.pack(expand=True, fill='both', padx=10, pady=10)

        sys.stdout = RedirectText(log_area)
        state.redirector = sys.stdout
        
        print("✅ Interface iniciada com sucesso!")
        print("📋 Aguardando ações do usuário...")
        
        janela.mainloop()
    except Exception as e:
        print(f"❌ Erro ao iniciar interface: {e}")
        import traceback
        traceback.print_exc()
        raise


def main():
    """Função principal"""
    iniciar_interface()


if __name__ == "__main__":
    main()
