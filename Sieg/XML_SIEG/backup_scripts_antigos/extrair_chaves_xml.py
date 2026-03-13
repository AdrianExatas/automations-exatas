"""
Script para extrair chaves de XMLs de planilhas Excel e consolidar em uma única planilha.
A chave de XML é um número de 44 dígitos (ex: 27250411188276000676550030000002121243117664)
"""

import pandas as pd
import re
import os
from pathlib import Path
import tkinter as tk
from tkinter import filedialog
from typing import Optional, List

def extrair_chaves_xml(texto):
    """
    Extrai chaves de XML de um texto.
    A chave é um número de 44 dígitos.
    """
    # Padrão para chave de XML: 44 dígitos consecutivos
    padrao = r'\b\d{44}\b'
    chaves = re.findall(padrao, str(texto))
    return chaves

def processar_planilha(caminho_arquivo):
    """
    Processa uma planilha Excel e extrai todas as chaves de XML encontradas.
    Retorna uma lista de chaves e o nome do arquivo de origem.
    """
    print(f"Processando: {caminho_arquivo}")
    chaves_encontradas = []
    
    try:
        # Lê a planilha sem assumir estrutura específica
        # Tenta ler todas as células como texto para capturar chaves em qualquer lugar
        df = pd.read_excel(caminho_arquivo, header=None, dtype=str)
        
        # Itera por todas as células da planilha
        for coluna in df.columns:
            for valor in df[coluna]:
                if pd.notna(valor):
                    chaves = extrair_chaves_xml(str(valor))
                    chaves_encontradas.extend(chaves)
        
        # Remove duplicatas mantendo a ordem
        chaves_unicas = []
        for chave in chaves_encontradas:
            if chave not in chaves_unicas:
                chaves_unicas.append(chave)
        
        print(f"  Encontradas {len(chaves_unicas)} chaves únicas")
        return chaves_unicas
        
    except Exception as e:
        print(f"  Erro ao processar {caminho_arquivo}: {e}")
        return []

def selecionar_planilha() -> Optional[str]:
    """
    Abre um diálogo para o usuário selecionar uma planilha do computador
    Retorna o caminho completo da planilha selecionada ou None se cancelado
    """
    print("\nAbrindo diálogo de seleção de arquivo...")
    print("Por favor, selecione a planilha Excel no diálogo que será aberto.\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente
    
    # Abrir diálogo de seleção de arquivo
    arquivo = filedialog.askopenfilename(
        title="Selecione a planilha Excel",
        filetypes=[
            ("Arquivos Excel", "*.xlsx *.xls"),
            ("Excel 2007+", "*.xlsx"),
            ("Excel 97-2003", "*.xls"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivo:
        print(f"Planilha selecionada: {arquivo}")
        return arquivo
    else:
        print("Nenhuma planilha selecionada.")
        return None


def selecionar_multiplas_planilhas() -> List[str]:
    """
    Abre um diálogo para o usuário selecionar múltiplas planilhas
    Retorna lista de caminhos das planilhas selecionadas
    """
    print("\nAbrindo diálogo de seleção de arquivos...")
    print("Por favor, selecione as planilhas Excel no diálogo (Ctrl+Click para múltiplas).\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente
    
    # Abrir diálogo de seleção múltipla de arquivos
    arquivos = filedialog.askopenfilenames(
        title="Selecione as planilhas Excel (Ctrl+Click para múltiplas)",
        filetypes=[
            ("Arquivos Excel", "*.xlsx *.xls"),
            ("Excel 2007+", "*.xlsx"),
            ("Excel 97-2003", "*.xls"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivos:
        print(f"Planilhas selecionadas: {len(arquivos)}")
        for arquivo in arquivos:
            print(f"  - {arquivo}")
        return list(arquivos)
    else:
        print("Nenhuma planilha selecionada.")
        return []


def main():
    """
    Função principal que processa planilhas e cria uma planilha consolidada.
    """
    print("="*60)
    print("Extrator de Chaves de XML")
    print("="*60)
    
    # Perguntar ao usuário como deseja processar
    print("\nOpções:")
    print("  [1] Selecionar uma planilha específica")
    print("  [2] Selecionar múltiplas planilhas")
    print("  [3] Processar todas as planilhas do diretório atual")
    print("  [q] Sair")
    
    escolha = input("\nEscolha uma opção (1/2/3/q): ").strip().lower()
    
    arquivos_excel = []
    
    if escolha == '1':
        # Selecionar uma planilha
        arquivo = selecionar_planilha()
        if arquivo:
            arquivos_excel = [Path(arquivo)]
    elif escolha == '2':
        # Selecionar múltiplas planilhas
        arquivos = selecionar_multiplas_planilhas()
        if arquivos:
            arquivos_excel = [Path(arq) for arq in arquivos]
    elif escolha == '3':
        # Processar todas do diretório atual
        diretorio = Path('.')
        arquivos_excel = [
            f for f in diretorio.glob('*.xlsx')
            if not f.name.startswith('~$')  # Ignora arquivos temporários do Excel
        ]
        print(f"\nEncontrados {len(arquivos_excel)} arquivos Excel no diretório atual")
    elif escolha == 'q':
        print("Operação cancelada.")
        return
    else:
        print("Opção inválida.")
        return
    
    if not arquivos_excel:
        print("\nNenhum arquivo Excel selecionado para processar.")
        return
    
    print(f"\nProcessando {len(arquivos_excel)} arquivo(s)...\n")
    
    # Lista para armazenar todas as chaves com informações de origem
    todas_chaves = []
    
    # Processa cada planilha
    for arquivo in arquivos_excel:
        chaves = processar_planilha(arquivo)
        for chave in chaves:
            todas_chaves.append({
                'Chave XML': chave,
                'Arquivo Origem': arquivo.name
            })
    
    # Cria DataFrame com todas as chaves
    if todas_chaves:
        df_resultado = pd.DataFrame(todas_chaves)
        
        # Remove duplicatas (mesma chave pode aparecer em múltiplos arquivos)
        df_resultado = df_resultado.drop_duplicates(subset=['Chave XML'], keep='first')
        
        # Ordena por chave
        df_resultado = df_resultado.sort_values('Chave XML').reset_index(drop=True)
        
        # Salva em uma nova planilha
        arquivo_saida = 'chaves_xml_consolidadas.xlsx'
        df_resultado.to_excel(arquivo_saida, index=False)
        
        print(f"\n{'='*60}")
        print(f"Processamento concluído!")
        print(f"Total de chaves únicas encontradas: {len(df_resultado)}")
        print(f"Arquivo gerado: {arquivo_saida}")
        print(f"{'='*60}")
        
        # Mostra algumas estatísticas
        print(f"\nChaves por arquivo de origem:")
        contagem = df_resultado['Arquivo Origem'].value_counts()
        for arquivo, quantidade in contagem.items():
            print(f"  {arquivo}: {quantidade} chaves")
    else:
        print("\nNenhuma chave de XML foi encontrada nas planilhas.")

if __name__ == '__main__':
    main()

