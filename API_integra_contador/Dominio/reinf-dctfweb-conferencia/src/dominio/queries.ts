/**
 * Consultas SQL parametrizadas para o banco Domínio (Contabil Oficial).
 * Todas as consultas são estritamente SELECT (somente leitura).
 */

export const SQL_ASSERT_SELECT_ONLY = (sql: string): void => {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error(`Violação de segurança: Consulta não permitida. Apenas SELECT é autorizado: ${sql.slice(0, 50)}`);
  }
  const forbiddenKeywords = [
    "INSERT ",
    "UPDATE ",
    "DELETE ",
    "DROP ",
    "ALTER ",
    "CREATE ",
    "TRUNCATE ",
    "EXEC ",
    "GRANT ",
    "REVOKE ",
  ];
  for (const kw of forbiddenKeywords) {
    if (trimmed.includes(kw)) {
      throw new Error(`Violação de segurança: Palavra-chave proibida '${kw.trim()}' detectada na consulta.`);
    }
  }
};

/**
 * Consulta de empresas cadastradas em GEEMPRE
 */
export const QUERY_COMPANIES = `
SELECT
    codi_emp AS CODI_EMP,
    cgce_emp AS CGC_EMP,
    COALESCE(razao_emp, nome_emp) AS RAZAO_EMP,
    COALESCE(stat_emp, 'A') AS STAT_EMP
FROM
    bethadba.geempre
WHERE
    cgce_emp IS NOT NULL
    AND TRIM(cgce_emp) <> ''
ORDER BY
    codi_emp
`;

/**
 * Consulta de empresa específica por código ou CNPJ
 */
export const QUERY_COMPANY_BY_CODE_OR_CNPJ = `
SELECT
    codi_emp AS CODI_EMP,
    cgce_emp AS CGC_EMP,
    COALESCE(razao_emp, nome_emp) AS RAZAO_EMP,
    COALESCE(stat_emp, 'A') AS STAT_EMP
FROM
    bethadba.geempre
WHERE
    codi_emp = ? OR cgce_emp = ?
`;

/**
 * Consulta de eventos de fechamento e reabertura EFD-Reinf na Domínio
 */
export const QUERY_REINF_CLOSINGS = `
SELECT
    E.CODI_EMP,
    IF E.I_EVENTO IN (2098, 2099) THEN 'R-2000' ELSE 'R-4000' ENDIF AS TIPO_SERIE,
    'R-' || string(E.I_EVENTO) AS EVENTO,
    string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) AS COMPETENCIA,
    E.NUMERO_RECIBO AS RECIBO,
    string(E.DATA_ENVIO) || 'T' || string(E.HORARIO_ENVIO) AS DATA_HORA_ENVIO,
    IF E.SITUACAO = 1 THEN 'ACEITO' ELSE 'REJEITADO' ENDIF AS SITUACAO_LOTE,
    IF E.EVENTO_EXCLUIDO = 'S' THEN 1 ELSE 0 ENDIF AS EXCLUIDO,
    0 AS SEM_MOVIMENTO,
    NULL AS MENSAGEM_ERRO,
    E.I_ENVIO
FROM
    bethadba.EFD_REINF_ENVIO_ARQUIVOS E
WHERE
    E.CODI_EMP = ?
    AND string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) = ?
    AND E.I_EVENTO IN (2098, 2099, 4098, 4099)
ORDER BY
    E.DATA_ENVIO DESC, E.HORARIO_ENVIO DESC
`;

/**
 * Consulta de totalizadores da série R-2000 (Origem 6: Reinf CP)
 * Unifica Serviços Tomados (R-2010), Produção Rural (R-2055) e CPRB (R-2060)
 */
export const QUERY_R2000_TOTALS = `
SELECT
    U.CODI_EMP,
    string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) AS COMPETENCIA,
    U.EVENTO_ORIGEM,
    U.CODIGO_RECEITA,
    U.BASE_CALCULO,
    U.VALOR_CONTRIBUICAO,
    U.VALOR_RETENCAO,
    0.0 AS VALOR_DEDUCAO,
    U.VALOR_SUSPENSO,
    U.VALOR_EXIGIVEL
FROM
    bethadba.EFD_REINF_ENVIO_ARQUIVOS E
JOIN (
    SELECT CODI_EMP, I_ENVIO, 'R-2010' AS EVENTO_ORIGEM, CODIGO_RECEITA, BASE_CALCULO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_CONTRIBUICAO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_RETENCAO,
           VALOR_CONTRIBUICAO_EXIGIBILIDADE_SUSPENSA AS VALOR_SUSPENSO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_EXIGIVEL
    FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2010
    UNION ALL
    SELECT CODI_EMP, I_ENVIO, 'R-2055' AS EVENTO_ORIGEM, CODIGO_RECEITA, 0.0 AS BASE_CALCULO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_CONTRIBUICAO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_RETENCAO,
           VALOR_CONTRIBUICAO_EXIGIBILIDADE_SUSPENSA AS VALOR_SUSPENSO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_EXIGIVEL
    FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2055
    UNION ALL
    SELECT CODI_EMP, I_ENVIO, 'R-2060' AS EVENTO_ORIGEM, CODIGO_RECEITA, 0.0 AS BASE_CALCULO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_CONTRIBUICAO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_RETENCAO,
           0.0 AS VALOR_SUSPENSO,
           VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR_EXIGIVEL
    FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2060
) U ON U.CODI_EMP = E.CODI_EMP AND U.I_ENVIO = E.I_ENVIO
WHERE
    E.CODI_EMP = ?
    AND string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) = ?
    AND E.NUMERO_RECIBO = ?
`;

/**
 * Consulta de totalizadores da série R-4000 (Origem 7: Reinf RET)
 */
export const QUERY_R4000_TOTALS = `
SELECT
    P.CODI_EMP,
    string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) AS COMPETENCIA,
    'R-4020' AS EVENTO_ORIGEM,
    P.CODIGO_RECEITA,
    0.0 AS BASE_CALCULO,
    P.VALOR_RETIDO AS VALOR_IRRF,
    P.VALOR_RETIDO AS VALOR_RETENCAO,
    0.0 AS VALOR_DEDUCAO,
    P.VALOR_NAO_RETIDO AS VALOR_SUSPENSO,
    P.VALOR_RETIDO AS VALOR_EXIGIVEL
FROM
    bethadba.EFD_REINF_RETORNO_ARQUIVOS_R4099_PERIODO P
JOIN
    bethadba.EFD_REINF_ENVIO_ARQUIVOS E
    ON P.CODI_EMP = E.CODI_EMP AND P.I_ENVIO = E.I_ENVIO
WHERE
    P.CODI_EMP = ?
    AND string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) = ?
    AND E.NUMERO_RECIBO = ?
`;

/**
 * Consulta de competências com movimentação / fechamento de EFD-Reinf no Domínio
 */
export const QUERY_DOMINIO_COMPETENCIAS_LIST = `
SELECT DISTINCT
    string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) AS COMPETENCIA,
    COUNT(DISTINCT E.CODI_EMP) AS TOTAL_EMPRESAS,
    COUNT(*) AS TOTAL_FECHAMENTOS
FROM
    bethadba.EFD_REINF_ENVIO_ARQUIVOS E
WHERE
    E.I_EVENTO IN (2099, 4099)
    AND E.SITUACAO = 1
    AND E.EVENTO_EXCLUIDO = 'N'
GROUP BY
    COMPETENCIA
ORDER BY
    COMPETENCIA DESC
`;

/**
 * Consulta de visão geral de todas as empresas e seus fechamentos/totais no Domínio para a competência
 */
export const QUERY_DOMINIO_COMPETENCIA_OVERVIEW = `
SELECT
    G.codi_emp AS CODI_EMP,
    G.cgce_emp AS CGC_EMP,
    COALESCE(G.razao_emp, G.nome_emp) AS RAZAO_EMP,
    COALESCE(G.stat_emp, 'A') AS STAT_EMP,
    MAX(CASE WHEN E.I_EVENTO = 2099 THEN E.NUMERO_RECIBO ELSE NULL END) AS RECIBO_R2000,
    MAX(CASE WHEN E.I_EVENTO = 4099 THEN E.NUMERO_RECIBO ELSE NULL END) AS RECIBO_R4000,
    MAX(CASE WHEN E.I_EVENTO = 2098 THEN 1 ELSE 0 END) AS REABERTO_R2000,
    MAX(CASE WHEN E.I_EVENTO = 4098 THEN 1 ELSE 0 END) AS REABERTO_R4000,
    COALESCE((
      SELECT SUM(U2.VALOR)
      FROM (
        SELECT CODI_EMP, I_ENVIO, VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2010
        UNION ALL
        SELECT CODI_EMP, I_ENVIO, VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2055
        UNION ALL
        SELECT CODI_EMP, I_ENVIO, VALOR_CONTRIBUICAO_PREVIDENCIARIA AS VALOR FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2060
      ) U2
      JOIN bethadba.EFD_REINF_ENVIO_ARQUIVOS E2 ON U2.CODI_EMP = E2.CODI_EMP AND U2.I_ENVIO = E2.I_ENVIO
      WHERE U2.CODI_EMP = G.codi_emp
        AND string(year(E2.COMPETENCIA)) || '-' || string(right('0' || string(month(E2.COMPETENCIA)), 2)) = ?
        AND E2.I_EVENTO = 2099 AND E2.SITUACAO = 1 AND E2.EVENTO_EXCLUIDO = 'N'
        AND E2.I_ENVIO = (
          SELECT MAX(E2M.I_ENVIO)
          FROM bethadba.EFD_REINF_ENVIO_ARQUIVOS E2M
          WHERE E2M.CODI_EMP = E2.CODI_EMP AND E2M.COMPETENCIA = E2.COMPETENCIA
            AND E2M.I_EVENTO = 2099 AND E2M.SITUACAO = 1 AND E2M.EVENTO_EXCLUIDO = 'N'
        )
    ), 0.0) AS TOTAL_R2000,
    COALESCE((
      SELECT SUM(R4.VALOR_RETIDO)
      FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R4099_PERIODO R4
      JOIN bethadba.EFD_REINF_ENVIO_ARQUIVOS E4 ON R4.CODI_EMP = E4.CODI_EMP AND R4.I_ENVIO = E4.I_ENVIO
      WHERE R4.CODI_EMP = G.codi_emp
        AND string(year(E4.COMPETENCIA)) || '-' || string(right('0' || string(month(E4.COMPETENCIA)), 2)) = ?
        AND E4.I_EVENTO = 4099 AND E4.SITUACAO = 1 AND E4.EVENTO_EXCLUIDO = 'N'
        AND E4.I_ENVIO = (
          SELECT MAX(E4M.I_ENVIO)
          FROM bethadba.EFD_REINF_ENVIO_ARQUIVOS E4M
          WHERE E4M.CODI_EMP = E4.CODI_EMP AND E4M.COMPETENCIA = E4.COMPETENCIA
            AND E4M.I_EVENTO = 4099 AND E4M.SITUACAO = 1 AND E4M.EVENTO_EXCLUIDO = 'N'
        )
    ), 0.0) AS TOTAL_R4000
FROM
    bethadba.geempre G
LEFT JOIN
    bethadba.EFD_REINF_ENVIO_ARQUIVOS E
    ON G.codi_emp = E.CODI_EMP
    AND string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) = ?
    AND E.I_EVENTO IN (2098, 2099, 4098, 4099)
    AND E.SITUACAO = 1
    AND E.EVENTO_EXCLUIDO = 'N'
WHERE
    G.cgce_emp IS NOT NULL
    AND TRIM(G.cgce_emp) <> ''
GROUP BY
    G.codi_emp, G.cgce_emp, COALESCE(G.razao_emp, G.nome_emp), COALESCE(G.stat_emp, 'A')
ORDER BY
    CASE WHEN MAX(E.I_EVENTO) IS NOT NULL THEN 0 ELSE 1 END,
    G.codi_emp
`;
