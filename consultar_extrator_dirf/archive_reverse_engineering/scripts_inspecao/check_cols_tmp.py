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

print("Columns in FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR:")
for col in cursor.columns(table='FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR').fetchall():
    print(f"  {col.column_name}")

conn.close()
