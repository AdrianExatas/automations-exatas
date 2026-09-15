import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("=== Dados da Empresa 45 no EXTRATOR_TOTALIZADOR ===")
cursor.execute("""
    SELECT t.COMPETENCIA_REF, t.CRMEN, count(distinct e.CPF) as cpfs,
           sum(t.VLRRENDTRIB) as rendtrib,
           sum(t.VLRRENDTRIB13) as rendtrib13,
           sum(t.VLRPREVOFICIAL) as prev,
           sum(t.VLRCRMEN) as crmen,
           sum(t.VLRISENOUTROS) as outros,
           sum(t.VLRINDRESCONTRATO) as indres,
           min(e.DATA_IMPORTACAO), max(e.DATA_IMPORTACAO)
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR t
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR e
      ON e.CODI_EMP = t.CODI_EMP AND e.I_DADOS_EVENTOS = t.I_DADOS_EVENTOS
    WHERE t.CODI_EMP = 45
    GROUP BY t.COMPETENCIA_REF, t.CRMEN
    ORDER BY t.COMPETENCIA_REF
""")
for r in cursor.fetchall():
    print(r)

conn.close()
