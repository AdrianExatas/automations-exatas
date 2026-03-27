#!/usr/bin/env python3
"""
Script para limpar arquivos ZIP que ficaram presos na pasta base
e movê-los para a estrutura organizada correta.
"""
import sys
from pathlib import Path
import shutil

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.config import PATHS
from src.download.downloader import _parse_nome_empresa_e_ano_mes
import re

downloads_dir = PATHS.downloads_dir

def mover_arquivo_preso(arquivo_zip: Path) -> bool:
    """Move um arquivo ZIP preso para a estrutura organizada"""
    try:
        nome_sem_ext = arquivo_zip.stem
        
        # Tenta extrair dt_solicitacao do nome
        dt_solicitacao = None
        # Procura por padrão de timestamp no final (YYYYMMDDHHMMSS ou similar)
        match = re.search(r'_(\d{14})$', nome_sem_ext)
        if match:
            dt_solicitacao = match.group(1)
        
        empresa, ano, mes = _parse_nome_empresa_e_ano_mes(nome_sem_ext, dt_solicitacao)
        
        # Determina tipo (verifica se já tem prefixo)
        tipo_download = None
        if nome_sem_ext.startswith("NFE_"):
            tipo_download = "NFE"
            nome_base = nome_sem_ext[4:]  # Remove prefixo
        elif nome_sem_ext.startswith("NFC_"):
            tipo_download = "NFC"
            nome_base = nome_sem_ext[4:]
        elif nome_sem_ext.startswith("CTE_"):
            tipo_download = "CTE"
            nome_base = nome_sem_ext[4:]
        else:
            # Sem prefixo, tenta identificar pelo nome ou assume NFE
            tipo_download = "NFE"
            nome_base = nome_sem_ext
        
        # Adiciona prefixo se necessário
        if tipo_download:
            nome_com_tipo = f"{tipo_download}_{nome_base}" if not nome_sem_ext.startswith(f"{tipo_download}_") else nome_sem_ext
        else:
            nome_com_tipo = nome_sem_ext
        
        # Cria estrutura de destino
        destino_dir = downloads_dir / ano / mes / empresa
        pasta_zips = destino_dir / "zips"
        pasta_zips.mkdir(parents=True, exist_ok=True)
        
        destino_final = pasta_zips / f"{nome_com_tipo}.zip"
        
        # Se já existe no destino, apenas remove da pasta base
        if destino_final.exists():
            print(f"  ⏭️ Já existe no destino, removendo da pasta base...")
            arquivo_zip.unlink()
            return True
        
        # Move o arquivo
        shutil.move(str(arquivo_zip), str(destino_final))
        print(f"  [OK] Movido: {arquivo_zip.name}")
        print(f"    Para: {destino_dir.name}/zips/")
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao mover {arquivo_zip.name}: {e}")
        return False


def main():
    """Limpa arquivos ZIP presos na pasta base"""
    print("=" * 70)
    print("LIMPEZA DE ARQUIVOS PRESOS NA PASTA BASE")
    print("=" * 70)
    print(f"Diretório: {downloads_dir}\n")
    
    # Procura arquivos ZIP diretamente na pasta base
    zips_presos = [f for f in downloads_dir.iterdir() 
                   if f.is_file() and f.suffix.lower() == '.zip']
    
    if not zips_presos:
        print("[OK] Nenhum arquivo ZIP encontrado na pasta base.")
        return
    
    print(f"Encontrados {len(zips_presos)} arquivo(s) ZIP na pasta base:\n")
    
    movidos = 0
    erros = 0
    
    for zip_file in zips_presos:
        print(f"Processando: {zip_file.name}")
        if mover_arquivo_preso(zip_file):
            movidos += 1
        else:
            erros += 1
        print()
    
    print("=" * 70)
    print(f"[OK] Concluido: {movidos} movidos, {erros} erros")
    print("=" * 70)


if __name__ == "__main__":
    main()
