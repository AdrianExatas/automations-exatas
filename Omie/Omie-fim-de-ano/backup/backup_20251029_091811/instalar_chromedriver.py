"""
Script para instalar e configurar o ChromeDriver corretamente
"""
import os
import requests
import zipfile
import subprocess
import json
from pathlib import Path

def obter_versao_chrome():
    """Obtém a versão do Chrome instalado"""
    try:
        # Método 1: Verificar via registro do Windows
        result = subprocess.run([
            'reg', 'query', 
            'HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon', 
            '/v', 'version'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            version = result.stdout.split()[-1]
            return version.split('.')[0]  # Retorna apenas o número principal da versão
        
        # Método 2: Verificar via comando chrome --version
        result = subprocess.run(['chrome', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            version = result.stdout.strip().split()[-1]
            return version.split('.')[0]
            
    except Exception as e:
        print(f"Erro ao obter versão do Chrome: {e}")
    
    return None

def baixar_chromedriver(versao_chrome):
    """Baixa o ChromeDriver correspondente à versão do Chrome"""
    try:
        # URL da API do ChromeDriver
        api_url = f"https://googlechromelabs.github.io/chrome-for-testing/LATEST_RELEASE_{versao_chrome}"
        
        print(f"🔍 Verificando versão mais recente do ChromeDriver para Chrome {versao_chrome}...")
        response = requests.get(api_url)
        
        if response.status_code == 200:
            versao_chromedriver = response.text.strip()
            print(f"✅ Versão encontrada: {versao_chromedriver}")
        else:
            print("❌ Não foi possível obter a versão do ChromeDriver")
            return False
        
        # URL de download
        download_url = f"https://storage.googleapis.com/chrome-for-testing-public/{versao_chromedriver}/win64/chromedriver-win64.zip"
        
        print("📥 Baixando ChromeDriver...")
        response = requests.get(download_url)
        
        if response.status_code == 200:
            with open("chromedriver.zip", "wb") as f:
                f.write(response.content)
            
            print("📦 Extraindo ChromeDriver...")
            with zipfile.ZipFile("chromedriver.zip", 'r') as zip_ref:
                zip_ref.extractall(".")
            
            # Mover o executável para o diretório atual
            extracted_path = f"chromedriver-win64/chromedriver.exe"
            if os.path.exists(extracted_path):
                os.rename(extracted_path, "chromedriver.exe")
                print("✅ ChromeDriver instalado com sucesso!")
                
                # Limpar arquivos temporários
                os.remove("chromedriver.zip")
                import shutil
                if os.path.exists("chromedriver-win64"):
                    shutil.rmtree("chromedriver-win64")
                
                return True
            else:
                print("❌ Erro ao extrair ChromeDriver")
                return False
        else:
            print(f"❌ Erro ao baixar ChromeDriver: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Erro ao baixar ChromeDriver: {e}")
        return False

def testar_chromedriver():
    """Testa se o ChromeDriver está funcionando"""
    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service
        
        print("🔍 Testando ChromeDriver...")
        
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Executar sem interface gráfica
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        service = Service("chromedriver.exe")
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        driver.get("https://www.google.com")
        print(f"✅ ChromeDriver funcionando! Título: {driver.title}")
        
        driver.quit()
        return True
        
    except Exception as e:
        print(f"❌ Erro no teste do ChromeDriver: {e}")
        return False

def main():
    """Função principal"""
    print("🚀 Instalador do ChromeDriver para Automação Omie")
    print("=" * 50)
    
    # Verificar se o Chrome está instalado
    print("🔍 Verificando instalação do Google Chrome...")
    versao_chrome = obter_versao_chrome()
    
    if not versao_chrome:
        print("❌ Google Chrome não encontrado!")
        print("📥 Por favor, instale o Google Chrome primeiro:")
        print("   https://www.google.com/chrome/")
        return False
    
    print(f"✅ Google Chrome encontrado: versão {versao_chrome}")
    
    # Verificar se o ChromeDriver já existe
    if os.path.exists("chromedriver.exe"):
        print("🔍 ChromeDriver já existe. Testando...")
        if testar_chromedriver():
            print("✅ ChromeDriver já está funcionando!")
            return True
        else:
            print("⚠️ ChromeDriver existente não está funcionando. Reinstalando...")
    
    # Baixar e instalar ChromeDriver
    if baixar_chromedriver(versao_chrome):
        if testar_chromedriver():
            print("🎉 ChromeDriver instalado e testado com sucesso!")
            print("✅ Agora você pode executar o script de automação do Omie")
            return True
        else:
            print("❌ ChromeDriver instalado mas não está funcionando")
            return False
    else:
        print("❌ Falha na instalação do ChromeDriver")
        return False

if __name__ == "__main__":
    main()
