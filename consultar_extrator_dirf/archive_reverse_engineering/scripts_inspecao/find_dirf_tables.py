import pyodbc
from pathlib import Path

env_path = Path(".env")
config = {}
if env_path.exists():
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            config[k.strip()] = v.strip().strip('"').strip("'")

dsn = config.get("DOMINIO_ODBC_DSN", "Contabil Oficial")
user = config.get("DOMINIO_USER", "EXTERNO")
pwd = config.get("DOMINIO_PASSWORD", "externo")

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

keywords = ['dirf', 'extrator', 'esocial', '5002', 'rendimento', 'diverg']
name_conditions = [f"LOWER(table_name) LIKE '%{k}%'" for k in keywords]
remarks_conditions = [f"LOWER(COALESCE(remarks, '')) LIKE '%{k}%'" for k in keywords]
all_conditions = " OR ".join(name_conditions + remarks_conditions)

query = f"""
SELECT table_name, remarks
FROM sys.systable
WHERE table_type = 'BASE' AND ({all_conditions})
ORDER BY table_name
"""
cursor.execute(query)
rows = cursor.fetchall()
print(f"Encontradas {len(rows)} tabelas:")
for table, remarks in rows:
    print(f"- {table}: {remarks if remarks else 'Sem descricao'}")

conn.close()
