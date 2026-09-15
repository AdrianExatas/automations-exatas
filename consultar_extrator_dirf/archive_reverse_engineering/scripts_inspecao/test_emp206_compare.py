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

# 1. eSocial Extrator values for emp 206
q_esocial = f"""
SELECT 
    tot.CODI_EMP,
    ext.CPF,
    tot.COMPETENCIA_REF,
    COALESCE(tot.VLRRENDTRIB, 0) AS es_rendtrib_mensal,
    COALESCE(tot.VLRRENDTRIB13, 0) AS es_rendtrib_13,
    COALESCE(tot.VLRPREVOFICIAL, 0) AS es_prev_mensal,
    COALESCE(tot.VLRPREVOFICIAL13, 0) AS es_prev_13,
    COALESCE(tot.VLRCRMEN, 0) AS es_irrf_mensal,
    COALESCE(tot.VLRCR13MEN, 0) AS es_irrf_13
FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
  ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
WHERE tot.CODI_EMP = {CODI_EMP}
"""
cursor.execute(q_esocial)
cols = [c[0].lower() for c in cursor.description]
df_es = pd.DataFrame.from_records(cursor.fetchall(), columns=cols)
print(f"eSocial records for emp {CODI_EMP}: {len(df_es)}")

# Sample first 3 CPFs and competencies
sample = df_es.drop_duplicates(subset=['cpf', 'competencia_ref']).head(5)

for _, row in sample.iterrows():
    cpf = row['cpf']
    comp = row['competencia_ref']
    print("\n" + "="*70)
    print(f"CPF: {cpf} | Competência eSocial: {comp}")
    print(f"  eSocial: RendTrib={row['es_rendtrib_mensal']} | Prev={row['es_prev_mensal']} | IRRF={row['es_irrf_mensal']}")
    
    # Check FOBASESIRRF by payment date in this month
    q_bases = f"""
    SELECT 
        b.tipo,
        b.data_pagto,
        b.base,
        b.abatimentos,
        b.depend_desconto,
        b.valor as irrf_retido
    FROM bethadba.FOBASESSERVIRRF s
    JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
    JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
    WHERE s.CODI_EMP = {CODI_EMP}
      AND e.CPF = '{cpf}'
      AND b.DATA_PAGTO BETWEEN '{comp}' AND dateadd(month, 1, '{comp}') - 1
    """
    cursor.execute(q_bases)
    b_rows = cursor.fetchall()
    print("  Sistema (FOBASESIRRF por Data Pagto no mês):")
    for br in b_rows:
        print(f"    Tipo {br[0]} | Pagto {br[1]} | Base={br[2]} | Abat={br[3]} | Dep={br[4]} | IRRF={br[5]}")

    # Also check FOMOVTOSERV
    q_movto = f"""
    SELECT 
        bs.DATA_PAGTO,
        ev.REND_TRIBUTAVEIS,
        ev.REND_SUJEITOS,
        ev.CLASSIFICACAO,
        ev.NOME,
        m.VALOR_CAL,
        m.PROV_DESC
    FROM bethadba.FOBASESSERV bs
    JOIN bethadba.FOMOVTOSERV m 
      ON m.CODI_EMP = bs.CODI_EMP AND m.I_CALCULOS = bs.I_CALCULOS
    JOIN bethadba.FOEMPREGADOS e 
      ON e.CODI_EMP = bs.CODI_EMP AND e.I_EMPREGADOS = bs.I_EMPREGADOS
    JOIN bethadba.FOPARMTO p ON p.CODI_EMP = bs.CODI_EMP
    JOIN bethadba.FOEVENTOS ev 
      ON ev.CODI_EMP = p.CODI_EMP_EVE AND ev.I_EVENTOS = m.I_EVENTOS
    WHERE bs.CODI_EMP = {CODI_EMP}
      AND e.CPF = '{cpf}'
      AND bs.DATA_PAGTO BETWEEN '{comp}' AND dateadd(month, 1, '{comp}') - 1
      AND (ev.REND_TRIBUTAVEIS > 0 OR ev.REND_SUJEITOS > 0 OR ev.CLASSIFICACAO IN (12, 13, 29))
    """
    cursor.execute(q_movto)
    m_rows = cursor.fetchall()
    print("  Sistema (FOMOVTOSERV eventos IRRF):")
    for mr in m_rows[:6]:
        print(f"    Pagto {mr[0]} | {mr[4]} | Vlr={mr[5]} | ProvDesc={mr[6]} | RendTrib={mr[1]}")

conn.close()
