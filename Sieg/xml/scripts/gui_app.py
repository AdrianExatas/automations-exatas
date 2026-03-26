"""
Script para executar a interface gráfica
"""
import sys
import os

# Adicionar src ao path para importar módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sieg_xml.gui import MainWindow


def main():
    """Função principal"""
    app = MainWindow()
    app.run()


if __name__ == "__main__":
    main()
