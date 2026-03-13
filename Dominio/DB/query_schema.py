import pyodbc

# Connection parameters
dsn = 'Contabil Oficial'
usuario = 'EXTERNO'
senha = 'externo'

try:
    conn = pyodbc.connect(f'DSN={dsn};UID={usuario};PWD={senha}')
    cursor = conn.cursor()

    print("=" * 80)
    print("SYS.SYSTABLE Column Names:")
    print("=" * 80)
    cursor.execute("SELECT TOP 1 * FROM sys.systable")
    systable_cols = [desc[0] for desc in cursor.description]
    for col in systable_cols:
        print(f"  - {col}")

    print("\n" + "=" * 80)
    print("SYS.SYSCOLUMN Column Names:")
    print("=" * 80)
    cursor.execute("SELECT TOP 1 * FROM sys.syscolumn")
    syscolumn_cols = [desc[0] for desc in cursor.description]
    for col in syscolumn_cols:
        print(f"  - {col}")

    print("\n" + "=" * 80)
    print("First 20 Tables from sys.systable:")
    print("=" * 80)
    cursor.execute("SELECT TOP 20 table_id, table_name, creator, remarks, table_type FROM sys.systable ORDER BY table_name")
    for i, row in enumerate(cursor.fetchall(), 1):
        print(f"{i:2d}. {row}")

    cursor.close()
    conn.close()
    print("\nQuery completed successfully!")

except Exception as e:
    print(f"Error: {e}")