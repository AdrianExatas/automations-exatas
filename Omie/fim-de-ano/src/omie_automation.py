"""
Módulo de automação para o Omie
"""
import time
import os
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException

from utils.selenium_utils import (
    configurar_driver_omie, 
    aguardar_e_alternar_para_nova_aba, 
    clicar_elemento_seguro,
    fechar_dialogo_seguro
)
from utils.data_utils import carregar_dados_macro, formatar_valor_monetario
from utils.checkpoint import salvar_checkpoint, ler_checkpoint
from utils.logger import log_event


class OmieAutomation:
    """Classe para automação do Omie"""
    
    def __init__(self, email, senha, checkpoint_file="omie_checkpoint.txt"):
        self.email = email
        self.senha = senha
        self.checkpoint_file = checkpoint_file
        self.driver = None
        self.wait = None
    
    def fazer_login(self, log_widget):
        """Realiza o login no Omie"""
        try:
            log_event(log_widget, "[LOGIN] Iniciando processo de login...")
            
            # Acessar página de login
            self.driver.get("https://app.omie.com.br/login/")
            time.sleep(0.5)
            
            # Preencher e-mail
            campo_email = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="email"]')))
            campo_email.clear()
            campo_email.send_keys(self.email)
            log_event(log_widget, "[OK] E-mail preenchido")
            
            # Clicar em continuar
            botao_continuar = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="btn-continue"]')))
            botao_continuar.click()
            time.sleep(0.3)
            
            # Preencher senha
            campo_senha = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="current-password"]')))
            campo_senha.clear()
            campo_senha.send_keys(self.senha)
            log_event(log_widget, "[OK] Senha preenchida")
            
            # Clicar em entrar
            botao_entrar = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="btn-login"]')))
            botao_entrar.click()
            time.sleep(0.5)
            
            log_event(log_widget, "[OK] Login realizado com sucesso")
            return True
            
        except Exception as e:
            log_event(log_widget, f"[ERRO] Erro no login: {e}")
            return False
    
    def acessar_aplicativo_exatas(self, log_widget):
        """Acessa o aplicativo da Exatas Contabilidade"""
        try:
            log_event(log_widget, "[EMPRESA] Acessando aplicativo da Exatas Contabilidade...")
            
            # Clicar no aplicativo da Exatas Contabilidade
            app_exatas = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="root"]/main/div/div[1]/div[2]/div/div[1]/div/div[2]/div[2]/div/div/button')))
            app_exatas.click()
            time.sleep(0.3)
            
            # Aguardar nova aba ser aberta e alternar para ela
            if not aguardar_e_alternar_para_nova_aba(self.driver, self.wait, log_widget):
                log_event(log_widget, "[AVISO] Nova aba não detectada, continuando na aba atual")
            
            log_event(log_widget, "[OK] Aplicativo acessado")
            return True
            
        except Exception as e:
            log_event(log_widget, f"[ERRO] Erro ao acessar aplicativo: {e}")
            return False
    
    def navegar_para_contratos_servicos(self, log_widget):
        """Navega até a seção de contratos de serviços"""
        try:
            log_event(log_widget, "[NAVEGACAO] Navegando para Serviços e NFS-e...")
            
            # Aguardar a página carregar completamente
            time.sleep(5)
            
            # Verificar se estamos na aba correta
            log_event(log_widget, f"[INFO] Aba atual: {self.driver.current_window_handle}")
            log_event(log_widget, f"[INFO] URL atual: {self.driver.current_url}")
            
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
                    servicos_nfse = self.wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
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
            menu_suspenso = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="app"]/nav/ul/li[3]/a/span')))
            ActionChains(self.driver).move_to_element(menu_suspenso).perform()
            time.sleep(1)
            
            # Aguardar um pouco mais para o menu suspenso aparecer
            log_event(log_widget, "[AGUARDANDO] Aguardando menu suspenso aparecer...")
            time.sleep(2)
            
            # Buscar diretamente o elemento "Exibir todos"
            log_event(log_widget, "[BUSCA] Buscando elemento 'Exibir todos'...")
            contratos_servicos = None
            xpaths_contratos = [
                '//li[@data-slug="listar-todas-contratos-servico"]',
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
                    contratos_servicos = self.wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
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
                    self.driver.get(url_contratos)
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
                    self.driver.execute_script("arguments[0].click();", contratos_servicos)
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
                log_event(log_widget, f"[DEBUG] URL atual: {self.driver.current_url}")
                log_event(log_widget, f"[DEBUG] Título da página: {self.driver.title}")
            except:
                pass
            return False
    
    def processar_cnpj(self, cnpj, valor_unitario, log_widget):
        """Processa um CNPJ específico"""
        try:
            log_event(log_widget, f"[EMPRESA] Processando CNPJ: {cnpj}")
            
            # Preencher campo Cliente (CPF/CNPJ)
            campo_cliente = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d51612c10000g_headers"]/thead/tr[2]/td[4]/span/input')))
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
                self.wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="d51612c10000g"]/tbody/tr')))
                log_event(log_widget, "[OK] Resultados do filtro carregados")
            except TimeoutException:
                log_event(log_widget, "[AVISO] Timeout aguardando resultados do filtro, tentando continuar...")
            
            # Clicar duas vezes na empresa
            log_event(log_widget, "[CLIQUE] Clicando duas vezes na empresa...")
            empresa = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d51612c10000g"]/tbody/tr/td[4]')))
            ActionChains(self.driver).double_click(empresa).perform()
            time.sleep(5)
            
            # Clicar em "Selecionar serviços já cadastrados"
            try:
                elemento_selecionar = (By.XPATH, '//*[@id="d51612c46"]/a[2]/span[2]/div')
                if clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_selecionar, "'Selecionar serviços já cadastrados'"):
                    log_event(log_widget, "[OK] Clicou em 'Selecionar serviços já cadastrados'")
                else:
                    log_event(log_widget, "[AVISO] XPath por texto falhou, tentando CSS selector...")
                    elemento_css = (By.CSS_SELECTOR, '#d51612c46 > a:nth-child(3) > span:nth-child(2) > div')
                    if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_css, "'Selecionar serviços já cadastrados' via CSS"):
                        log_event(log_widget, "[ERRO] Não foi possível encontrar 'Selecionar serviços já cadastrados'")
                        return False
            except Exception as e:
                log_event(log_widget, f"[ERRO] Erro ao clicar em 'Selecionar serviços já cadastrados': {e}")
                return False
            
            time.sleep(5)
            
            # Selecionar "ADICIONAL DE FINAL DE ANO"
            elemento_adicional = (By.XPATH, '//*[@id="d50527c3g"]/tbody/tr[4]/td[1]')
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_adicional, "'ADICIONAL DE FINAL DE ANO'"):
                return False
            time.sleep(2)
            
            # Clicar em "Incluir os serviços selecionados"
            elemento_incluir = (By.XPATH, '//*[@id="dialogContent-50527"]/div/button/span[2]')
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_incluir, "'Incluir os serviços selecionados'"):
                return False
            time.sleep(5)
            
            # Selecionar o ADICIONAL DE FINAL DE ANO na lista
            elemento_adicional_lista = (By.XPATH, '//*[@id="d51612c86g"]/tbody/tr[2]/td[3]')
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_adicional_lista, "'ADICIONAL DE FINAL DE ANO na lista'"):
                return False
            time.sleep(2)
            
            # Clicar em "Editar o item"
            elemento_editar = (By.XPATH, '//*[@id="d51612c58"]/a[2]/span[2]/div')
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_editar, "'Editar o item'"):
                return False
            time.sleep(5)
            
            # Preencher valor unitário
            campo_valor = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d50670c30"]')))
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
                    self.driver.execute_script(f"arguments[0].value = '{valor_formatado}';", campo_valor)
                    self.driver.execute_script("arguments[0].dispatchEvent(new Event('change'));", campo_valor)
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
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_outras_info, "'Outras informações'"):
                return False
            time.sleep(3)
            
            # Clicar em "Preencher uma data específica"
            elemento_data_especifica = (By.XPATH, '//*[@id="d50670c148"]/a[2]/span[2]/div')
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_data_especifica, "'Preencher uma data específica'"):
                return False
            time.sleep(3)
            
            # Preencher vigência inicial (data fixa)
            data_inicial = "25/10/2025"
            vigencia_inicial_campo = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d50670c162"]')))
            vigencia_inicial_campo.send_keys(Keys.HOME)
            vigencia_inicial_campo.send_keys(data_inicial)
            time.sleep(2)
            log_event(log_widget, f"[OK] Vigência inicial preenchida: {data_inicial}")
            
            # Preencher vigência final (data fixa)
            data_final = "30/11/2025"
            vigencia_final_campo = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d50670c163"]')))
            time.sleep(2)
            vigencia_final_campo.send_keys(Keys.HOME)
            time.sleep(2)
            vigencia_final_campo.send_keys(Keys.HOME)
            vigencia_final_campo.send_keys(data_final)
            time.sleep(2)
            log_event(log_widget, f"[OK] Vigência final preenchida: {data_final}")
            
            # Salvar
            elemento_salvar = (By.XPATH, '//*[@id="dialogToolbar-50670"]/li[1]/a/div/div/div[1]')
            if not clicar_elemento_seguro(self.driver, self.wait, log_widget, elemento_salvar, "'Salvar'"):
                return False
            time.sleep(5)
            
            # Fechar primeiro diálogo
            if not fechar_dialogo_seguro(self.driver, self.wait, log_widget, '//*[@id="dialog-50670"]/div[1]/button', "primeiro diálogo"):
                log_event(log_widget, "[AVISO] Não foi possível fechar primeiro diálogo, mas continuando...")
            time.sleep(3)
            
            # Fechar segundo diálogo
            if not fechar_dialogo_seguro(self.driver, self.wait, log_widget, '//*[@id="dialog-51612"]/div[1]/button', "segundo diálogo"):
                log_event(log_widget, "[AVISO] Não foi possível fechar segundo diálogo, mas continuando...")
            time.sleep(5)
            
            log_event(log_widget, f"[OK] CNPJ {cnpj} processado com sucesso")
            return True
            
        except Exception as e:
            log_event(log_widget, f"[ERRO] Erro ao processar CNPJ {cnpj}: {e}")
            return False
    
    def processar_dados_macro(self, dados, log_widget, progress_bar, root, stop_requested, modo_simulacao):
        """Processa todos os dados da planilha MACRO.xlsx"""
        if dados.empty:
            log_event(log_widget, "[ERRO] Nenhum dado para processar")
            return
        
        agora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        # Criar pasta logs se não existir
        os.makedirs("logs", exist_ok=True)
        log_txt = open(f"logs/log_omie_{agora}.txt", "w", encoding="utf-8")
        resultados = []
        
        def registrar(msg):
            log_event(log_widget, msg)
            log_txt.write(msg + "\n")
        
        checkpoint = ler_checkpoint(self.checkpoint_file)
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
        self.driver, self.wait = configurar_driver_omie(log_widget)
        
        if not self.driver or not self.wait:
            log_event(log_widget, "[ERRO] Falha ao configurar driver. Encerrando execução.")
            return
        
        if not self.fazer_login(log_widget):
            log_event(log_widget, "[ERRO] Falha no login. Encerrando execução.")
            self.driver.quit()
            return
        
        if not self.acessar_aplicativo_exatas(log_widget):
            log_event(log_widget, "[ERRO] Falha ao acessar aplicativo. Encerrando execução.")
            self.driver.quit()
            return
        
        if not self.navegar_para_contratos_servicos(log_widget):
            log_event(log_widget, "[ERRO] Falha na navegação. Encerrando execução.")
            self.driver.quit()
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
                sucesso = self.processar_cnpj(cnpj, valor_unitario, log_widget)
                log_event(log_widget, f"[RETORNO] processar_cnpj retornou: {sucesso}")
            except Exception as e:
                log_event(log_widget, f"[ERRO] Exceção em processar_cnpj: {e}")
                sucesso = False
            
            tempo = round(time.time() - inicio, 2)
            status = "Sucesso" if sucesso else "Erro"
            registrar(f"[OK] Processamento do CNPJ {cnpj} concluído em {tempo} segundos - Status: {status}")
            
            # Salvar checkpoint apenas se o processamento foi bem-sucedido
            if sucesso:
                salvar_checkpoint(self.checkpoint_file, cnpj)
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
        import pandas as pd
        pd.DataFrame(resultados).to_excel(f"logs/resultado_omie_{agora}.xlsx", index=False)
        log_txt.close()
        self.driver.quit()
    
    def testar_chromedriver(self, log_widget):
        """Testa se o ChromeDriver está funcionando"""
        log_widget.delete(1.0, "end")
        log_event(log_widget, "[TESTE] Testando ChromeDriver...")
        
        self.driver, self.wait = configurar_driver_omie(log_widget)
        if self.driver and self.wait:
            try:
                self.driver.get("https://www.google.com")
                time.sleep(3)
                log_event(log_widget, f"[OK] ChromeDriver funcionando! Título: {self.driver.title}")
                self.driver.quit()
            except Exception as e:
                log_event(log_widget, f"[ERRO] Erro no teste: {e}")
        else:
            log_event(log_widget, "[ERRO] Falha ao configurar ChromeDriver")
