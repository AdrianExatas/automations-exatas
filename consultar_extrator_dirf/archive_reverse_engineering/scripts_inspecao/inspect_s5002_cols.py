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

print('=== FOEVENTOS - colunas relevantes ===')
for row in cursor.columns(table='FOEVENTOS').fetchall():
    if any(k in row.column_name.upper() for k in ['REND', 'IRRF', 'PREV', 'TIPO', 'INC', 'ISEN', 'TRIB', 'DEPEND', 'PENSAO', 'ALIM', 'COMP', 'SAL', '13']):
        print(f'  {row.column_name}  |  {row.type_name}({row.column_size})')

print()
print('=== FOMOVTO - colunas ===')
for row in cursor.columns(table='FOMOVTO').fetchall():
    print(f'  {row.column_name}  |  {row.type_name}({row.column_size})')

conn.close()
