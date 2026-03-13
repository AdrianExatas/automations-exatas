"""
Script para limpeza e gerenciamento da pasta logs
"""
import os
import glob
from datetime import datetime, timedelta

def listar_arquivos_logs():
    """Lista todos os arquivos na pasta logs"""
    if not os.path.exists("logs"):
        print("[INFO] Pasta logs não existe")
        return []
    
    arquivos = []
    for arquivo in os.listdir("logs"):
        caminho_completo = os.path.join("logs", arquivo)
        if os.path.isfile(caminho_completo):
            stat = os.stat(caminho_completo)
            tamanho = stat.st_size
            data_modificacao = datetime.fromtimestamp(stat.st_mtime)
            arquivos.append({
                'nome': arquivo,
                'caminho': caminho_completo,
                'tamanho': tamanho,
                'data': data_modificacao
            })
    
    return sorted(arquivos, key=lambda x: x['data'], reverse=True)

def mostrar_arquivos_logs():
    """Mostra informações sobre os arquivos de log"""
    arquivos = listar_arquivos_logs()
    
    if not arquivos:
        print("[INFO] Nenhum arquivo encontrado na pasta logs")
        return
    
    print(f"[INFO] Encontrados {len(arquivos)} arquivos na pasta logs:")
    print("-" * 80)
    print(f"{'Nome':<40} {'Tamanho':<12} {'Data':<20}")
    print("-" * 80)
    
    for arquivo in arquivos:
        tamanho_mb = arquivo['tamanho'] / (1024 * 1024)
        data_str = arquivo['data'].strftime("%Y-%m-%d %H:%M:%S")
        print(f"{arquivo['nome']:<40} {tamanho_mb:.2f} MB{'':<6} {data_str:<20}")

def limpar_logs_antigos(dias=30):
    """Remove arquivos de log mais antigos que o número de dias especificado"""
    arquivos = listar_arquivos_logs()
    data_limite = datetime.now() - timedelta(days=dias)
    
    removidos = 0
    espaco_liberado = 0
    
    for arquivo in arquivos:
        if arquivo['data'] < data_limite:
            try:
                os.remove(arquivo['caminho'])
                removidos += 1
                espaco_liberado += arquivo['tamanho']
                print(f"[OK] Removido: {arquivo['nome']}")
            except Exception as e:
                print(f"[ERRO] Erro ao remover {arquivo['nome']}: {e}")
    
    if removidos > 0:
        espaco_mb = espaco_liberado / (1024 * 1024)
        print(f"\n[SUCESSO] {removidos} arquivos removidos")
        print(f"[INFO] Espaço liberado: {espaco_mb:.2f} MB")
    else:
        print(f"[INFO] Nenhum arquivo mais antigo que {dias} dias encontrado")

def limpar_todos_logs():
    """Remove todos os arquivos da pasta logs (exceto checkpoint)"""
    arquivos = listar_arquivos_logs()
    
    removidos = 0
    espaco_liberado = 0
    
    for arquivo in arquivos:
        # Não remover arquivo de checkpoint
        if arquivo['nome'] == 'omie_checkpoint.txt':
            continue
            
        try:
            os.remove(arquivo['caminho'])
            removidos += 1
            espaco_liberado += arquivo['tamanho']
            print(f"[OK] Removido: {arquivo['nome']}")
        except Exception as e:
            print(f"[ERRO] Erro ao remover {arquivo['nome']}: {e}")
    
    if removidos > 0:
        espaco_mb = espaco_liberado / (1024 * 1024)
        print(f"\n[SUCESSO] {removidos} arquivos removidos")
        print(f"[INFO] Espaço liberado: {espaco_mb:.2f} MB")
    else:
        print("[INFO] Nenhum arquivo para remover")

def main():
    """Menu principal do script"""
    while True:
        print("\n" + "="*50)
        print("GERENCIADOR DE LOGS - Automação Omie")
        print("="*50)
        print("1. Listar arquivos de log")
        print("2. Limpar logs antigos (mais de 30 dias)")
        print("3. Limpar todos os logs (exceto checkpoint)")
        print("4. Sair")
        print("-"*50)
        
        opcao = input("Escolha uma opção (1-4): ").strip()
        
        if opcao == "1":
            mostrar_arquivos_logs()
        elif opcao == "2":
            confirmar = input("Tem certeza que deseja remover logs antigos? (s/N): ").strip().lower()
            if confirmar in ['s', 'sim', 'y', 'yes']:
                limpar_logs_antigos()
            else:
                print("[INFO] Operação cancelada")
        elif opcao == "3":
            confirmar = input("ATENÇÃO: Isso removerá TODOS os logs exceto checkpoint! Tem certeza? (s/N): ").strip().lower()
            if confirmar in ['s', 'sim', 'y', 'yes']:
                limpar_todos_logs()
            else:
                print("[INFO] Operação cancelada")
        elif opcao == "4":
            print("[INFO] Saindo...")
            break
        else:
            print("[ERRO] Opção inválida")

if __name__ == "__main__":
    main()
