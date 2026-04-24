import { readCompaniesWorkbook } from "./companies.js";
import { writeNotificationsWorkbook } from "./excel.js";
import { collectMailboxForCompanies } from "./portal.js";
import { collectMailboxForCompaniesHttp } from "./http/portal-http.js";

export async function runSefazPiMailboxAutomation(): Promise<string> {
  const companies = await readCompaniesWorkbook();
  console.log(`[SEFAZ-PI] Empresas carregadas: ${companies.length}`);

  const useHttpMode = process.env.SEFAZ_PI_HTTP_MODE === "1";

  if (useHttpMode) {
    console.log("[SEFAZ-PI] Modo HTTP ativo (sem browser).");
  }

  const results = useHttpMode
    ? await collectMailboxForCompaniesHttp(companies)
    : await collectMailboxForCompanies(companies);

  const outputPath = await writeNotificationsWorkbook(results);

  console.log(`[SEFAZ-PI] Relatorio gerado em: ${outputPath}`);
  return outputPath;
}
