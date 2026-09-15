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

CODI_EMP = 206
COMP = '2026-01-01'

# 1. eSocial
cursor.execute(f"""
SELECT 
    ext.CPF,
    COALESCE(tot.VLRRENDTRIB, 0) + COALESCE(tot.VLRRENDTRIB13, 0) AS es_rendtrib,
    COALESCE(tot.VLRPREVOFICIAL, 0) + COALESCE(tot.VLRPREVOFICIAL13, 0) AS es_prev,
    COALESCE(tot.VLRCRMEN, 0) + COALESCE(tot.VLRCR13MEN, 0) AS es_irrf
FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
  ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
WHERE tot.CODI_EMP = {CODI_EMP}
  AND tot.COMPETENCIA_REF = '{COMP}'
""")
df_es = pd.DataFrame.from_records(cursor.fetchall(), columns=['cpf', 'es_rendtrib', 'es_prev', 'es_irrf'])

# 2. Sistema via FOBASESIRRF com RATEIO = 0
cursor.execute(f"""
SELECT 
    e.CPF,
    e.NOME,
    SUM(b.base) AS sis_rendtrib,
    SUM(b.abatimentos) AS sis_prev,
    SUM(b.depend_desconto) AS sis_dep,
    SUM(b.valor) AS sis_irrf
FROM bethadba.FOBASESSERVIRRF s
JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
WHERE s.CODI_EMP = {CODI_EMP}
  AND s.RATEIO = 0
  AND b.DATA_PAGTO BETWEEN '{COMP}' AND dateadd(month, 1, '{COMP}') - 1
GROUP BY e.CPF, e.NOME
""")
df_sis = pd.DataFrame.from_records(cursor.fetchall(), columns=['cpf', 'nome', 'sis_rendtrib', 'sis_prev', 'sis_dep', 'sis_irrf'])

merged = pd.merge(df_es, df_sis, on='cpf', how='outer').fillna(0)
merged['diff_rendtrib'] = (merged['sis_rendtrib'] - merged['es_rendtrib']).round(2)
merged['diff_prev'] = (merged['sis_prev'] - merged['es_prev']).round(2)
merged['diff_irrf'] = (merged['sis_irrf'] - merged['es_irrf']).round(2)

com_dif = merged[(merged['diff_rendtrib'].abs() > 0.01) | (merged['diff_prev'].abs() > 0.01) | (merged['diff_irrf'].abs() > 0.01)]

print(f"Total colaboradores avaliados em {COMP}: {len(merged)}")
print(f"Conciliados perfeitamente (100% batimento): {len(merged) - len(com_dif)}")
print(f"Com divergência: {len(com_dif)}")

if not com_dif.empty:
    print("\nDivergências reais encontradas:")
    for _, r in com_dif.head(10).iterrows():
        print(f"  CPF {r['cpf']} ({r['nome']}):")
        if abs(r['diff_rendtrib']) > 0.01:
            print(f"    RendTrib: Sis={r['sis_rendtrib']} | eSoc={r['es_rendtrib']} | Dif={r['diff_rendtrib']}")
        if abs(r['diff_prev']) > 0.01:
            print(f"    Prev:     Sis={r['sis_prev']} | eSoc={r['es_prev']} | Dif={r['diff_prev']}")
        if abs(r['diff_irrf']) > 0.01:
            print(f"    IRRF:     Sis={r['sis_irrf']} | eSoc={r['es_irrf']} | Dif={r['diff_irrf']}")

conn.close()
