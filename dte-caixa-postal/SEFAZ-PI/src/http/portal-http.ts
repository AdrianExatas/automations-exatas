/**
 * Implementação HTTP-only do portal SEFAZ-PI.
 * Sem Playwright/Chrome — usa apenas requisições HTTP com undici (mTLS) e cheerio.
 *
 * Ative com SEFAZ_PI_HTTP_MODE=1 no .env.
 */

import type { Company } from "../companies.js";
import { requirePfxCertificateForHttp } from "../certificate/load-pfx.js";
import type { CompanyMailboxResult } from "../mailbox/types.js";
import { buildCompanyMailboxFailure } from "../mailbox/results.js";
import { authenticate } from "./auth.js";
import { findAndSetCompanyContext } from "./company.js";
import { collectAgeatNotifications } from "./ageat.js";

export async function collectMailboxForCompaniesHttp(
  companies: Company[],
): Promise<CompanyMailboxResult[]> {
  const certConfig = requirePfxCertificateForHttp();

  console.log("[SEFAZ-PI HTTP] Autenticando via OIDC PKCE com certificado...");
  const session = await authenticate(certConfig.pfxPath, certConfig.passphrase);
  console.log("[SEFAZ-PI HTTP] Autenticado com sucesso.");

  const results: CompanyMailboxResult[] = [];

  for (const company of companies) {
    console.log(
      `[SEFAZ-PI HTTP] Consultando ${company.code} - ${company.name} (${company.stateRegistrationDisplay})`,
    );

    try {
      // Setar cookies de empresa
      await findAndSetCompanyContext(
        session.client,
        session.client.cookies,
        company,
        session.accessToken,
      );

      // Coletar notificações do e-AGEAT
      const notifications = await collectAgeatNotifications(session.client);

      results.push({
        company,
        result: notifications.length === 0 ? "SEM_NOTIFICACOES_NO_PERIODO" : "NOTIFICACOES_ENCONTRADAS",
        notifications,
      });
    } catch (error) {
      console.error(
        `[SEFAZ-PI HTTP] Erro ao consultar empresa ${company.code}: ${error instanceof Error ? error.message : String(error)}`,
      );
      results.push(buildCompanyMailboxFailure(company, error));
    }
  }

  return results;
}
