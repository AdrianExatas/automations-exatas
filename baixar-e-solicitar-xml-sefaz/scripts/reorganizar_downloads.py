#!/usr/bin/env python3
"""
Script para reorganizar arquivos baixados para a nova estrutura:
empresa/
  - zips/     (arquivos ZIP originais)
  - xmls/     (XMLs extraídos)
"""
import sys
from pathlib import Path

# Adiciona o diretório raiz ao path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.core.config import PATHS
import shutil


def reorganizar_pasta_empresa(pasta_empresa: Path):
    """Reorganiza uma pasta de empresa para a nova estrutura"""
    if not pasta_empresa.is_dir():
        return
    
    pasta_zips = pasta_empresa / "zips"
    pasta_xmls = pasta_empresa / "xmls"
    
    pasta_zips.mkdir(exist_ok=True)
    pasta_xmls.mkdir(exist_ok=True)
    
    movidos_zip = 0
    movidos_xml = 0
    
    # Move arquivos ZIP para zips/
    for item in pasta_empresa.iterdir():
        if item.is_file() and item.suffix.lower() == '.zip':
            destino = pasta_zips / item.name
            if not destino.exists():
                try:
                    shutil.move(str(item), str(destino))
                    movidos_zip += 1
                    print(f"  Movido ZIP: {item.name}")
                except Exception as e:
                    print(f"  Erro ao mover {item.name}: {e}")
    
    # Move pastas extraídas e seus XMLs para xmls/
    for item in pasta_empresa.iterdir():
        if item.is_dir() and item.name not in ['zips', 'xmls']:
            # É uma pasta extraída
            try:
                # Move todos os XMLs da pasta para xmls/
                xmls = list(item.rglob('*.xml'))
                for xml in xmls:
                    destino_xml = pasta_xmls / xml.name
                    # Se já existe, adiciona prefixo do nome da pasta
                    if destino_xml.exists():
                        destino_xml = pasta_xmls / f"{item.name}_{xml.name}"
                    
                    try:
                        shutil.move(str(xml), str(destino_xml))
                        movidos_xml += 1
                    except Exception as e:
                        print(f"    Erro ao mover XML {xml.name}: {e}")
                
                # Remove pasta vazia
                try:
                    item.rmdir()
                    print(f"  Processada pasta: {item.name} ({len(xmls)} XMLs)")
                except:
                    pass  # Pasta não está vazia ou não pode ser removida
                    
            except Exception as e:
                print(f"  Erro ao processar pasta {item.name}: {e}")
    
    if movidos_zip > 0 or movidos_xml > 0:
        print(f"  [OK] Reorganizado: {movidos_zip} ZIPs, {movidos_xml} XMLs")


def main():
    """Reorganiza todos os downloads para a nova estrutura"""
    downloads_dir = PATHS.downloads_dir
    
    if not downloads_dir.exists():
        print(f"Diretório não encontrado: {downloads_dir}")
        return
    
    print("=" * 70)
    print("REORGANIZANDO ARQUIVOS BAIXADOS")
    print("=" * 70)
    print(f"Diretório: {downloads_dir}\n")
    
    total_empresas = 0
    
    # Percorre ano/mês/empresa
    for ano_dir in downloads_dir.iterdir():
        if not ano_dir.is_dir() or not ano_dir.name.isdigit():
            continue
        
        for mes_dir in ano_dir.iterdir():
            if not mes_dir.is_dir() or not mes_dir.name.isdigit():
                continue
            
            for empresa_dir in mes_dir.iterdir():
                if not empresa_dir.is_dir():
                    continue
                
                print(f"\n[{ano_dir.name}/{mes_dir.name}] {empresa_dir.name}:")
                reorganizar_pasta_empresa(empresa_dir)
                total_empresas += 1
    
    print("\n" + "=" * 70)
    print(f"[OK] Reorganizacao concluida! Processadas {total_empresas} empresas.")
    print("=" * 70)


if __name__ == "__main__":
    main()
