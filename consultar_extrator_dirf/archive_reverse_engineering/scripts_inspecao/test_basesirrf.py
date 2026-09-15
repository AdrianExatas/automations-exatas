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

print("=== FOBASESIRRF columns ===")
for col in cursor.columns(table='FOBASESIRRF').fetchall():
    print(f"  {col.column_name} ({col.type_name})")

print("\n=== FOBASESSERVIRRF columns ===")
for col in cursor.columns(table='FOBASESSERVIRRF').fetchall():
    print(f"  {col.column_name} ({col.type_name})")

print("\n=== Sample FOBASESIRRF for empresa 45 ===")
cursor.execute("SELECT TOP 5 * FROM bethadba.FOBASESIRRF WHERE CODI_EMP = 45")
cols = [c[0] for c in cursor.description]
for r in cursor.fetchall():
    print(dict(zip(cols, r)))

conn.close()
