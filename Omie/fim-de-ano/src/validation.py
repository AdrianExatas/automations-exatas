"""
Módulo de validação para verificar se o Adicional de Final de Ano foi adicionado
"""
import time
import os
from datetime import datetime
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException

from utils.selenium_utils import (
    configurar_driver_omie, 
    aguardar_e_alternar_para_nova_aba, 
    clicar_elemento_seguro,
    fechar_dialogo_seguro
)
from utils.data_utils import carregar_dados_macro
from utils.checkpoint import salvar_checkpoint, ler_checkpoint
from utils.logger import log_event


class OmieValidation:
    """Classe para validação de contratos no Omie"""
    
    def __init__(self, email, senha, checkpoint_file="logs/validacao_checkpoint.txt"):
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
                    servicos_nfse = self.wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                    log_event(log_widget, f"[OK] Elemento encontrado com XPath {i+1}")
                    break
                except TimeoutException:
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
            contratos_servicos = None
            xpaths_contratos = [
                '//li[@data-slug="listar-todas-contratos-servico"]',
                '//li[contains(@class, "ui-floating-section-list-item") and contains(text(), "Exibir todos")]',
                '//li[contains(@title, "Exibe a lista com todos os contratos de serviço")]',
                '//li[contains(@data-slug, "contratos-servico")]',
                '//*[@id="d0cundefined"]//li[contains(text(), "Exibir todos")]',
                '//*[@id="d0cundefined"]//li[contains(@class, "ui-floating-section-list-item")]'
            ]
            
            for i, xpath in enumerate(xpaths_contratos):
                try:
                    contratos_servicos = self.wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                    log_event(log_widget, f"[OK] Elemento 'Exibir todos' encontrado com XPath {i+1}")
                    break
                except TimeoutException:
                    continue
            
            # Estratégia alternativa: tentar clicar diretamente no link
            if not contratos_servicos:
                log_event(log_widget, "[ALTERNATIVA] Tentando estratégia alternativa - navegação direta...")
                try:
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
            return False
    
    def verificar_adicional_final_ano(self, cnpj, log_widget):
        """
        Verifica se o Adicional de Final de Ano está presente no contrato do CNPJ
        
        Returns:
            dict: {'cnpj': str, 'adicional_presente': bool, 'valor': str, 'mensagem': str}
        """
        try:
            log_event(log_widget, f"[VALIDACAO] Verificando CNPJ: {cnpj}")
            
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
                self.wait.until(EC.presence_of_element_located((By.XPATH, '//*[@id="d51612c10000g"]/tbody/tr')))
                log_event(log_widget, "[OK] Resultados do filtro carregados")
            except TimeoutException:
                log_event(log_widget, "[AVISO] Timeout aguardando resultados do filtro")
                return {
                    'cnpj': cnpj,
                    'adicional_presente': False,
                    'valor': None,
                    'mensagem': 'CNPJ não encontrado ou timeout ao filtrar'
                }
            
            # Clicar duas vezes na empresa
            log_event(log_widget, "[CLIQUE] Clicando duas vezes na empresa...")
            empresa = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d51612c10000g"]/tbody/tr/td[4]')))
            ActionChains(self.driver).double_click(empresa).perform()
            time.sleep(5)
            
            # Verificar se o ADICIONAL DE FINAL DE ANO está na lista de serviços
            log_event(log_widget, "[VALIDACAO] Verificando se 'ADICIONAL DE FINAL DE ANO' está presente...")
            
            adicional_presente = False
            valor_adicional = None
            
            try:
                # Tentar encontrar o adicional na lista de serviços
                # A lista de serviços está na tabela com id "d51612c86g"
                elementos_lista = self.driver.find_elements(By.XPATH, '//*[@id="d51612c86g"]/tbody/tr')
                
                for elemento in elementos_lista:
                    try:
                        texto_celula = elemento.find_element(By.XPATH, './td[3]').text
                        if 'ADICIONAL DE FINAL DE ANO' in texto_celula.upper():
                            adicional_presente = True
                            log_event(log_widget, f"[OK] ADICIONAL DE FINAL DE ANO encontrado!")
                            
                            # Tentar obter o valor unitário
                            try:
                                valor_elemento = elemento.find_element(By.XPATH, './td[contains(@class, "valor") or contains(@class, "numero")]')
                                valor_adicional = valor_elemento.text
                                log_event(log_widget, f"[INFO] Valor encontrado: {valor_adicional}")
                            except:
                                # Tentar outras colunas
                                try:
                                    valor_adicional = elemento.find_element(By.XPATH, './td[4]').text
                                except:
                                    pass
                            
                            break
                    except:
                        continue
                
                if not adicional_presente:
                    log_event(log_widget, "[AVISO] ADICIONAL DE FINAL DE ANO não encontrado na lista")
                
            except Exception as e:
                log_event(log_widget, f"[ERRO] Erro ao verificar lista de serviços: {e}")
            
            # Fechar o diálogo
            try:
                if fechar_dialogo_seguro(self.driver, self.wait, log_widget, '//*[@id="dialog-51612"]/div[1]/button', "diálogo de validação"):
                    time.sleep(2)
            except:
                pass
            
            # Limpar filtro para próxima iteração
            try:
                campo_cliente = self.wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="d51612c10000g_headers"]/thead/tr[2]/td[4]/span/input')))
                campo_cliente.clear()
                campo_cliente.send_keys(Keys.RETURN)
                time.sleep(2)
            except:
                pass
            
            status = "OK" if adicional_presente else "FALTANDO"
            mensagem = f"Adicional {'presente' if adicional_presente else 'não encontrado'}"
            
            log_event(log_widget, f"[RESULTADO] CNPJ {cnpj}: {status} - {mensagem}")
            
            return {
                'cnpj': cnpj,
                'adicional_presente': adicional_presente,
                'valor': valor_adicional,
                'mensagem': mensagem,
                'status': status
            }
            
        except Exception as e:
            log_event(log_widget, f"[ERRO] Erro ao verificar CNPJ {cnpj}: {e}")
            return {
                'cnpj': cnpj,
                'adicional_presente': False,
                'valor': None,
                'mensagem': f'Erro na verificação: {str(e)}',
                'status': 'ERRO'
            }
    
    def validar_planilha(self, dados, log_widget, progress_bar, root, stop_requested, modo_simulacao):
        """Valida todos os CNPJs da planilha"""
        if dados.empty:
            log_event(log_widget, "[ERRO] Nenhum dado para validar")
            return
        
        agora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        # Criar pasta logs se não existir
        os.makedirs("logs", exist_ok=True)
        log_txt = open(f"logs/validacao_{agora}.txt", "w", encoding="utf-8")
        resultados = []
        
        def registrar(msg):
            log_event(log_widget, msg)
            log_txt.write(msg + "\n")
        
        checkpoint = ler_checkpoint(self.checkpoint_file)
        if checkpoint and checkpoint in dados['CNPJ'].values:
            checkpoint_index = dados[dados['CNPJ'] == checkpoint].index[0]
            dados = dados.iloc[checkpoint_index + 1:]
            registrar(f"[RETOMANDO] Retomando a partir do CNPJ: {checkpoint}")
        
        total = len(dados)
        registrar(f"[DADOS] Total de CNPJs para validar: {total}")
        
        if modo_simulacao:
            for i, (_, row) in enumerate(dados.iterrows(), start=1):
                if stop_requested:
                    registrar("[PARADO] Execução interrompida pelo usuário.")
                    break
                registrar(f"[SIMULAÇÃO] ({i}/{total}) Validando CNPJ: {row['CNPJ']}")
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
        
        log_event(log_widget, "[INICIANDO] Iniciando validação dos CNPJs...")
        
        # Processar cada CNPJ
        for i, (_, row) in enumerate(dados.iterrows(), start=1):
            if stop_requested:
                registrar("[PARADO] Execução interrompida pelo usuário.")
                break
            
            cnpj = row['CNPJ']
            valor_esperado = row.get('VALOR UNITÁRIO DO ITEM', None)
            
            inicio = time.time()
            registrar(f"[VALIDANDO] ({i}/{total}) CNPJ: {cnpj}")
            
            try:
                resultado = self.verificar_adicional_final_ano(cnpj, log_widget)
                tempo = round(time.time() - inicio, 2)
                
                resultado['tempo'] = tempo
                resultado['valor_esperado'] = valor_esperado
                resultados.append(resultado)
                
                registrar(f"[OK] Validação do CNPJ {cnpj} concluída em {tempo} segundos - Status: {resultado['status']}")
                
                # Salvar checkpoint
                salvar_checkpoint(self.checkpoint_file, cnpj)
                
            except Exception as e:
                log_event(log_widget, f"[ERRO] Exceção ao validar CNPJ {cnpj}: {e}")
                resultados.append({
                    'cnpj': cnpj,
                    'adicional_presente': False,
                    'valor': None,
                    'mensagem': f'Erro: {str(e)}',
                    'status': 'ERRO',
                    'tempo': round(time.time() - inicio, 2),
                    'valor_esperado': valor_esperado
                })
            
            progress_bar["value"] = (i / total) * 100
            root.update_idletasks()
            
            # Pausa entre validações
            time.sleep(2)
        
        # Gerar relatório
        registrar("[OK] Validação finalizada.")
        
        # Estatísticas
        total_validados = len(resultados)
        presentes = sum(1 for r in resultados if r.get('adicional_presente', False))
        faltando = total_validados - presentes
        
        registrar(f"[ESTATISTICAS] Total: {total_validados} | Presentes: {presentes} | Faltando: {faltando}")
        
        # Salvar planilha de resultados
        import pandas as pd
        df_resultados = pd.DataFrame(resultados)
        df_resultados.to_excel(f"logs/resultado_validacao_{agora}.xlsx", index=False)
        log_event(log_widget, f"[OK] Planilha de resultados salva: logs/resultado_validacao_{agora}.xlsx")
        
        log_txt.close()
        self.driver.quit()
