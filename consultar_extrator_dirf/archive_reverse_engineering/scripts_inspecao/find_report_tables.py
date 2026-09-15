import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- Tabelas com 'relat' ou 'consulta' ou 'report' ---")
cursor.execute("""
    SELECT table_name, remarks 
    FROM sys.systable 
    WHERE table_type = 'BASE' 
      AND (
          LOWER(table_name) LIKE '%relat%' 
          OR LOWER(table_name) LIKE '%consult%'
      )
    ORDER BY table_name
""")
for r in cursor.fetchall():
    print(f"{r[0]}: {r[1]}")

conn.close()
