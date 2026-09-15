import pandas as pd

df_all = pd.read_excel('relatorios/Comparacao_Valor_Sistema_eSocial.xlsx', sheet_name='Conciliacao Completa')

# Vamos avaliar as competências de cada empresa
# Para cada empresa, qual é o período do eSocial presente no Extrator?
empresas_periodo = df_all[df_all['ESOCIAL_RENDTRIB_TOTAL'] + df_all['ESOCIAL_PREV_TOTAL'] + df_all['ESOCIAL_IRRF_TOTAL'] > 0].groupby('CODI_EMP')['COMPETENCIA_REF'].agg(['min', 'max']).reset_index()

df_merged = pd.merge(df_all, empresas_periodo, on='CODI_EMP', how='left')

# Classificação precisa
def classificar(r):
    es_tem = (r['ESOCIAL_RENDTRIB_TOTAL'] != 0 or r['ESOCIAL_PREV_TOTAL'] != 0 or r['ESOCIAL_IRRF_TOTAL'] != 0 or r['ESOCIAL_ISENTOS_TOTAL'] != 0)
    sis_tem = (r['SISTEMA_RENDTRIB_TOTAL'] != 0 or r['SISTEMA_PREV_TOTAL'] != 0 or r['SISTEMA_IRRF_TOTAL'] != 0 or r['SISTEMA_ISENTOS_TOTAL'] != 0)
    
    if es_tem and sis_tem:
        dif_tot = abs(r['DIF_RENDTRIB']) + abs(r['DIF_PREVIDENCIA']) + abs(r['DIF_IRRF']) + abs(r['DIF_DEPENDENTES']) + abs(r['DIF_PLANO_SAUDE']) + abs(r['DIF_ISENTOS'])
        if dif_tot <= 0.01:
            return "CONCILIADO (100% OK)"
        else:
            return "DIVERGÊNCIA REAL DE VALOR"
    elif sis_tem and not es_tem:
        # Está dentro do período extraído da empresa?
        if pd.notnull(r['min']) and r['COMPETENCIA_REF'] >= r['min'] and r['COMPETENCIA_REF'] <= r['max']:
            return "PENDENTE NO eSOCIAL / EXTRATOR (No período)"
        else:
            return "FORA DO PERÍODO DO EXTRATOR (Histórico Folha)"
    elif es_tem and not sis_tem:
        return "NÃO LOCALIZADO NA FOLHA"
    return "SEM MOVIMENTO"

df_all['CLASSIFICACAO_AUDITORIA'] = df_merged.apply(classificar, axis=1)

print("Distribuição da Classificação de Auditoria:")
print(df_all['CLASSIFICACAO_AUDITORIA'].value_counts())
