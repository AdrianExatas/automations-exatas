import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("Searching by CPF aggregation in EXTRATOR_TOTALIZADOR...")
cursor.execute("""
    SELECT e.CODI_EMP, e.CPF, emp.nome_emp,
           sum(t.VLRRENDTRIB) as tot_rendtrib,
           sum(t.VLRRENDTRIB13) as tot_rendtrib13,
           sum(t.VLRPREVOFICIAL) as tot_prev,
           sum(t.VLRCRMEN) as tot_crmen,
           sum(t.VLRISENOUTROS) as tot_outros,
           sum(t.VLRINDRESCONTRATO) as tot_indres
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR t
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR e
      ON e.CODI_EMP = t.CODI_EMP AND e.I_DADOS_EVENTOS = t.I_DADOS_EVENTOS
    JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = e.CODI_EMP
    GROUP BY e.CODI_EMP, e.CPF, emp.nome_emp
    HAVING abs(sum(t.VLRISENOUTROS) - 7829.60) < 1
        OR abs(sum(t.VLRRENDTRIB) - 101141.92) < 1
        OR abs(sum(t.VLRINDRESCONTRATO) - 7888.66) < 1
""")
rows = cursor.fetchall()
print(f"Found {len(rows)} by CPF:")
for r in rows:
    print(r)

if not rows:
    print("\nSearching by COMPANY aggregation in EXTRATOR_TOTALIZADOR...")
    cursor.execute("""
        SELECT e.CODI_EMP, emp.nome_emp,
               sum(t.VLRRENDTRIB) as tot_rendtrib,
               sum(t.VLRRENDTRIB13) as tot_rendtrib13,
               sum(t.VLRPREVOFICIAL) as tot_prev,
               sum(t.VLRCRMEN) as tot_crmen,
               sum(t.VLRISENOUTROS) as tot_outros,
               sum(t.VLRINDRESCONTRATO) as tot_indres
        FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR t
        JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR e
          ON e.CODI_EMP = t.CODI_EMP AND e.I_DADOS_EVENTOS = t.I_DADOS_EVENTOS
        JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = e.CODI_EMP
        GROUP BY e.CODI_EMP, emp.nome_emp
        HAVING abs(sum(t.VLRISENOUTROS) - 7829.60) < 1
            OR abs(sum(t.VLRRENDTRIB) - 101141.92) < 1
            OR abs(sum(t.VLRINDRESCONTRATO) - 7888.66) < 1
    """)
    for r in cursor.fetchall():
        print(r)

conn.close()
