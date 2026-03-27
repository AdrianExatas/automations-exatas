"""
Módulo de login e navegação para o sistema de download SEFAZ
"""
import time
import threading
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

from src.core.browser import configurar_driver
from src.core.config import USUARIO_SEFAZ, SENHA_SEFAZ
from . import state


def checar_parada(navegador) -> bool:
    """
    Verifica se a execução foi interrompida
    
    Args:
        navegador: Instância do WebDriver
        
    Returns:
        True se deve parar, False caso contrário
    """
    if not state.executando:
        print("🛑 Execução interrompida.")
        try:
            navegador.quit()
        except:
            pass
        return True
    return False


def fazer_login(navegador, wait) -> bool:
    """
    Realiza login no portal SEFAZ
    
    Args:
        navegador: Instância do WebDriver
        wait: WebDriverWait configurado
        
    Returns:
        True se login bem-sucedido
    """
    try:
        if checar_parada(navegador):
            return False
            
        # Aceitar cookies
        try:
            wait.until(EC.element_to_be_clickable((By.ID, 'accept-button'))).click()
        except:
            print("Botão 'Aceitar' não encontrado. Continuando.")
        time.sleep(0.5)

        if checar_parada(navegador):
            return False
            
        # Navegar para login
        navegador.switch_to.frame(navegador.find_elements(By.TAG_NAME, "iframe")[0])
        wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'acessoRapido'))).click()
        time.sleep(0.5)

        if checar_parada(navegador):
            return False
            
        wait.until(EC.element_to_be_clickable((By.XPATH, "//option[contains(@value,'contabilista')]"))).click()
        navegador.find_element(By.TAG_NAME, "body").click()
        time.sleep(0.5)

        if checar_parada(navegador):
            return False
            
        # Preencher credenciais
        navegador.switch_to.frame(wait.until(EC.presence_of_element_located(
            (By.XPATH, "//iframe[contains(@src, 'atoAcessoContribuinte.jsp')]")
        )))
        tabela_login = wait.until(EC.presence_of_element_located((By.CLASS_NAME, "tabelaVerde")))
        tabela_login.find_element(By.NAME, "UserName").send_keys(USUARIO_SEFAZ)
        tabela_login.find_element(By.NAME, "Password").send_keys(SENHA_SEFAZ)
        tabela_login.find_element(By.NAME, "submit").click()
        print("🎉 Login realizado com sucesso!")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro no login: {e}")
        return False


def navegar_para_downloads(navegador, wait) -> bool:
    """
    Navega até a área de downloads de XML
    
    Args:
        navegador: Instância do WebDriver
        wait: WebDriverWait configurado
        
    Returns:
        True se navegação bem-sucedida
    """
    try:
        if checar_parada(navegador):
            return False
        
        # Volta para o contexto principal (fora dos iframes)
        navegador.switch_to.default_content()
        time.sleep(2)
        
        # Aguarda a página carregar completamente após login
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        print("✅ Página principal carregada após login")
        
        if checar_parada(navegador):
            return False
        
        # Tenta encontrar o menu NFE diretamente (várias estratégias)
        menu_encontrado = False
        
        # Estratégia 1: Link direto NFE/DOCUMENTOS ELETRONICOS
        try:
            menu_nfe = wait.until(EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(text(), 'NFE/DOCUMENTOS ELETRONICOS')]")
            ))
            menu_nfe.click()
            menu_encontrado = True
            print("✅ Acessado menu NFE/DOCUMENTOS ELETRONICOS")
        except:
            pass
        
        # Estratégia 2: Procurar em iframes se não encontrou
        if not menu_encontrado:
            try:
                iframes = navegador.find_elements(By.TAG_NAME, "iframe")
                for idx, iframe in enumerate(iframes):
                    try:
                        navegador.switch_to.frame(iframe)
                        menu_nfe = navegador.find_element(
                            By.XPATH, "//a[contains(text(), 'NFE/DOCUMENTOS ELETRONICOS')]"
                        )
                        menu_nfe.click()
                        menu_encontrado = True
                        print(f"✅ Menu NFE encontrado no iframe {idx}")
                        break
                    except:
                        navegador.switch_to.default_content()
            except:
                pass
        
        # Estratégia 3: Navegar via URL direta
        if not menu_encontrado:
            print("⚠️ Tentando navegação via URL direta...")
            navegador.get("https://www.sefaz.se.gov.br/SitePages/arq_envio_home.aspx")
            time.sleep(2)
            menu_encontrado = True
        
        if not menu_encontrado:
            print("❌ Não foi possível acessar o menu NFE")
            return False
        
        time.sleep(1)
        
        if checar_parada(navegador):
            return False
        
        # Procurar link para Solicitar Arquivos XML
        try:
            navegador.switch_to.default_content()
            link_xml = wait.until(EC.element_to_be_clickable(
                (By.XPATH, "//a[contains(text(), 'Solicitar Arquivos XML')]")
            ))
            link_xml.click()
            print("✅ Acessado Solicitar Arquivos XML")
        except:
            # Tenta em iframes
            iframes = navegador.find_elements(By.TAG_NAME, "iframe")
            for iframe in iframes:
                try:
                    navegador.switch_to.frame(iframe)
                    link_xml = navegador.find_element(
                        By.XPATH, "//a[contains(text(), 'Solicitar Arquivos XML')]"
                    )
                    link_xml.click()
                    print("✅ Acessado Solicitar Arquivos XML (via iframe)")
                    break
                except:
                    navegador.switch_to.default_content()
        
        time.sleep(1)
        return True
        
    except Exception as e:
        print(f"❌ Erro ao navegar: {e}")
        import traceback
        traceback.print_exc()
        return False


def executar_login_completo(callback_download=None):
    """
    Executa o processo completo de login e navegação
    
    Args:
        callback_download: Função a ser chamada após login bem-sucedido
    """
    if not state.executando:
        print("🛑 Execução cancelada antes de iniciar.")
        return

    from src.core.config import PATHS

    navegador = configurar_driver(
        headless=state.usar_headless,
        download_dir=str(PATHS.downloads_dir)
    )
    wait = WebDriverWait(navegador, 10)
    navegador.get("https://www.sefaz.se.gov.br/SitePages/acesso_usuario.aspx")
    navegador.maximize_window()

    try:
        if not fazer_login(navegador, wait):
            return
            
        if not navegar_para_downloads(navegador, wait):
            return

        print("📥 Iniciando verificação de arquivos para download...")
        
        if callback_download:
            callback_download(navegador)
        
        print("✅ Concluído o processo de download e renomeação.")

    except Exception as e:
        print(f"❌ Erro durante o processo: {e}")
    finally:
        try:
            navegador.quit()
        except:
            pass


def iniciar_thread(callback_download=None):
    """Inicia o processo em uma thread separada"""
    state.executando = True
    thread = threading.Thread(target=executar_login_completo, args=(callback_download,))
    thread.start()
    return thread


def parar_automacao():
    """Para a automação em execução"""
    state.parar_execucao()
