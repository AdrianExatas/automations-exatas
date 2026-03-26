"""
Script CLI para organizar XMLs por ano (apenas ano, sem mês).
"""
import sys
import os

# Adicionar src ao path para importar módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sieg_xml.core.xml_organizer import organizar_xmls_por_data
from sieg_xml.config import PASTA_XMLS_BAIXADOS


def main():
    """Função principal"""
    print("=" * 60)
    print("Organizador de XMLs - Por Ano")
    print("=" * 60)

    resultado = organizar_xmls_por_data(PASTA_XMLS_BAIXADOS)

    if 'erro' in resultado:
        return

    # Resumo final
    print(f"\n{'='*60}")
    print("RESUMO DA ORGANIZAÇÃO")
    print(f"{'='*60}")
    print(f"  Organizados (movidos): {resultado['organizados']}")
    print(f"  Já organizados: {resultado['ja_organizados']}")
    print(f"  Sem data (mantidos na raiz): {resultado['sem_data']}")
    print(f"  Erros: {resultado['erros']}")
    print(f"  Total processado: {resultado['total']}")

    # Listar estrutura de pastas (apenas por ano)
    if os.path.exists(PASTA_XMLS_BAIXADOS):
        print(f"\n  Estrutura de pastas (por ano):")
        pastas_ano = sorted([d for d in os.listdir(PASTA_XMLS_BAIXADOS)
                             if os.path.isdir(os.path.join(PASTA_XMLS_BAIXADOS, d)) and d.isdigit()])

        for ano in pastas_ano:
            pasta_ano = os.path.join(PASTA_XMLS_BAIXADOS, ano)
            num_xmls = sum(
                1 for _r, _d, files in os.walk(pasta_ano)
                for f in files if f.lower().endswith('.xml')
            )
            if num_xmls > 0:
                print(f"    {ano}/ - {num_xmls} XML(s)")

    print(f"{'='*60}")


if __name__ == "__main__":
    main()
