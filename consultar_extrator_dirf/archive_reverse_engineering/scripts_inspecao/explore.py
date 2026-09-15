import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- Tabelas com DIRF ou EXTRATOR ---")
cursor.execute("""
    SELECT table_name, remarks 
    FROM sys.systable 
    WHERE table_type = 'BASE' 
      AND (
          LOWER(table_name) LIKE '%dirf%' 
          OR LOWER(table_name) LIKE '%extrat%'
          OR LOWER(COALESCE(remarks, '')) LIKE '%dirf%'
          OR LOWER(COALESCE(remarks, '')) LIKE '%extrat%'
      )
    ORDER BY table_name
""")
for row in cursor.fetchall():
    print(f"{row[0]}: {row[1]}")

conn.close()
