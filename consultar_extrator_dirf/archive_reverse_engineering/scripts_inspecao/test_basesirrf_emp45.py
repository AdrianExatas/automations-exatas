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
SELECT TOP 5
    s.codi_emp,
    s.i_empregados,
    s.competencia,
    s.tipo_process,
    b.tipo,
    b.data_pagto,
    b.base,
    b.abatimentos,
    b.depend_no,
    b.depend_desconto,
    b.deducao_simplificada,
    b.valor AS irrf_retido
FROM bethadba.FOBASESSERVIRRF s
JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
WHERE s.CODI_EMP = 45
ORDER BY b.data_pagto DESC
"""
cursor.execute(q)
cols = [c[0] for c in cursor.description]
for r in cursor.fetchall():
    print(dict(zip(cols, r)))

conn.close()
