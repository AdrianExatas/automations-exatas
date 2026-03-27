"""
Constantes centralizadas para operações do sistema SEFAZ
Facilita ajustes de performance e configuração
"""


class Timeouts:
    """Constantes de timeout para operações"""
    # Download
    DOWNLOAD_WAIT_INITIAL = 0.5  # Tempo inicial de espera para download
    DOWNLOAD_CHECK_INTERVAL = 0.5  # Intervalo entre verificações de download
    DOWNLOAD_COMPLETE_CHECK = 1.0  # Tempo para verificar se download completou
    DOWNLOAD_MAX_WAIT = 120  # Máximo de tentativas para aguardar download
    FILE_MOVE_RETRY_DELAY = 1.0  # Delay entre tentativas de mover arquivo
    FILE_COPY_FALLBACK_DELAY = 0.5  # Delay após copiar arquivo
    
    # Consulta
    PAGE_LOAD = 2.0  # Tempo para carregar página
    ELEMENT_CLICK = 0.1  # Tempo após clicar em elemento
    NAVIGATION = 0.2  # Tempo entre navegações
    ERROR_CHECK = 2.0  # Tempo para verificar erros
    
    # WebDriver
    DEFAULT_TIMEOUT = 10  # Timeout padrão do WebDriverWait
    POLL_FREQUENCY = 0.3  # Frequência de polling
    
    # Login e navegação
    LOGIN_ACCEPT_COOKIES = 0.3  # Tempo após aceitar cookies
    LOGIN_DROPDOWN = 0.2  # Tempo após abrir dropdown
    LOGIN_SELECT_OPTION = 0.2  # Tempo após selecionar opção
    LOGIN_CLICK_BODY = 0.2  # Tempo após clicar no body
    NAVIGATION_TAB_SWITCH = 0.1  # Tempo para alternar abas
    NAVIGATION_REQUEST_XML = 0.2  # Tempo após solicitar XML
    NAVIGATION_NEW_BUTTON = 0.1  # Tempo após clicar botão Novo
    NAVIGATION_BACK = 0.2  # Tempo após voltar para nova solicitação
    SCROLL_BEFORE_CLICK = 0.1  # Tempo após scroll antes de clicar
    
    # Arquivo
    FILE_SIZE_CHECK_DELAY = 3.0  # Delay para verificar tamanho de arquivo após download
    FILE_MIN_SIZE_STABLE_CHECK = 0.5  # Tempo entre verificações de estabilidade


class FileConfig:
    """Configurações de arquivo"""
    MIN_FILE_SIZE = 100  # Tamanho mínimo em bytes para considerar arquivo válido
    MAX_FILE_NAME_LENGTH = 255  # Tamanho máximo de nome de arquivo
    CHECKPOINT_MAX_AGE_DAYS = 7  # Idade máxima de checkpoint em dias
    MAX_MOVE_RETRIES = 5  # Número máximo de tentativas para mover arquivo
    MAX_DOWNLOAD_RETRIES = 3  # Número máximo de tentativas para download


class RetryConfig:
    """Configurações de retry"""
    DEFAULT_MAX_TENTATIVAS = 3  # Número padrão de tentativas
    DEFAULT_BACKOFF_BASE = 2.0  # Base para backoff exponencial
    MIN_WAIT_TIME = 0.5  # Tempo mínimo de espera em segundos
    MAX_WAIT_TIME = 10.0  # Tempo máximo de espera em segundos


class CapturaContinuaConfig:
    """Configurações da captura contínua de XMLs"""
    # Máximo de dias para recuperar automaticamente
    # Evita processamento excessivo se sistema ficar muito tempo parado
    MAX_DIAS_RECUPERACAO = 30
    
    # Horários padrão de execução
    HORA_DOWNLOAD = "09:00"  # Download primeiro (XMLs já prontos)
    HORA_CONSULTA = "10:00"  # Consulta depois (novas solicitações)
    
    # Limite de XMLs por solicitação na SEFAZ
    LIMITE_XMLS_SEFAZ = 3000


# Símbolos para output no terminal
SIMBOLOS = {
    'sucesso': '[OK]',
    'erro': '[ERRO]',
    'info': '[INFO]',
    'aviso': '[AVISO]',
    'login': '[LOGIN]',
    'menu': '[MENU]',
    'fechar': '[FECHAR]',
    'empresa': '[EMPRESA]',
    'download': '[DOWNLOAD]'
}
