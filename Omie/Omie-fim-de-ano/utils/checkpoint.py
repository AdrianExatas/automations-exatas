"""
Módulo para gerenciamento de checkpoints
"""
import os


def salvar_checkpoint(checkpoint_file, valor):
    """
    Salva um valor como checkpoint
    
    Args:
        checkpoint_file: Caminho do arquivo de checkpoint
        valor: Valor a ser salvo
    """
    import os
    
    # Criar pasta logs se não existir
    os.makedirs("logs", exist_ok=True)
    
    with open(checkpoint_file, "w") as f:
        f.write(str(valor))


def ler_checkpoint(checkpoint_file):
    """
    Lê o último valor salvo como checkpoint
    
    Args:
        checkpoint_file: Caminho do arquivo de checkpoint
        
    Returns:
        Valor do checkpoint ou None se não existir
    """
    if os.path.exists(checkpoint_file):
        with open(checkpoint_file, "r") as f:
            return f.read().strip()
    return None


def limpar_checkpoint(checkpoint_file):
    """
    Remove o arquivo de checkpoint
    
    Args:
        checkpoint_file: Caminho do arquivo de checkpoint
    """
    if os.path.exists(checkpoint_file):
        os.remove(checkpoint_file)
