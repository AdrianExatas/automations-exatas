import pyodbc
from pathlib import Path

config = {}
for line in Path('.env').read_text().splitlines():
    line = line.strip()
    if line and not line.startswith('#') and '=' in line:
        k, v = line.split('=', 1)
        config[k.strip()] = v.strip().strip('"').strip("'")

conn = pyodbc.connect(f"DSN={config['DOMINIO_ODBC_DSN']};UID={config['DOMINIO_USER']};PWD={config['DOMINIO_PASSWORD']}")
cursor = conn.cursor()

# Check distinct companies and competences in S-5002 Extrator
cursor.execute("""
SELECT tot.CODI_EMP, emp.NOME_EMP, COUNT(*) as qtd_registros,
       MIN(tot.COMPETENCIA_REF) as min_comp, MAX(tot.COMPETENCIA_REF) as max_comp
FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = tot.CODI_EMP
GROUP BY tot.CODI_EMP, emp.NOME_EMP
ORDER BY qtd_registros DESC
""")
cols = [c[0] for c in cursor.description]
print(f"{'CODI_EMP':<10} | {'QTD':<6} | {'MIN_COMP':<10} | {'MAX_COMP':<10} | NOME_EMP")
print("-" * 80)
for r in cursor.fetchall()[:15]:
    print(f"{r[0]:<10} | {r[2]:<6} | {str(r[3]):<10} | {str(r[4]):<10} | {r[1][:40]}")

conn.close()
