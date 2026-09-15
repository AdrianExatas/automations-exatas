import odbc from "odbc";

async function main() {
  const conn = await odbc.connect("DSN=Contabil Oficial;UID=EXTERNO;PWD=externo;");
  try {
    const t0 = Date.now();
    const overviewQuery = `
      SELECT
        G.codi_emp AS CODI_EMP,
        G.cgce_emp AS CGC_EMP,
        COALESCE(G.razao_emp, G.nome_emp) AS RAZAO_EMP,
        MAX(CASE WHEN E.I_EVENTO = 2099 THEN E.NUMERO_RECIBO ELSE NULL END) AS RECIBO_R2000,
        MAX(CASE WHEN E.I_EVENTO = 4099 THEN E.NUMERO_RECIBO ELSE NULL END) AS RECIBO_R4000,
        MAX(CASE WHEN E.I_EVENTO = 2098 THEN 1 ELSE 0 END) AS REABERTO_R2000,
        MAX(CASE WHEN E.I_EVENTO = 4098 THEN 1 ELSE 0 END) AS REABERTO_R4000,
        COALESCE((
          SELECT SUM(R2.VALOR_CONTRIBUICAO_PREVIDENCIARIA)
          FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R2099_R2010 R2
          JOIN bethadba.EFD_REINF_ENVIO_ARQUIVOS E2 ON R2.CODI_EMP = E2.CODI_EMP AND R2.I_ENVIO = E2.I_ENVIO
          WHERE R2.CODI_EMP = G.codi_emp
            AND string(year(E2.COMPETENCIA)) || '-' || string(right('0' || string(month(E2.COMPETENCIA)), 2)) = '2026-08'
            AND E2.I_EVENTO = 2099 AND E2.SITUACAO = 1 AND E2.EVENTO_EXCLUIDO = 'N'
        ), 0.0) AS TOTAL_R2000,
        COALESCE((
          SELECT SUM(R4.VALOR_RETIDO)
          FROM bethadba.EFD_REINF_RETORNO_ARQUIVOS_R4099_PERIODO R4
          JOIN bethadba.EFD_REINF_ENVIO_ARQUIVOS E4 ON R4.CODI_EMP = E4.CODI_EMP AND R4.I_ENVIO = E4.I_ENVIO
          WHERE R4.CODI_EMP = G.codi_emp
            AND string(year(E4.COMPETENCIA)) || '-' || string(right('0' || string(month(E4.COMPETENCIA)), 2)) = '2026-08'
            AND E4.I_EVENTO = 4099 AND E4.SITUACAO = 1 AND E4.EVENTO_EXCLUIDO = 'N'
        ), 0.0) AS TOTAL_R4000
      FROM
        bethadba.geempre G
      LEFT JOIN
        bethadba.EFD_REINF_ENVIO_ARQUIVOS E
        ON G.codi_emp = E.CODI_EMP
        AND string(year(E.COMPETENCIA)) || '-' || string(right('0' || string(month(E.COMPETENCIA)), 2)) = '2026-08'
        AND E.I_EVENTO IN (2098, 2099, 4098, 4099)
        AND E.SITUACAO = 1
        AND E.EVENTO_EXCLUIDO = 'N'
      WHERE
        G.cgce_emp IS NOT NULL
        AND TRIM(G.cgce_emp) <> ''
      GROUP BY
        G.codi_emp, G.cgce_emp, COALESCE(G.razao_emp, G.nome_emp)
      ORDER BY
        CASE WHEN MAX(E.I_EVENTO) IS NOT NULL THEN 0 ELSE 1 END,
        G.codi_emp
    `;
    const res = await conn.query(overviewQuery);
    console.log(`Executed full overview in ${Date.now() - t0}ms, returned ${res.length} companies:`);
    const comMovimento = (res as any[]).filter(r => r.RECIBO_R2000 || r.RECIBO_R4000);
    console.log(`Companies with movement: ${comMovimento.length}`);
    console.log("First 3 with movement:", comMovimento.slice(0, 3));
  } catch (err: any) {
    console.log("Error:", err.odbcErrors || err);
  } finally {
    await conn.close();
  }
}

main();
