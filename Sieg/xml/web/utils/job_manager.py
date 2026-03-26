"""
Gerenciamento de jobs
"""
import uuid
import time
from datetime import datetime, timedelta
from typing import Dict, Optional
from threading import Lock
from config import JOB_MAX_AGE, JOB_CLEANUP_INTERVAL


class JobManager:
    """Gerencia o estado dos jobs"""
    
    def __init__(self):
        self.jobs: Dict[str, dict] = {}
        self.lock = Lock()
        self.last_cleanup = time.time()
    
    def create_job(self, job_type: str, user_id: str = None) -> str:
        """
        Cria um novo job
        
        Args:
            job_type: Tipo do job ('upload', 'download', 'extract')
            user_id: ID do usuário (IP ou identificador)
            
        Returns:
            ID do job criado
        """
        job_id = str(uuid.uuid4())
        
        with self.lock:
            self.jobs[job_id] = {
                'id': job_id,
                'type': job_type,
                'user_id': user_id,
                'status': 'running',
                'started_at': datetime.now().isoformat(),
                'progress': 0,
                'total': 0,
                'current': '',
                'result': None,
                'errors': [],
                'updated_at': time.time()
            }
        
        return job_id
    
    def get_job(self, job_id: str) -> Optional[dict]:
        """Retorna informações de um job"""
        with self.lock:
            return self.jobs.get(job_id)
    
    def update_progress(self, job_id: str, progress: int, total: int, current: str = ''):
        """Atualiza o progresso de um job"""
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]['progress'] = progress
                self.jobs[job_id]['total'] = total
                self.jobs[job_id]['current'] = current
                self.jobs[job_id]['updated_at'] = time.time()
    
    def complete_job(self, job_id: str, result: dict):
        """Marca um job como concluído"""
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]['status'] = 'completed'
                self.jobs[job_id]['result'] = result
                self.jobs[job_id]['completed_at'] = datetime.now().isoformat()
                self.jobs[job_id]['updated_at'] = time.time()
    
    def error_job(self, job_id: str, error: str):
        """Marca um job como erro"""
        with self.lock:
            if job_id in self.jobs:
                self.jobs[job_id]['status'] = 'error'
                self.jobs[job_id]['errors'].append(error)
                self.jobs[job_id]['updated_at'] = time.time()
    
    def cleanup_old_jobs(self):
        """Remove jobs antigos"""
        current_time = time.time()
        
        # Limpar apenas periodicamente
        if current_time - self.last_cleanup < JOB_CLEANUP_INTERVAL:
            return
        
        with self.lock:
            cutoff_time = current_time - JOB_MAX_AGE
            jobs_to_remove = [
                job_id for job_id, job in self.jobs.items()
                if job['updated_at'] < cutoff_time
            ]
            
            for job_id in jobs_to_remove:
                del self.jobs[job_id]
        
        self.last_cleanup = current_time


# Instância global
job_manager = JobManager()
