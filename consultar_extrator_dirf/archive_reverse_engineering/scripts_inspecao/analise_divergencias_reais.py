import pandas as pd

df = pd.read_excel('relatorios/Comparacao_Valor_Sistema_eSocial.xlsx', sheet_name='Conciliacao Completa')

# Filtrar apenas onde ambos existem (eSocial > 0 e Sistema > 0) e têm divergência
ambos_com_dados = df[(df['ESOCIAL_RENDTRIB_TOTAL'] > 0) | (df['ESOCIAL_PREV_TOTAL'] > 0) | (df['ESOCIAL_IRRF_TOTAL'] > 0)]
ambos_com_dados = ambos_com_dados[(ambos_com_dados['SISTEMA_RENDTRIB_TOTAL'] > 0) | (ambos_com_dados['SISTEMA_PREV_TOTAL'] > 0) | (ambos_com_dados['SISTEMA_IRRF_TOTAL'] > 0)]

div_reais = ambos_com_dados[ambos_com_dados['STATUS'] == 'COM DIVERGÊNCIA'].copy()
print(f"Total divergências reais com dados em ambos os lados: {len(div_reais)}")

# Contar por tipo de rubrica que diverge
div_rendtrib = (div_reais['DIF_RENDTRIB'].abs() > 0.01).sum()
div_prev = (div_reais['DIF_PREVIDENCIA'].abs() > 0.01).sum()
div_dep = (div_reais['DIF_DEPENDENTES'].abs() > 0.01).sum()
div_saude = (div_reais['DIF_PLANO_SAUDE'].abs() > 0.01).sum()
div_irrf = (div_reais['DIF_IRRF'].abs() > 0.01).sum()
div_isentos = (div_reais['DIF_ISENTOS'].abs() > 0.01).sum()

print("\nDetalhamento dos tipos de divergência real:")
print(f"  - Divergência em Rendimentos Tributáveis: {div_rendtrib}")
print(f"  - Divergência em Previdência Oficial:    {div_prev}")
print(f"  - Divergência em Dependentes:            {div_dep}")
print(f"  - Divergência em Plano de Saúde:         {div_saude}")
print(f"  - Divergência em IRRF Retido:            {div_irrf}")
print(f"  - Divergência em Rendimentos Isentos:    {div_isentos}")

print("\nTop 5 Exemplos de Divergência Real:")
cols_view = ['CODI_EMP', 'NOME_EMP', 'COMPETENCIA_REF', 'CPF', 'NOME_COLABORADOR', 'DETALHES_DIVERGENCIA']
for _, r in div_reais[cols_view].head(8).iterrows():
    print(f"\nEmp {r['CODI_EMP']} | {str(r['COMPETENCIA_REF'])[:7]} | CPF {r['CPF']} ({r['NOME_COLABORADOR']}):")
    print(f"  {r['DETALHES_DIVERGENCIA']}")
