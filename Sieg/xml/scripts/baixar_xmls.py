"""
Script CLI para baixar XMLs da API SIEG
"""
import sys
import os
import argparse

# Adicionar src ao path para importar módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sieg_xml.services.download_service import DownloadService
from sieg_xml.utils.ui_utils import selecionar_planilha
from sieg_xml.core.chave_extractor import processar_arquivo


def baixar_automatico(planilha: str, coluna: str = None, confirmar: bool = False):
    """Modo automático: baixa XMLs sem interação"""
    print("="*60)
    print("🚀 MODO AUTOMÁTICO - Download de XMLs da API SIEG")
    print("="*60)
    print(f"\n📁 Planilha: {planilha}")
    
    if not os.path.exists(planilha):
        print(f"\n❌ ERRO: Planilha não encontrada: {planilha}")
        return 1
    
    try:
        # Usar a mesma extração de chaves que "Extrair Chaves de Acesso"
        # (processar_arquivo: suporta .txt, .csv, .xlsx, .xls com encoding robusto)
        print(f"\n📖 Extraindo chaves do arquivo (mesma lógica do Extrair Chaves de Acesso)...")
        chaves = processar_arquivo(planilha)
        
        print(f"\n🔑 Total de chaves válidas encontradas: {len(chaves)}")
        
        if len(chaves) == 0:
            print("❌ ERRO: Nenhuma chave válida encontrada na planilha.")
            return 1
        
        # Confirmação se solicitada
        if confirmar:
            resposta = input(f"\nDeseja baixar {len(chaves)} XMLs? (s/n): ").strip().lower()
            if resposta != 's':
                print("Operação cancelada.")
                return 0
        
        # Baixar XMLs
        print(f"\n{'='*60}")
        print("🔥 Iniciando download...")
        print("="*60)
        
        service = DownloadService()
        resultado = service.baixar_xmls(chaves)
        
        # Resumo final
        print(f"\n{'='*60}")
        print("📊 RESUMO FINAL")
        print("="*60)
        print(f"   ✅ Sucesso: {resultado['sucesso']}")
        print(f"   ❌ Falhas: {resultado['falhas']}")
        print(f"   📦 Total processado: {resultado['total']}")
        print(f"   📁 XMLs organizados por ano em: {os.path.abspath(service.pasta_xmls)}")
        print("="*60)
        
        return 0 if resultado['falhas'] == 0 else 1
        
    except FileNotFoundError:
        print(f"\n❌ ERRO: Arquivo '{planilha}' não encontrado.")
        return 1
    except Exception as e:
        print(f"\n❌ ERRO ao processar planilha: {e}")
        import traceback
        traceback.print_exc()
        return 1


def main():
    """Função principal com suporte a argumentos de linha de comando"""
    parser = argparse.ArgumentParser(
        description="Baixar XMLs da API SIEG",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos:
  python scripts/baixar_xmls.py                    # Modo interativo
  python scripts/baixar_xmls.py --planilha "planilha.xlsx"  # Modo automático
  python scripts/baixar_xmls.py --planilha "planilha.xlsx" --coluna "Chave de Acesso"
        """
    )
    
    parser.add_argument(
        '--planilha', '-p',
        type=str,
        default=None,
        help='Caminho da planilha Excel com as chaves de acesso'
    )
    
    parser.add_argument(
        '--coluna', '-c',
        type=str,
        default=None,
        help='Nome da coluna que contém as chaves de acesso (opcional, será identificada automaticamente se não fornecido)'
    )
    
    parser.add_argument(
        '--confirmar',
        action='store_true',
        help='Pedir confirmação antes de baixar (útil para testes)'
    )
    
    args = parser.parse_args()
    
    # Modo automático se planilha fornecida
    if args.planilha:
        exit_code = baixar_automatico(
            planilha=args.planilha,
            coluna=args.coluna,
            confirmar=args.confirmar
        )
        sys.exit(exit_code)
    
    # Modo interativo
    print("="*60)
    print("Sistema de Download de XMLs - API SIEG")
    print("="*60)
    
    # Selecionar planilha
    print("\n" + "="*60)
    print("Seleção de Planilha")
    print("="*60)
    planilha = selecionar_planilha()
    
    if not planilha:
        print("\nNenhuma planilha selecionada. Encerrando...")
        return
    
    # Extrair chaves (mesma lógica do Extrair Chaves de Acesso)
    print(f"\nLendo arquivo: {planilha}")
    try:
        chaves = processar_arquivo(planilha)
        print(f"\nTotal de chaves válidas encontradas: {len(chaves)}")
        
        if len(chaves) == 0:
            print("ERRO: Nenhuma chave válida encontrada na planilha.")
            return
        
        # Confirmação
        resposta = input(f"\nDeseja baixar {len(chaves)} XMLs? (s/n): ").strip().lower()
        if resposta != 's':
            print("Operação cancelada.")
            return
        
        # Baixar XMLs
        service = DownloadService()
        resultado = service.baixar_xmls(chaves)
        
        # Resumo final
        print(f"\n{'='*60}")
        print("RESUMO FINAL")
        print(f"{'='*60}")
        print(f"  Sucesso: {resultado['sucesso']}")
        print(f"  Falhas: {resultado['falhas']}")
        print(f"  Total processado: {resultado['total']}")
        print(f"  XMLs organizados por ano em: {os.path.abspath(service.pasta_xmls)}")
        print(f"{'='*60}")
        
    except FileNotFoundError:
        print(f"ERRO: Arquivo '{planilha}' não encontrado.")
    except Exception as e:
        print(f"ERRO ao processar planilha: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
