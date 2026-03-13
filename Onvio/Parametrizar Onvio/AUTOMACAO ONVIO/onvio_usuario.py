from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
import time

def criar_usuario(driver, wait, nome, email, cliente_id):
	driver.get('https://onvio.com.br/br-portal-do-cliente/settings/clients-users/add')
	wait.until(EC.element_to_be_clickable((By.ID, 'name'))).send_keys(nome)
	wait.until(EC.element_to_be_clickable((By.ID, 'email'))).send_keys(email)
	wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Ativar')]"))).click()
	wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'ENVIE AGORA')]"))).click()
	avancarUsuario = wait.until(EC.element_to_be_clickable((By.ID, "wizard-button-next")))
	avancarUsuario.click()
	wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Habilitar todos')]"))).click()
	time.sleep(2)
	avancarUsuario.click()
	time.sleep(2)
	wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="search-input-client-search"]'))).send_keys(cliente_id)
	time.sleep(2)
	
    # Espera até que a linha com o cliente_id esteja presente
	row = wait.until(EC.element_to_be_clickable((By.XPATH,
         f"//div[contains(@class,'wj-row') and .//div[@data-testid and contains(@data-testid,'col-code-row-') and normalize-space()='{cliente_id}']]"
     )))
	acesso = row.find_element(By.CSS_SELECTOR, "div.wj-cell[data-testid^='col-access-row-']")
	wait.until(EC.element_to_be_clickable(acesso)).click()
	
	wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="my-toggle"]'))).click()
	time.sleep(1)
	
	avancarUsuario.click()
	time.sleep(2)
	wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="toggle-enable-nfe-processing"]'))).click()
	wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="toggle-view-service-request"]'))).click()
	avancarUsuario.click()
	time.sleep(2)
	wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="newTopicEmail"]'))).click()
	wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '[data-testid="publishedDocumentEmail"]'))).click()
	time.sleep(2)
	wait.until(EC.element_to_be_clickable((By.ID, 'wizard-button-next'))).click()
	time.sleep(2)
