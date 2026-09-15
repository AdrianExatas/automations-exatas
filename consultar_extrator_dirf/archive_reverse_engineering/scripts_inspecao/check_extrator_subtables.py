import pyodbc
from inspect_db_helper import get_conn

conn = get_conn()
cur = conn.cursor()

print("=== EXTRATOR_DED_DEPEN ===")
cur.execute("SELECT * FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_DED_DEPEN WHERE CODI_EMP = 45")
print(cur.fetchall())

print("=== EXTRATOR_PEN_ALIM ===")
cur.execute("SELECT * FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_PEN_ALIM WHERE CODI_EMP = 45")
print(cur.fetchall())

print("=== EXTRATOR_PLANO_SAUDE ===")
cur.execute("SELECT * FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_PLANO_SAUDE WHERE CODI_EMP = 45")
print(cur.fetchall())

print("=== EXTRATOR_PREV_COMPL ===")
cur.execute("SELECT * FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_PREV_COMPL WHERE CODI_EMP = 45")
print(cur.fetchall())

conn.close()
