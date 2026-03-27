"""
Módulo de ações específicas no portal SEFAZ
Contém funções para interagir com formulários e realizar consultas
"""
import time
from typing import Optional, Tuple, Dict, Any
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException, StaleElementReferenceException, TimeoutException

from .utils import formatar_data
from src.utils.retry import retry_com_backoff


class SefazActions:
    """Classe para realizar ações no portal SEFAZ"""
    
    def __init__(self, browser):
        """
        Inicializa com uma instância do SefazBrowser
        
        Args:
            browser: Instância de SefazBrowser
        """
        self.browser = browser
        self.driver = browser.get_driver()
        self.wait = browser.get_wait()
    
    def selecionar_empresa(self, inscricao_municipal: str) -> bool:
        """
        Seleciona a empresa pela inscrição municipal com retry
        
        Args:
            inscricao_municipal: Inscrição municipal da empresa
            
        Returns:
            True se seleção bem-sucedida, False caso contrário
        """
        try:
            select_empresas = retry_com_backoff(
                lambda: self.wait.until(EC.presence_of_element_located((By.ID, "cdPessoaContribuinte"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            select = Select(select_empresas)
            select.select_by_value(str(inscricao_municipal))
            
            botao_ok = retry_com_backoff(
                lambda: self.wait.until(EC.element_to_be_clickable((By.ID, "okButton"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            botao_ok.click()
            
            print(f"[OK] Empresa '{inscricao_municipal}' selecionada!")
            return True
            
        except (NoSuchElementException, StaleElementReferenceException, TimeoutException) as e:
            print(f"[ERRO] Erro ao selecionar empresa (elemento não encontrado): {e}")
            return False
        except Exception as e:
            print(f"[ERRO] Erro ao selecionar empresa: {e}")
            return False
    
    def selecionar_tipo_arquivo(self, tipo_arquivo: str) -> bool:
        """
        Seleciona o tipo de arquivo (NFE, NFC, CTE) com retry
        
        Args:
            tipo_arquivo: Tipo de arquivo (NFE, NFC, CTE)
            
        Returns:
            True se seleção bem-sucedida, False caso contrário
        """
        try:
            tipo_arquivo = tipo_arquivo.strip().upper()
            
            select_tipo_arquivo_element = retry_com_backoff(
                lambda: self.wait.until(EC.presence_of_element_located((By.ID, "tipoArquivo"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            select_tipo_arquivo = Select(select_tipo_arquivo_element)
            
            opcoes_disponiveis = [op.text.strip().upper() for op in select_tipo_arquivo.options]
            
            if tipo_arquivo in opcoes_disponiveis:
                select_tipo_arquivo_element = retry_com_backoff(
                    lambda: self.wait.until(EC.presence_of_element_located((By.ID, "tipoArquivo"))),
                    max_tentativas=2,
                    excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
                )
                select_tipo_arquivo = Select(select_tipo_arquivo_element)
                select_tipo_arquivo.select_by_visible_text(tipo_arquivo)
                print(f"[OK] Tipo de arquivo '{tipo_arquivo}' selecionado com sucesso!")
            else:
                print(f"[ERRO] Tipo de arquivo '{tipo_arquivo}' nao encontrado. Opcoes disponiveis: {opcoes_disponiveis}")
                return False
            
            botao_ok = retry_com_backoff(
                lambda: self.wait.until(EC.element_to_be_clickable((By.ID, "okButton"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            botao_ok.click()
            
            return True
            
        except (NoSuchElementException, StaleElementReferenceException, TimeoutException) as e:
            print(f"[ERRO] Erro ao selecionar tipo de arquivo (elemento não encontrado): {e}")
            return False
        except Exception as e:
            print(f"[ERRO] Erro ao selecionar o tipo de arquivo: {e}")
            return False
    
    def selecionar_tipo_pesquisa_nfe_nfc(self, pesquisar_por: str) -> bool:
        """
        Seleciona o tipo de pesquisa para NFE ou NFC com retry
        
        Args:
            pesquisar_por: Tipo de pesquisa
            
        Returns:
            True se seleção bem-sucedida, False caso contrário
        """
        try:
            pesquisar_por = pesquisar_por.strip()
            tipo_pesquisa_element = retry_com_backoff(
                lambda: self.wait.until(EC.presence_of_element_located((By.ID, "tipoPesquisa"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            select_pesquisa = Select(tipo_pesquisa_element)
            opcoes_validas = {option.text.strip(): option.get_attribute('value').strip() for option in select_pesquisa.options}
            
            if pesquisar_por in opcoes_validas:
                select_pesquisa.select_by_visible_text(pesquisar_por)
                print(f"[OK] Tipo de pesquisa '{pesquisar_por}' selecionado com sucesso!")
                return True
            else:
                print(f"[ERRO] Tipo de pesquisa invalido: {pesquisar_por}")
                return False
                
        except (NoSuchElementException, StaleElementReferenceException, TimeoutException) as e:
            print(f"[ERRO] Erro ao selecionar tipo de pesquisa (elemento não encontrado): {e}")
            return False
        except Exception as e:
            print(f"[ERRO] Erro ao selecionar o tipo de pesquisa: {e}")
            return False
    
    def selecionar_tipo_pesquisa_cte(self, pesquisar_por: str) -> bool:
        """
        Seleciona o tipo de pesquisa para CTE (checkboxes) com retry
        
        Args:
            pesquisar_por: Tipo de pesquisa
            
        Returns:
            True se seleção bem-sucedida, False caso contrário
        """
        try:
            pesquisar_por = pesquisar_por.strip()
            mapeamento_pesquisa = {
                "Remetente": "Remetente",
                "Expedidor": "Expedidor",
                "Recebedor": "Recebedor",
                "Destinatário": "Destinatario",
                "Emitente": "Emitente",
                "Outros": "Outros"
            }
            
            if pesquisar_por in mapeamento_pesquisa:
                campo_id = mapeamento_pesquisa[pesquisar_por]
                campo_elemento = retry_com_backoff(
                    lambda: WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.ID, campo_id))
                    ),
                    max_tentativas=3,
                    excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
                )
                if not campo_elemento.is_selected():
                    campo_elemento.click()
                    print(f"[OK] Tipo de pesquisa '{pesquisar_por}' selecionado com sucesso!")
                else:
                    print(f"[INFO] O tipo de pesquisa '{pesquisar_por}' ja estava selecionado.")
                return True
            else:
                print(f"[ERRO] Tipo de pesquisa invalido: {pesquisar_por}")
                return False
                
        except (NoSuchElementException, StaleElementReferenceException, TimeoutException) as e:
            print(f"[ERRO] Erro ao selecionar tipo de pesquisa CTE (elemento não encontrado): {e}")
            return False
        except Exception as e:
            print(f"[ERRO] Erro ao selecionar o tipo de pesquisa: {e}")
            return False
    
    def preencher_datas(self, data_inicial: str, data_final: str) -> bool:
        """
        Preenche as datas inicial e final com retry
        
        Args:
            data_inicial: Data inicial no formato DD/MM/YYYY
            data_final: Data final no formato DD/MM/YYYY
            
        Returns:
            True se preenchimento bem-sucedido, False caso contrário
        """
        try:
            data_inicial = formatar_data(data_inicial.strip())
            data_final = formatar_data(data_final.strip())
            
            if not (data_inicial and data_final):
                print(f"[ERRO] Formato de data invalido: {data_inicial} - {data_final}. Corrija e tente novamente.")
                return False
            
            campo_data_inicial = retry_com_backoff(
                lambda: self.wait.until(EC.presence_of_element_located((By.ID, "dtInicio"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            campo_data_final = retry_com_backoff(
                lambda: self.wait.until(EC.presence_of_element_located((By.ID, "dtFinal"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            
            for campo, valor in ((campo_data_inicial, data_inicial), (campo_data_final, data_final)):
                campo.clear()
                campo.send_keys(Keys.CONTROL + "a")
                campo.send_keys(Keys.DELETE)
                campo.send_keys(valor)
            
            print(f"[OK] Datas preenchidas corretamente: {data_inicial} ate {data_final}")
            return True
            
        except (NoSuchElementException, StaleElementReferenceException, TimeoutException) as e:
            print(f"[ERRO] Erro ao preencher as datas (elemento não encontrado): {e}")
            return False
        except Exception as e:
            print(f"[ERRO] Erro ao preencher as datas: {e}")
            return False
    
    def submeter_solicitacao(self) -> Tuple[bool, Optional[str]]:
        """
        Submete a solicitação clicando no botão OK com retry
        
        Returns:
            Tupla (sucesso, mensagem_erro) onde sucesso é bool e mensagem_erro é str ou None
        """
        try:
            botao_ok = retry_com_backoff(
                lambda: self.wait.until(EC.element_to_be_clickable((By.ID, "okButton"))),
                max_tentativas=3,
                excecoes=(NoSuchElementException, StaleElementReferenceException, TimeoutException)
            )
            botao_ok.click()
            print("[OK] XML solicitada!")
            
            # Verifica se há mensagem de erro
            try:
                wait_rapido = WebDriverWait(self.driver, 2, poll_frequency=0.3)
                mensagem_erro_element = wait_rapido.until(EC.presence_of_element_located((By.CLASS_NAME, "fontMessageError")))
                mensagem_erro = mensagem_erro_element.text.strip()
                if mensagem_erro:
                    print(f"[AVISO] Mensagem de erro detectada: {mensagem_erro}")
                    return True, mensagem_erro
            except (NoSuchElementException, StaleElementReferenceException, TimeoutException):
                print("[OK] Nenhuma mensagem de erro detectada.")
            except Exception:
                print("[OK] Nenhuma mensagem de erro detectada.")
            
            return True, None
            
        except (NoSuchElementException, StaleElementReferenceException, TimeoutException) as e:
            print(f"[ERRO] Erro ao submeter solicitação (elemento não encontrado): {e}")
            return False, str(e)
        except Exception as e:
            print(f"[ERRO] Erro ao submeter solicitacao: {e}")
            return False, str(e)
    
    def processar_solicitacao_nfe_nfc(self, params: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Processa uma solicitação completa para NFE ou NFC
        
        Args:
            params: Dicionário com os parâmetros da solicitação
                - inscricao_municipal
                - tipo_arquivo
                - pesquisar_por
                - data_inicial
                - data_final
                
        Returns:
            Tupla (sucesso, mensagem)
        """
        try:
            if not self.selecionar_empresa(params["inscricao_municipal"]):
                return False, "Erro ao selecionar empresa"
            
            if not self.selecionar_tipo_arquivo(params["tipo_arquivo"]):
                return False, "Erro ao selecionar tipo de arquivo"
            
            if not self.selecionar_tipo_pesquisa_nfe_nfc(params["pesquisar_por"]):
                return False, "Erro ao selecionar tipo de pesquisa"
            
            if not self.preencher_datas(params["data_inicial"], params["data_final"]):
                return False, "Erro ao preencher datas"
            
            sucesso, mensagem_erro = self.submeter_solicitacao()
            if not sucesso:
                return False, "Erro ao submeter solicitação"
            
            if mensagem_erro:
                return True, f"Solicitação enviada com aviso: {mensagem_erro}"
            
            return True, "Solicitação concluída com sucesso"
            
        except Exception as e:
            return False, f"Erro durante processamento: {str(e)}"
    
    def processar_solicitacao_cte(self, params: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Processa uma solicitação completa para CTE com retry
        
        Args:
            params: Dicionário com os parâmetros da solicitação
                - inscricao_municipal
                - tipo_arquivo
                - pesquisar_por
                - data_inicial
                - data_final
                
        Returns:
            Tupla (sucesso, mensagem)
        """
        try:
            if not self.selecionar_empresa(params["inscricao_municipal"]):
                return False, "Erro ao selecionar empresa"
            
            if not self.selecionar_tipo_arquivo(params["tipo_arquivo"]):
                return False, "Erro ao selecionar tipo de arquivo"
            
            if not self.selecionar_tipo_pesquisa_cte(params["pesquisar_por"]):
                return False, "Erro ao selecionar tipo de pesquisa"
            
            if not self.preencher_datas(params["data_inicial"], params["data_final"]):
                return False, "Erro ao preencher datas"
            
            sucesso, mensagem_erro = self.submeter_solicitacao()
            if not sucesso:
                return False, "Erro ao submeter solicitação"
            
            if mensagem_erro:
                return True, f"Solicitação enviada com aviso: {mensagem_erro}"
            
            return True, "Solicitação concluída com sucesso"
            
        except Exception as e:
            return False, f"Erro durante processamento: {str(e)}"
