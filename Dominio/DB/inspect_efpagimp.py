import pyodbc

# Connection parameters
dsn = 'Contabil Oficial'
usuario = 'EXTERNO'
senha = 'externo'

conn = pyodbc.connect(f'DSN={dsn};UID={usuario};PWD={senha}')
cursor = conn.cursor()

# Tables to inspect
tables = [
    'bethadba.efpagimp',
    'bethadba.efpagimp_lancto',
    'bethadba.efpagimp_entradas',
    'bethadba.efpagimp_saidas',
    'bethadba.efpagimp_dados_pagamento'
]

for table in tables:
    try:
        cursor.execute(f"SELECT TOP 1 * FROM {table}")
        cols = [d[0] for d in cursor.description]
        print(f"\n=== {table} columns ({len(cols)}) ===")
        print(cols)

        # show sample rows that contain 'Tributos' in any text column
        search = '%Tributos%'
        for col in cols:
            # try to search only text-like columns
            try:
                cursor.execute(f"SELECT TOP 1 {col} FROM {table} WHERE {col} LIKE ?", (search,))
                row = cursor.fetchone()
                if row:
                    print(f"Found in {table}.{col}: {row[0]}")
            except Exception:
                pass
    except Exception as e:
        print(f"Error inspecting {table}: {e}")

cursor.close()
conn.close()
