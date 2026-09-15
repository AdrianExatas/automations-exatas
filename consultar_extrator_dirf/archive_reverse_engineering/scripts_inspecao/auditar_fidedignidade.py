import pandas as pd

df_all = pd.read_excel('relatorios/Comparacao_Valor_Sistema_eSocial.xlsx', sheet_name='Conciliacao Completa')
print(f"Total de registros na Conciliação Completa: {len(df_all)}")

# Verificar quantos registros têm eSocial zerado vs Sistema zerado
apenas_no_sistema = df_all[(df_all['ESOCIAL_RENDTRIB_TOTAL'] == 0) & (df_all['ESOCIAL_PREV_TOTAL'] == 0) & (df_all['ESOCIAL_IRRF_TOTAL'] == 0)]
apenas_no_esocial = df_all[(df_all['SISTEMA_RENDTRIB_TOTAL'] == 0) & (df_all['SISTEMA_PREV_TOTAL'] == 0) & (df_all['SISTEMA_IRRF_TOTAL'] == 0)]
ambos_tem_dados   = df_all[(~df_all.index.isin(apenas_no_sistema.index)) & (~df_all.index.isin(apenas_no_esocial.index))]

print(f"1. Registros que existem APENAS no Sistema (eSocial zerado): {len(apenas_no_sistema)} ({len(apenas_no_sistema)/len(df_all)*100:.1f}%)")
print(f"2. Registros que existem APENAS no eSocial (Sistema zerado): {len(apenas_no_esocial)} ({len(apenas_no_esocial)/len(df_all)*100:.1f}%)")
print(f"3. Registros onde AMBOS têm dados na mesma competência:    {len(ambos_tem_dados)} ({len(ambos_tem_dados)/len(df_all)*100:.1f}%)")

if not ambos_tem_dados.empty:
    ambos_conciliados = ambos_tem_dados[ambos_tem_dados['STATUS'] == 'CONCILIADO']
    ambos_divergentes = ambos_tem_dados[ambos_tem_dados['STATUS'] == 'COM DIVERGÊNCIA']
    print(f"\nDos registros que existem em AMBOS:")
    print(f"  - Conciliados (100% batimento): {len(ambos_conciliados)} ({len(ambos_conciliados)/len(ambos_tem_dados)*100:.1f}%)")
    print(f"  - Divergentes reais:            {len(ambos_divergentes)} ({len(ambos_divergentes)/len(ambos_tem_dados)*100:.1f}%)")

# Verificar competências dos registros que existem apenas no sistema
print("\nDistribuição de Anos dos registros 'Apenas no Sistema':")
anos_sis = pd.to_datetime(apenas_no_sistema['COMPETENCIA_REF']).dt.year.value_counts().sort_index()
print(anos_sis)
