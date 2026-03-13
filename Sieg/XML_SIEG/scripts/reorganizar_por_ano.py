"""
Script para reorganizar XMLs já baixados: de ano/mês para apenas ano.
Move todos os arquivos de xmls_baixados/ANO/MES/ para xmls_baixados/ANO/
e remove as pastas de mês vazias.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sieg_xml.core.xml_organizer import reorganizar_por_ano
from sieg_xml.config import PASTA_XMLS_BAIXADOS


def main():
    print("=" * 60)
    print("Reorganizar XMLs: ano/mes -> apenas ano")
    print("=" * 60)
    print(f"Pasta: {os.path.abspath(PASTA_XMLS_BAIXADOS)}")
    print()

    resultado = reorganizar_por_ano(PASTA_XMLS_BAIXADOS)

    if resultado.get("erro"):
        print(f"ERRO: {resultado['erro']}")
        return 1

    print(f"  Movidos: {resultado['movidos']}")
    if resultado.get("conflitos", 0) > 0:
        print(f"  Renomeados (conflito de nome): {resultado['conflitos']}")
    if resultado.get("erros", 0) > 0:
        print(f"  Erros: {resultado['erros']}")
    print()
    print("Estrutura agora é apenas por ano (ex: xmls_baixados/2024/).")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
