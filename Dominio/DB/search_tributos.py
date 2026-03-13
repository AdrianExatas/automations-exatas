import pyodbc

# Connection parameters
dsn = 'Contabil Oficial'
usuario = 'EXTERNO'
senha = 'externo'

conn = pyodbc.connect(f'DSN={dsn};UID={usuario};PWD={senha}')
cursor = conn.cursor()

# Candidate tables for payment-related data
candidate_tables = [
    'bethadba.folancto',
    'bethadba.cthispad'
]

search_term = 'TRIBUTOS'

print(f"Searching for '{search_term}' in candidate tables...")

for table in candidate_tables:
    try:
        # Get column names
        cursor.execute(f"SELECT TOP 1 * FROM {table}")
        columns = [desc[0] for desc in cursor.description]
        
        # Search in text columns (assuming varchar, char, etc.)
        for col in columns:
            try:
                query = f"SELECT * FROM {table} WHERE CAST({col} AS VARCHAR(MAX)) LIKE '%{search_term}%'"
                cursor.execute(query)
                rows = cursor.fetchall()
                if rows:
                    print(f"\nFound in {table}.{col}: {len(rows)} rows")
                    for row in rows[:3]:  # Show first 3
                        print(f"  {row}")
            except:
                pass  # Skip non-text columns or errors
    except Exception as e:
        print(f"Error with {table}: {e}")

cursor.close()
conn.close()
print("Search completed.")