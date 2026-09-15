import pandas as pd

df = pd.read_excel('relatorios/Relatorio_Geral_Divergencias_Extrator.xlsx', sheet_name='Divergencias')
print(f"Total divergências no relatório geral: {len(df)}")
print("Top empresas com divergências:")
print(df.groupby(['CODI_EMP', 'NOME_EMP']).size().sort_values(ascending=False).head(15))
