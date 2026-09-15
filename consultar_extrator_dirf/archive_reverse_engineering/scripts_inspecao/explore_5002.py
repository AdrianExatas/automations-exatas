import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- Tabelas FOESOCIAL_ARQUIVO_RETORNO ou 5002 ---")
cursor.execute("""
    SELECT table_name, remarks 
    FROM sys.systable 
    WHERE table_type = 'BASE' 
      AND (
          LOWER(table_name) LIKE '%5002%' 
          OR LOWER(table_name) LIKE '%extrator%'
          OR LOWER(table_name) LIKE '%comprovante%'
      )
    ORDER BY table_name
""")
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]}")

conn.close()
