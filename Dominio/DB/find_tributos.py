import pyodbc

# Connection parameters
dsn = 'Contabil Oficial'
usuario = 'EXTERNO'
senha = 'externo'

conn = pyodbc.connect(f'DSN={dsn};UID={usuario};PWD={senha}')
cursor = conn.cursor()

# Step 1: find tables that have a column like 'servico' or 'tipo' or 'descricao'
cursor.execute("""
SELECT t.table_name, c.column_name
FROM sys.systable t
JOIN sys.syscolumn c ON t.table_id = c.table_id
WHERE (LOWER(c.column_name) LIKE '%servic%' OR LOWER(c.column_name) LIKE '%tipo%' OR LOWER(c.column_name) LIKE '%descr%')
  AND t.table_type = 'BASE'
ORDER BY t.table_name, c.column_name
""")

candidates = {}
for table_name, column_name in cursor.fetchall():
    candidates.setdefault(table_name, []).append(column_name)

print(f"Found {len(candidates)} candidate tables with service/type/desc columns")

# Step 2: search for "Tributos" in these columns
search_term = '%Tributos%'
results = []

for table, cols in candidates.items():
    for col in cols:
        try:
            cursor.execute(f"SELECT TOP 1 {col} FROM bethadba.{table} WHERE {col} LIKE ?", (search_term,))
            row = cursor.fetchone()
            if row:
                results.append((table, col, row[0]))
        except Exception:
            # skip columns that can't be searched as text
            continue

if results:
    print("\nMatches found:")
    for table, col, value in results:
        print(f"- {table}.{col}: {value}")
else:
    print("\nNo matches found for 'Tributos' in candidate columns.")

cursor.close()
conn.close()
