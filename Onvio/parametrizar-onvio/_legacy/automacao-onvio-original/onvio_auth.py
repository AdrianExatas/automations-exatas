from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC

def login_onvio(driver, wait, email, senha):
    driver.get("https://onvio.com.br/login/#/")
    wait.until(EC.element_to_be_clickable((By.ID, 'trauth-continue-signin-btn'))).click()
    inserirEmail = wait.until(EC.element_to_be_clickable((By.ID, 'username')))
    inserirEmail.send_keys(email)
    inserirEmail.submit()
    inserirSenha = wait.until(EC.element_to_be_clickable((By.ID, 'password')))
    inserirSenha.send_keys(senha)
    inserirSenha.submit()
    wait.until(EC.element_to_be_clickable((By.CLASS_NAME, 'content-action__item')))
