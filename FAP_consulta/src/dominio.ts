import type { AppConfig, DominioCompany } from "./types.js";
import { digitsOnly } from "./utils.js";

export interface DominioQueryResult {
  companies: DominioCompany[];
  byCnpj: Map<string, DominioCompany>;
  activeCnpjs: Set<string>;
}

export function normalizeDocument(raw: unknown): string {
  const digits = digitsOnly(raw);
  if (!digits) return "";
  if (digits.length > 11 && digits.length < 14) {
    return digits.padStart(14, "0");
  }
  return digits;
}

export async function fetchActiveDominioCompanies(
  config: Pick<AppConfig, "dominioDsn" | "dominioUser" | "dominioPassword">,
): Promise<DominioQueryResult> {
  const odbc = await import("odbc");
  const connectionString = `DSN=${config.dominioDsn};UID=${config.dominioUser};PWD=${config.dominioPassword || ""};`;
  const connection = await odbc.connect(connectionString);

  try {
    const query = `
      SELECT
        codi_emp AS CODI_EMP,
        TRIM(cgce_emp) AS CGC_EMP,
        TRIM(COALESCE(razao_emp, nome_emp)) AS RAZAO_EMP,
        stat_emp AS STAT_EMP
      FROM
        bethadba.geempre
      WHERE
        stat_emp = 'A'
        AND cgce_emp IS NOT NULL
        AND TRIM(cgce_emp) <> ''
      ORDER BY
        codi_emp
    `;

    const rawRows = (await connection.query(query)) as Array<{
      CODI_EMP: number | string;
      CGC_EMP: string;
      RAZAO_EMP: string;
      STAT_EMP: string;
    }>;

    const companies: DominioCompany[] = [];
    const byCnpj = new Map<string, DominioCompany>();
    const activeCnpjs = new Set<string>();

    for (const row of rawRows) {
      const cnpj = normalizeDocument(row.CGC_EMP);
      if (!cnpj) continue;

      const company: DominioCompany = {
        codiEmp: Number(row.CODI_EMP),
        cnpj,
        corporateName: (row.RAZAO_EMP || "").trim(),
        status: (row.STAT_EMP || "A").trim(),
      };

      companies.push(company);
      byCnpj.set(cnpj, company);
      activeCnpjs.add(cnpj);
    }

    return {
      companies,
      byCnpj,
      activeCnpjs,
    };
  } finally {
    try {
      await connection.close();
    } catch {
      // no-op
    }
  }
}
