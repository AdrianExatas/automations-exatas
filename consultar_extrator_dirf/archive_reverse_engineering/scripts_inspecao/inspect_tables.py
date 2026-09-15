import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

tables = [
    "FOESOCIAL_ARQUIVO_RETORNO_S_5002",
    "FOESOCIAL_ARQUIVO_RETORNO_S_5002_CATEGORIA",
    "FOESOCIAL_ARQUIVO_RETORNO_S_5002_CATEGORIA_VALOR",
    "FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR",
    "FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR",
]

for table in tables:
    print("=" * 60)
    print(f"TABELA: {table}")
    print("=" * 60)
    cursor.execute(f"SELECT TOP 1 * FROM bethadba.{table}")
    cols = [desc[0] for desc in cursor.description]
    print("Colunas:", cols)
    
    cursor.execute(f"SELECT count(*) FROM bethadba.{table}")
    cnt = cursor.fetchone()[0]
    print(f"Total registros: {cnt}")
    
    if cnt > 0:
        cursor.execute(f"SELECT TOP 2 * FROM bethadba.{table}")
        for r in cursor.fetchall():
            print("Row:", r)

conn.close()
