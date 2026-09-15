import pyodbc
from pathlib import Path

config = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        config[k.strip()] = v.strip().strip('"').strip("'")

conn = pyodbc.connect(f"DSN={config.get('DOMINIO_ODBC_DSN')};UID={config.get('DOMINIO_USER')};PWD={config.get('DOMINIO_PASSWORD')}")
cur = conn.cursor()

print("=== VERIFICANDO CPFs COM MULTIPLOS CONTRATOS ===")
cur.execute("SELECT i_empregados, nome, cpf FROM bethadba.FOEMPREGADOS WHERE codi_emp = 4 AND cpf = '06597900502'")
for r in cur.fetchall():
    print("Mauricio:", r)

cur.execute("SELECT i_empregados, nome, cpf FROM bethadba.FOEMPREGADOS WHERE codi_emp = 45 AND cpf = '05069089501'")
for r in cur.fetchall():
    print("Antonio Soares:", r)
cur.execute("""
    SELECT tot.COMPETENCIA_REF, tot.VLRRENDTRIB, tot.VLRRENDTRIB13, tot.VLRPREVOFICIAL, tot.VLRCRMEN, fde.I_DADOS_EVENTOS, fde.NUMERO_RECIBO
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    JOIN bethadba.FOESOCIAL_DADOS_EVENTOS fde ON fde.CODI_EMP = tot.CODI_EMP AND fde.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    WHERE tot.CODI_EMP = 206 AND ext.CPF = ?
    ORDER BY tot.COMPETENCIA_REF
""", cpf)
for r in cur.fetchall():
    print("  eSocial:", r)

print("\n2. Dados no Sistema FOBASESSERVIRRF / FOBASESIRRF:")
cur.execute("""
    SELECT b.DATA_PAGTO, s.COMPETENCIA, b.TIPO, b.BASE, b.ABATIMENTOS, b.VALOR, b.DEPEND_DESCONTO, s.TIPO_PROCESS, s.I_CALCULOS
    FROM bethadba.FOBASESSERVIRRF s
    JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
    JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
    WHERE s.CODI_EMP = 206 AND e.CPF = ?
    ORDER BY b.DATA_PAGTO
""", cpf)
for r in cur.fetchall():
    print("  Sistema IRRF:", r)

print("\n3. Dados em FOBASESSERV:")
cur.execute("""
    SELECT bs.I_CALCULOS, bs.COMPETENCIA, bs.DATA_PAGTO, bs.TIPO_PROCESS
    FROM bethadba.FOBASESSERV bs
    JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = bs.CODI_EMP AND e.I_EMPREGADOS = bs.I_EMPREGADOS
    WHERE bs.CODI_EMP = 206 AND e.CPF = ? AND bs.COMPETENCIA >= '2026-01-01'
""", cpf)
for r in cur.fetchall():
    print("  FOBASESSERV:", r)

print("\n4. RATEIO em FOBASESSERVIRRF:")
cur.execute("""
    SELECT s.I_CALCULOS, s.RATEIO, s.I_BASESIRRF, b.TIPO, b.BASE, b.DATA_PAGTO
    FROM bethadba.FOBASESSERVIRRF s
    JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
    WHERE s.CODI_EMP = 206 AND s.I_EMPREGADOS = 85 AND b.DATA_PAGTO >= '2026-01-01'
""")
for r in cur.fetchall():
    print("  s:", r)
