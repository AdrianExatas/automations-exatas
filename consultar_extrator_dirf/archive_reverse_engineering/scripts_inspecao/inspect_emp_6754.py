import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

# Find employee by CPF in FOEMPREGADOS
cursor.execute("""
    SELECT i_empregados, nome_emp, cpf_emp
    FROM bethadba.foempregados
    WHERE codi_emp = 45 AND cpf_emp = '08968388547'
""")
emp = cursor.fetchone()
print("Empregado:", emp)
i_emp = emp[0]

# Check movements for this employee in 2026-06 or payment in 2026-06
cursor.execute(f"""
    SELECT m.origem, m.comp_mov, m.i_eventos, ev.nome_eve, m.valor_mov, ev.cod_dirf_eve, ev.natureza_rendimento_isento_esocial
    FROM bethadba.fomovto m
    JOIN bethadba.foeventos ev ON ev.codi_emp = m.codi_emp AND ev.i_eventos = m.i_eventos
    WHERE m.codi_emp = 45 AND m.i_empregados = {i_emp} AND m.comp_mov = '2026-06-01'
""")
print("Movimentos do empregado 4752 (67.54):")
for r in cursor.fetchall():
    print(r)

conn.close()
