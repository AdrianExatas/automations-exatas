import pyodbc
from pathlib import Path

config = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        config[k.strip()] = v.strip().strip('"').strip("'")

conn = pyodbc.connect(f"DSN={config.get('DOMINIO_ODBC_DSN')};UID={config.get('DOMINIO_USER')};PWD={config.get('DOMINIO_PASSWORD')}")
cur = conn.cursor()

# Nailton Gois Andrade (CPF 39365115515) na Empresa 185
cur.execute("""
    SELECT e.I_EMPREGADOS, e.NOME, e.TIPO_EPR, e.CATEGORIA, e.CPF
    FROM bethadba.FOEMPREGADOS e
    WHERE e.CODI_EMP = 185 AND e.CPF = '39365115515'
""")
print("Nailton na FOEMPREGADOS:", cur.fetchall())

# Jose Trabuco Ferreira Filho (CPF 07142064587) na Empresa 259
cur.execute("""
    SELECT e.I_EMPREGADOS, e.NOME, e.TIPO_EPR, e.CATEGORIA, e.CPF
    FROM bethadba.FOEMPREGADOS e
    WHERE e.CODI_EMP = 259 AND e.CPF = '07142064587'
""")
print("Jose Trabuco na FOEMPREGADOS:", cur.fetchall())
