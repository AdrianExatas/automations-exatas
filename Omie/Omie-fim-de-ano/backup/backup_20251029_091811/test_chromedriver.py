"""
Script de teste para verificar se o ChromeDriver está funcionando corretamente
"""
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def test_chromedriver():
    """Testa se o ChromeDriver está funcionando"""
    print("Testando ChromeDriver...")
    
    try:
        # Configurações básicas
        chrome_options = Options()
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option("useAutomationExtension", False)
        chrome_options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
        
        print("Baixando/Verificando ChromeDriver...")
        service = Service(ChromeDriverManager().install())
        
        print("Iniciando navegador...")
        driver = webdriver.Chrome(service=service, options=chrome_options)
        
        print("Acessando Google...")
        driver.get("https://www.google.com")
        time.sleep(3)
        
        print("ChromeDriver funcionando corretamente!")
        print(f"Titulo da pagina: {driver.title}")
        
        driver.quit()
        return True
        
    except Exception as e:
        print(f"Erro no ChromeDriver: {e}")
        print("Tentando metodo alternativo...")
        
        try:
            # Método alternativo sem service
            driver = webdriver.Chrome(options=chrome_options)
            print("Acessando Google...")
            driver.get("https://www.google.com")
            time.sleep(3)
            print("ChromeDriver funcionando com metodo alternativo!")
            print(f"Titulo da pagina: {driver.title}")
            driver.quit()
            return True
        except Exception as e2:
            print(f"Erro no metodo alternativo: {e2}")
            return False

if __name__ == "__main__":
    test_chromedriver()
