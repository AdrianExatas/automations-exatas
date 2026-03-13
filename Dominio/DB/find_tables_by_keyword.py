import pyodbc

# Connection parameters
dsn = 'Contabil Oficial'
usuario = 'EXTERNO'
senha = 'externo'

conn = pyodbc.connect(f'DSN={dsn};UID={usuario};PWD={senha}')
cursor = conn.cursor()

keywords = ['pag', 'valor', 'encarg', 'folha', 'tribu', 'lanc', 'pago']

print("Searching for tables with keywords in name or remarks...")

# Build the WHERE clause combining conditions for table name and remarks
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
print(f"Found {len(rows)} tables:")

for table, remarks in rows:
    print(f"- {table}: {remarks if remarks else 'No description'}")

cursor.close()
conn.close()
