import pyodbc
from test_conn import dsn, user, pwd

conn = pyodbc.connect(f"DSN={dsn};UID={user};PWD={pwd}")
cursor = conn.cursor()

print("--- EXTRATOR TOTALIZADOR SAMPLE ---")
cursor.execute("""
    SELECT TOP 5 
        t.CODI_EMP, t.I_DADOS_EVENTOS, t.CRMEN, t.COMPETENCIA_REF,
        t.VLRRENDTRIB, t.VLRPREVOFICIAL, t.VLRCRMEN, ext.CPF
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR t
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext 
      ON ext.CODI_EMP = t.CODI_EMP AND ext.I_DADOS_EVENTOS = t.I_DADOS_EVENTOS
    WHERE t.VLRRENDTRIB > 0
""")
for r in cursor.fetchall():
    print(r)

print("\n--- S_5002 RETORNO SAMPLE ---")
cursor.execute("""
    SELECT TOP 5
        s.CODI_EMP, s.I_DADOS_EVENTOS, s.CPF, s.VRDEDDEP,
        cat.CODCATEG, val.TPVALOR, val.VALOR, val.TPPGTO, val.FONTE
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002 s
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_CATEGORIA cat
      ON cat.CODI_EMP = s.CODI_EMP AND cat.I_DADOS_EVENTOS = s.I_DADOS_EVENTOS
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_CATEGORIA_VALOR val
      ON val.CODI_EMP = cat.CODI_EMP AND val.I_DADOS_EVENTOS = cat.I_DADOS_EVENTOS AND val.CODCATEG = cat.CODCATEG
    WHERE val.VALOR > 0
""")
for r in cursor.fetchall():
    print(r)

conn.close()
