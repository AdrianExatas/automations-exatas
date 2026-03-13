"""
Utilitários para manipulação de dados
"""
import pandas as pd
from .logger import log_event


def carregar_dados_macro(arquivo, log_widget):
    """Carrega os dados da planilha MACRO.xlsx"""
    try:
        df = pd.read_excel(arquivo)
        
        # Verificar se as colunas necessárias existem
        colunas_necessarias = ['CNPJ', 'VALOR UNITÁRIO DO ITEM', 'Vigencia inicial', 'Vigencia Final']
        colunas_faltando = [col for col in colunas_necessarias if col not in df.columns]
        
        if colunas_faltando:
            log_event(log_widget, f"[ERRO] Colunas não encontradas: {colunas_faltando}")
            log_event(log_widget, f"[NAVEGACAO] Colunas disponíveis: {list(df.columns)}")
            return pd.DataFrame()
        
        # Limpar dados
        df = df.dropna(subset=['CNPJ'])
        df['CNPJ'] = df['CNPJ'].astype(str).str.replace(r'[^\d]', '', regex=True)
        
        log_event(log_widget, f"[OK] Carregados {len(df)} registros da planilha")
        return df
        
    except Exception as e:
        log_event(log_widget, f"[ERRO] Erro ao ler a planilha: {e}")
        return pd.DataFrame()




def formatar_valor_monetario(valor):
    """Formata valor monetário para o formato brasileiro (com vírgula)"""
    try:
        # Converter para string se não for
        valor_str = str(valor)
        
        # Se contém ponto, substituir por vírgula (formato brasileiro)
        if '.' in valor_str:
            valor_str = valor_str.replace('.', ',')
        
        # Se não tem vírgula, adicionar ,00
        if ',' not in valor_str:
            valor_str = valor_str + ',00'
        
        return valor_str
    except:
        return str(valor)
