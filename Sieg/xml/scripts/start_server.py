"""
Script para iniciar o servidor web
"""
import sys
import os
from pathlib import Path

# Adicionar raiz do projeto ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Verificar dependências
try:
    import flask
    import flask_socketio
    from dotenv import load_dotenv
except ImportError as e:
    print(f"ERRO: Dependência não encontrada: {e}")
    print("Execute: pip install -r requirements.txt")
    sys.exit(1)

# Carregar variáveis de ambiente
load_dotenv()

# Criar pastas necessárias
logs_dir = project_root / 'logs'
uploads_dir = project_root / 'uploads_temp'

logs_dir.mkdir(exist_ok=True, parents=True)
uploads_dir.mkdir(exist_ok=True, parents=True)

# Importar e iniciar aplicação
from web.app import app, socketio
from web.config import WEB_HOST, WEB_PORT, DEBUG

if __name__ == '__main__':
    print("=" * 60)
    print("SIEG XML - Servidor Web")
    print("=" * 60)
    print(f"Host: {WEB_HOST}")
    print(f"Port: {WEB_PORT}")
    print(f"Debug: {DEBUG}")
    print(f"URL: http://{WEB_HOST if WEB_HOST != '0.0.0.0' else 'localhost'}:{WEB_PORT}")
    print("=" * 60)
    print()
    
    try:
        socketio.run(app, host=WEB_HOST, port=WEB_PORT, debug=DEBUG, allow_unsafe_werkzeug=True)
    except KeyboardInterrupt:
        print("\n\nServidor interrompido pelo usuário")
    except Exception as e:
        print(f"\n\nERRO ao iniciar servidor: {e}")
        sys.exit(1)
