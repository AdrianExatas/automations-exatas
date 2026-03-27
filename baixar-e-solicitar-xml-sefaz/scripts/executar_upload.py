#!/usr/bin/env python3
"""
Script CLI para upload automático de XMLs para o SIEG
"""
import os
import sys
import argparse
from pathlib import Path

# Configura encoding UTF-8 para Windows
if sys.platform == 'win32':
    import io
    if sys.stdout.encoding != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.config import PATHS
from src.upload.uploader import enviar_automatico


# Configurações padrão
NUM_THREADS_PADRAO = 20


def main():
    """Função principal do script CLI"""
    parser = argparse.ArgumentParser(
        description='Upload automático de XMLs para o SIEG',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python executar_upload.py --auto                    # Modo automático (pasta padrão)
  python executar_upload.py --auto --manter           # Automático sem excluir
  python executar_upload.py --auto --pasta "C:\\Downloads\\XML SEFAZ"
  python executar_upload.py --auto --threads 30       # Com 30 threads

Este script:
  1. Busca todos os XMLs na pasta especificada (recursivamente)
  2. Valida e identifica os XMLs
  3. Verifica se já existem no SIEG (evita duplicados)
  4. Envia apenas XMLs novos para o SIEG
  5. Exclui XMLs enviados com sucesso (opcional)

Ideal para execução após download e descompactação de XMLs do SEFAZ.
        """
    )
    
    parser.add_argument(
        '--auto', '-a',
        action='store_true',
        required=True,
        help='Modo automático: verifica, envia e exclui sem interação'
    )
    
    parser.add_argument(
        '--pasta', '-p',
        type=str,
        default=None,
        help=f'Pasta com XMLs (padrão: {PATHS.downloads_dir})'
    )
    
    parser.add_argument(
        '--manter', '-m',
        action='store_true',
        help='Manter XMLs após envio (não excluir)'
    )
    
    parser.add_argument(
        '--threads', '-t',
        type=int,
        default=NUM_THREADS_PADRAO,
        help=f'Número de threads (padrão: {NUM_THREADS_PADRAO})'
    )
    
    args = parser.parse_args()
    
    # Modo automático (único modo disponível)
    resultado = enviar_automatico(
        pasta=args.pasta,
        excluir_enviados=not args.manter,
        num_threads=args.threads
    )
    
    # Retornar código de saída baseado no resultado
    if "erro" in resultado:
        print(f"\n[ERRO] {resultado['erro']}")
        sys.exit(1)
    
    # Se houver erros, retornar código de erro
    if resultado.get("erros", 0) > 0:
        sys.exit(1)
    
    sys.exit(0)


if __name__ == "__main__":
    main()
