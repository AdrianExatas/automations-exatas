import pyodbc
import pandas as pd
from pathlib import Path

config = {}
for line in Path(".env").read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if line and not line.startswith("#") and "=" in line:
        k, v = line.split("=", 1)
        config[k.strip()] = v.strip().strip('"').strip("'")

conn = pyodbc.connect(f"DSN={config.get('DOMINIO_ODBC_DSN')};UID={config.get('DOMINIO_USER')};PWD={config.get('DOMINIO_PASSWORD')}")
cur = conn.cursor()

print("--- AUDITORIA DE FIDEDIGNIDADE: ANO 2026 ---")

# 1. Total de registros em S-5002 para 2026
cur.execute("""
    SELECT COUNT(*) as total_linhas, COUNT(DISTINCT tot.CODI_EMP) as total_emp, COUNT(DISTINCT ext.CPF) as total_cpfs
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
      ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    JOIN bethadba.FOESOCIAL_DADOS_EVENTOS fde
      ON fde.CODI_EMP = tot.CODI_EMP AND fde.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    WHERE YEAR(tot.COMPETENCIA_REF) = 2026
      AND fde.VALIDADO = 1
      AND NOT EXISTS (
          SELECT 1 FROM bethadba.FOESOCIAL_DADOS_EVENTOS ret
          WHERE ret.CODI_EMP_EVENTO_RETIFICADO = fde.CODI_EMP
            AND ret.I_DADOS_EVENTOS_EVENTO_RETIFICADO = fde.I_DADOS_EVENTOS
            AND ret.VALIDADO = 1
      )
""")
r = cur.fetchone()
print(f"eSocial S-5002 Validados 2026: {r[0]} linhas | {r[1]} empresas | {r[2]} CPFs")

# 2. Competências presentes em 2026
cur.execute("""
    SELECT tot.COMPETENCIA_REF, COUNT(*) as qtd
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    WHERE YEAR(tot.COMPETENCIA_REF) = 2026
    GROUP BY tot.COMPETENCIA_REF
    ORDER BY tot.COMPETENCIA_REF
""")
print("\nCompetências de 2026 no S-5002:")
for c in cur.fetchall():
    print(f"  Competência: {c[0]} -> {c[1]} registros")

# 3. Teste em 3 empresas reais com dados:
# Vamos ver empresas com mais registros em 2026
cur.execute("""
    SELECT TOP 5 tot.CODI_EMP, emp.NOME_EMP, COUNT(*) as qtd
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = tot.CODI_EMP
    WHERE YEAR(tot.COMPETENCIA_REF) = 2026
    GROUP BY tot.CODI_EMP, emp.NOME_EMP
    ORDER BY qtd DESC
""")
print("\nTop 5 empresas com mais registros em 2026:")
for e in cur.fetchall():
    print(f"  Empresa {e[0]} - {e[1]}: {e[2]} registros")
