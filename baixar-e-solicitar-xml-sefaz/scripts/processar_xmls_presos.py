#!/usr/bin/env python3
"""
Script para processar XMLs que ficaram presos na pasta xmls/ após extração
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


def main():
    """Função principal"""
    parser = argparse.ArgumentParser(
        description='Processa XMLs presos na pasta xmls/ após extração',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Exemplos de uso:
  python processar_xmls_presos.py                    # Processa pasta padrão (Downloads/XML SEFAZ)
  python processar_xmls_presos.py --pasta "C:\\..."  # Processa pasta específica
  python processar_xmls_presos.py --empresa "NOME"   # Processa apenas uma empresa
  python processar_xmls_presos.py --manter           # Não exclui arquivos após envio
  python processar_xmls_presos.py --threads 3        # Usa 3 threads (padrão: 20)

Este script:
  1. Busca todos os XMLs na pasta xmls/ (ou pasta especificada)
  2. Verifica se já existem no SIEG
  3. Envia apenas os novos
  4. Exclui arquivos já existentes e enviados com sucesso (padrão)
        """
    )
    
    parser.add_argument(
        '--pasta',
        type=str,
        default=None,
        help='Pasta específica para processar (padrão: busca todas as pastas xmls/ recursivamente)'
    )
    
    parser.add_argument(
        '--empresa',
        type=str,
        default=None,
        help='Nome da empresa para filtrar (busca apenas essa empresa)'
    )
    
    parser.add_argument(
        '--manter',
        action='store_true',
        help='Manter XMLs após envio (não excluir)'
    )
    
    parser.add_argument(
        '--threads', '-t',
        type=int,
        default=20,
        help='Número de threads (padrão: 20)'
    )
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("PROCESSAMENTO DE XMLs PRESOS")
    print("=" * 60)
    
    # Determina pasta(s) para processar
    pastas_para_processar = []
    
    if args.pasta:
        # Pasta específica fornecida
        pasta = Path(args.pasta)
        if not pasta.exists():
            print(f"❌ ERRO: Pasta não encontrada: {pasta}")
            sys.exit(1)
        pastas_para_processar.append(pasta)
    else:
        # Busca todas as pastas xmls/ recursivamente
        downloads_dir = PATHS.downloads_dir
        
        if not downloads_dir.exists():
            print(f"❌ ERRO: Diretório de downloads não existe: {downloads_dir}")
            sys.exit(1)
        
        print(f"📁 Buscando pastas xmls/ em: {downloads_dir}")
        
        # Busca todas as pastas xmls/
        for pasta_xmls in downloads_dir.rglob("xmls"):
            if pasta_xmls.is_dir():
                # Se filtro de empresa, verifica
                if args.empresa:
                    pasta_empresa = pasta_xmls.parent
                    if args.empresa.upper() not in pasta_empresa.name.upper():
                        continue
                
                # Verifica se tem XMLs
                xmls = list(pasta_xmls.glob("*.xml"))
                if xmls:
                    pastas_para_processar.append(pasta_xmls)
                    print(f"   ✓ Encontrada: {pasta_xmls} ({len(xmls)} XMLs)")
        
        if not pastas_para_processar:
            print("\n⚠️  Nenhuma pasta xmls/ com XMLs encontrada!")
            sys.exit(0)
    
    print(f"\n📊 Total de pastas para processar: {len(pastas_para_processar)}")
    print("=" * 60)
    
    # Processa cada pasta
    total_enviados = 0
    total_existentes = 0
    total_erros = 0
    
    for idx, pasta_xmls in enumerate(pastas_para_processar, 1):
        print(f"\n[{idx}/{len(pastas_para_processar)}] Processando: {pasta_xmls}")
        print("-" * 60)
        
        resultado = enviar_automatico(
            pasta=str(pasta_xmls),
            excluir_enviados=not args.manter,
            num_threads=args.threads
        )
        
        if "erro" in resultado:
            print(f"\n⚠️  ERRO ao processar {pasta_xmls}: {resultado['erro']}")
            total_erros += resultado.get('erros', 0)
            continue
        
        total_enviados += resultado.get('enviados', 0)
        total_existentes += resultado.get('existentes', 0)
        total_erros += resultado.get('erros', 0)
    
    # Resumo final
    print("\n" + "=" * 60)
    print("📊 RESUMO GERAL")
    print("=" * 60)
    print(f"   📁 Pastas processadas: {len(pastas_para_processar)}")
    print(f"   ✅ Enviados com sucesso: {total_enviados}")
    print(f"   ⚠️  Já existentes no SIEG: {total_existentes}")
    print(f"   ❌ Erros: {total_erros}")
    print("=" * 60)
    
    sys.exit(0 if total_erros == 0 else 1)


if __name__ == "__main__":
    main()
