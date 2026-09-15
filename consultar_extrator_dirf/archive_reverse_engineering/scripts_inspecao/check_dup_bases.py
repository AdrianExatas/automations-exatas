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

q = """
SELECT 
    s.CODI_EMP,
    s.I_EMPREGADOS,
    s.COMPETENCIA,
    s.TIPO_PROCESS,
    s.I_SERVICOS,
    s.RATEIO,
    s.I_CALCULOS,
    b.I_BASESIRRF,
    b.TIPO,
    b.DATA_PAGTO,
    b.BASE,
    b.ABATIMENTOS,
    b.VALOR
FROM bethadba.FOBASESSERVIRRF s
JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
WHERE s.CODI_EMP = 206
  AND e.CPF = '00101454430'
  AND b.DATA_PAGTO BETWEEN '2026-01-01' AND '2026-01-31'
"""
cursor.execute(q)
cols = [c[0] for c in cursor.description]
for r in cursor.fetchall():
    print(dict(zip(cols, r)))

conn.close()
