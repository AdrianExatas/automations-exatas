#!/usr/bin/env python3
"""
Script para extrair ZIPs aninhados que ficaram nas pastas xmls/
"""
import os
import sys
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
from src.download.downloader import _extrair_zip


def processar_zips_aninhados():
    """Processa todos os ZIPs encontrados nas pastas xmls/"""
    downloads_dir = PATHS.downloads_dir
    
    if not downloads_dir.exists():
        print(f"❌ Pasta de downloads não encontrada: {downloads_dir}")
        return
    
    print("=" * 60)
    print("EXTRAÇÃO RECURSIVA DE ZIPs ANINHADOS")
    print("=" * 60)
    print(f"📁 Pasta: {downloads_dir}")
    print()
    
    # Busca todos os ZIPs nas pastas xmls/
    zips_aninhados = []
    for xmls_dir in downloads_dir.rglob("xmls"):
        if xmls_dir.is_dir():
            zips = list(xmls_dir.glob("*.zip"))
            zips_aninhados.extend(zips)
    
    total = len(zips_aninhados)
    print(f"📦 Encontrados {total} ZIP(s) aninhado(s) para processar")
    print()
    
    if total == 0:
        print("✅ Nenhum ZIP aninhado encontrado!")
        return
    
    # Processa cada ZIP
    processados = 0
    erros = 0
    
    for i, zip_path in enumerate(zips_aninhados, 1):
        try:
            empresa = zip_path.parent.parent.name if zip_path.parent.parent else "Desconhecido"
            print(f"[{i}/{total}] Processando: {zip_path.name}")
            print(f"   📁 Empresa: {empresa}")
            
            # Extrai recursivamente (pasta_destino = mesma pasta do ZIP)
            sucesso = _extrair_zip(
                zip_path,
                pasta_destino=zip_path.parent,
                sobrescrever=False,
                profundidade=0
            )
            
            if sucesso:
                processados += 1
                # Verifica se o ZIP foi removido (deve ter sido removido após extração)
                if not zip_path.exists():
                    print(f"   ✅ Extraído e removido com sucesso")
                else:
                    print(f"   ✅ Extraído (ZIP ainda existe, pode conter conteúdo)")
            else:
                erros += 1
                print(f"   ⚠️ Falha na extração")
            
        except Exception as e:
            erros += 1
            print(f"   ❌ Erro: {e}")
        
        print()
    
    # Resumo
    print("=" * 60)
    print("📊 RESUMO")
    print("=" * 60)
    print(f"   ✅ Processados com sucesso: {processados}")
    print(f"   ❌ Erros: {erros}")
    print(f"   📦 Total: {total}")
    print("=" * 60)


if __name__ == "__main__":
    try:
        processar_zips_aninhados()
    except KeyboardInterrupt:
        print("\n\n[INFO] Processo interrompido pelo usuário.")
        sys.exit(130)
    except Exception as e:
        print(f"\n[ERRO] Erro crítico: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
