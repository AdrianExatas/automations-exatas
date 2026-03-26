"""
Utilitários para Selenium
"""
import time
import subprocess
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager
from .logger import log_event


def verificar_chrome_instalado():
    """Verifica se o Chrome está instalado"""
    try:
        # Verificar caminhos comuns do Chrome no Windows
        chrome_paths = [
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            r"C:\Users\{}\AppData\Local\Google\Chrome\Application\chrome.exe".format(os.getenv('USERNAME', '')),
        ]
        
        for path in chrome_paths:
            if os.path.exists(path):
                return True
        
        # Tentar comando where como fallback
        result = subprocess.run(['where', 'chrome'], capture_output=True, text=True)
        return result.returncode == 0
    except:
        return False


def configurar_driver_omie(log_widget):
    """Configura o driver do Chrome para automação do Omie"""
    log_event(log_widget, "[CONFIG] Configurando driver do Chrome...")
    
    # Verificar se o Chrome está instalado
    if not verificar_chrome_instalado():
        log_event(log_widget, "[ERRO] Google Chrome não encontrado. Instale o Chrome primeiro.")
        return None, None
    
    chrome_options = Options()
    chrome_options.add_argument('--user-data-dir=C:\\PerfisSelenium\\OmieProfile')
    chrome_options.add_argument("--profile-directory=Default")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    chrome_options.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
    
    try:
        log_event(log_widget, "[DOWNLOAD] Baixando ChromeDriver...")
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        wait = WebDriverWait(driver, 60)
        log_event(log_widget, "[OK] Driver configurado com sucesso")
        return driver, wait
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao configurar driver: {e}")
        log_event(log_widget, "[TENTATIVA] Tentando método alternativo...")
        
        try:
            # Método alternativo sem service
            driver = webdriver.Chrome(options=chrome_options)
            wait = WebDriverWait(driver, 60)
            log_event(log_widget, "[OK] Driver configurado com método alternativo")
            return driver, wait
            
        except Exception as e2:
            log_event(log_widget, f"[ERRO] Erro no método alternativo: {e2}")
            return None, None




def aguardar_e_alternar_para_nova_aba(driver, wait, log_widget, timeout=30):
    """Aguarda uma nova aba ser aberta e alterna para ela"""
    try:
        log_event(log_widget, "[INFO] Aguardando nova aba ser aberta...")
        
        # Aguardar até que uma nova aba seja aberta
        inicio = time.time()
        while time.time() - inicio < timeout:
            abas_atuais = driver.window_handles
            if len(abas_atuais) > 1:
                # Nova aba detectada
                nova_aba = abas_atuais[-1]  # Pega a última aba (mais recente)
                driver.switch_to.window(nova_aba)
                log_event(log_widget, f"[OK] Alternado para nova aba: {nova_aba}")
                
                # Aguardar a página carregar
                time.sleep(3)
                return True
            time.sleep(0.5)
        
        log_event(log_widget, "[AVISO] Timeout aguardando nova aba")
        return False
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao aguardar nova aba: {e}")
        return False


def aguardar_elemento_clicavel(driver, wait, log_widget, elemento, timeout=10):
    """Aguarda um elemento ficar clicável, removendo sobreposições se necessário"""
    try:
        # Primeiro, tenta aguardar o elemento ficar clicável
        elemento_clicavel = wait.until(EC.element_to_be_clickable(elemento))
        return elemento_clicavel
    except TimeoutException:
        log_event(log_widget, "[AVISO] Elemento não ficou clicável, tentando remover sobreposições...")
        
        # Tenta remover elementos de bloqueio comuns
        try:
            # Remove lockIndicator se existir (mais agressivo)
            lock_indicators = driver.find_elements(By.CSS_SELECTOR, ".lockIndicator")
            for lock in lock_indicators:
                if lock.is_displayed():
                    driver.execute_script("arguments[0].style.display = 'none';", lock)
                    driver.execute_script("arguments[0].remove();", lock)
                    log_event(log_widget, "[OK] Removido lockIndicator")
            
            # Remove overlays comuns
            overlays = driver.find_elements(By.CSS_SELECTOR, ".ui-overlay, .modal-backdrop, .loading-overlay, .ui-dialog-overlay")
            for overlay in overlays:
                if overlay.is_displayed():
                    driver.execute_script("arguments[0].style.display = 'none';", overlay)
                    driver.execute_script("arguments[0].remove();", overlay)
                    log_event(log_widget, "[OK] Removido overlay")
            
            # Remove elementos de loading/bloqueio específicos do Omie
            loading_elements = driver.find_elements(By.CSS_SELECTOR, ".ui-igdialog-overlay, .ui-igdialog-lock, .ui-igdialog-loading")
            for loading in loading_elements:
                if loading.is_displayed():
                    driver.execute_script("arguments[0].style.display = 'none';", loading)
                    driver.execute_script("arguments[0].remove();", loading)
                    log_event(log_widget, "[OK] Removido elemento de loading")
            
            time.sleep(2)
            
            # Tenta novamente
            elemento_clicavel = WebDriverWait(driver, 5).until(EC.element_to_be_clickable(elemento))
            return elemento_clicavel
            
        except Exception as e:
            log_event(log_widget, f"[AVISO] Não foi possível remover sobreposições: {e}")
            
            # Última tentativa: clique via JavaScript
            try:
                elemento_js = driver.find_element(elemento[0], elemento[1])
                log_event(log_widget, "[TENTATIVA] Tentando clique via JavaScript...")
                return elemento_js
            except Exception as e2:
                log_event(log_widget, f"[ERRO] Todas as tentativas falharam: {e2}")
                raise e2


def clicar_elemento_seguro(driver, wait, log_widget, elemento, descricao="elemento"):
    """Clica em um elemento de forma segura, lidando com interceptações"""
    try:
        elemento_clicavel = aguardar_elemento_clicavel(driver, wait, log_widget, elemento)
        
        # Tenta clique normal primeiro
        try:
            elemento_clicavel.click()
            log_event(log_widget, f"[OK] Clique normal realizado em {descricao}")
            return True
        except Exception as e:
            log_event(log_widget, f"[AVISO] Clique normal falhou para {descricao}: {e}")
            
            # Remove elementos de bloqueio antes de tentar outras estratégias
            try:
                # Remove lockIndicator e overlays novamente
                lock_indicators = driver.find_elements(By.CSS_SELECTOR, ".lockIndicator")
                for lock in lock_indicators:
                    if lock.is_displayed():
                        driver.execute_script("arguments[0].style.display = 'none';", lock)
                        driver.execute_script("arguments[0].remove();", lock)
                
                overlays = driver.find_elements(By.CSS_SELECTOR, ".ui-overlay, .modal-backdrop, .loading-overlay, .ui-dialog-overlay")
                for overlay in overlays:
                    if overlay.is_displayed():
                        driver.execute_script("arguments[0].style.display = 'none';", overlay)
                        driver.execute_script("arguments[0].remove();", overlay)
                
                time.sleep(1)
            except:
                pass
            
            # Tenta clique via JavaScript
            try:
                driver.execute_script("arguments[0].click();", elemento_clicavel)
                log_event(log_widget, f"[OK] Clique via JavaScript realizado em {descricao}")
                return True
            except Exception as e2:
                log_event(log_widget, f"[AVISO] Clique via JavaScript falhou para {descricao}: {e2}")
                
                # Tenta ActionChains com scroll para o elemento
                try:
                    driver.execute_script("arguments[0].scrollIntoView(true);", elemento_clicavel)
                    time.sleep(0.5)
                    ActionChains(driver).move_to_element(elemento_clicavel).click().perform()
                    log_event(log_widget, f"[OK] Clique via ActionChains realizado em {descricao}")
                    return True
                except Exception as e3:
                    log_event(log_widget, f"[AVISO] ActionChains falhou para {descricao}: {e3}")
                    
                    # Última tentativa: JavaScript com dispatchEvent
                    try:
                        driver.execute_script("""
                            var element = arguments[0];
                            var event = new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            });
                            element.dispatchEvent(event);
                        """, elemento_clicavel)
                        log_event(log_widget, f"[OK] Clique via dispatchEvent realizado em {descricao}")
                        return True
                    except Exception as e4:
                        log_event(log_widget, f"[ERRO] Todas as estratégias de clique falharam para {descricao}: {e4}")
                        return False
                    
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao clicar em {descricao}: {e}")
        return False


def fechar_dialogo_seguro(driver, wait, log_widget, xpath_dialogo, descricao="diálogo"):
    """Fecha um diálogo de forma segura, lidando com elementos de bloqueio"""
    try:
        # Primeiro, tenta remover todos os elementos de bloqueio
        log_event(log_widget, f"[FECHAR] Tentando fechar {descricao}...")
        
        # Remove lockIndicator e overlays
        lock_indicators = driver.find_elements(By.CSS_SELECTOR, ".lockIndicator")
        for lock in lock_indicators:
            if lock.is_displayed():
                driver.execute_script("arguments[0].style.display = 'none';", lock)
                driver.execute_script("arguments[0].remove();", lock)
                log_event(log_widget, "[OK] Removido lockIndicator")
        
        overlays = driver.find_elements(By.CSS_SELECTOR, ".ui-overlay, .modal-backdrop, .loading-overlay, .ui-dialog-overlay")
        for overlay in overlays:
            if overlay.is_displayed():
                driver.execute_script("arguments[0].style.display = 'none';", overlay)
                driver.execute_script("arguments[0].remove();", overlay)
                log_event(log_widget, "[OK] Removido overlay")
        
        time.sleep(1)
        
        # Tenta encontrar o botão de fechar
        try:
            botao_fechar = driver.find_element(By.XPATH, xpath_dialogo)
            
            # Tenta clique normal primeiro
            try:
                botao_fechar.click()
                log_event(log_widget, f"[OK] {descricao} fechado com clique normal")
                return True
            except Exception as e:
                log_event(log_widget, f"[AVISO] Clique normal falhou: {e}")
                
                # Tenta clique via JavaScript
                try:
                    driver.execute_script("arguments[0].click();", botao_fechar)
                    log_event(log_widget, f"[OK] {descricao} fechado via JavaScript")
                    return True
                except Exception as e2:
                    log_event(log_widget, f"[AVISO] JavaScript falhou: {e2}")
                    
                    # Tenta ActionChains
                    try:
                        driver.execute_script("arguments[0].scrollIntoView(true);", botao_fechar)
                        time.sleep(0.5)
                        ActionChains(driver).move_to_element(botao_fechar).click().perform()
                        log_event(log_widget, f"[OK] {descricao} fechado via ActionChains")
                        return True
                    except Exception as e3:
                        log_event(log_widget, f"[AVISO] ActionChains falhou: {e3}")
                        
                        # Última tentativa: dispatchEvent
                        try:
                            driver.execute_script("""
                                var element = arguments[0];
                                var event = new MouseEvent('click', {
                                    view: window,
                                    bubbles: true,
                                    cancelable: true
                                });
                                element.dispatchEvent(event);
                            """, botao_fechar)
                            log_event(log_widget, f"[OK] {descricao} fechado via dispatchEvent")
                            return True
                        except Exception as e4:
                            log_event(log_widget, f"[ERRO] Todas as estratégias falharam para fechar {descricao}: {e4}")
                            return False
                            
        except Exception as e:
            log_event(log_widget, f"[ERRO] Não foi possível encontrar botão de fechar {descricao}: {e}")
            return False
            
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao fechar {descricao}: {e}")
        return False
