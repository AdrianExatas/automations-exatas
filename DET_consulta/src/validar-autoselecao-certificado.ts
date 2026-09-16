import { mkdir } from "node:fs/promises";
import path from "node:path";
import { closeBrowserSession, launchBrowserSession, type BrowserSession } from "./browser.js";
import { loadConfig } from "./config.js";
import { SafeLogger } from "./logger.js";
import { authenticateSpe } from "./spe.js";

async function main() {
  console.log("=================================================================");
  console.log("  TESTE DE VALIDAÇÃO: SELEÇÃO AUTOMÁTICA DE CERTIFICADO DIGITAL  ");
  console.log("=================================================================");

  const config = await loadConfig();
  console.log(`[1/4] Configuração carregada:`);
  console.log(`      Modo de Navegador: ${config.browserMode}`);
  console.log(`      CNPJ Procurador:   ${config.procuratorCnpj}`);
  console.log(`      Certificado PFX:   ${config.certificatePath}`);

  await mkdir("output", { recursive: true });
  const logger = new SafeLogger("output", [config.certificatePassword]);
  await logger.initialize();

  let session: BrowserSession | null = null;

  try {
    console.log(`[2/4] Iniciando Google Chrome em modo ${config.browserMode.toUpperCase()}...`);
    session = (await launchBrowserSession(config)) as BrowserSession;
    const { page } = session;

    console.log("[3/4] Executando fluxo de autenticação automática no SPE / Gov.br...");
    console.log("      - Acessa o SPE");
    console.log("      - Clica em 'Entrar com gov.br'");
    console.log("      - Aguarda hCaptcha invisível do Gov.br");
    console.log("      - Aciona 'Seu certificado digital'");
    console.log("      - Chrome aplica AutoSelectCertificateForUrls para selecionar o certificado silenciosamente");

    const timeoutMs = 90_000;
    await authenticateSpe(page, config.procuratorCnpj, timeoutMs, logger);

    const screenshotPath = path.resolve("output", "validacao_autoselecao_certificado.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });

    console.log("\n[4/4] Resultado da validação:");
    console.log("=================================================================");
    console.log("  SUCESSO: CERTIFICADO DIGITAL SELECIONADO AUTOMATICAMENTE!     ");
    console.log("=================================================================");
    console.log("  O navegador selecionou automaticamente o certificado digital    ");
    console.log("  sem exibir caixas de diálogo ou modais de confirmação do Windows.");
    console.log(`  Página final autenticada: ${page.url()}`);
    console.log(`  Screenshot salvo em: ${screenshotPath}`);
    console.log("=================================================================\n");
  } catch (error) {
    console.error("\nFalha na validação da seleção do certificado:", error);
    if (session?.page) {
      const errorScreenshot = path.resolve("output", "validacao_erro_certificado.png");
      await session.page.screenshot({ path: errorScreenshot, fullPage: true }).catch(() => undefined);
      console.log(`Screenshot do momento do erro salvo em: ${errorScreenshot}`);
    }
    process.exitCode = 1;
  } finally {
    if (session) {
      console.log("Finalizando sessão do navegador de teste...");
      await closeBrowserSession(session);
    }
  }
}

main().catch(console.error);
