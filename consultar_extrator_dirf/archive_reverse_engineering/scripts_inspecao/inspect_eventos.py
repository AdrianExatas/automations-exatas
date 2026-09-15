import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

tables = [
    "FOESOCIAL_DADOS_EVENTOS",
    "FOESOCIAL_EVENTOS",
]

for table in tables:
    print("=" * 60)
    print(f"TABELA: {table}")
    print("=" * 60)
    cursor.execute(f"SELECT TOP 1 * FROM bethadba.{table}")
    cols = [desc[0] for desc in cursor.description]
    print("Colunas:", cols)
    cursor.execute(f"SELECT TOP 1 * FROM bethadba.{table}")
    print("Row:", cursor.fetchone())

conn.close()
