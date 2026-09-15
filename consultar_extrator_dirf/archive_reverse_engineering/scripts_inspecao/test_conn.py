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

print(f"Connecting to DSN={dsn}, User={user}...")
conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()
cursor.execute("SELECT @@version")
print("Connected! DB Version:", cursor.fetchone()[0])
conn.close()
