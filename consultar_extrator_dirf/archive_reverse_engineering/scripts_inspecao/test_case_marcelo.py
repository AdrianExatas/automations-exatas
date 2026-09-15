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

print("Columns in FOEVENTOS:")
cur.execute("SELECT column_name FROM sys.syscolumn WHERE table_id = (SELECT table_id FROM sys.systable WHERE table_name = 'FOEVENTOS')")
cols = [r[0] for r in cur.fetchall()]
print(cols[:20])

print("\nEvents for Marcelo:")
sql = """
    SELECT bs.COMPETENCIA, bs.DATA_PAGTO, m.I_EVENTOS, ev.NOME, ev.CLASSIFICACAO, ev.REND_ISENTOS, 
           ev.CODIGO_INCIDENCIA_IRRF_ESOCIAL, ev.SOMA_INF_REN, m.PROV_DESC, m.VALOR_CAL
    FROM bethadba.FOBASESSERV bs
    JOIN bethadba.FOMOVTOSERV m ON m.CODI_EMP = bs.CODI_EMP AND m.I_CALCULOS = bs.I_CALCULOS
    JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = bs.CODI_EMP AND e.I_EMPREGADOS = bs.I_EMPREGADOS
    JOIN bethadba.FOPARMTO p ON p.CODI_EMP = bs.CODI_EMP
    JOIN bethadba.FOEVENTOS ev ON ev.CODI_EMP = p.CODI_EMP_EVE AND ev.I_EVENTOS = m.I_EVENTOS
    WHERE bs.CODI_EMP = 3 AND e.CPF = '84943556515'
      AND bs.DATA_PAGTO BETWEEN '2026-02-01' AND '2026-02-28'
"""
cur.execute(sql)
for r in cur.fetchall():
    print(r)
