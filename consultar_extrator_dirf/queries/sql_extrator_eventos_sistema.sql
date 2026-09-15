-- ==============================================================================
-- CONSULTA: VALOR SISTEMA - EVENTOS COMPLEMENTARES (PLANO SAÚDE, PENSÃO E ISENTOS)
-- Descrição: Extrai valores de Plano de Saúde, Pensão Alimentícia e Rendimentos Isentos
--            lançados na folha de pagamento por colaborador e competência de pagamento.
-- ==============================================================================

SELECT 
    bs.CODI_EMP,
    YMD(YEAR(bs.DATA_PAGTO), MONTH(bs.DATA_PAGTO), 1) AS COMPETENCIA_REF,
    e.CPF,
    e.NOME                                            AS NOME_COLABORADOR,

    -- Plano Privado Coletivo de Assistência à Saúde
    SUM(CASE WHEN ev.CLASSIFICACAO = 29 THEN
            CASE WHEN m.PROV_DESC IN ('D', 'ID') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_PLANO_SAUDE,

    -- Pensão Alimentícia
    SUM(CASE WHEN ev.REND_TRIBUTAVEIS = 4 OR ev.REND_SUJEITOS IN (5, 7) THEN
            CASE WHEN m.PROV_DESC IN ('D', 'ID') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_PENSAO_ALIM,

    -- Rendimentos Isentos
    SUM(CASE WHEN ev.REND_ISENTOS = 1 THEN
            CASE WHEN m.PROV_DESC IN ('P', 'I') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_PARC_ISENTA_65,

    SUM(CASE WHEN ev.CLASSIFICACAO = 46 OR ev.CODIGO_INCIDENCIA_IRRF_ESOCIAL = 72 THEN
            CASE WHEN m.PROV_DESC IN ('P', 'I') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_DIARIAS,

    SUM(CASE WHEN ev.CODIGO_INCIDENCIA_IRRF_ESOCIAL = 73 THEN
            CASE WHEN m.PROV_DESC IN ('P', 'I') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_AJUDA_CUSTO,

    SUM(CASE WHEN ev.REND_ISENTOS = 6 THEN
            CASE WHEN m.PROV_DESC IN ('P', 'I') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_INDENIZACAO_RESC,

    SUM(CASE WHEN ev.REND_ISENTOS = 4 THEN
            CASE WHEN m.PROV_DESC IN ('P', 'I') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_ABONO_PEC,

    SUM(CASE WHEN ev.REND_ISENTOS NOT IN (0, 1, 4, 6) AND ev.CLASSIFICACAO <> 46 
             AND ev.CODIGO_INCIDENCIA_IRRF_ESOCIAL NOT IN (72, 73) THEN
            CASE WHEN m.PROV_DESC IN ('P', 'I') THEN m.VALOR_CAL ELSE -m.VALOR_CAL END
        ELSE 0 END) AS SISTEMA_OUTROS_ISENTOS

FROM bethadba.FOBASESSERV bs
JOIN bethadba.FOMOVTOSERV m 
  ON m.CODI_EMP = bs.CODI_EMP 
 AND m.I_CALCULOS = bs.I_CALCULOS
JOIN bethadba.FOEMPREGADOS e 
  ON e.CODI_EMP = bs.CODI_EMP 
 AND e.I_EMPREGADOS = bs.I_EMPREGADOS
JOIN bethadba.FOPARMTO p 
  ON p.CODI_EMP = bs.CODI_EMP
JOIN bethadba.FOEVENTOS ev 
  ON ev.CODI_EMP = p.CODI_EMP_EVE 
 AND ev.I_EVENTOS = m.I_EVENTOS
WHERE m.RATEIO = 0
  AND m.ORIGEM <> 'F'
  AND ev.SOMA_INF_REN = 'S'
GROUP BY 
    bs.CODI_EMP,
    YMD(YEAR(bs.DATA_PAGTO), MONTH(bs.DATA_PAGTO), 1),
    e.CPF,
    e.NOME
