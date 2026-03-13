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
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime
import threading
import os

PROFILE_PATH = r"C:\Users\Exatas\AppData\Local\Google\Chrome\User Data"
checkpoint_file = "checkpoint.txt"
stop_requested = False
modo_simulacao = False

# ---- Funções auxiliares ----
def log_event(log_widget, msg):
    timestamp = datetime.now().strftime("%H:%M:%S")
    linha = f"[{timestamp}] {msg}"
    print(linha)
    log_widget.insert(tk.END, linha + "\n")
    log_widget.see(tk.END)

def configurar_driver():
    chrome_options = Options()
    # Remova as linhas de perfil do usuário:
    # chrome_options.add_argument(f"--user-data-dir={PROFILE_PATH}")
    chrome_options.add_argument('--user-data-dir=C:\\PerfisSelenium\\FsistProfile')
    chrome_options.add_argument("--profile-directory=Default")
    chrome_options.add_argument("--start-maximized")
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option("useAutomationExtension", False)
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    wait = WebDriverWait(driver, 60)
    return driver, wait

def carregar_chaves(arquivo, log_widget):
    try:
        if arquivo.endswith(".csv"):
            df = pd.read_csv(arquivo, sep=None, engine='python')
        else:
            df = pd.read_excel(arquivo)

        if "Chave de Acesso" not in df.columns:
            log_event(log_widget, "❌ Coluna 'Chave de Acesso' não encontrada.")
            return []
        df["Chave de Acesso"] = df["Chave de Acesso"].astype(str).str.replace("'", "", regex=False)
        chaves = list(dict.fromkeys(df["Chave de Acesso"].dropna().tolist()))  # Remove duplicatas
        return chaves
    except Exception as e:
        log_event(log_widget, f"❌ Erro ao ler a planilha: {e}")
        return []

def salvar_checkpoint(chave):
    with open(checkpoint_file, "w") as f:
        f.write(chave)

def ler_checkpoint():
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, "r") as f:
            return f.read().strip()
    return None

def processar_chaves(chaves, log_widget, progress_bar):
    global stop_requested, modo_simulacao
    if not chaves:
        return

    agora = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    log_txt = open(f"log_interface_{agora}.txt", "w", encoding="utf-8")
    resultados = []

    def registrar(msg):
        log_event(log_widget, msg)
        log_txt.write(msg + "\n")

    checkpoint = ler_checkpoint()
    if checkpoint in chaves:
        index = chaves.index(checkpoint) + 1
        chaves = chaves[index:]
        registrar(f"⏩ Retomando a partir da chave: {checkpoint}")

    total = len(chaves)
    registrar(f"📊 Total de solicitações: {total}")

    if modo_simulacao:
        for i, chave in enumerate(chaves, start=1):
            if stop_requested:
                registrar("🛑 Execução interrompida pelo usuário.")
                break
            registrar(f"[SIMULAÇÃO] ({i}/{total}) Processando: {chave}")
            progress_bar["value"] = (i / total) * 100
            root.update_idletasks()
            time.sleep(0.5)
        return

    driver, wait = configurar_driver()
    driver.get("https://www.fsist.com.br/")
    time.sleep(2)
    janela_original = driver.current_window_handle

    for i, chave in enumerate(chaves, start=1):
        if stop_requested:
            registrar("🛑 Execução interrompida pelo usuário.")
            break

        salvar_checkpoint(chave)
        inicio = time.time()
        registrar(f"➡️ ({i}/{total}) Processando chave: {chave}")

        try:
            nova_consulta = wait.until(EC.element_to_be_clickable((By.XPATH, '//*[@id="DivConsulta"]/table[2]/tbody/tr/td[2]')))
            nova_consulta.click()
            campo_chave = wait.until(EC.element_to_be_clickable((By.ID, "chave")))
            campo_chave.clear()
            campo_chave.send_keys(chave)
            time.sleep(0.5)

            botao_consulta = wait.until(EC.element_to_be_clickable((By.ID, "butconsulta")))
            botao_consulta.click()
            time.sleep(0.5)

            try:
                botao_certificado = wait.until(EC.element_to_be_clickable((By.ID, "butComCertificado")))
                botao_certificado.click()
                time.sleep(0.5)
            except:
                registrar("⚠️ Nenhum botão de certificado encontrado.")

            tempo = round(time.time() - inicio, 2)
            registrar(f"✅ Concluído para {chave} em {tempo} segundos")
            resultados.append({"Chave": chave, "Status": "Sucesso", "Tempo": tempo})

            for janela in driver.window_handles:
                if janela != janela_original:
                    driver.switch_to.window(janela)
                    driver.close()
            driver.switch_to.window(janela_original)

        except TimeoutException:
            registrar("⏱️ Tempo excedido ao tentar localizar elementos.")
            resultados.append({"Chave": chave, "Status": "Timeout"})
        except NoSuchElementException:
            registrar("❌ Elemento necessário não encontrado.")
            resultados.append({"Chave": chave, "Status": "Elemento não encontrado"})
        except Exception as e:
            registrar(f"❌ Erro inesperado: {e}")
            resultados.append({"Chave": chave, "Status": str(e)})

        progress_bar["value"] = (i / total) * 100
        root.update_idletasks()

    registrar("✅ Execução finalizada.")
    pd.DataFrame(resultados).to_excel(f"resultado_{agora}.xlsx", index=False)
    log_txt.close()
    driver.quit()

def iniciar_processo():
    global stop_requested, modo_simulacao
    stop_requested = False
    modo_simulacao = var_simulacao.get() == "1"
    arquivo = filedialog.askopenfilename(title="Selecione a planilha de chaves", filetypes=[("Planilhas Excel ou CSV", "*.xlsx;*.csv")])
    if not arquivo:
        messagebox.showwarning("Aviso", "Nenhum arquivo selecionado.")
        return
    log_widget.delete(1.0, tk.END)
    chaves = carregar_chaves(arquivo, log_widget)
    threading.Thread(target=processar_chaves, args=(chaves, log_widget, progress)).start()

def parar_processo():
    global stop_requested
    stop_requested = True

root = tk.Tk()
root.title("Automações FSist")
root.geometry("800x600")

notebook = ttk.Notebook(root)
notebook.pack(fill='both', expand=True)

frame_execucao = tk.Frame(notebook)
frame_config = tk.Frame(notebook)
notebook.add(frame_execucao, text="Execução")
notebook.add(frame_config, text="Configurações")

frame_btns = tk.Frame(frame_execucao)
frame_btns.pack(pady=5)

btn_iniciar = tk.Button(frame_btns, text="📂 Iniciar", font=("Arial", 12), command=iniciar_processo)
btn_iniciar.pack(side=tk.LEFT, padx=10)

btn_parar = tk.Button(frame_btns, text="🛑 Parar", font=("Arial", 12), command=parar_processo)
btn_parar.pack(side=tk.LEFT, padx=10)

progress = ttk.Progressbar(frame_execucao, length=700)
progress.pack(pady=5)

log_widget = scrolledtext.ScrolledText(frame_execucao, width=100, height=30, font=("Courier", 10))
log_widget.pack(padx=10, pady=10)

# Aba de Configurações
var_simulacao = StringVar(value="0")
chk_simulacao = tk.Checkbutton(frame_config, text="Modo Simulação (sem abrir navegador)", variable=var_simulacao, onvalue="1", offvalue="0", font=("Arial", 11))
chk_simulacao.pack(pady=20, anchor="w", padx=20)

root.mainloop()
