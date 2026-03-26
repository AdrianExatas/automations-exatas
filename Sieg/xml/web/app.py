"""
Servidor Flask principal
"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import sys
import os
import requests
import json
import time

# Adicionar src e web ao path para imports
_project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_web_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_project_root, 'src'))
sys.path.insert(0, _web_dir)

from sieg_xml.config import (
    SIEG_API_KEY,
    API_URL_BASE,
    API_URL_BAIXAR,
    HEADERS,
    inferir_tipo_documento_chave,
)
from sieg_xml.api.endpoints import APIEndpoints
from config import WEB_HOST, WEB_PORT, DEBUG
from utils.job_manager import job_manager
from utils.logger import logger

# Inicializar Flask
app = Flask(__name__, 
            template_folder='templates',
            static_folder='static')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'sieg-xml-secret-key-change-in-production')

# Habilitar CORS para todas as rotas
CORS(app)

# Inicializar SocketIO
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Instanciar endpoints
api_endpoints = APIEndpoints()


@app.route('/')
def index():
    """Página principal"""
    return render_template('index.html')


@app.route('/api/config')
def get_config():
    """
    Retorna configurações para o cliente
    Inclui API Key e URLs da API SIEG
    """
    # Mascarar API Key parcialmente para logs
    api_key_masked = SIEG_API_KEY[:8] + '...' if len(SIEG_API_KEY) > 8 else SIEG_API_KEY
    
    return jsonify({
        'api_key': SIEG_API_KEY,  # Cliente precisa da chave completa
        'api_endpoints': {
            'upload': api_endpoints.get_upload_url(),
            'download': api_endpoints.get_download_url(),
            'verify': api_endpoints.get_verify_url()
        },
        'base_urls': {
            'upload': API_URL_BASE,
            'download': API_URL_BAIXAR
        }
    })


@app.route('/api/job/start', methods=['POST'])
def start_job():
    """Inicia um novo job"""
    try:
        data = request.json
        job_type = data.get('type')  # 'upload', 'download', 'extract'
        user_id = data.get('user_id') or request.remote_addr
        
        if not job_type:
            return jsonify({'error': 'Tipo de job não especificado'}), 400
        
        # Criar job
        job_id = job_manager.create_job(job_type, user_id)
        
        # Log
        logger.log_job_started(job_id, user_id, job_type)
        
        # Notificar via WebSocket
        socketio.emit('job_started', {'job_id': job_id}, room=user_id)
        
        return jsonify({'job_id': job_id})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/job/<job_id>/progress', methods=['POST'])
def update_progress(job_id):
    """Cliente atualiza progresso do job"""
    try:
        data = request.json
        progress = data.get('progress', 0)
        total = data.get('total', 0)
        current = data.get('current', '')
        
        job = job_manager.get_job(job_id)
        if not job:
            return jsonify({'error': 'Job não encontrado'}), 404
        
        # Atualizar progresso
        job_manager.update_progress(job_id, progress, total, current)
        
        # Log
        logger.log_progress(job_id, job['user_id'], progress, total, current)
        
        # Notificar via WebSocket
        socketio.emit('progress_update', {
            'job_id': job_id,
            'progress': progress,
            'total': total,
            'current': current
        }, room=job['user_id'])
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/job/<job_id>/complete', methods=['POST'])
def complete_job(job_id):
    """Cliente reporta conclusão do job"""
    try:
        data = request.json
        result = data.get('result', {})
        
        job = job_manager.get_job(job_id)
        if not job:
            return jsonify({'error': 'Job não encontrado'}), 404
        
        # Marcar como completo
        job_manager.complete_job(job_id, result)
        
        # Log
        logger.log_job_complete(job_id, job['user_id'], result)
        
        # Notificar via WebSocket
        socketio.emit('job_complete', {
            'job_id': job_id,
            'result': result
        }, room=job['user_id'])
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/job/<job_id>/error', methods=['POST'])
def job_error(job_id):
    """Cliente reporta erro no job"""
    try:
        data = request.json
        error = data.get('error', 'Erro desconhecido')
        
        job = job_manager.get_job(job_id)
        if not job:
            return jsonify({'error': 'Job não encontrado'}), 404
        
        # Registrar erro
        job_manager.error_job(job_id, error)
        
        # Log
        logger.log_error(job_id, job['user_id'], error)
        
        # Notificar via WebSocket
        socketio.emit('job_error', {
            'job_id': job_id,
            'error': error
        }, room=job['user_id'])
        
        return jsonify({'success': True})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/job/<job_id>')
def get_job(job_id):
    """Retorna status de um job"""
    job = job_manager.get_job(job_id)
    if not job:
        return jsonify({'error': 'Job não encontrado'}), 404
    
    return jsonify(job)


@app.route('/api/proxy/upload', methods=['POST'])
def proxy_upload():
    """
    Proxy para upload de XML na API SIEG
    Resolve problemas de CORS fazendo a requisição no servidor
    """
    try:
        data = request.json
        xml_base64 = data.get('Xml')
        
        if not xml_base64:
            return jsonify({'error': 'XML não fornecido'}), 400
        
        # Fazer requisição para API SIEG
        url = api_endpoints.get_upload_url()
        response = requests.post(
            url,
            headers=HEADERS,
            json={'Xml': xml_base64},
            timeout=30
        )
        
        if response.ok:
            try:
                return jsonify(response.json())
            except:
                return jsonify({'message': 'Enviado com sucesso'})
        else:
            # Tratamento específico por código de erro
            if response.status_code == 401:
                error_msg = 'Não autorizado - API key inválida ou expirada. Verifique a configuração da API key.'
            elif response.status_code == 500:
                error_msg = 'Erro interno do servidor SIEG - tente novamente mais tarde'
            else:
                error_msg = f'Erro HTTP {response.status_code}'
            
            try:
                error_data = response.json()
                api_error = error_data.get('message') or error_data.get('error') or error_data.get('Message')
                if api_error:
                    error_msg = f'{error_msg}: {api_error}'
            except:
                response_text = response.text[:200] if response.text else ''
                if response_text:
                    error_msg = f'{error_msg}: {response_text}'
            
            logger.log('proxy_upload_error', data={'error': error_msg, 'status': response.status_code, 'url': url})
            return jsonify({'error': error_msg, 'status_code': response.status_code}), response.status_code
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Timeout ao conectar com a API SIEG'}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({'error': 'Erro de conexão com a API SIEG'}), 503
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/proxy/download', methods=['POST', 'OPTIONS'])
def proxy_download():
    """
    Proxy para download de XML na API SIEG
    Resolve problemas de CORS fazendo a requisição no servidor
    Aceita chave como text/plain ou JSON
    """
    # Tratar OPTIONS para CORS
    if request.method == 'OPTIONS':
        response = jsonify({})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        return response
    
    try:
        # Verificar Content-Type
        content_type = request.headers.get('Content-Type', '').lower()
        print(f"[DEBUG] Recebida requisição - Method: {request.method}, Content-Type: {content_type}")
        
        # Ler dados do request - tentar múltiplas formas
        chave = None
        raw_data = None
        
        # Método 1: request.get_data() - sempre funciona
        try:
            raw_data = request.get_data(as_text=True)
            print(f"[DEBUG] get_data() retornou: '{raw_data[:50] if raw_data else 'None'}' (tamanho: {len(raw_data) if raw_data else 0})")
            if raw_data and raw_data.strip():
                chave = raw_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                print(f"[DEBUG] Chave extraída de get_data: '{chave[:10]}...{chave[-4:] if len(chave) > 14 else ''}' (tamanho: {len(chave)})")
        except Exception as e:
            print(f"[ERROR] Erro ao usar get_data(): {str(e)}")
            import traceback
            traceback.print_exc()
        
        # Método 2: request.data (pode estar vazio se get_data() já foi chamado)
        if not chave:
            try:
                if request.data:
                    raw_data = request.data.decode('utf-8')
                    print(f"[DEBUG] request.data retornou: '{raw_data[:50]}' (tamanho: {len(raw_data)})")
                    if raw_data and raw_data.strip():
                        chave = raw_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                        print(f"[DEBUG] Chave extraída de request.data: '{chave[:10]}...' (tamanho: {len(chave)})")
            except Exception as e:
                print(f"[DEBUG] Erro ao usar request.data: {str(e)}")
        
        # Método 3: request.stream (último recurso)
        if not chave:
            try:
                request.stream.seek(0)
                stream_data = request.stream.read().decode('utf-8')
                print(f"[DEBUG] request.stream retornou: '{stream_data[:50]}' (tamanho: {len(stream_data)})")
                if stream_data and stream_data.strip():
                    chave = stream_data.strip().replace('\n', '').replace('\r', '').replace(' ', '')
                    print(f"[DEBUG] Chave extraída de request.stream: '{chave[:10]}...' (tamanho: {len(chave)})")
            except Exception as e:
                print(f"[DEBUG] Erro ao usar request.stream: {str(e)}")
        
        if chave:
            print(f"[DEBUG] Chave completa (para debug): '{chave}'")
        
        # Se ainda não tem chave e é JSON, tentar parsear
        if not chave and 'application/json' in content_type:
            try:
                json_data = request.get_json(force=True)
                if json_data:
                    chave = json_data.get('chave') or json_data.get('chave_acesso')
                    if chave:
                        chave = str(chave).strip()
                        print(f"[DEBUG] Chave extraída de JSON: {chave[:10]}... (tamanho: {len(chave)})")
            except Exception as e:
                print(f"[DEBUG] Erro ao parsear JSON: {str(e)}")
        
        if not chave:
            error_msg = 'Chave não fornecida - verifique se a chave está sendo enviada corretamente'
            print(f"[ERROR] {error_msg}")
            print(f"[ERROR] Content-Type: {content_type}, Method: {request.method}")
            print(f"[ERROR] Headers: {dict(request.headers)}")
            return jsonify({'error': error_msg}), 400
        
        # Validar chave (deve ter 44 caracteres numéricos)
        print(f"[DEBUG] Validando chave - Tamanho: {len(chave)}, É numérica: {chave.isdigit()}, Primeiros 10: {chave[:10]}")
        if len(chave) != 44 or not chave.isdigit():
            error_msg = f'Chave inválida (deve ter 44 dígitos): recebido {len(chave)} caracteres'
            print(f"[ERROR] {error_msg}")
            print(f"[ERROR] Chave recebida: '{chave}'")
            logger.log('proxy_download_error', data={'error': f'Chave inválida: {chave[:10]}...', 'length': len(chave)})
            return jsonify({'error': error_msg}), 400
        
        tipo = inferir_tipo_documento_chave(chave)
        if tipo is None:
            try:
                modelo = int(chave[20:22])
            except (ValueError, IndexError):
                modelo = 0
            error_msg = f'Documento modelo {modelo} não suportado para download (suportados: NFe=55, CTe=57)'
            logger.log('proxy_download_error', data={'chave': chave[:10], 'error': error_msg})
            return jsonify({'error': error_msg}), 400
        
        # Fazer requisição para API SIEG (xmlType inferido pela chave: NFe ou CTe)
        url = api_endpoints.get_download_url(chave_acesso=chave)
        
        # Verificar se API key está configurada
        if not SIEG_API_KEY or SIEG_API_KEY == 'oecN20qEJJ0D8l6IFq7Nvg==':
            logger.log('proxy_download_warning', data={'error': 'API key padrão sendo usada - configure SIEG_API_KEY no .env'})
        
        logger.log('proxy_download_request', data={'chave': chave[:10], 'url': url, 'api_key_length': len(SIEG_API_KEY) if SIEG_API_KEY else 0})
        
        # API SIEG /BaixarXml espera Content-Type application/json com a chave como string JSON pura
        download_headers = {
            'Content-Type': 'application/json',
            'Accept': 'text/xml, application/json, */*'
        }
        
        # Tentar múltiplas vezes se receber erro 400 ou 500 (delay/instabilidade)
        retry_count = 3
        retry_delay = 2  # segundos
        response = None
        
        for tentativa in range(retry_count):
            if tentativa > 0:
                delay = retry_delay * tentativa
                print(f"[DEBUG] Tentativa {tentativa + 1}/{retry_count} após {delay}s de delay...")
                time.sleep(delay)
            
            response = requests.post(
                url,
                headers=download_headers,
                data=json.dumps(chave),
                timeout=30
            )
            
            if response.status_code == 200:
                break
            if response.status_code not in (400, 500, 502, 503, 504):
                break
        
        if response.ok:
            xml_content = response.text.strip()
            
            # Resposta 200 pode ser JSON (DownloadResponse: Status, Codigo, Mensagens) ou XML direto
            if xml_content.startswith('{'):
                try:
                    data = json.loads(xml_content)
                    if data.get('error') or ('error' in xml_content.lower() and data.get('message')):
                        error_msg = data.get('message') or data.get('error') or 'Erro desconhecido'
                        logger.log('proxy_download_error', data={'chave': chave[:10], 'error': error_msg})
                        return jsonify({'error': error_msg}), 400
                    xml_content = data.get('Codigo') or data.get('codigo')
                    if data.get('Mensagens'):
                        xml_content = xml_content or data['Mensagens'][0]
                    if not xml_content:
                        xml_content = ''
                except (json.JSONDecodeError, TypeError):
                    if 'error' in xml_content.lower():
                        error_msg = json.loads(xml_content).get('message', xml_content[:200])
                        return jsonify({'error': error_msg}), 400
                    xml_content = response.text
            
            if isinstance(xml_content, str) and xml_content.startswith('"') and xml_content.endswith('"'):
                try:
                    xml_content = json.loads(xml_content)
                except Exception:
                    pass
            
            if not (xml_content and str(xml_content).strip().startswith('<')):
                logger.log('proxy_download_error', data={'chave': chave[:10], 'error': 'Resposta não é XML válido'})
                return jsonify({'error': f'Resposta não é XML válido: {str(xml_content)[:100]}'}), 400
            
            logger.log('proxy_download_success', data={'chave': chave[:10]})
            return xml_content, 200, {'Content-Type': 'text/xml; charset=utf-8'}
        else:
            # Tratamento específico por código de erro
            if response.status_code == 401:
                error_msg = 'Não autorizado - API key inválida ou expirada. Verifique a configuração da API key no arquivo .env'
            elif response.status_code == 400:
                error_msg = 'Erro na requisição (400) - O XML pode não estar disponível para download via API ainda. Isso pode acontecer se o XML foi enviado recentemente e ainda está sendo processado pelo SIEG. Tente novamente em alguns minutos ou verifique no site do SIEG se o XML está disponível.'
            elif response.status_code == 404:
                error_msg = 'XML não encontrado - a chave pode não existir na base da SIEG'
            elif response.status_code == 500:
                error_msg = 'Erro interno do servidor SIEG - tente novamente mais tarde ou entre em contato com o suporte'
            else:
                error_msg = f'Erro HTTP {response.status_code}'
            
            # Tentar obter mensagem de erro detalhada da API
            response_text = ''
            try:
                # Primeiro tentar como JSON
                error_data = response.json()
                api_error = error_data.get('message') or error_data.get('error') or error_data.get('Message') or error_data.get('msg')
                if api_error:
                    error_msg = f'{error_msg}: {api_error}'
                    print(f"[DEBUG] Erro da API (JSON): {api_error}")
                else:
                    # Se não encontrou mensagem, usar o JSON completo como string
                    response_text = json.dumps(error_data)
                    print(f"[DEBUG] Erro da API (JSON completo): {response_text[:200]}")
            except Exception as e:
                # Se não for JSON, ler como texto
                response_text = response.text[:500] if response.text else ''
                print(f"[DEBUG] Erro ao parsear JSON da API: {str(e)}")
                print(f"[DEBUG] Resposta da API (texto): {response_text[:200]}")
            
            # Se ainda não temos uma mensagem detalhada e temos texto da resposta
            if response_text and not error_msg.endswith(response_text[:100]):
                # Verificar se o texto contém informações úteis
                if response_text.strip() and not response_text.strip().startswith('<'):
                    # Se não é XML, adicionar como mensagem de erro
                    if len(response_text) > 200:
                        error_msg = f'{error_msg}: {response_text[:200]}...'
                    else:
                        error_msg = f'{error_msg}: {response_text}'
            
            print(f"[ERROR] Erro ao baixar XML - Chave: {chave[:10]}..., Status: {response.status_code}, Mensagem: {error_msg}")
            
            # Log detalhado para debug
            logger.log('proxy_download_error', data={
                'chave': chave[:10], 
                'error': error_msg, 
                'status': response.status_code,
                'response_preview': response_text[:100] if response_text else None,
                'headers': dict(response.headers) if hasattr(response, 'headers') else None
            })
            
            return jsonify({'error': error_msg, 'status_code': response.status_code}), response.status_code
            
    except requests.exceptions.Timeout:
        logger.log('proxy_download_error', data={'error': 'Timeout'})
        return jsonify({'error': 'Timeout ao conectar com a API SIEG'}), 504
    except requests.exceptions.ConnectionError as e:
        logger.log('proxy_download_error', data={'error': f'Erro de conexão: {str(e)}'})
        return jsonify({'error': 'Erro de conexão com a API SIEG'}), 503
    except Exception as e:
        logger.log('proxy_download_error', data={'error': str(e)})
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Erro interno: {str(e)}'}), 500


# Handlers WebSocket
@socketio.on('connect')
def handle_connect():
    """Cliente conectou via WebSocket"""
    user_id = request.remote_addr
    logger.log('websocket_connect', user_id=user_id)
    emit('connected', {'status': 'ok', 'user_id': user_id})


@socketio.on('disconnect')
def handle_disconnect():
    """Cliente desconectou via WebSocket"""
    user_id = request.remote_addr
    logger.log('websocket_disconnect', user_id=user_id)


@socketio.on('join_room')
def handle_join_room(data):
    """Cliente quer entrar em uma sala (para receber atualizações)"""
    user_id = data.get('user_id') or request.remote_addr
    # SocketIO usa sessões, não precisamos de salas explícitas
    emit('room_joined', {'user_id': user_id})


# Limpar jobs antigos periodicamente
@socketio.on('ping')
def handle_ping():
    """Ping do cliente - aproveitar para limpar jobs antigos"""
    job_manager.cleanup_old_jobs()
    emit('pong')


def create_app():
    """Factory function para criar a aplicação"""
    return app


if __name__ == '__main__':
    # Limpar logs antigos na inicialização
    logger.cleanup()
    
    # Iniciar servidor
    print(f"Iniciando servidor SIEG XML Web")
    print(f"Host: {WEB_HOST}")
    print(f"Port: {WEB_PORT}")
    print(f"Acesse: http://{WEB_HOST}:{WEB_PORT}")
    
    socketio.run(app, host=WEB_HOST, port=WEB_PORT, debug=DEBUG)
