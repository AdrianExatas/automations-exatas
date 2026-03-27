"""
Estado global para controle de execução do módulo de download
"""

# Controle de execução
executando = True
usar_headless = False

# Redirecionador de output (para GUI)
redirector = None

# Controle de paginação
pagina_inicial = None  # None = começar do início
pagina_final = None    # None = ir até o fim

# Filtro de data de solicitação
data_solicitacao = None  # Formato: DDMMYYYY (ex: 01122025 para 01/12/2025)

# Extração automática de ZIPs
extrair_zips = True  # Se True, extrai automaticamente os arquivos .zip baixados

# Upload automático para SIEG
upload_automatico = False  # Se True, envia XMLs para SIEG após descompactação


def resetar_estado():
    """Reseta o estado para valores padrão"""
    global executando, usar_headless, redirector, pagina_inicial, pagina_final, data_solicitacao, extrair_zips, upload_automatico
    executando = True
    usar_headless = False
    redirector = None
    pagina_inicial = None
    pagina_final = None
    data_solicitacao = None
    extrair_zips = True
    upload_automatico = False


def parar_execucao():
    """Para a execução da automação"""
    global executando
    executando = False
    print("🛑 Execução interrompida pelo usuário.")


def iniciar_execucao():
    """Inicia/reinicia a execução"""
    global executando
    executando = True
