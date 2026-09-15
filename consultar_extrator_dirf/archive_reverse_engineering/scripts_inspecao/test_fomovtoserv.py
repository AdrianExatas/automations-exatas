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

print("=== FOMOVTOSERV columns ===")
for col in cursor.columns(table='FOMOVTOSERV').fetchall():
    print(f"  {col.column_name} ({col.type_name})")

print("\n=== Sample join FOMOVTOSERV + FOEVENTOS for emp 45 ===")
q = """
SELECT TOP 10
    m.codi_emp,
    m.i_empregados,
    m.data,
    m.tipo_proces,
    m.i_eventos,
    e.nome,
    e.tipo_inf,
    e.rend_tributaveis,
    e.rend_isentos,
    e.rend_sujeitos,
    e.classificacao,
    e.codigo_incidencia_irrf_esocial,
    m.prov_desc,
    m.valor_cal
FROM bethadba.FOMOVTOSERV m
JOIN bethadba.FOEVENTOS e ON e.CODI_EMP = 1 AND e.I_EVENTOS = m.I_EVENTOS
WHERE m.CODI_EMP = 45
ORDER BY m.data DESC
"""
cursor.execute(q)
cols = [c[0] for c in cursor.description]
for r in cursor.fetchall():
    print(dict(zip(cols, r)))

conn.close()
