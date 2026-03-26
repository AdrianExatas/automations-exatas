"""
Script de configuração do projeto
"""
import os
import shutil

def setup_project():
    """Configura o projeto criando arquivos necessários"""
    
    # Verificar se config.env existe, se não, criar a partir do exemplo
    if not os.path.exists('config.env'):
        if os.path.exists('config.env.example'):
            shutil.copy('config.env.example', 'config.env')
            print("[OK] Arquivo config.env criado a partir do exemplo")
            print("[AVISO] Lembre-se de editar o config.env com suas credenciais")
        else:
            # Criar config.env básico
            with open('config.env', 'w') as f:
                f.write("# Configurações do projeto\n")
                f.write("EMAIL=seu_email@exemplo.com\n")
                f.write("SENHA=sua_senha_aqui\n")
            print("[OK] Arquivo config.env criado")
            print("[AVISO] Lembre-se de editar o config.env com suas credenciais")
    else:
        print("[OK] Arquivo config.env já existe")
    
    # Criar diretórios necessários se não existirem
    directories = ['logs', 'src', 'utils', 'config']
    for directory in directories:
        if not os.path.exists(directory):
            os.makedirs(directory)
            print(f"[OK] Diretório {directory} criado")
        else:
            print(f"[OK] Diretório {directory} já existe")
    
    print("\n[SUCESSO] Configuração concluída!")
    print("[INFO] Próximos passos:")
    print("1. Edite o arquivo config.env com suas credenciais")
    print("2. Instale as dependências: pip install -r requirements.txt")
    print("3. Execute o projeto: python main.py")

if __name__ == "__main__":
    setup_project()
