"""
Script CLI para extrair chaves de XML de planilhas Excel ou arquivos SPED (.txt)
"""
import sys
import os
import argparse
from pathlib import Path

# Adicionar src ao path para importar módulos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from sieg_xml.core.chave_extractor import processar_arquivo
from sieg_xml.utils.ui_utils import selecionar_planilha
import pandas as pd


def main():
    """Função principal"""
    # Configurar parser de argumentos
    parser = argparse.ArgumentParser(description='Extrair chaves de acesso de XMLs')
    parser.add_argument('--arquivo', '--file', '--planilha_saida', '--pasta_xmls', 
                       type=str, help='Caminho do arquivo de entrada (Excel ou TXT)')
    parser.add_argument('--gerar_txt', action='store_true', 
                       help='Gerar arquivo TXT além do Excel')
    parser.add_argument('--output_txt', action='store_true',
                       help='Gerar arquivo TXT além do Excel')
    
    args = parser.parse_args()
    
    print("="*60)
    print("SIEG - Extrair Chaves de Acesso")
    print("="*60)
    
    # Determinar arquivo de entrada
    arquivo_selecionado = None
    
    # Se arquivo foi passado como parâmetro, usar ele
    if args.arquivo:
        arquivo_selecionado = args.arquivo
    else:
        # Se executado via hub, NUNCA abrir seleção interativa (apenas Streamlit)
        if os.environ.get('HUB_EXECUTION') == '1':
            print("\nErro: Arquivo não fornecido como parâmetro.")
            print("Selecione o arquivo na interface do hub e clique em Executar.")
            sys.exit(1)
        # Modo standalone: usar seleção interativa
        print("\nSelecione uma planilha Excel (.xlsx, .xls) ou arquivo SPED (.txt)")
        print("As chaves de acesso (44 dígitos) serão extraídas automaticamente.\n")
        arquivo_selecionado = selecionar_planilha()
    
    if not arquivo_selecionado:
        print("\nOperação cancelada.")
        sys.exit(1)
    
    arquivo_path = Path(arquivo_selecionado)
    
    # Verificar se o arquivo existe
    if not arquivo_path.exists():
        print(f"\nErro: Arquivo não encontrado: {arquivo_selecionado}")
        return
    
    print(f"\nProcessando arquivo: {arquivo_path.name}")
    print("-" * 60)
    
    try:
        # Usa a função genérica que detecta automaticamente o tipo de arquivo
        chaves = processar_arquivo(str(arquivo_path))
        
        if not chaves:
            print(f"\nNenhuma chave de acesso encontrada no arquivo.")
            return
        
        # Cria DataFrame com as chaves
        df_resultado = pd.DataFrame({
            'Chave XML': chaves
        })
        
        # Remove duplicatas (caso existam)
        df_resultado = df_resultado.drop_duplicates(subset=['Chave XML'], keep='first')
        
        # Ordena por chave
        df_resultado = df_resultado.sort_values('Chave XML').reset_index(drop=True)
        
        # Determinar se deve gerar TXT (sempre gerar quando executado via hub)
        # Sempre gerar TXT por padrão (quando executado via hub, sempre terá os flags)
        gerar_txt = True
        
        # Salva em uma nova planilha Excel
        arquivo_excel_saida = 'chaves_xml_consolidadas.xlsx'
        df_resultado.to_excel(arquivo_excel_saida, index=False)
        
        # Salva também em arquivo TXT (uma chave por linha)
        arquivos_gerados = [arquivo_excel_saida]
        if gerar_txt:
            arquivo_txt_saida = 'chaves_xml_consolidadas.txt'
            with open(arquivo_txt_saida, 'w', encoding='utf-8') as f:
                for chave in df_resultado['Chave XML']:
                    f.write(f"{chave}\n")
            arquivos_gerados.append(arquivo_txt_saida)
        
        print(f"\n{'='*60}")
        print(f"Processamento concluído!")
        print(f"Total de chaves únicas encontradas: {len(df_resultado)}")
        for arquivo in arquivos_gerados:
            print(f"Arquivo gerado: {arquivo}")
        print(f"{'='*60}")
        
    except Exception as e:
        print(f"\nErro ao processar arquivo: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == '__main__':
    main()
