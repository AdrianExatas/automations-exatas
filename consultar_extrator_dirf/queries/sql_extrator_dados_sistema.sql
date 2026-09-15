-- ==============================================================================
-- CONSULTA: VALOR SISTEMA - BASES DE CÁLCULO DO IRRF E FOLHA (REGIME DE CAIXA)
-- Descrição: Extrai os rendimentos tributáveis, deduções (INSS, dependentes),
--            e imposto retido consolidados pelo Domínio na data de pagamento
--            (regime de caixa) por colaborador e competência de referência.
-- Parâmetros opcionais a serem injetados dinamicamente no Python:
--   :WHERE_EMPRESA (ex: s.CODI_EMP = 206 ou s.CODI_EMP IN (...))
--   :WHERE_DATA_PAGTO (ex: b.DATA_PAGTO BETWEEN '2026-01-01' AND '2026-12-31')
-- ==============================================================================

SELECT 
    s.CODI_EMP,
    emp.NOME_EMP,
    YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1) AS COMPETENCIA_REF,
    e.CPF,
    e.NOME                                          AS NOME_COLABORADOR,
    e.I_EMPREGADOS,

    -- Rendimentos Tributáveis
    SUM(CASE WHEN b.TIPO NOT IN (4, 6) THEN b.BASE ELSE 0 END) AS SISTEMA_RENDTRIB_MENSAL,
    SUM(CASE WHEN b.TIPO = 6 THEN b.BASE ELSE 0 END)           AS SISTEMA_RENDTRIB_13,
    SUM(CASE WHEN b.TIPO = 4 THEN b.BASE ELSE 0 END)           AS SISTEMA_RENDTRIB_PLR,

    -- Deduções
    SUM(CASE WHEN b.TIPO NOT IN (4, 6) THEN b.ABATIMENTOS ELSE 0 END) AS SISTEMA_PREV_OFICIAL_MENSAL,
    SUM(CASE WHEN b.TIPO = 6 THEN b.ABATIMENTOS ELSE 0 END)           AS SISTEMA_PREV_OFICIAL_13,
    SUM(b.DEPEND_DESCONTO)                                            AS SISTEMA_DED_DEPENDENTES,
    SUM(COALESCE(b.DEDUCAO_SIMPLIFICADA, 0))                          AS SISTEMA_DED_SIMPLIFICADA,

    -- Imposto Retido
    SUM(CASE WHEN b.TIPO NOT IN (4, 6) THEN b.VALOR ELSE 0 END) AS SISTEMA_IMPOSTO_RETIDO_MENSAL,
    SUM(CASE WHEN b.TIPO = 6 THEN b.VALOR ELSE 0 END)           AS SISTEMA_IMPOSTO_RETIDO_13,
    SUM(CASE WHEN b.TIPO = 4 THEN b.VALOR ELSE 0 END)           AS SISTEMA_IMPOSTO_RETIDO_PLR

FROM bethadba.FOBASESSERVIRRF s
JOIN bethadba.FOBASESIRRF b 
  ON b.I_BASESIRRF = s.I_BASESIRRF
JOIN bethadba.FOEMPREGADOS e 
  ON e.CODI_EMP = s.CODI_EMP 
 AND e.I_EMPREGADOS = s.I_EMPREGADOS
JOIN bethadba.GEEMPRE emp 
  ON emp.CODI_EMP = s.CODI_EMP
WHERE s.RATEIO = 0
GROUP BY 
    s.CODI_EMP,
    emp.NOME_EMP,
    YMD(YEAR(b.DATA_PAGTO), MONTH(b.DATA_PAGTO), 1),
    e.CPF,
    e.NOME,
    e.I_EMPREGADOS
