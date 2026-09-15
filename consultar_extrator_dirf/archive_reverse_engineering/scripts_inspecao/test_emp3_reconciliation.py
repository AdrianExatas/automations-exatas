import pyodbc
from pathlib import Path
import pandas as pd

config = {}
for line in Path('.env').read_text().splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        config[k.strip()] = v.strip().strip('"').strip("'")

conn = pyodbc.connect(f"DSN={config['DOMINIO_ODBC_DSN']};UID={config['DOMINIO_USER']};PWD={config['DOMINIO_PASSWORD']}")
cursor = conn.cursor()

CODI_EMP = 3

# 1. eSocial
q_es = f"""
SELECT 
    tot.CODI_EMP,
    emp.NOME_EMP,
    tot.COMPETENCIA_REF,
    ext.CPF,
    COALESCE(tot.VLRRENDTRIB, 0) AS es_rendtrib_mensal,
    COALESCE(tot.VLRRENDTRIB13, 0) AS es_rendtrib_13,
    COALESCE(tot.VLRPREVOFICIAL, 0) AS es_prev_mensal,
    COALESCE(tot.VLRPREVOFICIAL13, 0) AS es_prev_13,
    COALESCE(tot.VLRCRMEN, 0) AS es_irrf_mensal,
    COALESCE(tot.VLRCR13MEN, 0) AS es_irrf_13,
    tot.I_DADOS_EVENTOS
FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
  ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = tot.CODI_EMP
WHERE tot.CODI_EMP = {CODI_EMP}
"""
cursor.execute(q_es)
df_es = pd.DataFrame.from_records(cursor.fetchall(), columns=[c[0].lower() for c in cursor.description])
print(f"eSocial records for emp {CODI_EMP}: {len(df_es)}")

# Subtabelas
q_dep = f"""
SELECT ded.CODI_EMP, ded.COMPETENCIA_REF, ext.CPF,
       SUM(COALESCE(ded.VLRDEDDEP, 0)) AS es_ded_dep
FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_DED_DEPEN ded
JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
  ON ext.CODI_EMP = ded.CODI_EMP AND ext.I_DADOS_EVENTOS = ded.I_DADOS_EVENTOS
WHERE ded.CODI_EMP = {CODI_EMP}
GROUP BY ded.CODI_EMP, ded.COMPETENCIA_REF, ext.CPF
"""
cursor.execute(q_dep)
df_dep = pd.DataFrame.from_records(cursor.fetchall(), columns=['codi_emp', 'competencia_ref', 'cpf', 'es_ded_dep'])

# 2. Sistema
q_sis = f"""
SELECT 
    s.CODI_EMP,
    YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1) AS competencia_ref,
    e.CPF,
    e.NOME AS nome_colaborador,
    SUM(CASE WHEN b.TIPO = 6 THEN b.BASE ELSE 0 END) AS sis_rendtrib_13,
    SUM(CASE WHEN b.TIPO <> 6 THEN b.BASE ELSE 0 END) AS sis_rendtrib_mensal,
    SUM(CASE WHEN b.TIPO = 6 THEN b.ABATIMENTOS ELSE 0 END) AS sis_prev_13,
    SUM(CASE WHEN b.TIPO <> 6 THEN b.ABATIMENTOS ELSE 0 END) AS sis_prev_mensal,
    SUM(b.DEPEND_DESCONTO) AS sis_ded_dep,
    SUM(CASE WHEN b.TIPO = 6 THEN b.VALOR ELSE 0 END) AS sis_irrf_13,
    SUM(CASE WHEN b.TIPO <> 6 THEN b.VALOR ELSE 0 END) AS sis_irrf_mensal
FROM bethadba.FOBASESSERVIRRF s
JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
WHERE s.CODI_EMP = {CODI_EMP}
  AND s.RATEIO = 0
GROUP BY s.CODI_EMP, YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1), e.CPF, e.NOME
"""
cursor.execute(q_sis)
df_sis = pd.DataFrame.from_records(cursor.fetchall(), columns=[c[0].lower() for c in cursor.description])
print(f"Sistema records for emp {CODI_EMP}: {len(df_sis)}")

# Agrupa eSocial por (codi_emp, competencia_ref, cpf)
es_grp = df_es.groupby(['codi_emp', 'competencia_ref', 'cpf']).agg({
    'nome_emp': 'first',
    'es_rendtrib_mensal': 'sum',
    'es_rendtrib_13': 'sum',
    'es_prev_mensal': 'sum',
    'es_prev_13': 'sum',
    'es_irrf_mensal': 'sum',
    'es_irrf_13': 'sum'
}).reset_index()

if not df_dep.empty:
    es_grp = pd.merge(es_grp, df_dep, on=['codi_emp', 'competencia_ref', 'cpf'], how='left')
    es_grp['es_ded_dep'] = es_grp['es_ded_dep'].fillna(0)
else:
    es_grp['es_ded_dep'] = 0.0

merged = pd.merge(es_grp, df_sis, on=['codi_emp', 'competencia_ref', 'cpf'], how='outer').fillna(0)

merged['dif_rendtrib_mensal'] = (merged['sis_rendtrib_mensal'] - merged['es_rendtrib_mensal']).round(2)
merged['dif_rendtrib_13'] = (merged['sis_rendtrib_13'] - merged['es_rendtrib_13']).round(2)
merged['dif_prev_mensal'] = (merged['sis_prev_mensal'] - merged['es_prev_mensal']).round(2)
merged['dif_prev_13'] = (merged['sis_prev_13'] - merged['es_prev_13']).round(2)
merged['dif_irrf_mensal'] = (merged['sis_irrf_mensal'] - merged['es_irrf_mensal']).round(2)
merged['dif_irrf_13'] = (merged['sis_irrf_13'] - merged['es_irrf_13']).round(2)

divergentes = merged[
    (merged['dif_rendtrib_mensal'].abs() > 0.01) |
    (merged['dif_rendtrib_13'].abs() > 0.01) |
    (merged['dif_prev_mensal'].abs() > 0.01) |
    (merged['dif_prev_13'].abs() > 0.01) |
    (merged['dif_irrf_mensal'].abs() > 0.01) |
    (merged['dif_irrf_13'].abs() > 0.01)
]

print(f"\nTotal registros comparados: {len(merged)}")
print(f"Conciliados: {len(merged) - len(divergentes)}")
print(f"Com divergência: {len(divergentes)}")

if not divergentes.empty:
    print("\nExemplos de divergências na Empresa 3:")
    for _, r in divergentes.head(10).iterrows():
        comp_str = str(r['competencia_ref'])
        print(f"  Comp {comp_str} | CPF {r['cpf']} ({r['nome_colaborador']}):")
        if abs(r['dif_rendtrib_mensal']) > 0.01:
            print(f"    RendTrib Mensal: Sis={r['sis_rendtrib_mensal']} | eSoc={r['es_rendtrib_mensal']} | Dif={r['dif_rendtrib_mensal']}")
        if abs(r['dif_rendtrib_13']) > 0.01:
            print(f"    RendTrib 13:     Sis={r['sis_rendtrib_13']} | eSoc={r['es_rendtrib_13']} | Dif={r['dif_rendtrib_13']}")
        if abs(r['dif_prev_mensal']) > 0.01:
            print(f"    Prev Mensal:     Sis={r['sis_prev_mensal']} | eSoc={r['es_prev_mensal']} | Dif={r['dif_prev_mensal']}")
        if abs(r['dif_irrf_mensal']) > 0.01:
            print(f"    IRRF Mensal:     Sis={r['sis_irrf_mensal']} | eSoc={r['es_irrf_mensal']} | Dif={r['dif_irrf_mensal']}")

conn.close()
