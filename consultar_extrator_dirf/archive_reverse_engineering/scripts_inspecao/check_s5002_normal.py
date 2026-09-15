import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("=== S_5002 (NORMAL) PARA EMPRESA 45 ===")
cursor.execute("""
    SELECT count(distinct s.CPF), count(*)
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002 s
    WHERE s.CODI_EMP = 45
""")
print("Total CPFs e registros em S_5002 normal:", cursor.fetchone())

cursor.execute("""
    SELECT val.TPVALOR, count(*), sum(val.VALOR)
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002 s
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_CATEGORIA cat
      ON cat.CODI_EMP = s.CODI_EMP AND cat.I_DADOS_EVENTOS = s.I_DADOS_EVENTOS
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_CATEGORIA_VALOR val
      ON val.CODI_EMP = cat.CODI_EMP AND val.I_DADOS_EVENTOS = cat.I_DADOS_EVENTOS AND val.CODCATEG = cat.CODCATEG
    WHERE s.CODI_EMP = 45
      AND val.FONTE LIKE '062026%'
    GROUP BY val.TPVALOR
    ORDER BY val.TPVALOR
""")
rows = cursor.fetchall()
print("Valores S_5002 normal agrupados por TPVALOR em 062026:")
for r in rows:
    print(r)

conn.close()
