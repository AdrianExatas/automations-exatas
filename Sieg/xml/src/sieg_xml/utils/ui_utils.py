"""
Utilitários para interface gráfica (tkinter)
"""
import os
import tkinter as tk
from tkinter import filedialog
from typing import Optional, List


def selecionar_planilha() -> Optional[str]:
    """
    Abre um diálogo para o usuário selecionar planilha Excel, TXT ou CSV.
    Retorna o caminho completo do arquivo selecionado ou None se cancelado
    """
    print("\nAbrindo diálogo de seleção de arquivo...")
    print("Por favor, selecione o arquivo (Excel, TXT ou CSV) no diálogo que será aberto.\n")

    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente

    # Abrir diálogo de seleção de arquivo
    arquivo = filedialog.askopenfilename(
        title="Selecione o arquivo (Excel, TXT ou CSV)",
        filetypes=[
            ("Todos os arquivos suportados", "*.xlsx *.xls *.txt *.csv"),
            ("Arquivos Excel", "*.xlsx *.xls"),
            ("Excel 2007+", "*.xlsx"),
            ("Excel 97-2003", "*.xls"),
            ("CSV", "*.csv"),
            ("Arquivos de texto", "*.txt"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivo:
        print(f"Arquivo selecionado: {arquivo}")
        return arquivo
    else:
        print("Nenhum arquivo selecionado.")
        return None


def selecionar_multiplas_planilhas() -> List[str]:
    """
    Abre um diálogo para o usuário selecionar múltiplos arquivos (Excel, TXT ou CSV)
    Retorna lista de caminhos dos arquivos selecionados
    """
    print("\nAbrindo diálogo de seleção de arquivos...")
    print("Por favor, selecione os arquivos (Excel, TXT ou CSV) no diálogo (Ctrl+Click para múltiplos).\n")

    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente

    # Abrir diálogo de seleção múltipla de arquivos
    arquivos = filedialog.askopenfilenames(
        title="Selecione os arquivos (Excel, TXT ou CSV) - Ctrl+Click para múltiplos",
        filetypes=[
            ("Todos os arquivos suportados", "*.xlsx *.xls *.txt *.csv"),
            ("Arquivos Excel", "*.xlsx *.xls"),
            ("Excel 2007+", "*.xlsx"),
            ("Excel 97-2003", "*.xls"),
            ("CSV", "*.csv"),
            ("Arquivos de texto", "*.txt"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivos:
        print(f"Arquivos selecionados: {len(arquivos)}")
        for arquivo in arquivos:
            print(f"  - {arquivo}")
        return list(arquivos)
    else:
        print("Nenhum arquivo selecionado.")
        return []


def selecionar_arquivos_xml() -> List[str]:
    """
    Abre um diálogo para o usuário selecionar arquivos XML
    Retorna lista de caminhos dos arquivos selecionados
    """
    print("\nAbrindo diálogo de seleção de arquivos...")
    print("Por favor, selecione os arquivos XML no diálogo que será aberto.\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()  # Esconder a janela principal
    root.attributes('-topmost', True)  # Trazer para frente
    
    # Abrir diálogo de seleção múltipla de arquivos
    arquivos = filedialog.askopenfilenames(
        title="Selecione os arquivos XML para enviar (Ctrl+Click para múltiplos)",
        filetypes=[
            ("Arquivos XML", "*.xml"),
            ("Todos os arquivos", "*.*")
        ],
        initialdir=os.getcwd()  # Começar no diretório atual
    )
    
    root.destroy()  # Fechar a janela
    
    if arquivos:
        print(f"Arquivos selecionados: {len(arquivos)}")
        return list(arquivos)
    else:
        print("Nenhum arquivo selecionado.")
        return []


def selecionar_pasta_xmls() -> List[str]:
    """
    Permite selecionar uma pasta e retorna todos os XMLs encontrados nela
    """
    print("\nAbrindo diálogo de seleção de pasta...")
    print("Por favor, selecione a pasta que contém os arquivos XML.\n")
    
    # Criar janela root (oculta)
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    pasta = filedialog.askdirectory(
        title="Selecione a pasta com os arquivos XML",
        initialdir=os.getcwd()
    )
    
    root.destroy()
    
    if not pasta:
        print("Nenhuma pasta selecionada.")
        return []
    
    # Buscar todos os XMLs na pasta (recursivamente)
    # Importação local para evitar dependência circular
    from .file_utils import buscar_xmls_recursivo
    xmls_encontrados = buscar_xmls_recursivo(pasta)
    
    print(f"Encontrados {len(xmls_encontrados)} arquivo(s) XML na pasta")
    return xmls_encontrados


def selecionar_diretorio(title: str, initialdir: Optional[str] = None) -> Optional[str]:
    """
    Permite selecionar um diretorio e retorna seu caminho.
    """
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)

    diretorio = filedialog.askdirectory(
        title=title,
        initialdir=initialdir or os.getcwd()
    )

    root.destroy()
    return diretorio or None
