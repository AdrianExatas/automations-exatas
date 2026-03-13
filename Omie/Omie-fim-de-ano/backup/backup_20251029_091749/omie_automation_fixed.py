import time
import pandas as pd
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk, StringVar
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime
import threading
import os
from dotenv import load_dotenv
import subprocess
import sys

# Carregar variáveis de ambiente
load_dotenv('config.env')

# Configurações
EMAIL = os.getenv('EMAIL')
SENHA = os.getenv('SENHA')
checkpoint_file = "omie_checkpoint.txt"
stop_requested = False
modo_simulacao = False

# ---- Funções auxiliares ----
def log_event(log_widget, msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    linha = f"[{timestamp}] {msg}"
    try:
        print(linha)
    except UnicodeEncodeError:
        # Fallback para Windows com problemas de codificação
        print(linha.encode('ascii', 'ignore').decode('ascii'))
    log_widget.insert(tk.END, linha + "\n")
    log_widget.see(tk.END)

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

def configurar_driver():
    """Configura o driver do Chrome com tratamento robusto de erros"""
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

def carregar_dados_macro(arquivo, log_widget):
    """Carrega os dados da planilha MACRO.xlsx"""
    try:
        df = pd.read_excel(arquivo)
        
        # Verificar se as colunas necessárias existem
        colunas_necessarias = ['CNPJ', 'VALOR UNITÁRIO DO ITEM', 'Vigencia inicial', 'Vigencia Final']
        colunas_faltando = [col for col in colunas_necessarias if col not in df.columns]
        
        if colunas_faltando:
            log_event(log_widget, f"[ERRO] Colunas não encontradas: {colunas_faltando}")
            log_event(log_widget, f"[NAVEGACAO] Colunas disponíveis: {list(df.columns)}")
            return pd.DataFrame()
        
        # Limpar dados
        df = df.dropna(subset=['CNPJ'])
        df['CNPJ'] = df['CNPJ'].astype(str).str.replace(r'[^\d]', '', regex=True)
        
        log_event(log_widget, f"[OK] Carregados {len(df)} registros da planilha")
        return df
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao ler a planilha: {e}")
        return pd.DataFrame()

def salvar_checkpoint(cnpj):
    """Salva o CNPJ atual como checkpoint"""
    with open(checkpoint_file, "w") as f:
        f.write(cnpj)

def ler_checkpoint():
    """Lê o último CNPJ processado"""
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, "r") as f:
            return f.read().strip()
    return None

def limpar_checkpoint():
    """Remove o arquivo de checkpoint"""
    if os.path.exists(checkpoint_file):
        os.remove(checkpoint_file)

def formatar_valor_monetario(valor):
    """Formata valor monetário para o formato brasileiro (com vírgula)"""
    try:
        # Converter para string se não for
        valor_str = str(valor)
        
        # Se contém ponto, substituir por vírgula (formato brasileiro)
        if '.' in valor_str:
            valor_str = valor_str.replace('.', ',')
        
        # Se não tem vírgula, adicionar ,00
        if ',' not in valor_str:
            valor_str = valor_str + ',00'
        
        return valor_str
    except:
        return str(valor)

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
            # Remove lockIndicator se existir
            lock_indicators = driver.find_elements(By.CSS_SELECTOR, ".lockIndicator")
            for lock in lock_indicators:
                if lock.is_displayed():
                    driver.execute_script("arguments[0].style.display = 'none';", lock)
                    log_event(log_widget, "[OK] Removido lockIndicator")
            
            # Remove overlays comuns
            overlays = driver.find_elements(By.CSS_SELECTOR, ".ui-overlay, .modal-backdrop, .loading-overlay")
            for overlay in overlays:
                if overlay.is_displayed():
                    driver.execute_script("arguments[0].style.display = 'none';", overlay)
                    log_event(log_widget, "[OK] Removido overlay")
            
            time.sleep(1)
            
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
            
            # Tenta clique via JavaScript
            try:
                driver.execute_script("arguments[0].click();", elemento_clicavel)
                log_event(log_widget, f"[OK] Clique via JavaScript realizado em {descricao}")
                return True
            except Exception as e2:
                log_event(log_widget, f"[AVISO] Clique via JavaScript falhou para {descricao}: {e2}")
                
                # Tenta ActionChains
                try:
                    ActionChains(driver).move_to_element(elemento_clicavel).click().perform()
                    log_event(log_widget, f"[OK] Clique via ActionChains realizado em {descricao}")
                    return True
                except Exception as e3:
                    log_event(log_widget, f"[ERRO] Todas as estratégias de clique falharam para {descricao}: {e3}")
                    return False
                    
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao clicar em {descricao}: {e}")
        return False

def fazer_login(driver, wait, log_widget):
    """Realiza o login no Omie"""
    try:
        log_event(log_widget, "[LOGIN] Iniciando processo de login...")
        
        # Acessar página de login
        driver.get("https://app.omie.com.br/login/")
        time.sleep(0.5)
        
        # Preencher e-mail
        campo_email = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="email"]')))
        campo_email.clear()
        campo_email.send_keys(EMAIL)
        log_event(log_widget, "[OK] E-mail preenchido")
        
        # Clicar em continuar
        botao_continuar = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="btn-continue"]')))
        botao_continuar.click()
        time.sleep(0.3)
        
        # Preencher senha
        campo_senha = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="current-password"]')))
        campo_senha.clear()
        campo_senha.send_keys(SENHA)
        log_event(log_widget, "[OK] Senha preenchida")
        
        # Clicar em entrar
        botao_entrar = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="btn-login"]')))
        botao_entrar.click()
        time.sleep(0.5)
        
        log_event(log_widget, "[OK] Login realizado com sucesso")
        return True
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro no login: {e}")
        return False

def acessar_aplicativo_exatas(driver, wait, log_widget):
    """Acessa o aplicativo da Exatas Contabilidade"""
    try:
        log_event(log_widget, "[EMPRESA] Acessando aplicativo da Exatas Contabilidade...")
        
        # Clicar no aplicativo da Exatas Contabilidade
        app_exatas = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="root"]/main/div/div[1]/div[2]/div/div[1]/div/div[2]/div[2]/div/div/button')))
        app_exatas.click()
        time.sleep(0.3)
        
        # Aguardar nova aba ser aberta e alternar para ela
        if not aguardar_e_alternar_para_nova_aba(driver, wait, log_widget):
            log_event(log_widget, "[AVISO] Nova aba não detectada, continuando na aba atual")
        
        log_event(log_widget, "[OK] Aplicativo acessado")
        return True
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao acessar aplicativo: {e}")
        return False

def navegar_para_contratos_servicos(driver, wait, log_widget):
    """Navega até a seção de contratos de serviços"""
    try:
        log_event(log_widget, "[NAVEGACAO] Navegando para Serviços e NFS-e...")
        
        # Aguardar a página carregar completamente
        time.sleep(5)
        
        # Verificar se estamos na aba correta
        log_event(log_widget, f"[INFO] Aba atual: {driver.current_window_handle}")
        log_event(log_widget, f"[INFO] URL atual: {driver.current_url}")
        
        # Tentar encontrar o elemento com diferentes estratégias
        servicos_nfse = None
        xpaths_tentativas = [
            '//*[@id="tiles-redesign"]/li[3]/a',
            '//a[contains(text(), "Serviços e NFS-e")]',
            '//a[contains(@href, "servicos")]',
            '//li[3]/a[contains(@class, "tile")]',
            '//*[@id="tiles-redesign"]//li[3]//a'
        ]
        
        for i, xpath in enumerate(xpaths_tentativas):
            try:
                log_event(log_widget, f"[TENTATIVA] Tentando XPath {i+1}: {xpath}")
                servicos_nfse = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                log_event(log_widget, f"[OK] Elemento encontrado com XPath {i+1}")
                break
            except TimeoutException:
                log_event(log_widget, f"[FALHA] XPath {i+1} não funcionou")
                continue
        
        if not servicos_nfse:
            log_event(log_widget, "[ERRO] Não foi possível encontrar o elemento 'Serviços e NFS-e'")
            return False
        
        # Clicar no elemento encontrado
        servicos_nfse.click()
        time.sleep(0.5)
        
        # Posicionar mouse no menu suspenso
        log_event(log_widget, "[MOUSE] Posicionando mouse no menu suspenso...")
        menu_suspenso = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="app"]/nav/ul/li[3]/a/span')))
        ActionChains(driver).move_to_element(menu_suspenso).perform()
        time.sleep(1)  # Aumentado para 1 segundo
        
        # Aguardar um pouco mais para o menu suspenso aparecer
        log_event(log_widget, "[AGUARDANDO] Aguardando menu suspenso aparecer...")
        time.sleep(2)
        
        # Buscar diretamente o elemento "Exibir todos"
        log_event(log_widget, "[BUSCA] Buscando elemento 'Exibir todos'...")
        contratos_servicos = None
        xpaths_contratos = [
            '//li[@data-slug="listar-todas-contratos-servico"]',  # Mais específico primeiro
            '//li[contains(@class, "ui-floating-section-list-item") and contains(text(), "Exibir todos")]',
            '//li[contains(@title, "Exibe a lista com todos os contratos de serviço")]',
            '//li[contains(@data-slug, "contratos-servico")]',
            '//*[@id="d0cundefined"]//li[contains(text(), "Exibir todos")]',
            '//*[@id="d0cundefined"]//li[contains(@class, "ui-floating-section-list-item")]'
        ]
        
        # Usar timeout menor para cada tentativa
        for i, xpath in enumerate(xpaths_contratos):
            try:
                log_event(log_widget, f"[TENTATIVA] Tentando XPath {i+1}: {xpath}")
                # Timeout de 3 segundos por tentativa
                contratos_servicos = WebDriverWait(driver, 3).until(EC.element_to_be_clickable((By.XPATH, xpath)))
                log_event(log_widget, f"[OK] Elemento 'Exibir todos' encontrado com XPath {i+1}")
                break
            except TimeoutException:
                log_event(log_widget, f"[FALHA] XPath {i+1} não funcionou")
                continue
        
        # Estratégia alternativa: tentar clicar diretamente no link
        if not contratos_servicos:
            log_event(log_widget, "[ALTERNATIVA] Tentando estratégia alternativa - clicando diretamente no link...")
            try:
                # Tentar navegar diretamente para a URL de contratos de serviços
                url_contratos = "https://app.omie.com.br/gestao/exatas-02sne7ka/contratos-servico/listar-todas-contratos-servico"
                log_event(log_widget, f"[NAVEGACAO] Navegando diretamente para: {url_contratos}")
                driver.get(url_contratos)
                time.sleep(5)
                log_event(log_widget, "[OK] Navegação direta realizada com sucesso")
                return True
            except Exception as e:
                log_event(log_widget, f"[ERRO] Falha na navegação direta: {e}")
                return False
        
        # Clicar no elemento encontrado
        log_event(log_widget, "[CLIQUE] Clicando em 'Exibir todos'...")
        try:
            contratos_servicos.click()
            log_event(log_widget, "[OK] Clique normal realizado com sucesso")
        except Exception as e:
            log_event(log_widget, f"[AVISO] Clique normal falhou: {e}")
            log_event(log_widget, "[TENTATIVA] Tentando clique via JavaScript...")
            try:
                driver.execute_script("arguments[0].click();", contratos_servicos)
                log_event(log_widget, "[OK] Clique via JavaScript realizado com sucesso")
            except Exception as e2:
                log_event(log_widget, f"[ERRO] Clique via JavaScript também falhou: {e2}")
                return False
        
        time.sleep(3)
        
        log_event(log_widget, "[OK] Navegação para contratos de serviços concluída")
        return True
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro na navegação: {e}")
        # Tentar obter mais informações sobre o erro
        try:
            log_event(log_widget, f"[DEBUG] URL atual: {driver.current_url}")
            log_event(log_widget, f"[DEBUG] Título da página: {driver.title}")
        except:
            pass
        return False

def processar_cnpj(driver, wait, log_widget, cnpj, valor_unitario):
    """Processa um CNPJ específico"""
    try:
        log_event(log_widget, f"[EMPRESA] Processando CNPJ: {cnpj}")
        
        # Preencher campo Cliente (CPF/CNPJ)
        campo_cliente = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d51612c10000g_headers"]/thead/tr[2]/td[4]/span/input')))
        campo_cliente.clear()
        campo_cliente.send_keys(cnpj)
        log_event(log_widget, f"[OK] CNPJ preenchido: {cnpj}")
        
        # Pressionar Enter para filtrar
        log_event(log_widget, "[FILTRO] Pressionando Enter para filtrar...")
        campo_cliente.send_keys(Keys.RETURN)
        time.sleep(3)
        
        # Aguardar os resultados do filtro aparecerem
        log_event(log_widget, "[AGUARDANDO] Aguardando resultados do filtro...")
        try:
            # Aguardar a tabela de resultados aparecer
            wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="d51612c10000g"]/tbody/tr')))
            log_event(log_widget, "[OK] Resultados do filtro carregados")
        except TimeoutException:
            log_event(log_widget, "[AVISO] Timeout aguardando resultados do filtro, tentando continuar...")
        
        # Clicar duas vezes na empresa
        log_event(log_widget, "[CLIQUE] Clicando duas vezes na empresa...")
        empresa = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d51612c10000g"]/tbody/tr/td[4]')))
        ActionChains(driver).double_click(empresa).perform()
        time.sleep(5)
        
        # Clicar em "Selecionar serviços já cadastrados"
        try:
            elemento_selecionar = (By.XPATH, '//*[@id="d51612c46"]/a[2]/span[2]/div')
            if clicar_elemento_seguro(driver, wait, log_widget, elemento_selecionar, "'Selecionar serviços já cadastrados'"):
                log_event(log_widget, "[OK] Clicou em 'Selecionar serviços já cadastrados'")
            else:
                log_event(log_widget, "[AVISO] XPath por texto falhou, tentando CSS selector...")
                elemento_css = (By.CSS_SELECTOR, '#d51612c46 > a:nth-child(3) > span:nth-child(2) > div')
                if not clicar_elemento_seguro(driver, wait, log_widget, elemento_css, "'Selecionar serviços já cadastrados' via CSS"):
                    log_event(log_widget, "[ERRO] Não foi possível encontrar 'Selecionar serviços já cadastrados'")
                    return False
        except Exception as e:
            log_event(log_widget, f"[ERRO] Erro ao clicar em 'Selecionar serviços já cadastrados': {e}")
            return False
        
        time.sleep(5)
        
        # Selecionar "ADICIONAL DE FINAL DE ANO"
        elemento_adicional = (By.XPATH, '//*[@id="d50527c3g"]/tbody/tr[4]/td[1]')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_adicional, "'ADICIONAL DE FINAL DE ANO'"):
            return False
        time.sleep(2)
        
        # Clicar em "Incluir os serviços selecionados"
        elemento_incluir = (By.XPATH, '//*[@id="dialogContent-50527"]/div/button/span[2]')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_incluir, "'Incluir os serviços selecionados'"):
            return False
        time.sleep(5)
        
        # Selecionar o ADICIONAL DE FINAL DE ANO na lista
        elemento_adicional_lista = (By.XPATH, '//*[@id="d51612c86g"]/tbody/tr[2]/td[3]')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_adicional_lista, "'ADICIONAL DE FINAL DE ANO na lista'"):
            return False
        time.sleep(2)
        
        # Clicar em "Editar o item"
        elemento_editar = (By.XPATH, '//*[@id="d51612c58"]/a[2]/span[2]/div')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_editar, "'Editar o item'"):
            return False
        time.sleep(5)
        
        # Preencher valor unitário
        campo_valor = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d50670c30"]')))
        campo_valor.clear()
        
        # Converter valor para formato correto
        valor_formatado = formatar_valor_monetario(valor_unitario)
        log_event(log_widget, f"[FORMATO] Valor original: {valor_unitario}, Formatado: {valor_formatado}")
        
        # Preencher campo de valor com diferentes estratégias
        log_event(log_widget, f"[TENTATIVA] Tentando preencher valor: {valor_formatado}")
        
        try:
            # Estratégia 1: Clicar, limpar e preencher
            campo_valor.click()
            time.sleep(0.5)
            campo_valor.clear()
            time.sleep(0.5)
            campo_valor.send_keys(valor_formatado)
            log_event(log_widget, f"[OK] Valor unitário preenchido (método 1): {valor_formatado}")
        except Exception as e:
            log_event(log_widget, f"[AVISO] Método 1 falhou: {e}")
            
            # Estratégia 2: JavaScript
            try:
                driver.execute_script(f"arguments[0].value = '{valor_formatado}';", campo_valor)
                driver.execute_script("arguments[0].dispatchEvent(new Event('change'));", campo_valor)
                log_event(log_widget, f"[OK] Valor unitário preenchido via JavaScript: {valor_formatado}")
            except Exception as e2:
                log_event(log_widget, f"[AVISO] JavaScript falhou: {e2}")
                
                # Estratégia 3: Digitação lenta
                try:
                    campo_valor.click()
                    campo_valor.clear()
                    for char in valor_formatado:
                        campo_valor.send_keys(char)
                        time.sleep(0.1)
                    log_event(log_widget, f"[OK] Valor unitário preenchido com digitação lenta: {valor_formatado}")
                except Exception as e3:
                    log_event(log_widget, f"[ERRO] Todas as estratégias falharam para valor: {e3}")
        
        # Ir para "Outras informações"
        elemento_outras_info = (By.XPATH, '//*[@id="navbar-collapse-50670"]/ul/li[4]/a')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_outras_info, "'Outras informações'"):
            return False
        time.sleep(3)
        
        # Clicar em "Preencher uma data específica"
        elemento_data_especifica = (By.XPATH, '//*[@id="d50670c148"]/a[2]/span[2]/div')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_data_especifica, "'Preencher uma data específica'"):
            return False
        time.sleep(3)
        
        # Preencher vigência inicial (data fixa)
        data_inicial = "25/10/2025"
        vigencia_inicial_campo = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d50670c162"]')))
        vigencia_inicial_campo.send_keys(Keys.HOME)
        vigencia_inicial_campo.send_keys(data_inicial)
        time.sleep(2)
        log_event(log_widget, f"[OK] Vigência inicial preenchida: {data_inicial}")
        
        # Preencher vigência final (data fixa)
        data_final = "30/11/2025"
        vigencia_final_campo = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d50670c163"]')))
        time.sleep(2)
        vigencia_final_campo.send_keys(Keys.HOME)
        time.sleep(2)
        vigencia_final_campo.send_keys(Keys.HOME)
        vigencia_final_campo.send_keys(data_final)
        time.sleep(2)
        log_event(log_widget, f"[OK] Vigência final preenchida: {data_final}")
        
        # Salvar
        elemento_salvar = (By.XPATH, '//*[@id="dialogToolbar-50670"]/li[1]/a/div/div/div[1]')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_salvar, "'Salvar'"):
            return False
        time.sleep(5)
        
        # Fechar primeiro diálogo
        elemento_fechar1 = (By.XPATH, '//*[@id="dialog-50670"]/div[1]/button')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_fechar1, "'Fechar primeiro diálogo'"):
            log_event(log_widget, "[AVISO] Não foi possível fechar primeiro diálogo, mas continuando...")
        time.sleep(3)
        
        # Fechar segundo diálogo
        elemento_fechar2 = (By.XPATH, '//*[@id="dialog-51612"]/div[1]/button')
        if not clicar_elemento_seguro(driver, wait, log_widget, elemento_fechar2, "'Fechar segundo diálogo'"):
            log_event(log_widget, "[AVISO] Não foi possível fechar segundo diálogo, mas continuando...")
        time.sleep(5)
        
        log_event(log_widget, f"[OK] CNPJ {cnpj} processado com sucesso")
        return True
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao processar CNPJ {cnpj}: {e}")
        return False

def processar_dados_macro(dados, log_widget, progress_bar):
    """Processa todos os dados da planilha MACRO.xlsx"""
    global stop_requested, modo_simulacao
    
    if dados.empty:
        log_event(log_widget, "[ERRO] Nenhum dado para processar")
        return
    
    agora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_txt = open(f"log_omie_{agora}.txt", "w", encoding="utf-8")
    resultados = []
    
    def registrar(msg):
        log_event(log_widget, msg)
        log_txt.write(msg + "\n")
    
    checkpoint = ler_checkpoint()
    if checkpoint and checkpoint in dados['CNPJ'].values:
        # Encontrar a posição do checkpoint
        checkpoint_index = dados[dados['CNPJ'] == checkpoint].index[0]
        # Continuar a partir do próximo CNPJ após o checkpoint
        dados = dados.iloc[checkpoint_index + 1:]
        registrar(f"[RETOMANDO] Retomando a partir do CNPJ: {checkpoint}")
    
    total = len(dados)
    registrar(f"[DADOS] Total de CNPJs para processar: {total}")
    
    if modo_simulacao:
        for i, (_, row) in enumerate(dados.iterrows(), start=1):
            if stop_requested:
                registrar("[PARADO] Execução interrompida pelo usuário.")
                break
            registrar(f"[SIMULAÇÃO] ({i}/{total}) Processando CNPJ: {row['CNPJ']}")
            progress_bar["value"] = (i / total) * 100
            root.update_idletasks()
            time.sleep(0.5)
        return
    
    # Configurar driver e fazer login
    driver, wait = configurar_driver()
    
    if not driver or not wait:
        log_event(log_widget, "[ERRO] Falha ao configurar driver. Encerrando execução.")
        return
    
    if not fazer_login(driver, wait, log_widget):
        log_event(log_widget, "[ERRO] Falha no login. Encerrando execução.")
        driver.quit()
        return
    
    if not acessar_aplicativo_exatas(driver, wait, log_widget):
        log_event(log_widget, "[ERRO] Falha ao acessar aplicativo. Encerrando execução.")
        driver.quit()
        return
    
    if not navegar_para_contratos_servicos(driver, wait, log_widget):
        log_event(log_widget, "[ERRO] Falha na navegação. Encerrando execução.")
        driver.quit()
        return
    
    log_event(log_widget, "[INICIANDO] Iniciando processamento dos CNPJs...")
    
    # Processar cada CNPJ
    log_event(log_widget, f"[INFO] Iniciando loop de processamento para {total} CNPJs...")
    
    for i, (_, row) in enumerate(dados.iterrows(), start=1):
        if stop_requested:
            registrar("[PARADO] Execução interrompida pelo usuário.")
            break
        
        log_event(log_widget, f"[LOOP] Iniciando iteração {i} de {total}")
        
        cnpj = row['CNPJ']
        valor_unitario = row['VALOR UNITÁRIO DO ITEM']
        
        log_event(log_widget, f"[DADOS] CNPJ: {cnpj}, Valor: {valor_unitario}")
        
        inicio = time.time()
        registrar(f"[PROCESSANDO] ({i}/{total}) Processando CNPJ: {cnpj}")
        
        log_event(log_widget, f"[CHAMADA] Chamando processar_cnpj para CNPJ: {cnpj}")
        try:
            sucesso = processar_cnpj(driver, wait, log_widget, cnpj, valor_unitario)
            log_event(log_widget, f"[RETORNO] processar_cnpj retornou: {sucesso}")
        except Exception as e:
            log_event(log_widget, f"[ERRO] Exceção em processar_cnpj: {e}")
            sucesso = False
        
        tempo = round(time.time() - inicio, 2)
        status = "Sucesso" if sucesso else "Erro"
        registrar(f"[OK] Processamento do CNPJ {cnpj} concluído em {tempo} segundos - Status: {status}")
        
        # Salvar checkpoint apenas se o processamento foi bem-sucedido
        if sucesso:
            salvar_checkpoint(cnpj)
            registrar(f"[CHECKPOINT] CNPJ {cnpj} salvo como checkpoint")
        
        resultados.append({
            "CNPJ": cnpj,
            "Valor Unitário": valor_unitario,
            "Vigência Inicial": "25/10/2025",
            "Vigência Final": "30/11/2025",
            "Status": status,
            "Tempo": tempo
        })
        
        progress_bar["value"] = (i / total) * 100
        root.update_idletasks()
        
        # Pausa entre processamentos
        time.sleep(3)
    
    registrar("[OK] Execução finalizada.")
    pd.DataFrame(resultados).to_excel(f"resultado_omie_{agora}.xlsx", index=False)
    log_txt.close()
    driver.quit()

def iniciar_processo():
    """Inicia o processo de automação"""
    global stop_requested, modo_simulacao
    stop_requested = False
    modo_simulacao = var_simulacao.get() == "1"
    
    arquivo = filedialog.askopenfilename(
        title="Selecione a planilha MACRO.xlsx", 
        filetypes=[("Planilhas Excel", "*.xlsx")]
    )
    
    if not arquivo:
        messagebox.showwarning("Aviso", "Nenhum arquivo selecionado.")
        return
    
    log_widget.delete(1.0, tk.END)
    dados = carregar_dados_macro(arquivo, log_widget)
    
    if not dados.empty:
        threading.Thread(target=processar_dados_macro, args=(dados, log_widget, progress)).start()

def parar_processo():
    """Para o processo de automação"""
    global stop_requested
    stop_requested = True

def testar_chromedriver():
    """Testa se o ChromeDriver está funcionando"""
    log_widget.delete(1.0, tk.END)
    log_event(log_widget, "[TESTE] Testando ChromeDriver...")
    
    driver, wait = configurar_driver()
    if driver and wait:
        try:
            driver.get("https://www.google.com")
            time.sleep(3)
            log_event(log_widget, f"[OK] ChromeDriver funcionando! Título: {driver.title}")
            driver.quit()
        except Exception as e:
            log_event(log_widget, f"[ERRO] Erro no teste: {e}")
    else:
        log_event(log_widget, "[ERRO] Falha ao configurar ChromeDriver")

def limpar_checkpoint_interface():
    """Limpa o checkpoint via interface"""
    limpar_checkpoint()
    log_event(log_widget, "[CHECKPOINT] Checkpoint limpo com sucesso")

# Interface gráfica
root = tk.Tk()
root.title("Automação Omie - Contratos de Serviços (Versão Corrigida)")
root.geometry("1000x750")

notebook = ttk.Notebook(root)
notebook.pack(fill='both', expand=True)

frame_execucao = tk.Frame(notebook)
frame_config = tk.Frame(notebook)
notebook.add(frame_execucao, text="Execução")
notebook.add(frame_config, text="Configurações")

# Frame de botões
frame_btns = tk.Frame(frame_execucao)
frame_btns.pack(pady=5)

btn_iniciar = tk.Button(frame_btns, text="[INICIAR] Iniciar Automação", font=("Arial", 12), command=iniciar_processo)
btn_iniciar.pack(side=tk.LEFT, padx=10)

btn_parar = tk.Button(frame_btns, text="[PARADO] Parar", font=("Arial", 12), command=parar_processo)
btn_parar.pack(side=tk.LEFT, padx=10)

btn_teste = tk.Button(frame_btns, text="[TESTE] Testar ChromeDriver", font=("Arial", 12), command=testar_chromedriver)
btn_teste.pack(side=tk.LEFT, padx=10)

btn_limpar_checkpoint = tk.Button(frame_btns, text="[CHECKPOINT] Limpar", font=("Arial", 12), command=limpar_checkpoint_interface)
btn_limpar_checkpoint.pack(side=tk.LEFT, padx=10)

# Barra de progresso
progress = ttk.Progressbar(frame_execucao, length=900)
progress.pack(pady=5)

# Widget de log
log_widget = scrolledtext.ScrolledText(frame_execucao, width=120, height=35, font=("Courier", 9))
log_widget.pack(padx=10, pady=10)

# Aba de Configurações
var_simulacao = StringVar(value="0")
chk_simulacao = tk.Checkbutton(
    frame_config, 
    text="Modo Simulação (sem abrir navegador)", 
    variable=var_simulacao, 
    onvalue="1", 
    offvalue="0", 
    font=("Arial", 11)
)
chk_simulacao.pack(pady=20, anchor="w", padx=20)

# Instruções
instrucoes = tk.Label(
    frame_config, 
    text="""Instruções:

1. Certifique-se de que o arquivo config.env está configurado com suas credenciais
2. Selecione a planilha MACRO.xlsx com os dados dos CNPJs
3. Use o botão "[TESTE] Testar ChromeDriver" para verificar se está funcionando
4. O script processará cada CNPJ automaticamente

Solução de Problemas:
- Se houver erro no ChromeDriver, reinstale o Google Chrome
- Verifique se o arquivo config.env tem as credenciais corretas
- Certifique-se de que a planilha tem as colunas necessárias""",
    font=("Arial", 10),
    justify="left"
)
instrucoes.pack(pady=20, padx=20)

root.mainloop()
