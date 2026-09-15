import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- Procedimentos / Funções com DIRF ou 5002 ou EXTRATOR ---")
cursor.execute("""
    SELECT proc_name 
    FROM sys.sysprocedure 
    WHERE LOWER(proc_name) LIKE '%dirf%' 
       OR LOWER(proc_name) LIKE '%5002%' 
       OR LOWER(proc_name) LIKE '%extrat%'
    ORDER BY proc_name
""")
for row in cursor.fetchall():
    print(row[0])

print("\n--- Views com DIRF ou 5002 ou EXTRATOR ---")
cursor.execute("""
    SELECT viewname 
    FROM sys.sysviews 
    WHERE LOWER(viewname) LIKE '%dirf%' 
       OR LOWER(viewname) LIKE '%5002%' 
       OR LOWER(viewname) LIKE '%extrat%'
    ORDER BY viewname
""")
for row in cursor.fetchall():
    print(row[0])

conn.close()
