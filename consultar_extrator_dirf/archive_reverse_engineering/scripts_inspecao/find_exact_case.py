import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("Searching FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR...")
cursor.execute("""
    SELECT t.*, e.CPF, emp.nome_emp
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR t
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR e
      ON e.CODI_EMP = t.CODI_EMP AND e.I_DADOS_EVENTOS = t.I_DADOS_EVENTOS
    JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = t.CODI_EMP
    WHERE t.VLRISENOUTROS = 7829.60 
       OR t.VLRINDRESCONTRATO = 7888.66
       OR t.VLRRENDTRIB = 101141.92
       OR t.VLRRENDTRIB = 104248.47
       OR t.VLRPREVOFICIAL = 9709.14
""")
rows = cursor.fetchall()
print(f"Found {len(rows)} matches in EXTRATOR_TOTALIZADOR:")
for r in rows:
    print(r)

if not rows:
    print("Trying approximate search on VLRISENOUTROS around 7829.60...")
    cursor.execute("""
        SELECT t.CODI_EMP, t.I_DADOS_EVENTOS, t.CRMEN, t.COMPETENCIA_REF, t.VLRISENOUTROS, t.VLRINDRESCONTRATO, emp.nome_emp
        FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR t
        JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = t.CODI_EMP
        WHERE t.VLRISENOUTROS BETWEEN 7820 AND 7840
    """)
    for r in cursor.fetchall():
        print(r)

conn.close()
