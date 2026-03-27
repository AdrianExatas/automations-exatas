#!/usr/bin/env python3
"""
Script de diagnóstico para verificar configuração do ChromeDriver
"""
import os
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.core.browser import (
    obter_versao_chrome,
    validar_chromedriver_executavel,
    encontrar_chromedriver_executavel,
    limpar_cache_webdriver
)


def diagnostico_completo():
    """Executa diagnóstico completo do ChromeDriver"""
    print("=" * 60)
    print("DIAGNÓSTICO DO CHROMEDRIVER")
    print("=" * 60)
    
    # 1. Verificar versão do Chrome instalado
    print("\n[1/4] Verificando Chrome instalado...")
    versao_chrome = obter_versao_chrome()
    if versao_chrome:
        print(f"   ✅ Chrome encontrado: versão {versao_chrome}")
    else:
        print("   ⚠️ Não foi possível detectar a versão do Chrome")
    
    # 2. Verificar cache do webdriver
    print("\n[2/4] Verificando cache do webdriver_manager...")
    cache_path = Path.home() / ".wdm"
    if cache_path.exists():
        drivers = list(cache_path.rglob("chromedriver*"))
        print(f"   📁 Cache encontrado: {cache_path}")
        print(f"   📄 Arquivos ChromeDriver: {len(drivers)}")
        
        for driver in drivers[:5]:
            if validar_chromedriver_executavel(str(driver)):
                print(f"      ✅ {driver.name} (válido)")
            else:
                print(f"      ❌ {driver.name} (inválido)")
    else:
        print("   ℹ️ Cache não existe (será criado na primeira execução)")
    
    # 3. Tentar baixar/configurar ChromeDriver
    print("\n[3/4] Testando download do ChromeDriver...")
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        driver_path = ChromeDriverManager().install()
        
        if validar_chromedriver_executavel(driver_path):
            print(f"   ✅ ChromeDriver baixado e válido: {driver_path}")
        else:
            # Tenta encontrar executável
            driver_exec = encontrar_chromedriver_executavel(driver_path)
            if driver_exec:
                print(f"   ✅ ChromeDriver encontrado: {driver_exec}")
            else:
                print(f"   ❌ ChromeDriver inválido: {driver_path}")
    except Exception as e:
        print(f"   ❌ Erro ao baixar ChromeDriver: {e}")
    
    # 4. Testar inicialização do navegador
    print("\n[4/4] Testando inicialização do navegador...")
    try:
        from src.core.browser import SefazBrowser
        browser = SefazBrowser(headless=True)
        print("   ✅ Navegador iniciado com sucesso!")
        browser.fechar()
        print("   ✅ Navegador fechado corretamente!")
    except Exception as e:
        print(f"   ❌ Erro ao iniciar navegador: {e}")
    
    print("\n" + "=" * 60)
    print("DIAGNÓSTICO CONCLUÍDO")
    print("=" * 60)


def limpar_cache():
    """Limpa o cache do ChromeDriver"""
    print("\n[INFO] Limpando cache do webdriver_manager...")
    if limpar_cache_webdriver():
        print("[OK] Cache limpo com sucesso!")
    else:
        print("[INFO] Cache não encontrado ou já limpo.")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Diagnóstico do ChromeDriver')
    parser.add_argument('--limpar', action='store_true', help='Limpa o cache do ChromeDriver')
    
    args = parser.parse_args()
    
    if args.limpar:
        limpar_cache()
    else:
        diagnostico_completo()
