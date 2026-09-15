import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- Pesquisa em gerelatorios ---")
cursor.execute("SELECT TOP 1 * FROM bethadba.gerelatorios")
print("Colunas gerelatorios:", [d[0] for d in cursor.description])

cursor.execute("""
    SELECT opcao, sequencia, descricao FROM bethadba.gerelatorios 
    WHERE LOWER(COALESCE(descricao, '')) LIKE '%dirf%'
       OR LOWER(COALESCE(descricao, '')) LIKE '%extrat%'
       OR LOWER(COALESCE(descricao, '')) LIKE '%rendimento%'
       OR LOWER(COALESCE(descricao, '')) LIKE '%demonstrativo%'
""")
for r in cursor.fetchall():
    print(r)

print("\n--- Pesquisa em relatorios ---")
cursor.execute("SELECT TOP 1 * FROM bethadba.relatorios")
cols_rel = [d[0] for d in cursor.description]
print("Colunas relatorios:", cols_rel)
text_cols = [c for c in cols_rel if 'nom' in c.lower() or 'desc' in c.lower() or 'tit' in c.lower()]
print("Text cols in relatorios:", text_cols)
if text_cols:
    where_clause = " OR ".join([f"LOWER(COALESCE({c}, '')) LIKE '%dirf%' OR LOWER(COALESCE({c}, '')) LIKE '%extrat%' OR LOWER(COALESCE({c}, '')) LIKE '%rendimento%'" for c in text_cols])
    cursor.execute(f"SELECT TOP 20 * FROM bethadba.relatorios WHERE {where_clause}")
    for r in cursor.fetchall():
        print(r)

conn.close()
