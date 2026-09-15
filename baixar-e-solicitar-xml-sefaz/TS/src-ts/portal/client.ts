import { SefazHttpClient, SefazPortalBusinessError, SefazPortalIncompatibleError } from "../sefaz-http/client.js";
import { SefazPlaywrightPortal } from "./playwright.js";
import type { DownloadInfo, DownloadListingPage, SolicitacaoResultado } from "../types.js";

export type SefazTransport = "auto" | "http" | "playwright";

/** HTTP e o caminho normal; o navegador so entra em incompatibilidade tecnica. */
export class SefazPortalClient {
  private readonly http = new SefazHttpClient();
  private browser?: SefazPlaywrightPortal;
  private browserAuthenticated = false;

  constructor(private readonly transport: SefazTransport = "auto", private readonly headless?: boolean) {}

  async login(pfxPath: string, pfxPassword: string): Promise<void> {
    if (this.transport !== "playwright") {
      try {
        await this.http.loginComCertificado(pfxPath, pfxPassword);
        return;
      } catch (error) {
        if (this.transport === "http" || !isPortalIncompatible(error)) throw error;
      }
    }
    await this.loginComPlaywright();
  }

  async listarEmpresas(): Promise<Array<{ inscricao: string; nome: string }>> {
    return this.withFallback(() => this.http.listarEmpresas(), () => this.requireBrowser().listarEmpresas());
  }

  async preflightSolicitacao(inscricao: string): Promise<boolean> {
    return this.withFallback(() => this.http.preflightSolicitacao(inscricao), () => this.requireBrowser().preflightSolicitacao(inscricao));
  }

  async solicitarXml(params: Record<string, string>): Promise<SolicitacaoResultado> {
    return this.withFallback(() => this.http.solicitarXml(params), () => this.requireBrowser().solicitarXml(params));
  }

  async listarDownloads(page: number, readyOnly: boolean): Promise<DownloadListingPage> {
    return this.withFallback(() => this.http.listarDownloads(page, readyOnly), async () => this.requireBrowser().listarDownloads(page, readyOnly));
  }

  async baixarArquivo(info: DownloadInfo, destino?: string): Promise<string> {
    return this.withFallback(() => this.http.baixarArquivo(info, destino), () => this.requireBrowser().baixarArquivo(info));
  }

  async close(): Promise<void> {
    await this.browser?.close();
    this.browserAuthenticated = false;
  }

  private async withFallback<T>(httpAction: () => Promise<T>, browserAction: () => Promise<T>): Promise<T> {
    if (this.transport === "playwright") return browserAction();
    try { return await httpAction(); } catch (error) {
      if (this.transport === "http" || error instanceof SefazPortalBusinessError || !isPortalIncompatible(error)) throw error;
      await this.loginComPlaywright();
      return browserAction();
    }
  }

  private async loginComPlaywright(): Promise<void> {
    if (this.browserAuthenticated) return;
    this.browser ??= new SefazPlaywrightPortal();
    const session = await this.browser.login(this.headless);
    await this.http.adotarSessaoDoPortal(session.cookies, session.servicoXmlUrl);
    this.browserAuthenticated = true;
  }

  private requireBrowser(): SefazPlaywrightPortal {
    if (!this.browser) throw new SefazPortalIncompatibleError("Fallback Playwright nao foi inicializado");
    return this.browser;
  }
}

export function isPortalIncompatible(error: unknown): boolean {
  return error instanceof SefazPortalIncompatibleError;
}
