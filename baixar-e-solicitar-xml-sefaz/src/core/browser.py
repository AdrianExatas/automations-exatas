"""
Módulo unificado para gerenciamento do navegador Chrome/Selenium
Combina funcionalidades de consulta e download
"""
import os
import time
import shutil
import tempfile
import random
import string
import socket
from selenium import webdriver
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


def obter_versao_chrome():
    """Tenta obter a versão do Chrome instalado"""
    try:
        import subprocess
        import re
        
        # Tenta obter via registro do Windows
        if os.name == 'nt':
            try:
                result = subprocess.run(
                    ['reg', 'query', 'HKEY_CURRENT_USER\\Software\\Google\\Chrome\\BLBeacon', '/v', 'version'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    match = re.search(r'version\s+REG_SZ\s+(\d+\.\d+\.\d+\.\d+)', result.stdout)
                    if match:
                        return match.group(1)
            except:
                pass
            
            # Tenta via caminho padrão do Chrome
            chrome_paths = [
                os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
                r"C:\Program Files\Google\Chrome\Application\chrome.exe",
                r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
            ]
            
            for chrome_path in chrome_paths:
                if os.path.exists(chrome_path):
                    try:
                        result = subprocess.run(
                            ['wmic', 'datafile', 'where', f'name="{chrome_path.replace(chr(92), chr(92)+chr(92))}"', 'get', 'Version'],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if result.returncode == 0:
                            lines = [l.strip() for l in result.stdout.split('\n') if l.strip() and l.strip() != 'Version']
                            if lines:
                                return lines[0]
                    except:
                        pass
    except:
        pass
    return None


def validar_chromedriver_executavel(caminho):
    """Valida se o arquivo é um executável PE válido no Windows"""
    try:
        if not os.path.exists(caminho):
            return False
        
        # Verificar se não está vazio
        if os.path.getsize(caminho) < 1000:  # ChromeDriver deve ter pelo menos alguns KB
            return False
        
        # Verificar se é um executável PE (Portable Executable) no Windows
        # Arquivos PE começam com "MZ" (0x4D 0x5A)
        with open(caminho, 'rb') as f:
            header = f.read(2)
            if header != b'MZ':
                return False
        
        return True
    except:
        return False


def encontrar_chromedriver_executavel(caminho_base):
    """Encontra o executável chromedriver.exe no diretório"""
    try:
        # Se o caminho já é um executável válido, retornar
        if os.path.isfile(caminho_base) and caminho_base.endswith('.exe'):
            if validar_chromedriver_executavel(caminho_base):
                return caminho_base
        
        # Determinar o diretório base para busca
        if os.path.isfile(caminho_base):
            diretorio = os.path.dirname(caminho_base)
        else:
            diretorio = caminho_base
        
        # Normalizar o caminho
        diretorio = os.path.normpath(diretorio)
        
        diretorios_para_buscar = [diretorio]
        
        # Também tentar o diretório pai (pode estar um nível acima)
        diretorio_pai = os.path.dirname(diretorio)
        if diretorio_pai and diretorio_pai != diretorio:
            diretorios_para_buscar.append(diretorio_pai)
        
        for dir_busca in diretorios_para_buscar:
            if os.path.exists(dir_busca):
                try:
                    for root, dirs, files in os.walk(dir_busca):
                        for file in files:
                            if file.lower() == 'chromedriver.exe':
                                caminho_completo = os.path.join(root, file)
                                if validar_chromedriver_executavel(caminho_completo):
                                    return caminho_completo
                except:
                    pass
        
        return None
    except:
        return None


def limpar_cache_webdriver():
    """Limpa o cache do webdriver_manager para forçar novo download"""
    try:
        cache_path = os.path.join(os.path.expanduser("~"), ".wdm")
        if os.path.exists(cache_path):
            print("🧹 Limpando cache do webdriver_manager...")
            shutil.rmtree(cache_path)
            print("✅ Cache limpo com sucesso.")
            return True
        return False
    except Exception as e:
        print(f"⚠️ Aviso ao limpar cache: {e}")
        return False


def _encontrar_porta_disponivel(porta_inicial: int = 9222, max_tentativas: int = 100) -> int:
    """
    Encontra uma porta TCP disponível para remote debugging do Chrome
    
    Args:
        porta_inicial: Porta inicial para começar a busca (padrão: 9222)
        max_tentativas: Número máximo de tentativas (padrão: 100)
    
    Returns:
        Porta TCP disponível
    
    Raises:
        Exception: Se não encontrar porta disponível
    """
    for offset in range(max_tentativas):
        porta = porta_inicial + offset
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', porta))
                return porta
        except OSError:
            continue
    raise Exception(f"Não foi possível encontrar porta disponível no range {porta_inicial}-{porta_inicial + max_tentativas - 1}")


def _configurar_opcoes_chrome(headless: bool = False, download_dir: str = None, remote_debugging_port: int = None) -> Options:
    """
    Configura opções do Chrome otimizadas para automação
    
    Args:
        headless: Se True, executa em modo headless
        download_dir: Diretório para downloads (opcional)
        remote_debugging_port: Porta para remote debugging (opcional, gera automaticamente se None)
    
    Returns:
        Options configuradas
    """
    options = Options()
    
    if headless:
        options.add_argument("--headless=new")
    
    # Opções de estabilidade e PERFORMANCE
    options.add_argument("--disable-gpu")
    options.add_argument("--mute-audio")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-features=PushMessaging,GCMService,TranslateUI")
    options.add_argument("--disable-notifications")
    options.add_argument("--window-size=1920,1080")
    
    # Opções para INICIAR MAIS RÁPIDO
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-backgrounding-occluded-windows")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-sync")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--disable-default-apps")
    options.add_argument("--homepage=about:blank")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-new-tab-first-run")
    options.add_argument("--disable-features=MultipleDisplayWorkstation")
    
    # Opções adicionais de isolamento para múltiplas sessões
    options.add_argument("--disable-background-networking")
    
    # Configurar porta de remote debugging única para isolamento entre sessões
    if remote_debugging_port is None:
        remote_debugging_port = _encontrar_porta_disponivel()
    options.add_argument(f"--remote-debugging-port={remote_debugging_port}")
    
    # Preferências para melhor compatibilidade e performance
    options.add_experimental_option("useAutomationExtension", False)
    options.add_experimental_option("excludeSwitches", ["enable-automation", "enable-logging"])
    
    # Preferências para iniciar mais rápido
    prefs = {
        "profile.default_content_setting_values.notifications": 2,
        "profile.default_content_settings.popups": 0,
        "credentials_enable_service": False,
        "password_manager_enabled": False
    }
    
    # Configurar diretório de downloads se especificado
    if download_dir:
        prefs["download.default_directory"] = download_dir
        prefs["download.prompt_for_download"] = False
        prefs["download.directory_upgrade"] = True
        prefs["safebrowsing.enabled"] = True
    
    options.add_experimental_option("prefs", prefs)
    
    return options


def configurar_driver(headless: bool = False, download_dir: str = None):
    """
    Configura e retorna instância do ChromeDriver
    
    Args:
        headless: Se True, executa em modo headless
        download_dir: Diretório para downloads (opcional)
    
    Returns:
        WebDriver configurado
        
    Raises:
        Exception: Se falhar ao criar driver
    """
    # Gerar porta única para esta sessão (permite múltiplas automações simultâneas)
    porta_debug = _encontrar_porta_disponivel()
    options = _configurar_opcoes_chrome(headless, download_dir, remote_debugging_port=porta_debug)
    
    # Usar perfil temporário único
    unique_id = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    user_data_dir = tempfile.mkdtemp(prefix=f"chrome_sefaz_{unique_id}_")
    options.add_argument(f"--user-data-dir={user_data_dir}")
    
    print(f"[INFO] Configurando ChromeDriver...")
    print(f"   Perfil temporário: {user_data_dir}")
    print(f"   Porta de debug: {porta_debug}")
    
    if headless:
        print("   Modo headless ativado.")
    else:
        print("   Modo visível ativado.")
    
    try:
        # Baixar/obter o ChromeDriver
        driver_path_base = ChromeDriverManager().install()
        
        # Verificar se o caminho retornado é um executável válido
        if validar_chromedriver_executavel(driver_path_base):
            driver_path = driver_path_base
        else:
            driver_path = encontrar_chromedriver_executavel(driver_path_base)
        
        if not driver_path or not validar_chromedriver_executavel(driver_path):
            raise Exception(f"ChromeDriver inválido ou não encontrado em: {driver_path_base}")
        
        # Configurar chrome binary
        chrome_paths = [
            os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        ]
        
        for chrome_path in chrome_paths:
            if os.path.exists(chrome_path):
                options.binary_location = chrome_path
                break
        
        servico = Service(driver_path)
        driver = webdriver.Chrome(service=servico, options=options)
        
        # Armazenar referência ao diretório temporário para limpeza
        driver._temp_profile_dir = user_data_dir
        
        print("[OK] Driver configurado com sucesso!")
        return driver
        
    except Exception as e:
        error_str = str(e)
        print(f"[ERRO] Falha ao criar sessão do Chrome: {error_str[:200]}")
        print("[INFO] Soluções:")
        print("   1. Feche todas as instâncias do Chrome")
        print("   2. Limpe o cache: %USERPROFILE%\\.wdm")
        print("   3. Atualize o Chrome para a versão mais recente")
        raise Exception(f"Falha ao criar sessão do Chrome: {error_str[:200]}")


class SefazBrowser:
    """Classe para gerenciar a sessão do navegador no portal SEFAZ"""
    
    def __init__(self, headless: bool = False, download_dir: str = None):
        """
        Inicializa o navegador com as configurações necessárias
        
        Args:
            headless: Se True, executa o navegador em modo headless
            download_dir: Diretório para downloads (opcional)
        """
        self.navegador = None
        self.wait = None
        self.headless = headless
        self.download_dir = download_dir
        self._temp_profile_dir = None
        self._inicializar_navegador()
    
    def _inicializar_navegador(self):
        """Configura e inicializa o navegador Chrome"""
        # Gerar porta única para esta sessão (permite múltiplas automações simultâneas)
        porta_debug = _encontrar_porta_disponivel()
        options = _configurar_opcoes_chrome(self.headless, self.download_dir, remote_debugging_port=porta_debug)
        
        # Usar perfil temporário único
        unique_id = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        self._temp_profile_dir = tempfile.mkdtemp(prefix=f"chrome_selenium_{unique_id}_")
        options.add_argument(f"--user-data-dir={self._temp_profile_dir}")
        print(f"[INFO] Usando perfil temporário: {self._temp_profile_dir}")
        print(f"[INFO] Porta de debug: {porta_debug}")
        
        print("[INFO] Configurando ChromeDriver...")
        
        # Baixar/obter o ChromeDriver
        driver_path_base = ChromeDriverManager().install()
        
        # Verificar se o caminho retornado é um executável válido
        if validar_chromedriver_executavel(driver_path_base):
            driver_path = driver_path_base
        else:
            driver_path = encontrar_chromedriver_executavel(driver_path_base)
        
        if not driver_path or not validar_chromedriver_executavel(driver_path):
            raise Exception(f"ChromeDriver inválido ou não encontrado em: {driver_path_base}")
        
        servico = Service(driver_path)
        
        # Garantir que o Chrome binary está especificado
        chrome_paths = [
            os.path.expanduser(r"~\AppData\Local\Google\Chrome\Application\chrome.exe"),
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
        ]
        
        for chrome_path in chrome_paths:
            if os.path.exists(chrome_path):
                options.binary_location = chrome_path
                break
        
        try:
            self.navegador = webdriver.Chrome(service=servico, options=options)
            self.wait = WebDriverWait(self.navegador, 10, poll_frequency=0.5)
            print("[OK] Navegador inicializado com sucesso!")
        except Exception as e:
            error_str = str(e)
            print(f"[ERRO] Falha ao criar sessão do Chrome: {error_str[:200]}")
            print("[INFO] Soluções:")
            print("   1. Feche todas as instâncias do Chrome")
            print("   2. Limpe o cache: %USERPROFILE%\\.wdm")
            print("   3. Atualize o Chrome para a versão mais recente")
            raise Exception(f"Falha ao criar sessão do Chrome: {error_str[:200]}")
    
    def _wait_document_ready(self, timeout: int = 15):
        """Aguarda o carregamento do documento atual."""
        WebDriverWait(self.navegador, timeout).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )

    def _esperar_nova_aba(self, timeout: int = 5):
        """Alterna para a nova aba quando o portal abrir uma janela adicional."""
        try:
            WebDriverWait(self.navegador, timeout).until(lambda d: len(d.window_handles) > 1)
            self.navegador.switch_to.window(self.navegador.window_handles[-1])
        except Exception:
            pass

    def fazer_login(self, usuario: str, senha: str) -> bool:
        """
        Realiza o login no portal SEFAZ
        
        Args:
            usuario: Nome de usuário
            senha: Senha do usuário
            
        Returns:
            True se login bem-sucedido, False caso contrário
        """
        try:
            print("[LOGIN] Iniciando processo de login...")
            self.navegador.get("https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx")
            self._wait_document_ready()
            
            # Aceitar cookies, se houver
            try:
                accept_button = WebDriverWait(self.navegador, 3).until(
                    EC.element_to_be_clickable((By.ID, 'accept-button'))
                )
                accept_button.click()
            except Exception:
                pass
            
            # Entrar no primeiro iframe
            iframes = self.navegador.find_elements(By.TAG_NAME, "iframe")
            if not iframes:
                print("[ERRO] Nenhum iframe encontrado na tela de acesso!")
                return False
            self.navegador.switch_to.frame(iframes[0])
            
            # Dropdown de acesso rápido
            dropdown = self.wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'acessoRapido')))
            dropdown.click()
            
            # Seleciona Contabilista
            option_contabilista = self.wait.until(
                EC.element_to_be_clickable((
                    By.XPATH,
                    "//option[@value='https://security.sefaz.se.gov.br/internet/portal/contabilista/atoAcessoContabilista.jsp']"
                ))
            )
            option_contabilista.click()
            
            # Click no body para desencadear evento
            try:
                body_tmp = self.navegador.find_element(By.TAG_NAME, "body")
                body_tmp.click()
            except Exception:
                pass
            
            # Entrar no iframe de login
            try:
                iframe_login = self.wait.until(
                    EC.presence_of_element_located((By.XPATH, "//iframe[contains(@src, 'atoAcessoContribuinte.jsp') or contains(@src, 'atoAcessoContabilista.jsp')]"))
                )
                self.navegador.switch_to.frame(iframe_login)
            except Exception as e:
                print(f"[ERRO] O iframe do login NAO foi encontrado! {e}")
                return False
            
            # Localiza a tabela de login
            tabela_login = self.wait.until(EC.presence_of_element_located((By.CLASS_NAME, "tabelaVerde")))
            
            # Preenche campos de login
            campo_usuario = tabela_login.find_element(By.NAME, "UserName")
            campo_senha = tabela_login.find_element(By.NAME, "Password")
            botao_login = tabela_login.find_element(By.NAME, "submit")
            
            campo_usuario.click()
            campo_usuario.send_keys(usuario)
            campo_senha.click()
            campo_senha.send_keys(senha)
            botao_login.click()
            
            print("[OK] Login realizado com sucesso!")
            return True
            
        except Exception as e:
            print(f"[ERRO] Erro ao fazer login: {e}")
            return False
    
    def navegar_para_menu_xml(self) -> bool:
        """
        Navega até o menu de solicitação de XML após o login
        
        Returns:
            True se navegação bem-sucedida, False caso contrário
        """
        try:
            # Volta ao contexto principal
            self.navegador.switch_to.default_content()
            
            # Alterna para nova aba se houver
            self._esperar_nova_aba()
            
            # Aguarda a página ficar pronta
            self._wait_document_ready()
            
            # Aguarda o body
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # Acessa o menu NFE
            menu_nfe = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(., 'NFE/DOCUMENTOS ELETRONICOS')]"))
            )
            menu_nfe.click()
            print("[OK] 'NFE/DOCUMENTOS ELETRONICOS' acessada com sucesso!")
            
            # Entra em 'Solicitar Arquivos XML'
            solicitar_xml = self.wait.until(
                EC.element_to_be_clickable((By.XPATH, "//a[contains(., 'Solicitar Arquivos XML')]"))
            )
            solicitar_xml.click()
            
            # Garante que o body foi renderizado
            self.wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            
            # Clica no botão "Novo"
            novo_elemento = self.wait.until(EC.presence_of_element_located((
                By.CSS_SELECTOR,
                "body > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td:nth-child(1) > a"
            )))
            
            # Scroll até o link
            self.navegador.execute_script("arguments[0].scrollIntoView({block: 'center'});", novo_elemento)
            
            # Clica no elemento
            try:
                novo_elemento.click()
            except Exception:
                self.navegador.execute_script("arguments[0].click();", novo_elemento)
            
            print("[OK] Menu de solicitacao XML acessado com sucesso!")
            return True
            
        except Exception as e:
            print(f"[ERRO] Erro ao navegar para menu XML: {e}")
            return False
    
    def voltar_para_nova_solicitacao(self) -> bool:
        """
        Volta para a página de nova solicitação XML após concluir uma solicitação
        
        Returns:
            True se navegação bem-sucedida, False caso contrário
        """
        try:
            self._wait_document_ready(timeout=10)

            novo_elemento = self.wait.until(EC.element_to_be_clickable((
                By.CSS_SELECTOR,
                "body > table > tbody > tr:nth-child(2) > td:nth-child(2) > table > tbody > tr > td > table:nth-child(6) > tbody > tr > td:nth-child(1) > a"
            )))
            
            self.navegador.execute_script("arguments[0].scrollIntoView({block: 'center'});", novo_elemento)
            
            try:
                novo_elemento.click()
            except Exception:
                self.navegador.execute_script("arguments[0].click();", novo_elemento)
            
            print("[OK] Navegado para nova solicitacao!")
            return True
            
        except Exception as e:
            print(f"[AVISO] Nao foi possivel voltar automaticamente: {e}")
            return self.navegar_para_menu_xml()
    
    def fechar(self):
        """Fecha o navegador e limpa recursos temporários"""
        if self.navegador:
            try:
                self.navegador.quit()
                print("[OK] Navegador fechado com sucesso!")
            except Exception as e:
                print(f"[AVISO] Erro ao fechar navegador: {e}")
            
            self.navegador = None
        
        # Limpar diretório de perfil temporário
        if self._temp_profile_dir:
            try:
                time.sleep(0.5)
                if os.path.exists(self._temp_profile_dir):
                    shutil.rmtree(self._temp_profile_dir, ignore_errors=True)
                    print("[OK] Perfil temporário removido")
            except Exception as e:
                print(f"[AVISO] Erro ao remover perfil temporário: {e}")
    
    def get_driver(self):
        """Retorna o driver do Selenium"""
        return self.navegador
    
    def get_wait(self):
        """Retorna o objeto WebDriverWait"""
        return self.wait
