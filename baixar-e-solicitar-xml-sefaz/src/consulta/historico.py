"""
Sistema de histórico de execuções para captura contínua de XMLs
Rastreia a última data processada por empresa para permitir recuperação automática
"""
import json
import threading
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Optional, Dict, Any, List

from src.core.config import PATHS
from src.core.constants import CapturaContinuaConfig


# Usa pasta checkpoints configurada
HISTORICO_FILE = PATHS.checkpoints_dir / "historico_execucoes.json"

# Lock para evitar race condition
_historico_lock = threading.Lock()

# Constantes configuráveis
MAX_DIAS_RECUPERACAO = CapturaContinuaConfig.MAX_DIAS_RECUPERACAO


def carregar_historico() -> Dict[str, Any]:
    """
    Carrega o histórico de execuções do arquivo JSON
    
    Returns:
        Dict com histórico de execuções por empresa
    """
    if not HISTORICO_FILE.exists():
        return {
            "empresas": {},
            "ultima_execucao": None,
            "versao": "1.0"
        }
    
    try:
        with open(HISTORICO_FILE, 'r', encoding='utf-8') as f:
            historico = json.load(f)
        
        if "empresas" not in historico:
            historico["empresas"] = {}
        if "ultima_execucao" not in historico:
            historico["ultima_execucao"] = None
        
        return historico
    except json.JSONDecodeError as e:
        print(f"[AVISO] Histórico corrompido (JSON inválido): {e}")
        try:
            backup_path = HISTORICO_FILE.with_suffix('.json.corrupted')
            HISTORICO_FILE.rename(backup_path)
            print(f"   Backup do arquivo corrompido: {backup_path}")
        except Exception:
            pass
        return {"empresas": {}, "ultima_execucao": None, "versao": "1.0"}
    except Exception as e:
        print(f"[AVISO] Erro ao carregar histórico: {e}")
        return {"empresas": {}, "ultima_execucao": None, "versao": "1.0"}


def salvar_historico(historico: Dict[str, Any]) -> bool:
    """
    Salva o histórico de execuções no arquivo JSON
    
    Args:
        historico: Dict com dados do histórico
    
    Returns:
        True se salvo com sucesso, False caso contrário
    """
    PATHS.checkpoints_dir.mkdir(parents=True, exist_ok=True)
    
    with _historico_lock:
        try:
            historico["ultima_execucao"] = datetime.now().isoformat()
            
            with open(HISTORICO_FILE, 'w', encoding='utf-8') as f:
                json.dump(historico, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            print(f"[ERRO] Falha ao salvar histórico: {e}")
            return False


def obter_ultima_data_empresa(inscricao: str) -> Optional[date]:
    """
    Retorna a última data processada para uma empresa específica
    
    Args:
        inscricao: Inscrição municipal da empresa
    
    Returns:
        date da última execução ou None se nunca processada
    """
    historico = carregar_historico()
    empresa_data = historico.get("empresas", {}).get(str(inscricao), {})
    
    if not empresa_data:
        return None
    
    ultima_data_str = empresa_data.get("ultima_data_processada")
    if not ultima_data_str:
        return None
    
    try:
        return datetime.strptime(ultima_data_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def atualizar_data_empresa(
    inscricao: str,
    data_processada: date,
    tipo_arquivo: str = "",
    pesquisar_por: str = ""
) -> bool:
    """
    Atualiza a última data processada para uma empresa
    
    Args:
        inscricao: Inscrição municipal da empresa
        data_processada: Data que foi processada
        tipo_arquivo: Tipo de arquivo (NFE, NFC, CTE)
        pesquisar_por: Tipo de pesquisa
    
    Returns:
        True se atualizado com sucesso
    """
    historico = carregar_historico()
    
    inscricao_str = str(inscricao)
    
    if inscricao_str not in historico["empresas"]:
        historico["empresas"][inscricao_str] = {}
    
    historico["empresas"][inscricao_str].update({
        "ultima_data_processada": data_processada.strftime("%Y-%m-%d"),
        "ultima_atualizacao": datetime.now().isoformat()
    })
    
    if tipo_arquivo:
        historico["empresas"][inscricao_str]["tipo_arquivo"] = tipo_arquivo
    if pesquisar_por:
        historico["empresas"][inscricao_str]["pesquisar_por"] = pesquisar_por
    
    return salvar_historico(historico)


def calcular_dias_pendentes(
    ultima_data: Optional[date],
    data_atual: date,
    max_dias: int = MAX_DIAS_RECUPERACAO
) -> List[date]:
    """
    Calcula lista de datas que precisam ser processadas
    
    Args:
        ultima_data: Última data processada (ou None para primeira execução)
        data_atual: Data até qual processar (geralmente ontem)
        max_dias: Máximo de dias para recuperar
    
    Returns:
        Lista de datas a processar (ordem cronológica)
    """
    if ultima_data is None:
        return [data_atual]
    
    if ultima_data >= data_atual:
        return []
    
    dias_diferenca = (data_atual - ultima_data).days
    
    if dias_diferenca > max_dias:
        print(f"[AVISO] Muitos dias pendentes ({dias_diferenca}). Limitando a {max_dias} dias.")
        data_inicio = data_atual - timedelta(days=max_dias - 1)
    else:
        data_inicio = ultima_data + timedelta(days=1)
    
    dias_pendentes = []
    data_iteracao = data_inicio
    while data_iteracao <= data_atual:
        dias_pendentes.append(data_iteracao)
        data_iteracao += timedelta(days=1)
    
    return dias_pendentes


def obter_resumo_historico() -> Dict[str, Any]:
    """
    Retorna resumo do histórico para exibição
    
    Returns:
        Dict com resumo do histórico
    """
    historico = carregar_historico()
    empresas = historico.get("empresas", {})
    
    if not empresas:
        return {
            "total_empresas": 0,
            "ultima_execucao": None,
            "empresas_detalhes": []
        }
    
    detalhes = []
    for inscricao, dados in empresas.items():
        detalhes.append({
            "inscricao": inscricao,
            "ultima_data": dados.get("ultima_data_processada"),
            "tipo_arquivo": dados.get("tipo_arquivo", "N/A"),
            "pesquisar_por": dados.get("pesquisar_por", "N/A")
        })
    
    detalhes.sort(key=lambda x: x["ultima_data"] or "", reverse=True)
    
    return {
        "total_empresas": len(empresas),
        "ultima_execucao": historico.get("ultima_execucao"),
        "empresas_detalhes": detalhes
    }


def exibir_status_historico():
    """Exibe status do histórico de execuções no console"""
    resumo = obter_resumo_historico()
    
    print("\n" + "=" * 60)
    print("[HISTÓRICO DE EXECUÇÕES]")
    print("=" * 60)
    print(f"Total de empresas rastreadas: {resumo['total_empresas']}")
    
    if resumo['ultima_execucao']:
        print(f"Última execução geral: {resumo['ultima_execucao']}")
    else:
        print("Nenhuma execução registrada ainda.")
    
    if resumo['empresas_detalhes']:
        print("\nÚltimas datas processadas por empresa:")
        for i, emp in enumerate(resumo['empresas_detalhes'][:10], 1):
            print(f"  {i}. {emp['inscricao']}: {emp['ultima_data']} ({emp['tipo_arquivo']})")
        
        if len(resumo['empresas_detalhes']) > 10:
            print(f"  ... e mais {len(resumo['empresas_detalhes']) - 10} empresas")
    
    print("=" * 60 + "\n")


def limpar_historico_empresa(inscricao: str) -> bool:
    """Remove uma empresa específica do histórico"""
    historico = carregar_historico()
    inscricao_str = str(inscricao)
    
    if inscricao_str in historico.get("empresas", {}):
        del historico["empresas"][inscricao_str]
        return salvar_historico(historico)
    
    return True


def limpar_todo_historico() -> bool:
    """Remove todo o histórico (cria backup antes)"""
    if HISTORICO_FILE.exists():
        backup_dir = PATHS.checkpoints_backup_dir
        backup_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = backup_dir / f"historico_execucoes_{timestamp}.json"
        
        try:
            import shutil
            shutil.copy2(HISTORICO_FILE, backup_path)
            print(f"[BACKUP] Criado: {backup_path.name}")
        except Exception as e:
            print(f"[AVISO] Não foi possível criar backup: {e}")
        
        try:
            HISTORICO_FILE.unlink()
            print("[OK] Histórico limpo com sucesso")
            return True
        except Exception as e:
            print(f"[ERRO] Falha ao limpar histórico: {e}")
            return False
    
    return True


def obter_data_ontem() -> date:
    """Retorna a data de ontem (data padrão para processamento)"""
    return date.today() - timedelta(days=1)
