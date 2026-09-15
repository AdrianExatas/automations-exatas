import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

# Query distinct companies in FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR
print("=== Resumo por Empresa no EXTRATOR S_5002 ===")
cursor.execute("""
    SELECT e.CODI_EMP, emp.nome_emp, count(distinct e.CPF) as total_cpfs, count(*) as total_registros, min(e.DATA_IMPORTACAO), max(e.DATA_IMPORTACAO)
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR e
    LEFT JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = e.CODI_EMP
    GROUP BY e.CODI_EMP, emp.nome_emp
    ORDER BY total_registros DESC
""")
rows = cursor.fetchall()
print(f"Total empresas no extrator: {len(rows)}")
for r in rows[:15]:
    print(r)

print("\n=== Resumo por Empresa no S_5002 (Normal/Evento) ===")
cursor.execute("""
    SELECT e.CODI_EMP, emp.nome_emp, count(distinct e.CPF) as total_cpfs, count(*) as total_registros
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002 e
    LEFT JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = e.CODI_EMP
    GROUP BY e.CODI_EMP, emp.nome_emp
    ORDER BY total_registros DESC
""")
rows2 = cursor.fetchall()
print(f"Total empresas no S_5002: {len(rows2)}")
for r in rows2[:15]:
    print(r)

conn.close()
