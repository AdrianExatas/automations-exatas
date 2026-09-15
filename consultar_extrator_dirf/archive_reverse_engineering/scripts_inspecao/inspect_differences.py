import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

# Find employees with differences in Empresa 45
cpfs = ['02271424542', '02309249564', '05439173552', '08525156507', '08968388547', '10621327506']

print("=== Movimentos dos Empregados em 2026-06 ===")
for cpf in cpfs:
    cursor.execute(f"SELECT i_empregados, nome FROM bethadba.foempregados WHERE codi_emp = 45 AND cpf = '{cpf}'")
    emp = cursor.fetchone()
    print(f"\nCPF: {cpf} - Empregado: {emp}")
    if emp:
        i_emp = emp[0]
        cursor.execute(f"""
            SELECT m.origem, m.i_eventos, ev.nome, m.valor_cal, 
                   ev.rend_tributaveis, ev.rend_isentos, ev.REND_ISENTOS_DESCRICAO, ev.CODIGO_INCIDENCIA_IRRF_ESOCIAL
            FROM bethadba.fomovto m
            JOIN bethadba.foeventos ev ON ev.codi_emp = m.codi_emp AND ev.i_eventos = m.i_eventos
            WHERE m.codi_emp = 45 AND m.i_empregados = {i_emp} AND m.data = '2026-06-01'
        """)
        for r in cursor.fetchall():
            print("  Mov:", r)

conn.close()
