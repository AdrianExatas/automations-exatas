"""
Gerenciamento de logs
"""
import json
import os
from datetime import datetime
from pathlib import Path
from config import LOG_DIR, LOG_RETENTION_DAYS


class Logger:
    """Logger para eventos da aplicação"""
    
    def __init__(self):
        self.log_dir = Path(LOG_DIR)
        self.log_dir.mkdir(exist_ok=True, parents=True)
    
    def _get_log_file(self, log_type='app'):
        """Retorna o arquivo de log do dia atual"""
        today = datetime.now().strftime('%Y-%m-%d')
        return self.log_dir / f'{log_type}_{today}.log'
    
    def _cleanup_old_logs(self):
        """Remove logs antigos"""
        if not self.log_dir.exists():
            return
        
        cutoff_date = datetime.now().timestamp() - (LOG_RETENTION_DAYS * 86400)
        
        for log_file in self.log_dir.glob('*.log'):
            if log_file.stat().st_mtime < cutoff_date:
                try:
                    log_file.unlink()
                except Exception:
                    pass  # Ignorar erros na limpeza
    
    def log(self, event_type, job_id=None, user_id=None, data=None, log_type='app'):
        """
        Registra um evento
        
        Args:
            event_type: Tipo do evento (job_started, progress, complete, error)
            job_id: ID do job (opcional)
            user_id: ID do usuário/IP (opcional)
            data: Dados adicionais (opcional)
            log_type: Tipo de log ('app' ou 'jobs')
        """
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'event': event_type
        }
        
        if job_id:
            log_entry['job_id'] = job_id
        if user_id:
            log_entry['user_id'] = user_id
        if data:
            log_entry['data'] = data
        
        log_file = self._get_log_file(log_type)
        
        try:
            with open(log_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(log_entry, ensure_ascii=False) + '\n')
        except Exception as e:
            print(f"Erro ao escrever log: {e}")
    
    def log_job_started(self, job_id, user_id, job_type):
        """Log quando um job é iniciado"""
        self.log('job_started', job_id, user_id, {'type': job_type}, 'jobs')
    
    def log_progress(self, job_id, user_id, progress, total, current):
        """Log de progresso"""
        self.log('progress', job_id, user_id, {
            'progress': progress,
            'total': total,
            'current': current
        }, 'jobs')
    
    def log_job_complete(self, job_id, user_id, result):
        """Log quando um job é concluído"""
        self.log('job_complete', job_id, user_id, {'result': result}, 'jobs')
    
    def log_error(self, job_id, user_id, error):
        """Log de erro"""
        self.log('error', job_id, user_id, {'error': str(error)}, 'jobs')
    
    def cleanup(self):
        """Limpa logs antigos"""
        self._cleanup_old_logs()


# Instância global
logger = Logger()
