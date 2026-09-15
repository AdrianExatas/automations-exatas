import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- Colunas com 'extrator' ou 'dirf' ou 'diverg' ---")
cursor.execute("""
    SELECT t.table_name, c.column_name, c.remarks
    FROM sys.syscolumn c
    JOIN sys.systable t ON t.table_id = c.table_id
    WHERE t.table_type = 'BASE'
      AND (
          LOWER(c.column_name) LIKE '%extrat%'
          OR LOWER(c.column_name) LIKE '%dirf%'
          OR LOWER(c.column_name) LIKE '%diverg%'
      )
    ORDER BY t.table_name, c.column_name
""")
for r in cursor.fetchall():
    print(f"{r[0]}.{r[1]}: {r[2]}")

conn.close()
