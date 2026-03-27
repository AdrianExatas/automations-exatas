#!/usr/bin/env python3
"""
Script para limpar cache do ChromeDriver
"""
import os
import sys
import shutil
from pathlib import Path

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


def limpar_cache_webdriver():
    """Limpa o cache do webdriver_manager"""
    cache_path = Path.home() / ".wdm"
    
    if cache_path.exists():
        print(f"[INFO] Removendo cache em: {cache_path}")
        try:
            shutil.rmtree(cache_path)
            print("[OK] Cache do webdriver_manager removido com sucesso!")
            return True
        except Exception as e:
            print(f"[ERRO] Falha ao remover cache: {e}")
            return False
    else:
        print("[INFO] Cache não encontrado. Nada a limpar.")
        return True


def limpar_perfis_temporarios():
    """Limpa perfis temporários do Chrome criados pelo Selenium"""
    temp_dir = Path(os.environ.get('TEMP', '/tmp'))
    
    perfis_encontrados = 0
    perfis_removidos = 0
    
    for pasta in temp_dir.iterdir():
        if pasta.is_dir() and pasta.name.startswith(('chrome_selenium_', 'chrome_sefaz_')):
            perfis_encontrados += 1
            try:
                shutil.rmtree(pasta, ignore_errors=True)
                perfis_removidos += 1
            except:
                pass
    
    if perfis_encontrados > 0:
        print(f"[OK] {perfis_removidos}/{perfis_encontrados} perfis temporários removidos")
    else:
        print("[INFO] Nenhum perfil temporário encontrado")
    
    return perfis_removidos


def main():
    """Função principal"""
    print("=" * 50)
    print("LIMPEZA DE CACHE DO CHROMEDRIVER")
    print("=" * 50)
    
    print("\n[1/2] Limpando cache do webdriver_manager...")
    limpar_cache_webdriver()
    
    print("\n[2/2] Limpando perfis temporários...")
    limpar_perfis_temporarios()
    
    print("\n" + "=" * 50)
    print("LIMPEZA CONCLUÍDA")
    print("=" * 50)


if __name__ == "__main__":
    main()
