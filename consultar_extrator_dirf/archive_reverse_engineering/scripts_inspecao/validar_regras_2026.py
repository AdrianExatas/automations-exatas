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

print("--- AUDITANDO REGRAS CORRIGIDAS NO ANO 2026 ---")

# 1. Obter eSocial 2026 com dados de empresa e colaborador
sql_es = """
    SELECT 
        tot.CODI_EMP,
        emp.NOME_EMP,
        emp.CGCE_EMP,
        tot.COMPETENCIA_REF,
        ext.CPF,
        COALESCE(emp_col.NOME, 'COLABORADOR CPF ' + ext.CPF) AS NOME_COLABORADOR,
        COALESCE(tot.VLRRENDTRIB, 0)        AS ESOCIAL_RENDTRIB_MENSAL,
        COALESCE(tot.VLRRENDTRIB13, 0)      AS ESOCIAL_RENDTRIB_13,
        COALESCE(tot.VLRPREVOFICIAL, 0)     AS ESOCIAL_PREV_MENSAL,
        COALESCE(tot.VLRPREVOFICIAL13, 0)   AS ESOCIAL_PREV_13,
        COALESCE(tot.VLRCRMEN, 0)           AS ESOCIAL_IRRF_MENSAL,
        COALESCE(tot.VLRCR13MEN, 0)         AS ESOCIAL_IRRF_13,
        tot.I_DADOS_EVENTOS
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_TOTALIZADOR tot
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
      ON ext.CODI_EMP = tot.CODI_EMP AND ext.I_DADOS_EVENTOS = tot.I_DADOS_EVENTOS
    JOIN bethadba.GEEMPRE emp 
      ON emp.CODI_EMP = tot.CODI_EMP
    LEFT JOIN (
        SELECT CODI_EMP, CPF, MAX(NOME) AS NOME
        FROM bethadba.FOEMPREGADOS
        GROUP BY CODI_EMP, CPF
    ) emp_col
      ON emp_col.CODI_EMP = tot.CODI_EMP AND emp_col.CPF = ext.CPF
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
"""
cur.execute(sql_es)
df_es = pd.DataFrame.from_records(cur.fetchall(), columns=[c[0].lower() for c in cur.description])
print(f"Total registros eSocial 2026: {len(df_es)}")

# Subtabelas de dependentes e plano de saude do eSocial
sql_dep = """
    SELECT ded.CODI_EMP, ded.COMPETENCIA_REF, ext.CPF,
           SUM(COALESCE(ded.VLRDEDDEP, 0)) AS ESOCIAL_DED_DEPENDENTES
    FROM bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR_DED_DEPEN ded
    JOIN bethadba.FOESOCIAL_ARQUIVO_RETORNO_S_5002_EXTRATOR ext
      ON ext.CODI_EMP = ded.CODI_EMP AND ext.I_DADOS_EVENTOS = ded.I_DADOS_EVENTOS
    WHERE YEAR(ded.COMPETENCIA_REF) = 2026
    GROUP BY ded.CODI_EMP, ded.COMPETENCIA_REF, ext.CPF
"""
cur.execute(sql_dep)
df_dep = pd.DataFrame.from_records(cur.fetchall(), columns=[c[0].lower() for c in cur.description])

df_es_grp = df_es.groupby(['codi_emp', 'nome_emp', 'cgce_emp', 'competencia_ref', 'cpf', 'nome_colaborador']).agg({
    'esocial_rendtrib_mensal': 'sum',
    'esocial_rendtrib_13': 'sum',
    'esocial_prev_mensal': 'sum',
    'esocial_prev_13': 'sum',
    'esocial_irrf_mensal': 'sum',
    'esocial_irrf_13': 'sum'
}).reset_index()

if not df_dep.empty:
    df_es_grp = pd.merge(df_es_grp, df_dep, on=['codi_emp', 'competencia_ref', 'cpf'], how='left')
else:
    df_es_grp['esocial_ded_dependentes'] = 0.0
df_es_grp['esocial_ded_dependentes'] = df_es_grp['esocial_ded_dependentes'].fillna(0.0)

# Sistema: apenas para as empresas com dados no eSocial e no periodo de 2026
empresas = list(df_es['codi_emp'].unique())
emp_str = ",".join(map(str, empresas))

# TIPO em FOBASESIRRF:
# 1 = Mensal / Folha Normal
# 2 = Adiantamento 13o
# 3 = 13o Salario Rescisao
# 4 = PLR
# 6 = 13o Salario 2a Parcela
# 7 = RRA
sql_sis = f"""
    SELECT 
        s.CODI_EMP,
        emp.NOME_EMP,
        emp.CGCE_EMP,
        YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1) AS COMPETENCIA_REF,
        e.CPF,
        e.NOME AS NOME_COLABORADOR,
        SUM(CASE WHEN b.TIPO NOT IN (3, 4, 6) THEN b.BASE ELSE 0 END) AS SISTEMA_RENDTRIB_MENSAL,
        SUM(CASE WHEN b.TIPO IN (3, 6) THEN b.BASE ELSE 0 END)         AS SISTEMA_RENDTRIB_13,
        SUM(CASE WHEN b.TIPO = 4 THEN b.BASE ELSE 0 END)               AS SISTEMA_RENDTRIB_PLR,
        SUM(CASE WHEN b.TIPO NOT IN (3, 4, 6) THEN b.ABATIMENTOS ELSE 0 END) AS SISTEMA_PREV_MENSAL,
        SUM(CASE WHEN b.TIPO IN (3, 6) THEN b.ABATIMENTOS ELSE 0 END)         AS SISTEMA_PREV_13,
        SUM(b.DEPEND_DESCONTO)                                                AS SISTEMA_DED_DEPENDENTES,
        SUM(CASE WHEN b.TIPO NOT IN (3, 4, 6) THEN b.VALOR ELSE 0 END) AS SISTEMA_IRRF_MENSAL,
        SUM(CASE WHEN b.TIPO IN (3, 6) THEN b.VALOR ELSE 0 END)         AS SISTEMA_IRRF_13,
        SUM(CASE WHEN b.TIPO = 4 THEN b.VALOR ELSE 0 END)               AS SISTEMA_IRRF_PLR
    FROM bethadba.FOBASESSERVIRRF s
    JOIN bethadba.FOBASESIRRF b ON b.I_BASESIRRF = s.I_BASESIRRF
    JOIN bethadba.FOEMPREGADOS e ON e.CODI_EMP = s.CODI_EMP AND e.I_EMPREGADOS = s.I_EMPREGADOS
    JOIN bethadba.GEEMPRE emp ON emp.CODI_EMP = s.CODI_EMP
    WHERE s.CODI_EMP IN ({emp_str})
      AND s.RATEIO = 0
      AND b.DATA_PAGTO >= '2026-01-01' 
      AND b.DATA_PAGTO <= '2026-12-31'
    GROUP BY 
        s.CODI_EMP, emp.NOME_EMP, emp.CGCE_EMP,
        YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1),
        e.CPF, e.NOME
"""
cur.execute(sql_sis)
df_sis = pd.DataFrame.from_records(cur.fetchall(), columns=[c[0].lower() for c in cur.description])
print(f"Total registros Sistema 2026: {len(df_sis)}")

# Cruzamento
m = pd.merge(df_es_grp, df_sis, on=['codi_emp', 'competencia_ref', 'cpf'], how='outer')

# Consolidar nomes
m['nome_emp'] = m['nome_emp_x'].combine_first(m['nome_emp_y'])
m['cgce_emp'] = m['cgce_emp_x'].combine_first(m['cgce_emp_y'])
m['nome_colaborador'] = m['nome_colaborador_x'].combine_first(m['nome_colaborador_y'])
m.drop(columns=['nome_emp_x', 'nome_emp_y', 'cgce_emp_x', 'cgce_emp_y', 'nome_colaborador_x', 'nome_colaborador_y'], inplace=True)

# Preencher numéricos
cols_num = [c for c in m.columns if c.startswith(('esocial_', 'sistema_'))]
for c in cols_num:
    m[c] = pd.to_numeric(m[c], errors='coerce').fillna(0.0).astype(float).round(2)

# Totais
m['esocial_rendtrib_total'] = (m['esocial_rendtrib_mensal'] + m['esocial_rendtrib_13']).round(2)
m['sistema_rendtrib_total'] = (m['sistema_rendtrib_mensal'] + m['sistema_rendtrib_13'] + m['sistema_rendtrib_plr']).round(2)
m['dif_rendtrib'] = (m['sistema_rendtrib_total'] - m['esocial_rendtrib_total']).round(2)

m['esocial_prev_total'] = (m['esocial_prev_mensal'] + m['esocial_prev_13']).round(2)
m['sistema_prev_total'] = (m['sistema_prev_mensal'] + m['sistema_prev_13']).round(2)
m['dif_previdencia'] = (m['sistema_prev_total'] - m['esocial_prev_total']).round(2)

m['esocial_irrf_total'] = (m['esocial_irrf_mensal'] + m['esocial_irrf_13']).round(2)
m['sistema_irrf_total'] = (m['sistema_irrf_mensal'] + m['sistema_irrf_13'] + m['sistema_irrf_plr']).round(2)
m['dif_irrf'] = (m['sistema_irrf_total'] - m['esocial_irrf_total']).round(2)

m['dif_dependentes'] = (m['sistema_ded_dependentes'] - m['esocial_ded_dependentes']).round(2)

# Categorização precisa
def classificar(r):
    tem_esoc = (r['esocial_rendtrib_total'] > 0 or r['esocial_prev_total'] > 0 or r['esocial_irrf_total'] > 0)
    tem_sis = (r['sistema_rendtrib_total'] > 0 or r['sistema_prev_total'] > 0 or r['sistema_irrf_total'] > 0)
    
    if tem_esoc and not tem_sis:
        return "APENAS NO eSOCIAL (Sem cálculo no Sistema)"
    if tem_sis and not tem_esoc:
        return "PENDÊNCIA eSOCIAL (Sem retorno S-5002 no Extrator)"
    
    # Ambos têm movimentação
    dif_irrf = abs(r['dif_irrf']) > 0.01
    dif_rend = abs(r['dif_rendtrib']) > 0.01
    dif_prev = abs(r['dif_previdencia']) > 0.01
    dif_dep = abs(r['dif_dependentes']) > 0.01
    
    if dif_irrf:
        return "DIVERGÊNCIA CRÍTICA: IRRF"
    if dif_rend:
        return "DIVERGÊNCIA: BASE DE CÁLCULO"
    if dif_prev or dif_dep:
        return "DIVERGÊNCIA: DEDUÇÕES (INSS/DEP)"
    
    return "CONCILIADO 100%"

m['classificacao'] = m.apply(classificar, axis=1)

print("\n--- DISTRIBUIÇÃO DAS LINHAS APÓS CORREÇÃO ---")
print(m['classificacao'].value_counts())

print("\n--- RESUMO DE DIVERGÊNCIAS CRÍTICAS DE IRRF ---")
div_irrf = m[m['classificacao'] == "DIVERGÊNCIA CRÍTICA: IRRF"]
print(f"Total colaboradores com diferença real de IRRF: {len(div_irrf)}")
print(f"Total empresas com diferença real de IRRF: {div_irrf['codi_emp'].nunique()}")
print(f"Soma total da diferença de IRRF: R$ {div_irrf['dif_irrf'].sum():,.2f}\n")

cols_show = ['codi_emp', 'nome_emp', 'competencia_ref', 'cpf', 'nome_colaborador', 'sistema_irrf_total', 'esocial_irrf_total', 'dif_irrf', 'sistema_rendtrib_total', 'esocial_rendtrib_total', 'dif_rendtrib']
print(div_irrf[cols_show].to_string())

conn.close()
