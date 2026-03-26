"""
Configurações do servidor web
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

# Configurações do servidor
WEB_HOST = os.getenv('WEB_HOST', '0.0.0.0')
WEB_PORT = int(os.getenv('WEB_PORT', 5000))
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Pastas
BASE_DIR = Path(__file__).parent.parent
LOG_DIR = BASE_DIR / os.getenv('LOG_DIR', 'logs')
UPLOAD_DIR = BASE_DIR / 'uploads_temp'

# Criar pastas se não existirem
LOG_DIR.mkdir(exist_ok=True, parents=True)
UPLOAD_DIR.mkdir(exist_ok=True, parents=True)

# Configurações de upload
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500MB
ALLOWED_EXTENSIONS = {'xml', 'xlsx', 'xls'}

# Configurações de jobs
JOB_TIMEOUT = 3600  # 1 hora
JOB_CLEANUP_INTERVAL = 3600  # Limpar jobs antigos a cada 1 hora
JOB_MAX_AGE = 86400  # Jobs expiram em 24 horas

# Configurações de logs
LOG_RETENTION_DAYS = 30
