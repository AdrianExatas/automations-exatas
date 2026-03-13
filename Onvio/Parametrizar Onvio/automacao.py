"""
Automacao Completa - Onvio
Login + Navegacao + Preenchimento de Departamentos e Usuarios
Usando Selenium
"""

import json
import time
import sys
import io
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

# Configurar encoding do console para UTF-8 (Windows)
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configuracoes
DADOS_JSON = "dados.json"
TEMPO_ESPERA = 0.5  # segundos entre acoes (super otimizado)

# Credenciais de Login
EMAIL_LOGIN = 'adrian@exatascontabilidade.com.br'
SENHA_LOGIN = 'Exatas1010+'

# URLs
URL_LOGIN = "https://onvio.com.br/login/#/"
URL_DASHBOARD = "https://onvio.com.br/staff/#/dashboard-core-center"
URL_LISTA_CLIENTES = "https://app.gestta.com.br/admin/#/sidebar/customer/list?active=true"

# Seletores
SELETOR_CAMPO_PESQUISA = 'input[ng-model="listCtrl.model.search"][placeholder="Pesquisar por nome"]'
SELETOR_BOTAO_ABA = '//*[@id="page-wrapper"]/div[2]/div/div[2]/div/div/div/div/div/a[2]/span'
SELETOR_DEPARTAMENTO = '//*[@id="page-wrapper"]/div[2]/div/div[3]/div/div[2]/div/div[1]/form/fieldset[1]/div/div/div/div[1]/span'
SELETOR_USUARIO = '//*[@id="page-wrapper"]/div[2]/div/div[3]/div/div[2]/div/div[1]/form/fieldset[2]/div/div/div/div[1]/span'
SELETOR_BOTAO_ADICIONAR = '//span[@class="ladda-label" and text()="Adicionar"]'


def configurar_driver():
    """Configura o Chrome Driver"""
    chrome_options = Options()
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    
    try:
        # Tentar usar webdriver-manager primeiro
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        print("[INIT] ChromeDriver configurado via webdriver-manager")
    except Exception as e:
        print(f"[WARN] Erro com webdriver-manager: {e}")
        print("[INIT] Tentando usar ChromeDriver do sistema...")
        try:
            # Tentar usar ChromeDriver do PATH do sistema
            driver = webdriver.Chrome(options=chrome_options)
            print("[INIT] ChromeDriver configurado via PATH do sistema")
        except Exception as e2:
            print(f"[ERRO] Falha ao configurar ChromeDriver: {e2}")
            print("[INFO] Verifique se o Chrome está instalado e atualizado")
            raise e2
    
    wait = WebDriverWait(driver, 60)
    return driver, wait


def limpar_cnpj(cnpj):
    """Remove pontos, barras e traços do CNPJ"""
    if not cnpj:
        return ""
    return cnpj.replace(".", "").replace("/", "").replace("-", "").strip()


def carregar_dados():
    """Carrega os dados do arquivo JSON"""
    with open(DADOS_JSON, 'r', encoding='utf-8') as f:
        dados = json.load(f)
        # Garantir que o CNPJ está limpo
        if 'cnpj' in dados:
            dados['cnpj'] = limpar_cnpj(dados['cnpj'])
        return dados


def login_onvio(driver, wait):
    """Faz login no Onvio"""
    print("[LOGIN] Acessando pagina de login...")
    driver.get(URL_LOGIN)
    
    print("[LOGIN] Clicando em 'Continuar para login'...")
    wait.until(EC.element_to_be_clickable((By.ID, 'trauth-continue-signin-btn'))).click()
    
    print(f"[LOGIN] Inserindo email: {EMAIL_LOGIN}")
    inserir_email = wait.until(EC.element_to_be_clickable((By.ID, 'username')))
    inserir_email.send_keys(EMAIL_LOGIN)
    inserir_email.submit()
    
    print("[LOGIN] Inserindo senha...")
    inserir_senha = wait.until(EC.element_to_be_clickable((By.ID, 'password')))
    inserir_senha.send_keys(SENHA_LOGIN)
    inserir_senha.submit()
    
    print("[LOGIN] Aguardando login completar...")
    wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'content-action__item')))
    
    print("[LOGIN] Login realizado com sucesso!\n")
    time.sleep(0.5)


def navegar_ate_empresa(driver, wait, cnpj):
    """Navega ate a pagina de edicao da empresa pelo CNPJ"""
    
    print("\n[1/8] Navegando para o dashboard...")
    driver.get(URL_DASHBOARD)
    time.sleep(TEMPO_ESPERA)
    
    print("[2/8] Abrindo menu de aplicativos...")
    menu_toggle = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="bm-header-app-menu-toggle"]')))
    menu_toggle.click()
    time.sleep(0.5)
    
    print("[3/8] Clicando em 'Processos' (abre nova guia)...")
    menu_item = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="bm-header-app-menu"]/ul/li[1]/a/span')))
    
    # Guardar a janela atual
    janela_original = driver.current_window_handle
    
    # Clicar e aguardar nova janela
    menu_item.click()
    time.sleep(0.5)
    
    # Esperar ate que haja mais de uma janela
    wait.until(lambda d: len(d.window_handles) > 1)
    
    # Mudar para a nova janela
    for janela in driver.window_handles:
        if janela != janela_original:
            driver.switch_to.window(janela)
            break
    
    print("[4/8] Mudou para nova guia!")
    time.sleep(TEMPO_ESPERA)
    
    print("[5/8] Navegando para lista de clientes...")
    driver.get(URL_LISTA_CLIENTES)
    time.sleep(TEMPO_ESPERA)
    
    print(f"[6/8] Pesquisando pelo CNPJ: {cnpj}...")
    campo_pesquisa = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, SELETOR_CAMPO_PESQUISA)))
    campo_pesquisa.click()
    campo_pesquisa.clear()
    campo_pesquisa.send_keys(cnpj)
    time.sleep(0.5)  # Aguarda o debounce de 1000ms
    
    print("[7/8] Clicando no link do CNPJ...")
    link_cnpj = wait.until(EC.element_to_be_clickable((By.XPATH, f'//a[@class="link-to-edit ng-binding" and text()="{cnpj}"]')))
    link_cnpj.click()
    time.sleep(TEMPO_ESPERA)
    
    print("[8/8] Clicando na aba de departamentos...")
    botao_aba = wait.until(EC.element_to_be_clickable((By.XPATH, SELETOR_BOTAO_ABA)))
    botao_aba.click()
    time.sleep(TEMPO_ESPERA)
    
    print("Pronto! Pagina de preenchimento carregada.\n")


def verificar_registro_na_tabela(driver, wait, departamento, usuario, timeout=10):
    """Verifica se o registro foi adicionado na tabela, aguardando até aparecer"""
    try:
        # XPath para procurar o departamento e usuário na tabela
        xpath_departamento = f'//div[@col-id="company_department.name" and text()="{departamento}"]'
        xpath_usuario = f'//div[@col-id="company_user.name" and text()="{usuario}"]'
        
        # Aguarda até que AMBOS os elementos apareçam na tabela
        # Primeiro aguarda o departamento
        elem_dept = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, xpath_departamento))
        )
        
        # Depois aguarda o usuário
        elem_user = WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located((By.XPATH, xpath_usuario))
        )
        
        # Se chegou até aqui, ambos foram encontrados
        return True
        
    except Exception as e:
        print(f"        [DEBUG] Erro ao verificar tabela: {str(e)}")
        return False


def preencher_departamento_usuario(driver, wait, departamento, usuario):
    """Preenche um departamento e usuario com validacao na tabela"""
    
    print(f"    [>] Preenchendo: {departamento} -> {usuario}")
    
    try:
        # 1. Clicar no campo de departamento para abrir dropdown
        elem_dept = wait.until(EC.element_to_be_clickable((By.XPATH, SELETOR_DEPARTAMENTO)))
        elem_dept.click()
        time.sleep(0.1)
        
        # 2. Aguardar dropdown aparecer e clicar no item com o texto exato
        dropdown_dept = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'ul.ui-select-choices')))
        item_dept = wait.until(EC.element_to_be_clickable((By.XPATH, f'//div[@ng-bind="item.name" and text()="{departamento}"]')))
        item_dept.click()
        time.sleep(0.1)
        
        # 3. Clicar no campo de usuario para abrir dropdown
        elem_usuario = wait.until(EC.element_to_be_clickable((By.XPATH, SELETOR_USUARIO)))
        elem_usuario.click()
        time.sleep(0.1)
        
        # 4. Aguardar dropdown aparecer e clicar no item com o texto exato
        dropdown_user = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'ul.ui-select-choices')))
        item_user = wait.until(EC.element_to_be_clickable((By.XPATH, f'//div[@ng-bind="item.name" and text()="{usuario}"]')))
        item_user.click()
        time.sleep(0.1)
        
        # 5. Clicar em Adicionar
        botao_adicionar = wait.until(EC.element_to_be_clickable((By.XPATH, SELETOR_BOTAO_ADICIONAR)))
        botao_adicionar.click()
        
        # 6. VALIDACAO: Verificar se o registro apareceu na tabela
        print(f"        [6] Verificando se foi adicionado na tabela...")
        if verificar_registro_na_tabela(driver, wait, departamento, usuario):
            print(f"    [OK] Registro confirmado na tabela! {departamento} -> {usuario}")
            return True
        else:
            print(f"    [ERRO] Registro nao encontrado na tabela para {departamento} -> {usuario}")
            return False
        
    except Exception as e:
        print(f"    [ERRO] Falha: {str(e)}")
        return False


def main():
    """Funcao principal"""
    
    print("=" * 70)
    print("  AUTOMACAO ONVIO - PREENCHIMENTO DE DEPARTAMENTOS E USUARIOS")
    print("=" * 70)
    
    # Carregar dados
    dados = carregar_dados()
    cnpj = dados['cnpj']
    departamentos = dados['departamentos']
    
    # Garantir que o CNPJ está limpo antes de usar
    cnpj = limpar_cnpj(cnpj)
    
    if not cnpj:
        print("[ERRO] CNPJ não encontrado ou inválido!")
        return
    
    print(f"\n[INFO] CNPJ: {cnpj}")
    print(f"[INFO] Total de departamentos: {len(departamentos)}\n")
    
    driver = None
    
    try:
        # Configurar driver
        print("[INIT] Configurando navegador Chrome...")
        driver, wait = configurar_driver()
        print("[INIT] Navegador configurado!\n")
        
        # Login
        print("=" * 70)
        print("  ETAPA 1: LOGIN NO ONVIO")
        print("=" * 70)
        login_onvio(driver, wait)
        
        # Navegar ate a empresa
        print("=" * 70)
        print("  ETAPA 2: NAVEGACAO ATE A EMPRESA")
        print("=" * 70)
        navegar_ate_empresa(driver, wait, cnpj)
        
        # Aguardar um pouco para garantir que a pagina carregou
        time.sleep(0.5)
        
        # Preencher departamentos e usuarios
        print("=" * 70)
        print("  ETAPA 3: PREENCHIMENTO DOS DEPARTAMENTOS")
        print("=" * 70)
        
        sucessos = 0
        falhas = 0
        
        for i, item in enumerate(departamentos, 1):
            print(f"\n[{i}/{len(departamentos)}]")
            
            if preencher_departamento_usuario(driver, wait, item['departamento'], item['usuario']):
                sucessos += 1
            else:
                falhas += 1
                
                # Perguntar se quer continuar apos falha
                print("\n    [?] Houve uma falha. Deseja continuar? (Enter = Sim, Ctrl+C = Nao)")
                try:
                    input()
                except KeyboardInterrupt:
                    print("\n\n[INFO] Automacao interrompida pelo usuario.")
                    break
        
        # Relatorio final
        print("\n" + "=" * 70)
        print("  RELATORIO FINAL")
        print("=" * 70)
        print(f"[OK] Sucessos: {sucessos}")
        print(f"[ERRO] Falhas: {falhas}")
        print(f"[INFO] Total: {len(departamentos)}")
        print("=" * 70)
        
        print("\n[INFO] Automacao concluida!")
        print("[INFO] O navegador permanecera aberto para voce verificar.")
        print("[INFO] Pressione Enter para fechar...")
        try:
            input()
        except EOFError:
            # Quando executado via interface, não há input disponível
            pass
        
    except KeyboardInterrupt:
        print("\n\n[INFO] Automacao interrompida pelo usuario.")
        
    except Exception as e:
        print(f"\n[ERRO] Erro critico: {str(e)}")
        import traceback
        traceback.print_exc()
        print("\n[INFO] Pressione Enter para fechar...")
        try:
            input()
        except EOFError:
            # Quando executado via interface, não há input disponível
            pass
    
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


if __name__ == "__main__":
    main()
