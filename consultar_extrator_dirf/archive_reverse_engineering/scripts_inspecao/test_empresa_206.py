import pyodbc
import pandas as pd
from pathlib import Path

config = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        config[k.strip()] = v.strip().strip('"').strip("'")

conn = pyodbc.connect(f"DSN={config.get('DOMINIO_ODBC_DSN')};UID={config.get('DOMINIO_USER')};PWD={config.get('DOMINIO_PASSWORD')}")
cur = conn.cursor()

print("--- AUDITORIA DETALHADA: EMPRESA 206 (ANO 2026) ---")

# 1. Totalizadores eSocial Empresa 206
sql_es = """
    SELECT 
        tot.COMPETENCIA_REF,
        ext.CPF,
        SUM(tot.VLRRENDTRIB) as es_rendtrib,
        SUM(tot.VLRPREVOFICIAL) as es_prev,
        SUM(tot.VLRCRMEN) as es_irrf
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
      ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    JOIN bethadba.FOESOCIAL_DADOS_EVENTOS fde
      ON fde.CODI_EMP = tot.CODI_EMP AND fde.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    WHERE tot.CODI_EMP = 206 AND YEAR(tot.COMPETENCIA_REF) = 2026
      AND fde.VALIDADO = 1
      AND NOT EXISTS (
          SELECT 1 FROM bethadba.FOESOCIAL_DADOS_EVENTOS ret
          WHERE ret.CODI_EMP_EVENTO_RETIFICADO = fde.CODI_EMP
            AND ret.I_DADOS_EVENTOS_EVENTO_RETIFICADO = fde.I_DADOS_EVENTOS
            AND ret.VALIDADO = 1
      )
    GROUP BY tot.COMPETENCIA_REF, ext.CPF
"""
cur.execute(sql_es)
df_es = pd.DataFrame.from_records(cur.fetchall(), columns=[c[0].lower() for c in cur.description])
print(f"eSocial: {len(df_es)} registros agregados")

# 2. Sistema Empresa 206 (FOBASESSERVIRRF + FOBASESIRRF)
sql_sis = """
    SELECT 
        YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1) AS competencia_ref,
        e.CPF,
        SUM(CASE WHEN b.TIPO NOT IN (4, 6) THEN b.BASE ELSE 0 END) AS sis_rendtrib,
        SUM(CASE WHEN b.TIPO NOT IN (4, 6) THEN b.ABATIMENTOS ELSE 0 END) AS sis_prev,
        SUM(CASE WHEN b.TIPO NOT IN (4, 6) THEN b.VALOR ELSE 0 END) AS sis_irrf
    FROM bethadba.FOBASESSERVIRRF s
    JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
    JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
    WHERE s.CODI_EMP = 206
      AND s.RATEIO = 0
      AND b.DATA_PAGTO >= '2026-01-01' AND b.DATA_PAGTO <= '2026-12-31'
    GROUP BY YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1), e.CPF
"""
cur.execute(sql_sis)
df_sis = pd.DataFrame.from_records(cur.fetchall(), columns=[c[0].lower() for c in cur.description])
print(f"Sistema: {len(df_sis)} registros agregados")

# Cruzar
m = pd.merge(df_es, df_sis, on=['competencia_ref', 'cpf'], how='outer').fillna(0.0)
for col in ['es_rendtrib', 'es_prev', 'es_irrf', 'sis_rendtrib', 'sis_prev', 'sis_irrf']:
    m[col] = m[col].astype(float).round(2)

m['dif_rend'] = (m['sis_rendtrib'] - m['es_rendtrib']).round(2)
m['dif_prev'] = (m['sis_prev'] - m['es_prev']).round(2)
m['dif_irrf'] = (m['sis_irrf'] - m['es_irrf']).round(2)

tot_linhas = len(m)
conciliados = m[(m['dif_rend'].abs() < 0.01) & (m['dif_prev'].abs() < 0.01) & (m['dif_irrf'].abs() < 0.01)]
ambos_dif = m[(m['dif_rend'].abs() >= 0.01) | (m['dif_prev'].abs() >= 0.01) | (m['dif_irrf'].abs() >= 0.01)]
sem_esoc = m[m['es_rendtrib'] == 0]
sem_sis = m[m['sis_rendtrib'] == 0]
ambos_com_dif = m[(m['es_rendtrib'] > 0) & (m['sis_rendtrib'] > 0) & ((m['dif_rend'].abs() >= 0.01) | (m['dif_irrf'].abs() >= 0.01))]

print(f"\nResultado Empresa 206:")
print(f"  Total linhas cruzadas:      {tot_linhas}")
print(f"  Conciliados perfeitamente: {len(conciliados)} ({len(conciliados)/tot_linhas*100:.1f}%)")
print(f"  Com alguma divergência:    {len(ambos_dif)} ({len(ambos_dif)/tot_linhas*100:.1f}%)")
print(f"    - Sem retorno eSocial:   {len(sem_esoc)}")
print(f"    - Sem cálculo no sistema:{len(sem_sis)}")
print(f"    - Ambos >0 e divergem:   {len(ambos_com_dif)}")

if not ambos_com_dif.empty:
    print("\nExemplo de divergências reais na Empresa 206:")
    print(ambos_com_dif[['competencia_ref', 'cpf', 'sis_rendtrib', 'es_rendtrib', 'dif_rend', 'sis_irrf', 'es_irrf', 'dif_irrf']].head(10))
