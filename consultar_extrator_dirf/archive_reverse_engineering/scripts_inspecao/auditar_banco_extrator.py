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

print("--- ANOS / COMPETENCIAS EM FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR ---")
cur.execute("""
    SELECT YEAR(tot.COMPETENCIA_REF) as ano, COUNT(*) as qtd_linhas, COUNT(DISTINCT tot.CODI_EMP) as qtd_emp, COUNT(DISTINCT ext.CPF) as qtd_cpf
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext 
      ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    GROUP BY YEAR(tot.COMPETENCIA_REF)
    ORDER BY ano
""")
for r in cur.fetchall():
    print(f"Ano: {r[0]} | Registros: {r[1]} | Empresas: {r[2]} | CPFs: {r[3]}")

print("\n--- TABELAS DO EXTRATOR DA DIRF NO BANCO ---")
cur.execute("""
    SELECT table_name FROM sys.systable WHERE creator = (SELECT user_id FROM sys.sysuser WHERE user_name = 'bethadba')
    AND table_name LIKE '%EXTRATOR%'
    ORDER BY table_name
""")
for r in cur.fetchall():
    print(r[0])

print("\n--- QUANTIDADE DE EMPRESAS ATIVAS NO SISTEMA ---")
cur.execute("SELECT COUNT(*) FROM bethadba.GEEMPRE WHERE STAT_EMP = 'A'")
print(f"Empresas ativas: {cur.fetchone()[0]}")
