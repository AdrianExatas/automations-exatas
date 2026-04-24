import type { Company } from "../companies.js";

import type { CompanyMailboxResult } from "./types.js";

export function buildCompanyMailboxFailure(company: Company, error: unknown): CompanyMailboxResult {
  return {
    company,
    result: "ERRO_CONSULTA",
    notifications: [],
    errorMessage: error instanceof Error ? error.message : String(error),
  };
}
