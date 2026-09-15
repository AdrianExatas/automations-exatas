import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

event_ids = [4720, 4721, 4723, 4724, 4727, 4733, 4749, 4752, 4753, 4757]

print("=== Detalhes dos Eventos S_5002_EXTRATOR ===")
for eid in event_ids:
    cursor.execute(f"""
        SELECT ext.CODI_EMP, ext.I_DADOS_EVENTOS, ext.CPF, tot.VLRISENOUTROS, tot.VLRINDRESCONTRATO, tot.VLRRENDTRIB
        FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
        JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
          ON tot.CODI_EMP = ext.CODI_EMP AND tot.I_DADOS_EVENTOS = ext.I_DADOS_EVENTOS
        WHERE ext.CODI_EMP = 45 AND ext.I_DADOS_EVENTOS = {eid}
    """)
    r = cursor.fetchone()
    print("Extrator:", r)

conn.close()
